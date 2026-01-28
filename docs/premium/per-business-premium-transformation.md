# Per-Business Premium Transformation - Complete Investigation & Solution

## 🎯 Objective
Transform premium system from **user-based** (all companies have premium) to **per-business** (pay separately for each company).

## 📊 Current State Analysis

### **Provider Hierarchy** (from App.tsx)
```
ThemeProvider
└── QueryClientProvider
    └── TooltipProvider
        └── Router
            └── AuthProvider ⭐
                └── DepartmentProvider
                    └── BusinessProfileProviderWithModal ⭐
                        └── PremiumProvider ⭐
                            └── WorkspaceTabsProvider
```

**Key Finding**: PremiumProvider is INSIDE BusinessProfileProviderWithModal, meaning it has access to business profile context.

### **Two PremiumContext Files Found**
1. **`src/shared/context/PremiumContext.tsx`** - OLD system (user-based)
2. **`src/modules/premium/context/PremiumContext.tsx`** - NEW system (business-based)

**Problem**: App.tsx imports from `@/shared/context/PremiumContext` (OLD), not the new one!

### **Current Issues**
1. ✅ RPC function works correctly - returns proper premium status per business
2. ❌ UI doesn't update when switching businesses
3. ❌ App.tsx uses OLD PremiumContext from shared/context
4. ❌ Two conflicting PremiumContext implementations
5. ❌ Business switching doesn't trigger premium refetch in OLD context

## 🔍 Root Cause

### **The Real Problem**
```typescript
// App.tsx line 8 - WRONG IMPORT
import { PremiumProvider } from '@/shared/context/PremiumContext';

// Should be:
import { PremiumProvider } from '@/modules/premium/context/PremiumContext';
```

The app is using the OLD user-based premium context that doesn't react to business profile changes!

### **Why It's Not Working**
1. **OLD PremiumContext** (`shared/context/PremiumContext.tsx`):
   - Uses `premiumService` that checks user-level premium
   - Doesn't listen to `selectedProfileId` changes
   - Returns same premium status for all businesses
   - Interface: `{ hasPremium, tier, premiumSource, coversAllBusinesses }`

2. **NEW PremiumContext** (`modules/premium/context/PremiumContext.tsx`):
   - Uses `rpcPremiumService` with hierarchical checking
   - Listens to `selectedProfileId` changes
   - Returns per-business premium status
   - Interface: `{ hasPremium, level, subscriptionType, features, hasUserLevelPremium }`

## 🛠️ Solution Plan

### **Phase 1: Fix Import in App.tsx**
Change App.tsx to use the NEW PremiumContext:

```typescript
// OLD - Remove
import { PremiumProvider } from '@/shared/context/PremiumContext';

// NEW - Use
import { PremiumProvider } from '@/modules/premium/context/PremiumContext';
```

### **Phase 2: Remove/Archive OLD PremiumContext**
The OLD context at `src/shared/context/PremiumContext.tsx` should be:
- Renamed to `PremiumContext.OLD.tsx` (for reference)
- Or deleted entirely after confirming no other imports

### **Phase 3: Update All Imports**
Search for all files importing from `@/shared/context/PremiumContext` and update to `@/modules/premium/context/PremiumContext`.

### **Phase 4: Remove Debug Override**
In `modules/premium/context/PremiumContext.tsx`, remove the temporary debug override:

```typescript
// REMOVE THIS:
const forceBusinessChecks = true;

// And update the enabled condition back to:
enabled: !!user && !!selectedProfileId && !hasUserLevelPremium,
```

### **Phase 5: Verify Database Structure**
Use the DatabaseInvestigation tool at `/admin/database-investigation` to verify:
1. `premium_status` view exists and returns correct data
2. `enhanced_subscriptions` table has business-specific subscriptions
3. Business profiles are correctly linked to subscriptions

### **Phase 6: Test Business Switching**
1. Navigate to `/admin/business-premium-debug`
2. Switch between businesses with different premium statuses
3. Verify console logs show:
   - User-level premium check on app load
   - Business-level premium check on switch
   - Correct premium status per business

## 📋 Implementation Checklist

- [ ] Update App.tsx import to use NEW PremiumContext
- [ ] Archive or delete OLD PremiumContext
- [ ] Find and update all imports across codebase
- [ ] Remove debug override (forceBusinessChecks)
- [ ] Deploy RPC function if not already deployed
- [ ] Test with actual business profiles
- [ ] Verify premium status updates on switch
- [ ] Check console logs for proper flow
- [ ] Test with enterprise user (should skip business checks)
- [ ] Test with free user (should check per business)

## 🧪 Testing Scenarios

### **Scenario 1: Free User with Mixed Businesses**
```
User: Free tier (no enterprise/user premium)
Business A: Has premium subscription
Business B: No premium subscription

Expected:
- App load: User-level check returns free
- Select Business A: Business check returns premium ✓
- Switch to Business B: Business check returns free ✓
- Premium status updates correctly
```

### **Scenario 2: Enterprise User**
```
User: Has enterprise subscription
Business A: Any status
Business B: Any status

Expected:
- App load: User-level check returns enterprise
- Select Business A: No business check (uses user premium) ✓
- Switch to Business B: No business check (uses user premium) ✓
- All businesses show premium instantly
```

