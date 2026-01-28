# Premium System Debugging Guide

## 🚨 Current Issue
Business premium is not being detected even though the business has premium. The system isn't making API calls for business premium checks.

## 🔍 Debugging Steps

### **Step 1: Navigate to Investigation Tool**
Go to: `/admin/database-investigation`

This tool will show you:
- User-level premium status
- Business-level premium status  
- All premium entries in the database
- Enhanced subscriptions
- Enterprise benefits
- Business profiles

### **Step 2: Check Console Logs**
Open browser console and look for these log messages:

```
[PremiumContext] Checking user-level premium for: [user-id]
[PremiumContext] User-level premium status: [true/false], level: [enterprise/user/free]
[PremiumContext] Business profile changed to: [business-id] - refetching premium
[PremiumContext] Checking business-level premium for user: [user-id], business: [business-id]
[RpcPremiumService] Checking premium via RPC for user [user-id], business [business-id]
[check-premium-access] Checking premium for user: [user-id], business: [business-id]
```

**What to look for:**
- Are you seeing the "Checking business-level premium" logs?
- Is the RPC function being called?
- What does the RPC function return?

### **Step 3: Check Query Status**
Go to: `/admin/business-premium-debug`

Look at the "Query Debug Info" section:
- Is the business premium query enabled?
- What's the query key?
- Is it loading or has data?

### **Step 4: Force Business Premium Check**
If the system isn't checking business premium, temporarily modify the PremiumContext:

```typescript
// In src/modules/premium/context/PremiumContext.tsx
// Change this line:
enabled: !!user && !!selectedProfileId && !hasUserLevelPremium,

// To this (temporarily for debugging):
enabled: !!user && !!selectedProfileId, // Always check business premium
```

### **Step 5: Test RPC Function Directly**
Use the investigation tool to see what the database actually contains:

1. **Check premium_status view** - This is what the RPC function queries
2. **Check enhanced_subscriptions** - This is the source data
3. **Check business_profiles** - Verify the business exists

## 📊 Expected Database Structure

### **premium_status View**
```sql
SELECT 
  user_id,
  business_profile_id,
  has_premium,  -- 'true'/'false'
  effective_tier,  -- 'enterprise', 'premium', 'free'
  user_tier,  -- 'admin', 'manual_client', null
  business_tier,  -- 'premium', null
  premium_source,  -- 'enterprise_subscription', 'business_subscription', 'user_subscription'
  user_period_end,
  business_period_end
FROM premium_status
WHERE user_id = 'your-user-id'
```

### **enhanced_subscriptions Table**
```sql
SELECT *
FROM enhanced_subscriptions
WHERE user_id = 'your-user-id'
```

Should show:
- `subscription_type_id` (references subscription_types)
- `business_profile_id` (for business subscriptions)
- `is_active` (true/false)
- `period_start`, `period_end`

### **subscription_types Table**
```sql
SELECT *
FROM subscription_types
```

Should show available subscription types like:
- `enterprise`
- `premium` (business-level)
- `admin`
- `manual_client`

## 🐛 Common Issues

### **Issue 1: Business Premium Not Detected**
**Symptoms:**
- Business has premium subscription but shows as free
- No business premium API calls

**Causes:**
1. `hasUserLevelPremium` is true, so business checks are disabled
2. Business subscription exists but `is_active` is false
3. `premium_status` view not returning correct data
4. RPC function not deployed

**Solutions:**
1. Check if user has enterprise/admin premium that's overriding business checks
2. Verify business subscription is active
3. Check `premium_status` view data
4. Deploy RPC function: `supabase functions deploy check-premium-access`

### **Issue 2: RPC Function Not Working**
**Symptoms:**
- Console shows RPC errors
- Investigation tool shows RPC failures

**Solutions:**
1. Deploy the RPC function
2. Check Supabase Edge Function logs
3. Verify function permissions

### **Issue 3: Database View Issues**
**Symptoms:**
- `premium_status` view returns no data
- Investigation shows null values

**Solutions:**
1. Check if `premium_status` view exists
2. Verify view query logic
3. Check source tables have data

## 🔧 Temporary Debugging Overrides

### **Force Business Premium Checking**
```typescript
// In PremiumContext.tsx
// Temporarily disable user-level premium optimization
const hasUserLevelPremium = false; // Force business checks
```

### **Enable All Logging**
```typescript
// In rpcPremiumService.ts
console.log('[RpcPremiumService] Full request:', { userId, businessProfileId });
console.log('[RpcPremiumService] Full response:', data);
```

### **Check Query Cache**
```typescript
// In BusinessPremiumDebug.tsx
// Add this to see what's cached
const queryCache = queryClient.getQueryCache();
console.log('All queries:', queryCache.getAll());
```

## 📋 Debugging Checklist

- [ ] Navigate to `/admin/database-investigation`
- [ ] Run investigation and review results
- [ ] Check console for premium context logs
- [ ] Verify business premium API calls are being made
- [ ] Check if RPC function is deployed
- [ ] Verify database has correct premium data
- [ ] Test with temporary overrides if needed
- [ ] Check query cache state

## 🚀 Quick Fix Commands

### **Deploy RPC Function**
```bash
cd ksef-ai
supabase functions deploy check-premium-access
```

### **Check Function Status**
```bash
supabase functions list
```

### **View Function Logs**
```bash
supabase functions logs check-premium-access
```

## 📞 If Issues Persist

1. **Share investigation results** from `/admin/database-investigation`
2. **Share console logs** showing the premium checking flow
3. **Share database schema** if `premium_status` view doesn't exist
4. **Check if business subscription exists** in enhanced_subscriptions table

The investigation tool should reveal exactly what's in the database and why the premium detection isn't working.
