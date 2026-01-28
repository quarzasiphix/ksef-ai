# Hierarchical Premium Checking System

## 🎯 Overview

The hierarchical premium checking system optimizes premium status detection by checking user-level premium once on app initialization, then only checking business-level premium when necessary.

## 📊 Premium Hierarchy

```
Enterprise Premium (covers ALL businesses)
    ↓
User-Level Premium (admin, manual clients)
    ↓
Business-Level Premium (per-company subscriptions)
    ↓
Free Tier
```

## 🔄 How It Works

### **On App Launch**

```
User logs in
    ↓
PremiumContext initializes
    ↓
Check user-level premium (RPC call without businessProfileId)
    ↓
Is user enterprise/admin/manual_client?
    ├─ YES → Set hasUserLevelPremium = true
    │         Skip all business-level checks ✓
    │         All businesses have premium access
    │
    └─ NO → Set hasUserLevelPremium = false
              Check premium per business when switching
```

### **When Switching Business Profiles**

```
User switches business profile
    ↓
selectedProfileId changes
    ↓
Does user have user-level premium?
    ├─ YES → Use cached user-level premium ✓
    │         No RPC call needed
    │         Instant premium status
    │
    └─ NO → Call RPC with businessProfileId
              Check if THIS business has premium
              Update premium status for this business
```

## 💡 Key Benefits

### **1. Performance Optimization**
- **User-level premium**: 1 RPC call on app launch
- **Business switching**: 0 RPC calls if user has enterprise/user premium
- **Free tier users**: 1 RPC call per business switch (necessary)

### **2. Correct Premium Detection**
- **Enterprise users**: All businesses show premium ✓
- **Free tier users**: Only businesses with subscriptions show premium ✓
- **No sticking**: Fresh data on every business switch ✓

### **3. Clear Separation**
- **User-level queries**: `['user-level-premium', userId]`
- **Business-level queries**: `['business-premium', businessProfileId, userId]`
- **Independent caching**: User-level cached for 5 minutes, business-level always fresh

## 🔧 Implementation Details

### **PremiumContext Structure**

```typescript
// Two separate queries
const userPremiumCheck = useQuery({
  queryKey: ['user-level-premium', user?.id],
  queryFn: () => rpcPremiumService.getPremiumAccess(user.id), // No businessProfileId
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  refetchOnMount: false, // Only check once
});

const businessPremiumCheck = useQuery({
  queryKey: ['business-premium', selectedProfileId, user?.id],
  queryFn: () => rpcPremiumService.getPremiumAccess(user.id, selectedProfileId),
  enabled: !hasUserLevelPremium, // Only if no user-level premium
  staleTime: 0, // Always fresh
  refetchOnMount: 'always', // Refetch on every business switch
});

// Use appropriate result
const premiumAccess = hasUserLevelPremium ? userPremiumCheck : businessPremiumCheck;
```

### **RPC Function Logic**

```typescript
// In check-premium-access edge function
if (!businessProfileId) {
  // Check for user-level or enterprise premium
  const userPremium = await supabase
    .from('premium_status')
    .select('*')
    .eq('user_id', userId)
    .or('user_tier.not.is.null,effective_tier.eq.enterprise')
    .single();
    
  if (userPremium) {
    return {
      hasAccess: true,
      level: userPremium.effective_tier === 'enterprise' ? 'enterprise' : 'user',
      // ... covers all businesses
    };
  }
} else {
  // Check specific business premium
  const businessPremium = await supabase
    .from('premium_status')
    .select('*')
    .eq('user_id', userId)
    .eq('business_profile_id', businessProfileId)
    .single();
    
  return {
    hasAccess: businessPremium.has_premium === 'true',
    level: 'business',
    // ... specific to this business
  };
}
```

## 📈 Performance Comparison

### **Before (Always Check Per Business)**
```
App Launch:
- User logs in
- Selects Business A → RPC call #1
- Switches to Business B → RPC call #2
- Switches to Business C → RPC call #3
- Switches back to Business A → RPC call #4 (cache expired)

Total: 4 RPC calls
```

### **After (Hierarchical Checking)**

**Enterprise User:**
```
App Launch:
- User logs in → RPC call #1 (user-level check)
- hasUserLevelPremium = true
- Selects Business A → No RPC call (use cached user premium)
- Switches to Business B → No RPC call (use cached user premium)
- Switches to Business C → No RPC call (use cached user premium)

Total: 1 RPC call
Improvement: 75% reduction
```

**Free Tier User:**
```
App Launch:
- User logs in → RPC call #1 (user-level check, returns free)
- hasUserLevelPremium = false
- Selects Business A → RPC call #2 (business-level check)
- Switches to Business B → RPC call #3 (business-level check)
- Switches to Business C → RPC call #4 (business-level check)

Total: 4 RPC calls
Same as before, but correct behavior
```

## 🎨 User Experience

### **Enterprise User**
1. Logs in
2. Sees premium badge immediately
3. Switches businesses instantly (no loading)
4. All features available everywhere

### **Free Tier User with Business Premium**
1. Logs in
2. Selects business with premium
3. Brief loading indicator
4. Premium features available for this business
5. Switches to business without premium
6. Brief loading indicator
7. Premium features disabled

