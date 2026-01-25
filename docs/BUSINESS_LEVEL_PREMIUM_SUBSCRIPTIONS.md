# Business-Level Premium Subscriptions

## Overview

This document describes the implementation of business-level premium subscriptions, where each business profile can have its own independent premium subscription based on its entity type.

## Architecture

### Database Schema

#### New Fields in `business_profiles` Table

```sql
-- Premium subscription fields
is_premium BOOLEAN DEFAULT FALSE
premium_tier TEXT CHECK (premium_tier IN ('jdg_premium', 'spolka_premium', 'enterprise'))
stripe_subscription_id TEXT
premium_starts_at TIMESTAMPTZ
premium_ends_at TIMESTAMPTZ
premium_status TEXT CHECK (premium_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'))
```

### Premium Tiers

1. **JDG Premium** (`jdg_premium`)
   - Price: 19 zł/month
   - For: Jednoosobowa Działalność Gospodarcza
   - Features:
     - Nieograniczone faktury i dokumenty
     - Podstawowa księgowość
     - Eksport JPK
     - Uproszczony system decyzji

2. **Spółka Premium** (`spolka_premium`)
   - Price: 89 zł/month
   - For: Spółka z o.o. / S.A.
   - Features:
     - System uchwał i decyzji
     - Zarządzanie aktywami (nieruchomości, pojazdy, IP)
     - Decyzje powiązane z wydatkami
     - Ścieżka audytu i odpowiedzialność
     - Śledzenie kapitału i wspólników
     - Nieograniczone dokumenty
     - Architektura gotowa na KSeF

3. **Enterprise** (`enterprise`)
   - Price: Custom
   - For: Banki, grupy kapitałowe
   - All Spółka features plus dedicated support

## Implementation

### 1. RequirePremium Component

The `RequirePremium` component now shows entity-specific premium information:

```tsx
// Shows business profile name and entity type
// Displays appropriate pricing (19 zł for JDG, 89 zł for Spółka)
// Uses entity-specific colors (emerald for JDG, amber for Spółka)
// Checks business_profiles.is_premium instead of user-level premium
```

**Features:**
- Business profile badge display
- Entity-specific pricing
- Dynamic color scheme based on entity type
- Premium status from business profile

### 2. Stripe Webhook Integration

The `enhanced-subscription-webhook` Edge Function now updates business profiles:

**On Subscription Created:**
```typescript
// Updates business_profiles table
{
  is_premium: true,
  premium_tier: 'jdg_premium' | 'spolka_premium' | 'enterprise',
  stripe_subscription_id: subscription.id,
  premium_starts_at: subscription.current_period_start,
  premium_ends_at: subscription.cancel_at_period_end ? subscription.current_period_end : null,
  premium_status: subscription.status
}
```

**On Subscription Updated:**
```typescript
// Updates premium status and end date
{
  is_premium: subscription.status === 'active' || subscription.status === 'trialing',
  premium_ends_at: subscription.cancel_at_period_end ? subscription.current_period_end : null,
  premium_status: subscription.status
}
```

**On Subscription Deleted:**
```typescript
// Marks subscription as canceled
{
  is_premium: false,
  premium_ends_at: now,
  premium_status: 'canceled'
}
```

### 3. Checkout Flow

When creating a Stripe checkout session, include metadata:

```typescript
{
  user_id: user.id,
  business_profile_id: selectedBusinessProfileId,
  entity_type: businessProfile.entityType,
  subscription_level: 'jdg' | 'spolka' | 'enterprise'
}
```

The webhook will use this metadata to update the correct business profile.

## Usage

### Checking Premium Status

```typescript
// In components
const { selectedProfileId, profiles } = useBusinessProfile();
const currentProfile = profiles?.find(p => p.id === selectedProfileId);
const isPremium = currentProfile?.is_premium;
const premiumTier = currentProfile?.premium_tier;
```

### Displaying Premium Gates

```tsx
import RequirePremium from '@/components/auth/RequirePremium';

// Wrap premium features
{!isPremium ? (
  <RequirePremium feature="Eksport JPK" />
) : (
  <ExportJPKFeature />
)}
```

## Migration Path

### Step 1: Run Database Migration

```bash
# Apply the migration to add premium fields
supabase db push
```

### Step 2: Deploy Updated Webhook

```bash
# Deploy the updated webhook function
supabase functions deploy enhanced-subscription-webhook
```

### Step 3: Update Frontend Components

- ✅ RequirePremium component updated
- ✅ PremiumCheckoutModal updated
- ✅ Premium page updated

### Step 4: Test Flow

1. Select a business profile (JDG or Spółka)
2. Click "Aktywuj Premium" button
3. Complete Stripe checkout
4. Webhook updates business_profiles table
5. Premium features unlock for that specific business

## Benefits

### For Users

1. **Granular Control**: Each business can have its own premium subscription
2. **Fair Pricing**: Pay only for what you use (19 zł for JDG, 89 zł for Spółka)
3. **Clear Attribution**: Premium status is tied to specific business entities
4. **Flexible Management**: Can have premium on some businesses and not others

### For Business

1. **Revenue Optimization**: Different pricing tiers based on business complexity
2. **Clear Value Proposition**: JDG = simple accounting, Spółka = governance
3. **Scalable Model**: Users with multiple businesses pay per entity
4. **Compliance**: Premium status tracked at entity level for audit purposes

## Color Coding

### JDG (Emerald Theme)
- Border: `border-emerald-200 dark:border-emerald-800`
- Background: `bg-emerald-50 dark:bg-emerald-950/20`
- Icon: `text-emerald-600 dark:text-emerald-400`
- Button: `from-emerald-500 to-emerald-600`

### Spółka (Amber Theme)
- Border: `border-amber-200 dark:border-amber-800`
- Background: `bg-amber-50 dark:bg-amber-950/20`
- Icon: `text-amber-600 dark:text-amber-400`
- Button: `from-amber-500 to-yellow-600`

## Future Enhancements

1. **Bulk Discounts**: Discount for users with multiple premium businesses
2. **Annual Plans**: Discounted annual subscriptions
3. **Trial Periods**: 7-day free trial for Spółka plans
4. **Upgrade/Downgrade**: Easy switching between tiers
5. **Usage Analytics**: Track feature usage per business profile

## Troubleshooting

### Premium Not Activating

1. Check webhook logs in Supabase dashboard
2. Verify `business_profile_id` in Stripe metadata
3. Confirm `stripe_subscription_id` in business_profiles table
4. Check subscription status in Stripe dashboard

### Wrong Pricing Displayed

1. Verify `entityType` field in business_profiles table
2. Check plan selection logic in PremiumCheckoutModal
3. Confirm Stripe product IDs match entity types

### Subscription Not Canceling

1. Check webhook received `customer.subscription.deleted` event
2. Verify business profile updated with `is_premium: false`
3. Confirm `premium_status` set to 'canceled'

## Support

For issues or questions:
- Check webhook logs: Supabase Dashboard → Edge Functions → Logs
- Review Stripe events: Stripe Dashboard → Developers → Webhooks
- Database queries: Check `business_profiles` table for premium fields
