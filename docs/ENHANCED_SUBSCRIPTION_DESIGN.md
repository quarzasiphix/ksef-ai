# Enhanced Subscription System Design

## Overview

This document outlines the comprehensive multi-tier subscription system that supports:
- **Company-level premium assignment**
- **User-level enterprise plans**
- **Dynamic billing based on company count**
- **Flexible subscription management**

## Architecture

### Subscription Levels

#### 1. **User Level Subscription**
- Premium features for the user account
- Independent of business profiles
- Good for accountants or consultants

#### 2. **Company Level Subscription**
- Premium assigned to specific business profile
- Each company billed separately
- Current system behavior (preserved)

#### 3. **Enterprise Level Subscription**
- User gets premium for ALL their businesses
- Dynamic billing based on company count
- Automatic premium assignment to new companies

### Billing Model

#### Enterprise Dynamic Billing
```
Base Enterprise Price: 50 zł/month
Per-JDG Company: +19 zł/month
Per-Spółka Company: +89 zł/month

Example:
- 1 JDG + 1 Spółka = 50 + 19 + 89 = 158 zł/month
- 3 JDG companies = 50 + (3 × 19) = 107 zł/month
- 2 Spółki = 50 + (2 × 89) = 228 zł/month
```

## Database Schema

### Core Tables

#### subscription_types
```sql
- id: UUID (PK)
- name: TEXT (jdg, spolka, enterprise)
- display_name: TEXT
- price_monthly: INTEGER (in grosze)
- price_annual: INTEGER (in grosze)
- features: JSONB
- is_active: BOOLEAN
```

#### enhanced_subscriptions
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users)
- business_profile_id: UUID (FK to business_profiles, nullable)
- subscription_type_id: UUID (FK to subscription_types)
- subscription_level: TEXT (user, company, enterprise)
- stripe_subscription_id: TEXT
- is_active: BOOLEAN
- starts_at: TIMESTAMPTZ
- ends_at: TIMESTAMPTZ
- trial_ends_at: TIMESTAMPTZ
```

#### enterprise_benefits
```sql
- id: UUID (PK)
- user_id: UUID (FK)
- business_profile_id: UUID (FK)
- benefit_type: TEXT
- is_active: BOOLEAN
- granted_by_subscription_id: UUID (FK)
```

## Implementation Plan

### Phase 1: Database Migration ✅
- [x] Create new tables
- [x] Migrate existing subscriptions
- [x] Set up RLS policies
- [x] Create indexes

### Phase 2: Backend Services

#### Enhanced Subscription Service
```typescript
// src/shared/services/subscriptionService.ts
export class SubscriptionService {
  async calculateEnterprisePrice(userId: string): Promise<number>
  async assignEnterpriseBenefits(userId: string): Promise<void>
  async handleNewBusinessProfile(businessProfileId: string): Promise<void>
  async updateEnterpriseSubscription(userId: string): Promise<void>
}
```

#### Stripe Integration Updates
```typescript
// Enhanced webhook handler
export async function handleEnterpriseSubscriptionChange(
  subscription: Stripe.Subscription
): Promise<void>
```

### Phase 3: Frontend Components

#### Enhanced Premium UI
```typescript
// src/modules/premium/screens/EnhancedPremium.tsx
export const EnhancedPremium: React.FC = () => {
  // Show all three subscription levels
  // Calculate enterprise pricing dynamically
  // Handle company selection for enterprise plan
}
```

#### Company Management Integration
```typescript
// src/modules/business/components/CompanySubscriptionStatus.tsx
export const CompanySubscriptionStatus: React.FC = () => {
  // Show subscription status per company
  // Allow upgrading individual companies
  // Show enterprise benefits
}
```

### Phase 4: Migration Strategy

#### Data Migration
```sql
-- Migrate existing subscriptions to new system
INSERT INTO enhanced_subscriptions (
  user_id, 
  business_profile_id, 
  subscription_type_id, 
  subscription_level,
  stripe_subscription_id,
  is_active,
  starts_at,
  ends_at
)
SELECT 
  ps.user_id,
  bp.id as business_profile_id,
  st.id as subscription_type_id,
  'company' as subscription_level,
  ps.stripe_subscription_id,
  ps.is_active,
  ps.starts_at,
  ps.ends_at
FROM premium_subscriptions ps
CROSS JOIN business_profiles bp
CROSS JOIN subscription_types st
WHERE bp.user_id = ps.user_id 
AND bp.is_default = true
AND st.name = CASE 
  WHEN bp.entity_type = 'dzialalnosc' THEN 'jdg'
  WHEN bp.entity_type IN ('sp_zoo', 'sa') THEN 'spolka'
