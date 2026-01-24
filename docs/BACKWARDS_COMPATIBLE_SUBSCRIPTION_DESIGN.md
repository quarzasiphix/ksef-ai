# Backwards-Compatible Subscription System Design

## Current Behavior (What Exists Today)

```typescript
// Current system
user.has_premium === true
  → ALL businesses under that user are premium
```

**Simple and works**, but prevents per-business monetization.

---

## New Behavior (Backwards Compatible)

### Umbrella Hierarchy

```typescript
function getEffectiveTier(user, business) {
  // 1. Enterprise umbrella overrides everything
  if (user.enterprise_active === true) return 'PREMIUM';
  
  // 2. Legacy premium umbrella (temporary compatibility)
  if (user.legacy_premium === true) return 'PREMIUM';
  
  // 3. Business-level subscription
  return business.subscription_tier || 'FREE';
}
```

### Key Principle

**Enterprise/Legacy umbrella on user overrides everything**
- If user has umbrella → ALL businesses are premium
- Otherwise → check individual business subscription
- Otherwise → Free/Limited

---

## Database Schema Changes

### Add to `business_profiles` table

```sql
ALTER TABLE business_profiles ADD COLUMN
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'jdg_premium', 'spolka_premium')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'trial', 'cancelled', 'past_due')),
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  subscription_metadata JSONB DEFAULT '{}';
```

### Add to `premium_subscriptions` table (user-level)

```sql
ALTER TABLE premium_subscriptions ADD COLUMN
  subscription_level TEXT DEFAULT 'enterprise' CHECK (subscription_level IN ('enterprise', 'legacy')),
  is_umbrella BOOLEAN DEFAULT true;

-- For backwards compatibility
UPDATE premium_subscriptions 
SET subscription_level = 'legacy', is_umbrella = true 
WHERE is_active = true;
```

### Create view for easy access

```sql
CREATE OR REPLACE VIEW user_umbrella_status AS
SELECT 
  user_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM premium_subscriptions 
      WHERE premium_subscriptions.user_id = auth.users.id 
      AND is_active = true 
      AND is_umbrella = true
    ) THEN true
    ELSE false
  END as has_umbrella,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM premium_subscriptions 
      WHERE premium_subscriptions.user_id = auth.users.id 
      AND is_active = true 
      AND subscription_level = 'enterprise'
    ) THEN 'enterprise'
    WHEN EXISTS (
      SELECT 1 FROM premium_subscriptions 
      WHERE premium_subscriptions.user_id = auth.users.id 
      AND is_active = true 
      AND subscription_level = 'legacy'
    ) THEN 'legacy'
    ELSE null
  END as umbrella_type
FROM auth.users;
```

---

## Implementation

### 1. Canonical Access Function

**File**: `src/shared/services/premiumAccessService.ts`

