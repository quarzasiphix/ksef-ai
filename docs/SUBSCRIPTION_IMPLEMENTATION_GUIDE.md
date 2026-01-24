# Enhanced Subscription System - Implementation Guide

## Overview

This guide provides a complete implementation roadmap for the multi-tier subscription system that supports:
- **Company-level subscriptions** - Premium per business profile
- **Enterprise subscriptions** - All companies get premium with dynamic pricing
- **Automatic benefit assignment** - New companies automatically get premium under enterprise plan
- **Dynamic billing** - Price adjusts based on company count

---

## System Architecture

### Subscription Levels

```
┌─────────────────────────────────────────────────────────┐
│                    User Account                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Company 1  │  │   Company 2  │  │   Company 3  │  │
│  │   (JDG)      │  │   (Spółka)   │  │   (JDG)      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  Subscription Options:                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                           │
│  Option A: Individual Company Subscriptions              │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │ Company 1    │  │ Company 2    │                     │
│  │ 19 zł/month  │  │ 89 zł/month  │                     │
│  └──────────────┘  └──────────────┘                     │
│  Total: 108 zł/month                                     │
│                                                           │
│  Option B: Enterprise Subscription                       │
│  ┌─────────────────────────────────────────────┐        │
│  │ Enterprise Plan                              │        │
│  │ Base: 50 zł + (2×19) + (1×89) = 177 zł/month│        │
│  │ All 3 companies get premium automatically   │        │
│  └─────────────────────────────────────────────┘        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Pricing Model

#### Individual Company Plans
- **JDG Premium**: 19 zł/month per company
- **Spółka Standard**: 89 zł/month per company
- Each company billed separately
- User can mix and match

#### Enterprise Plan
```typescript
Base Price: 50 zł/month
+ Per JDG: 19 zł/month each
+ Per Spółka: 89 zł/month each
= Total Dynamic Price

Example calculations:
- 1 JDG: 50 + 19 = 69 zł/month
- 1 Spółka: 50 + 89 = 139 zł/month
- 2 JDG + 1 Spółka: 50 + 38 + 89 = 177 zł/month
- 5 JDG: 50 + 95 = 145 zł/month
```

---

## Database Schema

### Tables Created

#### `subscription_types`
Defines available subscription plans (JDG, Spółka, Enterprise)

```sql
- id: UUID
- name: TEXT (jdg, spolka, enterprise)
- display_name: TEXT
- description: TEXT
- price_monthly: INTEGER (in grosze)
- price_annual: INTEGER (in grosze)
- features: JSONB
- is_active: BOOLEAN
```

#### `enhanced_subscriptions`
Main subscription records linking users/companies to plans

```sql
- id: UUID
- user_id: UUID (FK to auth.users)
- business_profile_id: UUID (FK to business_profiles, nullable)
- subscription_type_id: UUID (FK to subscription_types)
- subscription_level: TEXT (user, company, enterprise)
- stripe_subscription_id: TEXT
- stripe_customer_id: TEXT
- is_active: BOOLEAN
- starts_at: TIMESTAMPTZ
- ends_at: TIMESTAMPTZ
- trial_ends_at: TIMESTAMPTZ
- cancel_at_period_end: BOOLEAN
- metadata: JSONB
```

#### `enterprise_benefits`
Tracks which companies get premium from enterprise subscription

```sql
- id: UUID
- user_id: UUID
- business_profile_id: UUID
- benefit_type: TEXT (premium_access)
- is_active: BOOLEAN
- granted_by_subscription_id: UUID (FK to enhanced_subscriptions)
```

#### `subscription_usage`
Tracks usage for analytics and billing

```sql
- id: UUID
- user_id: UUID
- business_profile_id: UUID
- subscription_id: UUID
- usage_type: TEXT
- usage_count: INTEGER
- usage_date: DATE
```

---

## Implementation Components

### 1. Subscription Service (`subscriptionService.ts`)

Core business logic for subscription management.

**Key Methods:**

```typescript
// Get all subscription types
getSubscriptionTypes(): Promise<SubscriptionType[]>

// Get user's subscriptions
getUserSubscriptions(userId: string): Promise<EnhancedSubscription[]>

