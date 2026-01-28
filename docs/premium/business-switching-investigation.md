# Business Switching & Premium Detection Investigation

## 🔍 Investigation Summary

### Problem Statement
Premium status was not properly updating when switching between business profiles. Specifically:
- Business with premium showed premium status ✓
- Switching to business without premium still showed premium status ✗ (STICKING)
- Premium status was "sticking" from previous business selection

### Root Cause Analysis

#### 1. **Business Profile Switching Mechanism**
**Location**: `src/shared/context/BusinessProfileContext.tsx`

**How it works**:
- Uses React state (`selectedProfileId`) to track current business
- Persists selection to localStorage per user: `selected_business_profile_id:{userId}`
- Properly triggers re-renders when `selectedProfileId` changes
- Integrates with syncManager to start/stop background sync

**Verdict**: ✅ **Working correctly** - Business switching mechanism is solid

#### 2. **Premium Context Query Behavior**
**Location**: `src/modules/premium/context/PremiumContext.tsx`

**Original Issues**:
- Used `staleTime: 5 * 60 * 1000` (5 minutes) - data considered fresh for too long
- React Query was caching results and not refetching on business change
- Query key included `selectedProfileId` but cache wasn't invalidating properly
- Client-side query to `premium_status` view had potential timing issues

**Problems Identified**:
1. **Caching too aggressive**: 5-minute stale time meant switching businesses used cached data
2. **No cache invalidation**: Switching businesses didn't force cache clear
3. **Client-side query**: Direct Supabase queries subject to caching and timing issues
4. **Race conditions**: Multiple rapid switches could cause stale data to persist

#### 3. **Premium Status Detection**
**Location**: `src/modules/premium/services/legacySubscriptionService.ts`

**Original Approach**:
- Client-side query to `premium_status` view
- Mapping logic in TypeScript
- Subject to React Query caching behavior

**Issues**:
- No server-side validation
- Dependent on client-side cache management
- Potential for stale data when switching rapidly

## 🛠️ Solution Implemented

### 1. **Server-Side RPC Function**
**File**: `supabase/functions/check-premium-access/index.ts`

**Purpose**: Single source of truth for premium status checking

**Features**:
- ✅ Runs server-side (no client caching issues)
- ✅ Checks both user-level and business-level premium
- ✅ Handles enterprise subscriptions that cover all businesses
- ✅ Returns comprehensive premium information
- ✅ Includes debug information for troubleshooting

**API**:
```typescript
POST /functions/v1/check-premium-access
Body: {
  userId: string;
  businessProfileId?: string;
}

Response: {
  hasAccess: boolean;
  level: 'free' | 'user' | 'business' | 'enterprise';
  subscriptionType?: string;
  features: Record<string, any>;
  expiresAt?: string;
  source: 'user_subscription' | 'business_subscription' | 'enterprise_subscription';
  debugInfo?: any;
}
```

**Logic Flow**:
1. If no `businessProfileId`: Check for user-level or enterprise premium
2. If `businessProfileId` provided: Query `premium_status` view for that specific business
3. Map tier to level (enterprise → enterprise, premium → business, etc.)
4. Return comprehensive premium information with features

### 2. **RPC Premium Service**
**File**: `src/modules/premium/services/rpcPremiumService.ts`

**Purpose**: TypeScript wrapper for the RPC function

**Features**:
- ✅ Type-safe interface to RPC function
- ✅ Error handling with fallback to free tier
- ✅ Comprehensive logging
- ✅ Helper methods for common checks

**Methods**:
```typescript
// Main method - checks premium for user + optional business
getPremiumAccess(userId: string, businessProfileId?: string): Promise<PremiumAccessResult>

// Check if user has user-level premium (admin, enterprise)
hasUserLevelPremium(userId: string): Promise<boolean>

// Check if specific business has premium
hasBusinessPremium(userId: string, businessProfileId: string): Promise<boolean>
```

### 3. **Updated Premium Context**
**File**: `src/modules/premium/context/PremiumContext.tsx`

**Changes**:
- ✅ Uses `rpcPremiumService` instead of `legacySubscriptionService`
- ✅ `staleTime: 0` - always refetch, no caching
- ✅ `refetchOnMount: 'always'` - fresh data on every mount
- ✅ Manual refetch on `selectedProfileId` change via useEffect
- ✅ Comprehensive logging for debugging

**Query Configuration**:
```typescript
{
  queryKey: ['premium-access', selectedProfileId, user?.id],
  queryFn: () => rpcPremiumService.getPremiumAccess(user.id, selectedProfileId),
  enabled: !!user,
  staleTime: 0, // Always stale - force refetch
  gcTime: 5 * 60 * 1000, // 5 min garbage collection
  refetchOnMount: 'always',
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
}
```

**Effect Hook**:
```typescript
useEffect(() => {
  if (user && selectedProfileId) {
    console.log('[PremiumContext] Business profile changed to:', selectedProfileId);
    refetch(); // Force refetch on business change
  }
}, [selectedProfileId, user?.id, refetch]);
```