END;
```

## User Experience Flow

### Enterprise Subscription Flow

1. **User Selection**
   - User chooses Enterprise plan
   - System shows all current companies
   - Calculates dynamic price

2. **Checkout Process**
   - Create Stripe subscription with dynamic pricing
   - Store subscription metadata
   - Enable enterprise benefits

3. **New Company Addition**
   - User adds new business profile
   - System automatically assigns premium
   - Subscription updated with new price
   - User notified of price change

4. **Company Removal**
   - User deletes business profile
   - System removes enterprise benefit
   - Subscription price adjusted
   - User notified of price decrease

### Company-Level Subscription Flow

1. **Individual Company Upgrade**
   - User selects specific company
   - Chooses JDG or Spółka plan
   - Subscription created for that company only

2. **Multi-Company Management**
   - User can upgrade companies individually
   - Each company has separate subscription
   - Total shown in dashboard

## Technical Implementation Details

### Dynamic Price Calculation

```typescript
async function calculateEnterprisePrice(userId: string): Promise<number> {
  const companies = await supabase
    .from('business_profiles')
    .select('entity_type')
    .eq('user_id', userId);
  
  let basePrice = 5000; // 50 zł base in grosze
  let additionalPrice = 0;
  
  companies.forEach(company => {
    if (company.entity_type === 'dzialalnosc') {
      additionalPrice += 1900; // 19 zł per JDG
    } else if (company.entity_type in ['sp_zoo', 'sa']) {
      additionalPrice += 8900; // 89 zł per Spółka
    }
  });
  
  return basePrice + additionalPrice;
}
```

### Automatic Benefit Assignment

```typescript
async function assignEnterpriseBenefits(userId: string): Promise<void> {
  const companies = await supabase
    .from('business_profiles')
    .select('id')
    .eq('user_id', userId);
  
  const enterpriseSubscription = await supabase
    .from('enhanced_subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('subscription_level', 'enterprise')
    .eq('is_active', true)
    .single();
  
  for (const company of companies) {
    await supabase
      .from('enterprise_benefits')
      .upsert({
        user_id: userId,
        business_profile_id: company.id,
        benefit_type: 'premium_access',
        is_active: true,
        granted_by_subscription_id: enterpriseSubscription.id
      });
  }
}
```

### Webhook Handler Updates

```typescript
export async function handleEnterpriseSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const userId = subscription.metadata.user_id;
  
  if (subscription.status === 'active') {
    await assignEnterpriseBenefits(userId);
  } else {
    await removeEnterpriseBenefits(userId);
  }
  
  // Update subscription record
  await supabase
    .from('enhanced_subscriptions')
    .update({
      is_active: subscription.status === 'active',
      ends_at: subscription.current_period_end ? 
        new Date(subscription.current_period_end * 1000).toISOString() : null
    })
    .eq('stripe_subscription_id', subscription.id);
}
```

## Testing Strategy

### Unit Tests
- Price calculation logic
- Benefit assignment/removal
- Subscription validation

### Integration Tests
- Stripe webhook processing
- Database migrations
- RLS policy enforcement

### End-to-End Tests
- Complete enterprise subscription flow
- Multi-company management
- Price updates on company changes

## Migration Timeline

### Week 1: Backend Services
- Implement subscription service
- Update Stripe webhooks
- Create database migration scripts

### Week 2: Frontend Components
- Build enhanced premium UI
- Update company management
- Implement subscription status displays

### Week 3: Testing & Migration
- Comprehensive testing
- Data migration execution
- Performance optimization

### Week 4: Deployment
- Staging deployment
- User acceptance testing
- Production rollout

## Benefits

### For Users
- **Flexible Pricing**: Pay only for what you use
- **Automatic Management**: New companies get premium automatically
- **Clear Value**: Transparent pricing based on company count

### For Business
- **Increased Revenue**: Enterprise plans encourage multi-company usage
- **Reduced Churn**: Automatic premium assignment increases stickiness
- **Better Analytics**: Detailed usage tracking for business insights

## Future Enhancements

### Advanced Features
- Usage-based billing
- Tiered enterprise plans
- Custom enterprise packages
- Advanced analytics dashboard

### Integration Opportunities
- Accounting software integration
- Multi-currency support
- Advanced reporting
- API access for enterprise customers

---

**Status**: Design Complete, Implementation Ready
**Next Steps**: Begin Phase 2 Backend Services Implementation