### **Free Tier User without Premium**
1. Logs in
2. Selects any business
3. Brief loading indicator
4. No premium features
5. Sees upgrade prompts

## 🧪 Testing Scenarios

### **Scenario 1: Enterprise User**
```
✓ User-level check returns enterprise
✓ hasUserLevelPremium = true
✓ All businesses show premium
✓ No business-level checks performed
✓ Instant business switching
```

### **Scenario 2: Free User with Mixed Businesses**
```
✓ User-level check returns free
✓ hasUserLevelPremium = false
✓ Business A (premium) shows premium
✓ Business B (free) shows free
✓ Switching triggers fresh checks
✓ Correct status per business
```

### **Scenario 3: Admin User**
```
✓ User-level check returns user (admin)
✓ hasUserLevelPremium = true
✓ All businesses show premium
✓ No business-level checks performed
```

## 🔍 Debug Information

### **Console Logs**

**App Launch (Enterprise User):**
```
[PremiumContext] Checking user-level premium for: user-id
[RpcPremiumService] Checking premium via RPC for user user-id, business undefined
[check-premium-access] Checking premium for user: user-id, business: undefined
[PremiumContext] User-level premium status: true, level: enterprise
```

**Business Switch (Enterprise User):**
```
[PremiumContext] Business profile changed to: business-id - refetching premium
// No RPC call - using cached user-level premium
```

**Business Switch (Free User):**
```
[PremiumContext] Business profile changed to: business-id - refetching premium
[PremiumContext] Checking business-level premium for: business-id
[RpcPremiumService] Checking premium via RPC for user user-id, business business-id
[check-premium-access] Checking premium for user: user-id, business: business-id
```

### **Debug UI** (`/admin/business-premium-debug`)

Shows:
- ✅ User-level premium status
- ✅ Whether business checks are skipped
- ✅ Current business premium status
- ✅ Query cache state
- ✅ All business profiles

## 📝 Code Locations

### **Core Implementation**
- `src/modules/premium/context/PremiumContext.tsx` - Hierarchical checking logic
- `src/modules/premium/services/rpcPremiumService.ts` - RPC service wrapper
- `supabase/functions/check-premium-access/index.ts` - Server-side RPC function

### **Debug Tools**
- `src/modules/premium/components/BusinessPremiumDebug.tsx` - Debug UI with hierarchy display

## 🚀 Migration from Old System

### **Old System**
```typescript
// Single query that always checked with business profile
const { data: premiumAccess } = useQuery({
  queryKey: ['premium-access', selectedProfileId, user?.id],
  queryFn: () => checkPremium(user.id, selectedProfileId),
  staleTime: 0, // Always refetch
});
```

### **New System**
```typescript
// Two-tier checking
const userPremium = useQuery({
  queryKey: ['user-level-premium', user?.id],
  queryFn: () => checkPremium(user.id), // No business
  staleTime: 5 * 60 * 1000, // Cache
});

const businessPremium = useQuery({
  queryKey: ['business-premium', selectedProfileId, user?.id],
  queryFn: () => checkPremium(user.id, selectedProfileId),
  enabled: !hasUserLevelPremium, // Conditional
  staleTime: 0,
});
```

## ✅ Validation Checklist

- [ ] Deploy RPC function: `supabase functions deploy check-premium-access`
- [ ] Test enterprise user - all businesses show premium
- [ ] Test free user with business premium - correct per-business status
- [ ] Test business switching - no sticking issues
- [ ] Verify console logs show hierarchical checking
- [ ] Check debug UI shows user-level premium status
- [ ] Confirm performance improvement for enterprise users

## 🔮 Future Enhancements

### **1. Real-time Updates**
```typescript
// Subscribe to subscription changes
supabase
  .channel('premium-changes')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'enhanced_subscriptions' 
  }, () => {
    queryClient.invalidateQueries(['user-level-premium']);
  })
  .subscribe();
```

### **2. Predictive Prefetching**
```typescript
// Prefetch premium status for likely next business
useEffect(() => {
  const nextBusiness = profiles[currentIndex + 1];
  if (nextBusiness && !hasUserLevelPremium) {
    queryClient.prefetchQuery({
      queryKey: ['business-premium', nextBusiness.id, user?.id],
      queryFn: () => rpcPremiumService.getPremiumAccess(user.id, nextBusiness.id),
    });
  }
}, [currentIndex, hasUserLevelPremium]);
```

### **3. Background Sync**
```typescript
// Periodically refresh user-level premium in background
setInterval(() => {
  queryClient.invalidateQueries(['user-level-premium']);
}, 15 * 60 * 1000); // Every 15 minutes
```

## 📊 Metrics to Track

- **RPC call reduction** for enterprise users
- **Business switch latency** (should be near-instant for enterprise)
- **Premium detection accuracy** (no false positives/negatives)
- **Cache hit rate** for user-level premium
- **User satisfaction** with business switching speed

---

**Summary**: The hierarchical premium checking system provides optimal performance by checking user-level premium once on app launch and only performing business-level checks when necessary, while maintaining accurate premium status detection across all business profiles.