// Calculate enterprise pricing dynamically
calculateEnterprisePricing(userId: string): Promise<EnterprisePricing>

// Check if business has premium access
hasPremiumAccess(businessProfileId: string, userId: string): Promise<boolean>

// Assign enterprise benefits to all companies
assignEnterpriseBenefits(userId: string, subscriptionId: string): Promise<void>

// Handle new business profile creation
handleNewBusinessProfile(businessProfileId: string, userId: string): Promise<void>

// Create enterprise subscription
createEnterpriseSubscription(userId, stripeCustomerId, stripeSubscriptionId): Promise<EnhancedSubscription>

// Create company-level subscription
createCompanySubscription(userId, businessProfileId, type, ...): Promise<EnhancedSubscription>
```

**Usage Example:**

```typescript
import { subscriptionService } from '@/shared/services/subscriptionService';

// Check if company has premium
const hasPremium = await subscriptionService.hasPremiumAccess(
  businessProfileId, 
  userId
);

// Calculate enterprise price
const pricing = await subscriptionService.calculateEnterprisePricing(userId);
console.log(`Enterprise price: ${pricing.total_monthly_price / 100} zł`);

// Handle new company
await subscriptionService.handleNewBusinessProfile(newCompanyId, userId);
```

### 2. Enhanced Premium UI (`EnhancedPremium.tsx`)

User-facing subscription selection interface.

**Features:**
- Displays all three subscription tiers
- Shows user's current companies
- Calculates enterprise pricing dynamically
- Handles plan selection and checkout

**Key Components:**
- Company overview cards
- Subscription plan cards with pricing
- Enterprise benefits explanation
- Dynamic price calculation display

### 3. Stripe Integration

#### Checkout Flow for Enterprise

```typescript
// Create Stripe checkout session for enterprise
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: stripeCustomerId,
  line_items: [{
    price_data: {
      currency: 'pln',
      product: enterpriseProductId,
      recurring: { interval: 'month' },
      unit_amount: enterprisePricing.total_monthly_price
    },
    quantity: 1
  }],
  metadata: {
    user_id: userId,
    subscription_level: 'enterprise',
    company_count: companies.length,
    jdg_count: jdgCount,
    spolka_count: spolkaCount
  },
  success_url: `${appUrl}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${appUrl}/premium/cancel`
});
```

#### Webhook Handling

The webhook handler processes Stripe events and:
1. Creates/updates subscription records
2. Assigns enterprise benefits
3. Handles subscription lifecycle events
4. Logs transactions

**Key Events:**
- `checkout.session.completed` - Initial subscription creation
- `customer.subscription.created` - Subscription activated
- `customer.subscription.updated` - Price changes, status updates
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Successful payment
- `invoice.payment_failed` - Failed payment

---

## User Flows

### Flow 1: User Subscribes to Enterprise Plan

```
1. User navigates to /premium
2. System loads user's companies
3. System calculates enterprise pricing
4. User clicks "Aktywuj Enterprise"
5. Modal shows:
   - Current companies (3)
   - Breakdown: 50 + (2×19) + (1×89) = 177 zł
   - Explanation of benefits
6. User confirms and proceeds to Stripe checkout
7. User completes payment
8. Webhook receives checkout.session.completed
9. System creates enhanced_subscription record
10. System assigns enterprise_benefits to all 3 companies
11. User redirected to success page
12. All companies now have premium access
```

### Flow 2: User Adds New Company (Has Enterprise)

```
1. User creates new business profile (Company 4, JDG)
2. System detects user has active enterprise subscription
3. System automatically:
   - Creates enterprise_benefit for Company 4
   - Calculates new price: 177 + 19 = 196 zł
   - Updates subscription metadata
4. On next billing cycle:
   - Stripe charges new amount (196 zł)
   - Webhook updates subscription record
5. User receives notification:
   "New company added to enterprise plan. 
    New monthly price: 196 zł (was 177 zł)"
```

### Flow 3: User Subscribes Individual Companies

```
1. User navigates to /premium
2. User selects "Spółka Standard" plan
3. Modal shows: "Select which company to upgrade"
4. User selects Company 2 (Spółka)
5. Checkout for 89 zł/month
6. Payment completed
7. Webhook creates:
   - enhanced_subscription (company level)
   - Links to business_profile_id
