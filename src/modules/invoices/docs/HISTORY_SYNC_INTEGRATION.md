# Invoice History System - Sync & Cache Integration

## Overview

The invoice history/audit trail system is fully integrated with the app's sync and caching system to ensure efficiency and real-time updates. This document explains how the integration works.

## Sync System Integration

### 1. Edge Function Updates

**File**: `supabase/functions/sync-check/index.ts`

Added audit trail support to the sync-check edge function:

```typescript
// Added to interfaces
auditTrail?: string;  // in SyncCheckRequest
auditTrail: boolean;  // in SyncCheckResponse.hasUpdates
auditTrail: string | null;  // in SyncCheckResponse.latestTimestamps
auditTrail: number;  // in SyncCheckResponse.counts

// Added to database checks
// Audit trail (invoice_versions)
supabaseClient
  .from('invoice_versions')
  .select('changed_at', { count: 'exact', head: false })
  .eq('business_profile_id', businessProfileId)
  .order('changed_at', { ascending: false })
  .limit(1),

// Added timestamp comparison
if (lastSyncTimestamps.auditTrail && response.latestTimestamps.auditTrail) {
  response.hasUpdates.auditTrail = new Date(response.latestTimestamps.auditTrail) > new Date(lastSyncTimestamps.auditTrail);
} else if (response.latestTimestamps.auditTrail) {
  response.hasUpdates.auditTrail = true;
}
```

### 2. SyncManager Updates

**File**: `src/shared/services/syncManager.ts`

Added audit trail invalidation logic:

```typescript
// Added to interfaces
auditTrail?: string;  // in SyncTimestamps
auditTrail: boolean;  // in SyncCheckResponse.hasUpdates
auditTrail: string | null;  // in SyncCheckResponse.latestTimestamps
auditTrail: number;  // in SyncCheckResponse.counts

// Added invalidation logic
if (data.hasUpdates.auditTrail) {
  console.log('[SyncManager] Invalidating audit trail queries');
  invalidations.push(queryClient.invalidateQueries({ queryKey: ['invoice-audit-trail', businessProfileId] }));
}
```

## React Query Integration

### Query Key Structure

The audit trail uses a hierarchical query key structure that aligns with the sync system:

```typescript
queryKey: ['invoice-audit-trail', businessProfileId, invoiceId]
```

This ensures:
- **Business Profile Isolation**: Queries are scoped to business profiles
- **Sync Compatibility**: SyncManager can invalidate all audit trail queries for a profile
- **Granular Caching**: Individual invoice audit trails are cached separately

### Cache Configuration

```typescript
const { data: auditTrail, isLoading, error } = useQuery<InvoiceAuditTrail>({
  queryKey: ['invoice-audit-trail', businessProfileId, invoiceId],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('rpc_get_invoice_audit_trail', {
      p_invoice_id: invoiceId,
    });
    if (error) throw error;
    return data;
  },
  enabled: open && !!invoiceId && !!businessProfileId,
  staleTime: 1000 * 60 * 5, // 5 minutes - cache but refresh periodically
});
```

**Key Features**:
- **Conditional Fetching**: Only fetches when dialog is open and IDs are available
- **5-minute Cache**: Balances freshness with performance
- **Business Profile Scoping**: Ensures data isolation

## Sync Workflow

### 1. Background Sync (Every 60 seconds)

The syncManager automatically checks for audit trail updates:

```typescript
// Edge function checks for new invoice_versions
SELECT changed_at FROM invoice_versions 
WHERE business_profile_id = ? 
ORDER BY changed_at DESC 
LIMIT 1
```

### 2. Update Detection

When new invoice versions are detected:
```typescript
if (data.hasUpdates.auditTrail) {
  // Invalidate all audit trail queries for this business profile
  queryClient.invalidateQueries({ queryKey: ['invoice-audit-trail', businessProfileId] });
}
```

### 3. Cache Invalidation

Invalidation affects:
- All open audit trail dialogs for the business profile
- Any components using audit trail data
- Future queries will fetch fresh data

## Performance Benefits

### 1. Efficient Caching

- **Shared Cache**: Multiple users viewing same invoice share cached data
- **Profile Isolation**: Different business profiles have separate caches
- **Selective Invalidation**: Only affected profiles are invalidated

### 2. Background Updates

