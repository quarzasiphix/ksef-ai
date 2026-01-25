# New Premium Architecture

## 🏗️ Overview

The premium system has been redesigned to support three tiers of premium access:

1. **Free** - Basic functionality
2. **Premium** - Business-level premium (per business)
3. **Enterprise** - User-level premium (covers all businesses)

## 📊 Database Structure

### User Premium Subscriptions
```sql
user_premium_subscriptions
├── user_id (UUID)
├── tier ('free' | 'premium' | 'enterprise')
├── covers_all_businesses (BOOLEAN)
├── stripe_subscription_id (TEXT)
├── current_period_start/end (TIMESTAMP)
├── status ('trial' | 'active' | 'canceled' | 'expired')
└── UNIQUE(user_id)
```

### Business Premium Subscriptions
```sql
business_premium_subscriptions
├── business_profile_id (UUID)
├── user_id (UUID)
├── tier ('free' | 'premium')
├── plan_id (UUID) - references subscription_types
├── billing_cycle ('monthly' | 'annual')
├── stripe_subscription_id (TEXT)
├── current_period_start/end (TIMESTAMP)
├── status ('trial' | 'active' | 'canceled' | 'expired')
└── UNIQUE(business_profile_id)
```

### Premium Status View
```sql
premium_status (VIEW)
├── business_profile_id
├── user_id
├── business_name
├── entity_type
├── user_tier (from user_premium_subscriptions)
├── business_tier (from business_premium_subscriptions)
├── has_premium (computed)
├── effective_tier (computed)
├── premium_source (computed)
└── covers_all_businesses (computed)
```

## 🔍 Premium Checking Logic

### Function: `check_business_premium_access(user_id, business_profile_id)`

Returns JSONB with premium status:

```json
{
  "has_premium": true,
  "tier": "premium",
  "source": "business_subscription",
  "covers_all_businesses": false,
  "business_tier": "premium"
}
```

### Priority Order:
1. **Enterprise** - User has enterprise tier with `covers_all_businesses = true`
2. **Business Premium** - Business has active premium subscription
3. **Legacy Entity** - Fallback to old `entity_subscriptions` table
4. **Free** - Default to free tier

## 🎯 Frontend Integration

### New Premium Context
```typescript
// New hook replacing old AuthContext.isPremium
const { 
  hasPremium,           // Current business premium status
  tier,                // 'free' | 'premium' | 'enterprise'
  premiumSource,       // Source of premium
  coversAllBusinesses, // Enterprise covers all
  businessTier,        // Business-specific tier
  hasEnterprise,       // User has enterprise
  allBusinessesStatus, // All businesses premium status
  checkPremium,        // Manual check function
  refetch              // Refetch all data
} = usePremium();
```

### Usage Examples

```typescript
// Check if current business has premium
const { hasPremium } = usePremium();

// Check if user has enterprise (all businesses premium)
const { hasEnterprise } = usePremium();

// Get premium status for all businesses
const { allBusinessesStatus } = usePremium();

// Check specific business tier
const { businessTier } = usePremium();
```

## 💳 Subscription Types

### Business-Level Premium
- **JDG Premium**: €5 per business per month
- **Spółka Standard**: €21 per business per month
- **Tiered Pricing**: Quantity-based billing

### Enterprise-Level Premium
- **Enterprise**: Custom pricing for all businesses
- **Covers All**: One subscription covers all user's businesses
- **Unified Billing**: Single Stripe subscription

## 🔄 Migration Path

### Current State
- Existing `entity_subscriptions` still work (legacy support)
- New subscriptions use `business_premium_subscriptions`
- Enterprise subscriptions use `user_premium_subscriptions`

### Migration Steps
1. ✅ Database tables created
2. ✅ Premium checking function implemented
3. ✅ Frontend context created
4. ⏳ Update checkout flow to use new tables
5. ⏳ Update webhook to handle new subscription types
6. ⏳ Migrate existing subscriptions gradually

## 🚀 Benefits

### Clear Architecture
- **Separation of Concerns**: User vs Business level subscriptions
- **Scalable**: Easy to add new tiers and features
- **Backward Compatible**: Legacy subscriptions still work

### Better UX
- **Enterprise Support**: One subscription for all businesses
- **Flexible Pricing**: Per-business or enterprise pricing
- **Clear Status**: Users know exactly what they have premium for

### Developer Experience
- **Simple API**: One hook to check premium status
- **Type Safety**: Full TypeScript support
- **Caching**: Automatic caching and refetching

## 📝 Implementation Checklist

- [x] Database tables
- [x] Premium checking function
- [x] Premium status view
- [x] Frontend context
- [ ] Update checkout flow
- [ ] Update webhook handlers
- [ ] Update premium gates
- [ ] Update UI components
- [ ] Add enterprise pricing
- [ ] Migration scripts
- [ ] Testing
- [ ] Documentation

## 🔧 Testing

### Premium Status Check
```sql
-- Test premium checking function
SELECT check_business_premium_access(
  'user-id', 
  'business-profile-id'
);

-- Test premium status view
SELECT * FROM premium_status 
WHERE user_id = 'user-id';
```

### Frontend Testing
```typescript
// Test premium context
const premium = usePremium();
console.log('Has premium:', premium.hasPremium);
console.log('Tier:', premium.tier);
console.log('Source:', premium.premiumSource);
```
