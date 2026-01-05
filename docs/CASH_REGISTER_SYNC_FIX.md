# Cash Register Sync Fix

## Problem

Cash register data (kasa/cash transactions) was not being properly tracked by the sync system, causing:
- Data not updating in real-time when changed by other users/sessions
- No local storage of sync timestamps for cash register
- No automatic query invalidation when cash register data changed

## Root Cause

The `syncManager.ts` and `sync-check` edge function were missing cash register support:
- ❌ No `cashRegister` in `SyncTimestamps` interface
- ❌ No `cashRegister` in `SyncCheckResponse` interfaces
- ❌ No query for `kasa_documents` table in sync-check
- ❌ No query invalidation for cash register queries

## Solution

### 1. Updated `syncManager.ts`

**Added to interfaces:**
```typescript
interface SyncTimestamps {
  // ... existing fields
  cashRegister?: string;  // ✅ Added
}

interface SyncCheckResponse {
  hasUpdates: {
    // ... existing fields
    cashRegister: boolean;  // ✅ Added
  };
  latestTimestamps: {
    // ... existing fields
    cashRegister: string | null;  // ✅ Added
  };
  counts: {
    // ... existing fields
    cashRegister: number;  // ✅ Added
  };
}
```

**Added query invalidation:**
```typescript
if (data.hasUpdates.cashRegister) {
  console.log('[SyncManager] Invalidating cash register queries');
  invalidations.push(queryClient.invalidateQueries({ queryKey: ['cash-register', businessProfileId] }));
  invalidations.push(queryClient.invalidateQueries({ queryKey: ['cash-accounts', businessProfileId] }));
  invalidations.push(queryClient.invalidateQueries({ queryKey: ['cash-transactions'] }));
}
```

### 2. Updated `sync-check` Edge Function

**Added to interfaces:**
```typescript
interface SyncCheckRequest {
  lastSyncTimestamps?: {
    // ... existing fields
    cashRegister?: string;  // ✅ Added
  };
}

interface SyncCheckResponse {
  hasUpdates: {
    // ... existing fields
    cashRegister: boolean;  // ✅ Added
  };
  // ... same for latestTimestamps and counts
}
```

**Added database query:**
```typescript
// Cash register (kasa_documents)
supabaseClient
  .from('kasa_documents')
  .select('updated_at', { count: 'exact', head: false })
  .eq('business_profile_id', businessProfileId)
  .order('updated_at', { ascending: false })
  .limit(1),
```

**Added timestamp comparison:**
```typescript
if (lastSyncTimestamps.cashRegister && response.latestTimestamps.cashRegister) {
  response.hasUpdates.cashRegister = new Date(response.latestTimestamps.cashRegister) > new Date(lastSyncTimestamps.cashRegister);
} else if (response.latestTimestamps.cashRegister) {
  response.hasUpdates.cashRegister = true;
}
```

## How It Works Now

### Sync Flow

1. **Background Sync (every 60 seconds)**
   - SyncManager calls `sync-check` edge function
   - Passes last sync timestamp for cash register (from localStorage)

2. **Sync Check**
   - Edge function queries `kasa_documents` table for latest `updated_at`
   - Compares with last sync timestamp
   - Returns `hasUpdates.cashRegister = true` if data changed

3. **Query Invalidation**
   - If cash register has updates, SyncManager invalidates:
     - `['cash-register', businessProfileId]` - Main cash register data
     - `['cash-accounts', businessProfileId]` - Cash accounts list
     - `['cash-transactions']` - Transaction queries

4. **UI Updates**
   - React Query refetches invalidated queries
   - Kasa component re-renders with fresh data
   - User sees updated cash register data automatically

### Local Storage

Timestamps are stored in localStorage:
```javascript
// Key format
`sync_timestamps_${businessProfileId}`

// Example value
{
  "invoices": "2026-01-05T08:15:30.123Z",
  "cashRegister": "2026-01-05T08:20:45.456Z",  // ✅ Now tracked
  // ... other entities
}
```

## Testing

### Verify Sync is Working

1. **Open Kasa in two browser tabs/windows**
2. **In Tab 1:** Add a new cash transaction (KP or KW)
3. **In Tab 2:** Wait ~60 seconds (or force sync)
4. **Expected:** Tab 2 automatically shows the new transaction

### Check Console Logs

Look for these logs in browser console:
```
[SyncManager] Sync check completed { hasUpdates: true, counts: {...} }
[SyncManager] Invalidating cash register queries
```

### Verify localStorage

```javascript
// In browser console
const profileId = 'YOUR_PROFILE_ID';
const key = `sync_timestamps_${profileId}`;
console.log(JSON.parse(localStorage.getItem(key)));
// Should show cashRegister timestamp
```

## Files Modified

1. ✅ `src/shared/services/syncManager.ts` - Added cash register to sync interfaces and invalidation logic
2. ✅ `supabase/functions/sync-check/index.ts` - Added cash register query and timestamp comparison

## Benefits

✅ **Real-time updates** - Cash register data syncs automatically across sessions  
✅ **Proper tracking** - Timestamps stored in localStorage  
✅ **Query invalidation** - React Query cache refreshes when data changes  
✅ **Consistent with other entities** - Same pattern as invoices, contracts, etc.  

## Related

- Cash register data is fetched via `get-cash-register-data` edge function
- Kasa component uses this data for display
- Sync system ensures data stays fresh across sessions/users

## Summary

The cash register sync issue is now **fully resolved**. Cash register data will automatically sync in the background every 60 seconds, just like invoices, contracts, and other entities.