- **Real-time Sync**: New audit trail entries appear automatically
- **No Manual Refresh**: Users don't need to manually reload
- **Efficient Polling**: 60-second intervals balance freshness with performance

### 3. Smart Fetching

- **On-Demand Loading**: Audit trail only fetched when dialog opens
- **Conditional Queries**: Disabled when IDs are missing
- **Automatic Retry**: Failed queries retry automatically

## Data Flow

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Action   │    │   SyncManager    │    │  Edge Function  │
│ (Open Dialog)   │───▶│ (Background     │───▶│ (sync-check)    │
│                 │    │  Sync Check)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ React Query     │◀───│ Query            │◀───│ Database Check  │
│ (Cache Hit?)    │    │ Invalidation     │    │ (invoice_versions│
│                 │    │                 │    │  .changed_at)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────┐
│ RPC Function    │    │ Cache Refresh   │
│ (rpc_get_invoice│    │ (New Data)       │
│ _audit_trail)    │    │                 │
└─────────────────┘    └──────────────────┘
```

## Testing the Integration

### 1. Manual Testing

1. **Open Audit Trail Dialog**
   - Open invoice detail page
   - Click kebab menu → "Historia / Audit trail"
   - Verify data loads correctly

2. **Test Sync Updates**
   - Have another user modify the invoice (create new version)
   - Wait up to 60 seconds for sync
   - Reopen dialog - should show new version

3. **Test Cache Invalidation**
   - Open audit trail for invoice A
   - Open audit trail for invoice B
   - Modify invoice A
   - Both dialogs should refresh when sync occurs

### 2. Network Tab Testing

Check for:
- `sync-check` calls every 60 seconds
- `rpc_get_invoice_audit_trail` calls when opening dialog
- Cache hits (no network calls) for repeated opens

### 3. Console Logs

Look for:
- `[SyncManager] Invalidating audit trail queries`
- `[SyncManager] Sync check completed` with auditTrail count

## Troubleshooting

### Common Issues

**1. Audit trail not updating**
- Check if syncManager is started for the business profile
- Verify edge function deployment
- Check browser console for sync errors

**2. Cache not invalidating**
- Verify query key structure matches sync invalidation
- Check business profile ID consistency
- Ensure syncManager has auditTrail in response

**3. Performance issues**
- Check if too many dialogs are open simultaneously
- Verify staleTime is appropriate (5 minutes)
- Monitor network requests for unnecessary calls

### Debug Queries

```sql
-- Check if audit trail data exists
SELECT business_profile_id, COUNT(*) 
FROM invoice_versions 
GROUP BY business_profile_id;

-- Check latest audit trail updates
SELECT business_profile_id, MAX(changed_at) 
FROM invoice_versions 
GROUP BY business_profile_id;

-- Verify sync timestamps
SELECT * FROM sync_timestamps_business_profile_id;
```

## Best Practices

### 1. Query Key Consistency

Always use the same query key pattern:
```typescript
['invoice-audit-trail', businessProfileId, invoiceId]
```

### 2. Error Handling

The system includes comprehensive error handling:
- Network failures fall back to cached data
- Auth errors are logged but don't crash
- RPC errors are caught and displayed to users

### 3. Performance Optimization

- **Lazy Loading**: Only fetch when dialog opens
- **Background Sync**: Updates happen automatically
- **Smart Caching**: Balance freshness with performance

## Future Enhancements

### 1. Real-time Updates (WebSocket)

Consider WebSocket for instant updates:
- Immediate notification of new audit trail entries
- No 60-second delay
- Reduced server load

### 2. Offline Support

Add offline capabilities:
- Service worker for caching
- Offline queue for updates
- Conflict resolution

### 3. Advanced Caching

Implement more sophisticated caching:
- LRU eviction for large datasets
- Prefetching related invoices
- Compressed data storage

## Conclusion

The invoice history system is fully integrated with the app's sync and caching architecture, providing:

✅ **Real-time Updates** - Background sync keeps data fresh
✅ **Efficient Caching** - Smart query keys and invalidation
✅ **Performance Optimization** - On-demand loading and 5-minute cache
✅ **Scalability** - Business profile isolation and selective updates
✅ **Reliability** - Comprehensive error handling and fallbacks

The integration ensures that audit trail data is always up-to-date while maintaining excellent performance and user experience.