8. Only Company 2 has premium
9. Other companies remain free tier
```

### Flow 4: User Upgrades from Individual to Enterprise

```
1. User has 2 individual subscriptions:
   - Company 1 (JDG): 19 zł/month
   - Company 2 (Spółka): 89 zł/month
   - Total: 108 zł/month
2. User adds Company 3 (JDG)
3. System suggests: "Upgrade to Enterprise for 177 zł/month 
   and get all 3 companies premium"
4. User accepts
5. System:
   - Cancels 2 individual subscriptions
   - Creates enterprise subscription
   - Assigns benefits to all 3 companies
6. User now pays 177 zł/month for all companies
```

---

## Integration Points

### AuthContext Integration

Update `AuthContext` to check both company-level and enterprise benefits:

```typescript
const checkPremiumStatus = async (userId: string, businessProfileId: string) => {
  const hasPremium = await subscriptionService.hasPremiumAccess(
    businessProfileId,
    userId
  );
  return hasPremium;
};
```

### BusinessProfileContext Integration

When creating new business profile:

```typescript
const createBusinessProfile = async (profileData) => {
  const newProfile = await supabase
    .from('business_profiles')
    .insert(profileData)
    .select()
    .single();
  
  // Handle enterprise subscription
  await subscriptionService.handleNewBusinessProfile(
    newProfile.id,
    user.id
  );
  
  return newProfile;
};
```

### Route Guards

Update premium route guards to check new system:

```typescript
const PremiumGuard = ({ children }) => {
  const { user } = useAuth();
  const { activeProfile } = useBusinessProfile();
  const [hasPremium, setHasPremium] = useState(false);
  
  useEffect(() => {
    if (user && activeProfile) {
      subscriptionService
        .hasPremiumAccess(activeProfile.id, user.id)
        .then(setHasPremium);
    }
  }, [user, activeProfile]);
  
  if (!hasPremium) {
    return <Navigate to="/premium" />;
  }
  
  return children;
};
```

---

## Stripe Product Setup

### Required Products in Stripe Dashboard

#### Product 1: JDG Premium
- Name: "JDG Premium"
- Price: 19 PLN/month (1900 grosze)
- Recurring: Monthly
- Metadata: `plan_type: jdg`

#### Product 2: Spółka Standard
- Name: "Spółka Standard"
- Price: 89 PLN/month (8900 grosze)
- Recurring: Monthly
- Metadata: `plan_type: spolka`

#### Product 3: Enterprise (Dynamic)
- Name: "Enterprise Plan"
- Price: Dynamic (calculated per user)
- Recurring: Monthly
- Metadata: `plan_type: enterprise`

**Note:** For enterprise, create checkout sessions with dynamic `price_data` instead of fixed price IDs.

---

## Migration Strategy

### Phase 1: Data Migration (Week 1)

```sql
-- Migrate existing premium_subscriptions to enhanced_subscriptions
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
  bp.id,
  st.id,
  'company',
  ps.stripe_subscription_id,
  ps.is_active,
  ps.starts_at,
  ps.ends_at
FROM premium_subscriptions ps
JOIN business_profiles bp ON bp.user_id = ps.user_id AND bp.is_default = true
JOIN subscription_types st ON st.name = CASE 
  WHEN bp.entity_type = 'dzialalnosc' THEN 'jdg'
  ELSE 'spolka'