### **Scenario 3: Business Switching Performance**
```
Free user switching between 5 businesses:
- First switch: ~200ms (RPC call)
- Subsequent switches: ~200ms each (fresh checks)
- No stale data
- No "sticking" premium status
```

## 🔧 Database Schema Requirements

### **Required Tables**
1. **enhanced_subscriptions** - Main subscription records
   - `user_id` - Owner
   - `business_profile_id` - Which business (NULL for user-level)
   - `subscription_type_id` - Type reference
   - `is_active` - Active status
   - `period_start`, `period_end` - Validity period

2. **subscription_types** - Subscription type definitions
   - `id` - Type ID
   - `name` - 'premium', 'enterprise', 'admin', etc.
   - `tier` - Tier level
   - `features` - JSON feature flags

3. **premium_status** VIEW - Consolidated premium view
   - `user_id`
   - `business_profile_id` (NULL for user-level)
   - `has_premium` - Boolean
   - `effective_tier` - Calculated tier
   - `premium_source` - Where premium comes from
   - `user_tier`, `business_tier` - Specific tiers
   - `user_period_end`, `business_period_end` - Expiry dates

### **Required RLS Policies**
```sql
-- Users see only their own subscriptions
CREATE POLICY "Users see own subscriptions"
ON enhanced_subscriptions FOR SELECT
USING (user_id = auth.uid());

-- Users see only their own premium status
CREATE POLICY "Users see own premium status"
ON premium_status FOR SELECT
USING (user_id = auth.uid());
```

## 🚀 Deployment Steps

### **Step 1: Deploy RPC Function**
```bash
cd ksef-ai
supabase functions deploy check-premium-access
```

### **Step 2: Update App.tsx**
Change import to use NEW PremiumContext

### **Step 3: Update All Component Imports**
Search and replace imports across codebase

### **Step 4: Remove Debug Code**
Remove `forceBusinessChecks` override

### **Step 5: Test Thoroughly**
Use debug tools and console logs to verify

### **Step 6: Monitor**
Check for errors in production logs

## 📊 Expected Console Log Flow

### **App Launch (Free User)**
```
[PremiumContext] Checking user-level premium for: user-123
[RpcPremiumService] Checking premium via RPC for user user-123, business undefined
[check-premium-access] Checking premium for user: user-123, business: undefined
[PremiumContext] User-level premium status: false, level: free
```

### **Business Switch (Free User)**
```
[PremiumContext] Business profile changed to: business-456 - refetching premium
[PremiumContext] hasUserLevelPremium: false, forceBusinessChecks: false
[PremiumContext] Checking business-level premium for user: user-123, business: business-456
[RpcPremiumService] Checking premium via RPC for user user-123, business business-456
[check-premium-access] Checking premium for user: user-123, business: business-456
[PremiumContext] Business premium result: { hasAccess: true, level: 'business', ... }
```

### **Business Switch (Enterprise User)**
```
[PremiumContext] Business profile changed to: business-789 - refetching premium
[PremiumContext] hasUserLevelPremium: true, forceBusinessChecks: false
// No RPC call - uses cached user-level premium
```

## 🎯 Success Criteria

✅ **Correct Import**: App.tsx uses NEW PremiumContext
✅ **Single Source**: Only ONE PremiumContext in use
✅ **Business Switching**: Premium status updates on switch
✅ **No Sticking**: Each business shows correct status
✅ **Performance**: Enterprise users skip business checks
✅ **Accuracy**: Free users get fresh checks per business
✅ **Console Logs**: Clear flow visible in logs
✅ **Debug Tools**: Investigation tool shows correct data

## 🔮 Future Enhancements

### **1. Real-time Subscription Updates**
```typescript
// Subscribe to subscription changes
supabase
  .channel('subscription-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'enhanced_subscriptions',
    filter: `user_id=eq.${user.id}`
  }, () => {
    queryClient.invalidateQueries(['user-level-premium']);
    queryClient.invalidateQueries(['business-premium']);
  })
  .subscribe();
```

### **2. Optimistic Premium Upgrades**
```typescript
// Show premium immediately after payment
const upgradeMutation = useMutation({
  mutationFn: createSubscription,
  onMutate: async () => {
    // Optimistically show premium
    queryClient.setQueryData(['business-premium', businessId], {
      hasAccess: true,
      level: 'business',
    });
  },
});
```

### **3. Premium Expiry Warnings**
```typescript
// Warn users before subscription expires
const daysUntilExpiry = differenceInDays(expiresAt, new Date());
if (daysUntilExpiry <= 7) {
  showExpiryWarning(daysUntilExpiry);
}
```

## 📝 Migration Notes

### **Breaking Changes**
- PremiumContext interface changed
- Import path changed
- Some properties renamed (`tier` → `level`, etc.)

### **Backward Compatibility**
- OLD context kept as `.OLD.tsx` for reference
- Can be restored if issues found
- All changes in version control

### **Rollback Plan**
If issues occur:
1. Revert App.tsx import to OLD context
2. Disable NEW PremiumContext
3. Investigate issues
4. Fix and redeploy

---

## 🎉 Summary

The transformation from user-based to per-business premium requires:
1. **Fix import** in App.tsx to use NEW PremiumContext
2. **Remove OLD** PremiumContext to avoid confusion
3. **Update all imports** across the codebase
4. **Remove debug code** (forceBusinessChecks)
5. **Test thoroughly** with actual business profiles

The NEW PremiumContext already has all the logic needed - it just wasn't being used!