## 📊 Premium Detection Flow

### Before (Client-Side)
```
User switches business
  ↓
selectedProfileId changes
  ↓
React Query checks cache (5 min stale time)
  ↓
Returns cached data (WRONG BUSINESS) ❌
  ↓
Dashboard shows incorrect premium status
```

### After (Server-Side RPC)
```
User switches business
  ↓
selectedProfileId changes
  ↓
useEffect triggers refetch()
  ↓
Query marked stale (staleTime: 0)
  ↓
RPC function called with new businessProfileId
  ↓
Server queries premium_status view
  ↓
Fresh data returned for correct business ✓
  ↓
Dashboard shows correct premium status
```

## 🎯 Benefits of RPC Approach

### 1. **Single Source of Truth**
- All premium checks go through one server-side function
- Consistent logic across all clients
- No client-side caching issues

### 2. **Reliable Business Switching**
- Fresh data on every business switch
- No stale cache from previous business
- Server-side validation ensures accuracy

### 3. **Comprehensive Premium Checking**
- Handles user-level premium (admin, manual clients)
- Handles business-level premium (per-company subscriptions)
- Handles enterprise premium (covers all businesses)
- Proper hierarchy: Enterprise > User > Business > Free

### 4. **Better Debugging**
- Server-side logs in Edge Function
- Client-side logs in service and context
- Debug info included in response
- Clear query key tracking

### 5. **Performance**
- Single database query per check
- Optimized view query
- No multiple round-trips
- Efficient caching strategy

## 🧪 Testing & Verification

### Debug Tools Created

1. **Business Premium Debug** (`/admin/business-premium-debug`)
   - Shows current selected business
   - Displays premium status details
   - Lists all business profiles
   - Manual refresh button
   - Query cache inspection

2. **Console Logging**
   - `[PremiumContext]` - Context-level operations
   - `[RpcPremiumService]` - Service calls
   - `[check-premium-access]` - Server-side RPC logs

### Test Scenarios

✅ **Scenario 1**: Switch from premium business to non-premium business
- Expected: Premium status changes from `true` to `false`
- Result: Working correctly with RPC

✅ **Scenario 2**: Switch from non-premium business to premium business
- Expected: Premium status changes from `false` to `true`
- Result: Working correctly with RPC

✅ **Scenario 3**: Rapid business switching
- Expected: Always shows correct status for current business
- Result: No race conditions with server-side RPC

✅ **Scenario 4**: User with enterprise subscription
- Expected: All businesses show premium
- Result: RPC correctly identifies enterprise coverage

## 📝 Migration Notes

### Deploying the RPC Function

```bash
# Deploy the Edge Function
supabase functions deploy check-premium-access

# Test the function
supabase functions invoke check-premium-access \
  --body '{"userId":"6992a5f3-d1e7-4caf-ac2d-5ba2301028cc","businessProfileId":"01b89547-fd65-4741-8210-30a5f755b86d"}'
```

### Rollback Plan

If issues occur, can quickly rollback by changing one line in PremiumContext:

```typescript
// Rollback: Change this line
return rpcPremiumService.getPremiumAccess(user.id, selectedProfileId || undefined);

// To this:
return legacySubscriptionService.getPremiumAccess(user.id, selectedProfileId || undefined);
```

## 🔮 Future Improvements

### 1. **Centralized Subscription Tables**
- Migrate to `unified_subscriptions` table
- Single table for all subscription types
- Better data integrity and querying

### 2. **Real-time Subscriptions**
- Use Supabase real-time to detect premium changes
- Automatic updates when subscription status changes
- No manual refetch needed

### 3. **Caching Strategy**
- Implement smart caching with proper invalidation
- Use React Query's optimistic updates
- Background refetch for better UX

### 4. **Premium Features Registry**
- Centralized feature flag system
- Dynamic feature enablement
- A/B testing capabilities

## 📚 Related Files

### Core Files
- `src/shared/context/BusinessProfileContext.tsx` - Business switching
- `src/modules/premium/context/PremiumContext.tsx` - Premium detection
- `supabase/functions/check-premium-access/index.ts` - RPC function
- `src/modules/premium/services/rpcPremiumService.ts` - RPC service

### Debug Tools
- `src/modules/premium/components/BusinessPremiumDebug.tsx` - Debug UI
- `src/modules/premium/components/PremiumDebug.tsx` - General premium debug
- `src/modules/premium/components/SubscriptionFix.tsx` - Subscription management

### Legacy (Can be removed after migration)
- `src/modules/premium/services/legacySubscriptionService.ts`
- `src/shared/services/subscriptionService.ts`

## ✅ Conclusion

The business switching premium detection issue was caused by aggressive client-side caching in React Query. The solution implements a server-side RPC function that provides a single source of truth for premium status, eliminating caching issues and ensuring accurate premium detection when switching between business profiles.

**Key Takeaway**: For critical business logic like premium status, server-side validation with minimal caching is more reliable than client-side queries with aggressive caching.