END;
```

### Phase 2: Frontend Update (Week 2)

1. Deploy new `subscriptionService.ts`
2. Update `AuthContext` to use new service
3. Deploy `EnhancedPremium.tsx` component
4. Update route configuration
5. Test all flows in staging

### Phase 3: Webhook Deployment (Week 3)

1. Deploy enhanced webhook function
2. Configure webhook in Stripe Dashboard
3. Test webhook events in test mode
4. Monitor logs for errors
5. Switch to live mode

### Phase 4: User Communication (Week 4)

1. Email existing users about new features
2. Provide migration guide
3. Offer special pricing for early adopters
4. Monitor support tickets

---

## Testing Checklist

### Unit Tests
- [ ] `calculateEnterprisePricing` returns correct prices
- [ ] `hasPremiumAccess` checks both company and enterprise
- [ ] `assignEnterpriseBenefits` creates benefits for all companies
- [ ] `handleNewBusinessProfile` assigns premium if enterprise active

### Integration Tests
- [ ] Create company subscription via Stripe
- [ ] Create enterprise subscription via Stripe
- [ ] Add company to existing enterprise subscription
- [ ] Remove company from enterprise subscription
- [ ] Cancel company subscription
- [ ] Cancel enterprise subscription

### E2E Tests
- [ ] Complete enterprise checkout flow
- [ ] Complete company checkout flow
- [ ] Add new company with active enterprise
- [ ] Upgrade from company to enterprise
- [ ] Downgrade from enterprise to company

---

## Monitoring & Analytics

### Key Metrics to Track

```typescript
// Dashboard queries
const metrics = {
  // Total active subscriptions by level
  activeSubscriptionsByLevel: `
    SELECT subscription_level, COUNT(*) 
    FROM enhanced_subscriptions 
    WHERE is_active = true 
    GROUP BY subscription_level
  `,
  
  // Average companies per enterprise user
  avgCompaniesPerEnterprise: `
    SELECT AVG(company_count) 
    FROM (
      SELECT user_id, COUNT(*) as company_count
      FROM enterprise_benefits
      WHERE is_active = true
      GROUP BY user_id
    )
  `,
  
  // Monthly recurring revenue
  mrr: `
    SELECT 
      SUM(CASE 
        WHEN subscription_level = 'enterprise' THEN 
          (metadata->>'current_price')::integer
        ELSE 
          st.price_monthly
      END) / 100 as mrr
    FROM enhanced_subscriptions es
    JOIN subscription_types st ON st.id = es.subscription_type_id
    WHERE es.is_active = true
  `
};
```

---

## Troubleshooting

### Issue: Enterprise benefits not assigned to new company

**Diagnosis:**
```sql
-- Check if enterprise subscription exists
SELECT * FROM enhanced_subscriptions 
WHERE user_id = '<user_id>' 
AND subscription_level = 'enterprise' 
AND is_active = true;

-- Check if benefit was created
SELECT * FROM enterprise_benefits 
WHERE business_profile_id = '<new_company_id>';
```

**Solution:**
```typescript
// Manually trigger benefit assignment
await subscriptionService.assignEnterpriseBenefits(userId, subscriptionId);
```

### Issue: Price not updating when company added

**Diagnosis:**
- Check webhook logs for errors
- Verify Stripe subscription metadata
- Check if subscription is in trial period

**Solution:**
- Update subscription manually via Stripe API
- Trigger webhook event manually
- Contact Stripe support if persistent

### Issue: User has both company and enterprise subscription

**Diagnosis:**
```sql
-- Find conflicting subscriptions
SELECT * FROM enhanced_subscriptions 
WHERE user_id = '<user_id>' 
AND is_active = true;
```

**Solution:**
- Cancel company-level subscriptions
- Keep only enterprise subscription
- Refund prorated amount

---

## Future Enhancements

### Phase 5: Advanced Features
- [ ] Usage-based billing for API calls
- [ ] Team member limits per plan
- [ ] Custom enterprise packages
- [ ] Annual billing with discount
- [ ] Proration handling for mid-cycle changes

### Phase 6: Analytics Dashboard
- [ ] Subscription analytics for users
- [ ] Cost forecasting
- [ ] Usage reports
- [ ] ROI calculator

### Phase 7: Self-Service
- [ ] User can upgrade/downgrade plans
- [ ] User can manage payment methods
- [ ] User can view billing history
- [ ] User can download invoices

---

## Support & Documentation

### User Documentation
- Create help articles for each subscription type
- Video tutorials for checkout process
- FAQ for common questions
- Pricing calculator tool

### Developer Documentation
- API reference for subscription service
- Webhook event reference
- Database schema documentation
- Integration examples

---

**Status**: Implementation Ready
**Last Updated**: 2025-01-24
**Version**: 1.0.0