```typescript
export type SubscriptionTier = 'free' | 'jdg_premium' | 'spolka_premium';
export type UmbrellaType = 'enterprise' | 'legacy' | null;

interface EffectiveTierResult {
  tier: SubscriptionTier | 'premium';
  source: 'enterprise_umbrella' | 'legacy_umbrella' | 'business_subscription' | 'free';
  umbrellaType?: UmbrellaType;
}

/**
 * CANONICAL FUNCTION - Use this everywhere for premium checks
 * 
 * Hierarchy:
 * 1. Enterprise umbrella (user-level) → PREMIUM for all businesses
 * 2. Legacy umbrella (user-level) → PREMIUM for all businesses  
 * 3. Business subscription → tier from business
 * 4. Default → FREE
 */
export async function getEffectiveTier(
  userId: string, 
  businessProfileId: string
): Promise<EffectiveTierResult> {
  
  // Check user umbrella status
  const { data: umbrellaStatus } = await supabase
    .from('user_umbrella_status')
    .select('has_umbrella, umbrella_type')
    .eq('user_id', userId)
    .single();
  
  // 1. Enterprise umbrella overrides everything
  if (umbrellaStatus?.umbrella_type === 'enterprise') {
    return {
      tier: 'premium',
      source: 'enterprise_umbrella',
      umbrellaType: 'enterprise'
    };
  }
  
  // 2. Legacy umbrella (backwards compatibility)
  if (umbrellaStatus?.umbrella_type === 'legacy') {
    return {
      tier: 'premium',
      source: 'legacy_umbrella',
      umbrellaType: 'legacy'
    };
  }
  
  // 3. Check business-level subscription
  const { data: business } = await supabase
    .from('business_profiles')
    .select('subscription_tier, subscription_status')
    .eq('id', businessProfileId)
    .single();
  
  if (business?.subscription_status === 'active' && business.subscription_tier) {
    return {
      tier: business.subscription_tier as SubscriptionTier,
      source: 'business_subscription'
    };
  }
  
  // 4. Default to free
  return {
    tier: 'free',
    source: 'free'
  };
}

/**
 * Check if user/business has a specific capability
 */
export async function hasCapability(
  userId: string,
  businessProfileId: string,
  capability: string
): Promise<boolean> {
  const { tier } = await getEffectiveTier(userId, businessProfileId);
  
  // Define capabilities per tier
  const capabilities: Record<string, string[]> = {
    free: ['basic_invoicing', 'basic_expenses'],
    jdg_premium: ['basic_invoicing', 'basic_expenses', 'advanced_accounting', 'jpk_export', 'ksef_integration'],
    spolka_premium: ['basic_invoicing', 'basic_expenses', 'advanced_accounting', 'jpk_export', 'ksef_integration', 'governance', 'decisions', 'asset_management'],
    premium: ['basic_invoicing', 'basic_expenses', 'advanced_accounting', 'jpk_export', 'ksef_integration', 'governance', 'decisions', 'asset_management'] // Umbrella gets everything
  };
  
  return capabilities[tier]?.includes(capability) ?? false;
}

/**
 * Simple boolean check - is this business premium?
 */
export async function isPremium(
  userId: string,
  businessProfileId: string
): Promise<boolean> {
  const { tier } = await getEffectiveTier(userId, businessProfileId);
  return tier === 'premium' || tier === 'jdg_premium' || tier === 'spolka_premium';
}
```

### 2. React Hook

**File**: `src/shared/hooks/usePremiumAccess.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { getEffectiveTier, hasCapability, isPremium } from '@/shared/services/premiumAccessService';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

export const usePremiumAccess = () => {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  
  const { data: effectiveTier, isLoading } = useQuery({
    queryKey: ['effective-tier', user?.id, selectedProfileId],
    queryFn: () => {
      if (!user || !selectedProfileId) return null;
      return getEffectiveTier(user.id, selectedProfileId);
    },
    enabled: !!user && !!selectedProfileId
  });
  
  const checkCapability = async (capability: string) => {
    if (!user || !selectedProfileId) return false;
    return hasCapability(user.id, selectedProfileId, capability);
  };
  
  const checkIsPremium = async () => {
    if (!user || !selectedProfileId) return false;
    return isPremium(user.id, selectedProfileId);
  };
  
  return {
    effectiveTier,
    isLoading,
    isPremium: effectiveTier?.tier !== 'free',
    isUmbrellaUser: effectiveTier?.source === 'enterprise_umbrella' || effectiveTier?.source === 'legacy_umbrella',
    hasCapability: checkCapability,
    checkIsPremium
  };
};
```

---

## Migration Strategy

### Phase 1: Add Fields (Non-Breaking)

```sql
-- Add business subscription fields
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'inactive',
  subscription_starts_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  subscription_metadata JSONB DEFAULT '{}';

-- Add umbrella fields to user subscriptions
ALTER TABLE premium_subscriptions ADD COLUMN IF NOT EXISTS
  subscription_level TEXT DEFAULT 'legacy',
  is_umbrella BOOLEAN DEFAULT true;

-- Mark all existing active subscriptions as legacy umbrella
UPDATE premium_subscriptions 
SET 
  subscription_level = 'legacy',
  is_umbrella = true 
WHERE is_active = true;
```

### Phase 2: Deploy New Access Functions

1. Deploy `premiumAccessService.ts`
2. Deploy `usePremiumAccess` hook
3. **DO NOT** change existing code yet

### Phase 3: Gradual Migration

Replace old premium checks one by one:

```typescript
// OLD (scattered everywhere)
const { isPremium } = useAuth();
if (isPremium) { ... }

// NEW (canonical)
const { isPremium } = usePremiumAccess();
if (isPremium) { ... }
```

### Phase 4: Verify Backwards Compatibility

**Test Cases**:

1. **Existing premium user**:
   - Has `premium_subscriptions.is_active = true`
   - Has `premium_subscriptions.subscription_level = 'legacy'`
   - Creates new business → automatically premium ✅
   - All existing businesses → premium ✅

2. **New user (no umbrella)**:
   - Creates business → free by default ✅
   - Subscribes business individually → that business premium ✅
   - Other businesses → still free ✅

3. **User upgrades to enterprise**:
   - `premium_subscriptions.subscription_level = 'enterprise'`
   - All businesses → premium ✅
   - New businesses → automatically premium ✅

---

## Product Behavior After Change

### If User Has Umbrella (Enterprise or Legacy)

```
✅ All businesses are premium
✅ New businesses automatically premium
✅ Business-level subscription ignored for access
✅ Can still subscribe individual businesses (for future migration)
```

### If User Does NOT Have Umbrella

```
✅ Each business starts as FREE
✅ Must subscribe each business individually
✅ Premium features only for subscribed businesses
✅ Can upgrade to enterprise umbrella later
```

---

## Pricing Model

### Business-Level Subscriptions

- **JDG Premium**: 19 zł/month per business
- **Spółka Premium**: 89 zł/month per business

### Enterprise Umbrella

**Option A: Fixed Price**
- 150 zł/month for unlimited businesses

**Option B: Dynamic Price** (your original idea)
- Base: 50 zł/month
- +19 zł per JDG business
- +89 zł per Spółka business

### Migration Path for Existing Users

**Existing premium users** (currently paying 19 zł or 89 zł):
- Keep current price as "legacy umbrella"
- Get all businesses premium
- Can migrate to enterprise when ready
- No forced changes

---

## Implementation Checklist

### Database
- [ ] Add business subscription fields
- [ ] Add umbrella fields to premium_subscriptions
- [ ] Create user_umbrella_status view
- [ ] Migrate existing subscriptions to legacy umbrella

### Backend
- [ ] Create `premiumAccessService.ts`
- [ ] Implement `getEffectiveTier()`
- [ ] Implement `hasCapability()`
- [ ] Implement `isPremium()`

### Frontend
- [ ] Create `usePremiumAccess` hook
- [ ] Update AuthContext to use new system (optional)
- [ ] Replace premium checks gradually
- [ ] Add business subscription UI

### Testing
- [ ] Test existing premium user (all businesses premium)
- [ ] Test new user (free by default)
- [ ] Test business subscription (only that business premium)
- [ ] Test enterprise upgrade (all businesses premium)

---

## Example Usage

### Check Premium Access

```typescript
// In any component
const { isPremium, isUmbrellaUser, effectiveTier } = usePremiumAccess();

if (isPremium) {
  // Show premium features
}

if (isUmbrellaUser) {
  // Show "All businesses premium" badge
}
```

### Check Specific Capability

```typescript
const { hasCapability } = usePremiumAccess();

const canUseGovernance = await hasCapability('governance');
if (canUseGovernance) {
  // Show governance features
}
```

### Route Guard

```typescript
const PremiumRoute = ({ children }) => {
  const { isPremium, isLoading } = usePremiumAccess();
  
  if (isLoading) return <Loading />;
  if (!isPremium) return <Navigate to="/premium" />;
  
  return children;
};
```

---

## Benefits

### For Existing Users
✅ **Zero disruption** - everything works exactly as before
✅ **Keep current pricing** - no forced upgrades
✅ **All businesses premium** - umbrella preserved

### For New Users
✅ **Pay per business** - only pay for what you use
✅ **Try before buy** - can test with free tier
✅ **Flexible** - subscribe businesses individually or get enterprise

### For Business
✅ **Backwards compatible** - no migration risk
✅ **New revenue streams** - per-business monetization
✅ **Gradual transition** - migrate users at own pace
✅ **Clear upgrade path** - free → business → enterprise

---

**Status**: Design Complete
**Next Step**: Implement database migration and premiumAccessService.ts
