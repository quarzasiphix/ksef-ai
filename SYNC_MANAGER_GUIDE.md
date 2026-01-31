# SYNC MANAGER GUIDE - Caching System Rules

## ⚡ SYNC MANAGER - CACHING SYSTEM (MANDATORY)

**ALWAYS use SyncManager for data fetching - NEVER fetch directly in components**

### Core Principle
- **Load once, cache everywhere**: Data fetched on login, cached in React Query
- **Silent updates**: SyncManager checks for changes every 60 seconds
- **No loading states**: Cached data shows instantly, no spinners between pages

### How It Works
1. **Login**: `useGlobalData()` fetches all data (invoices, contracts, decisions, etc.)
2. **Cache**: React Query stores data with 10-minute stale time
3. **Background Sync**: `syncManager` checks server for updates every 60 seconds
4. **Auto-refresh**: If data changed, queries are invalidated and refetched silently
5. **Instant UI**: Components read from cache, no loading spinners

### REQUIRED PATTERNS

#### ✅ CORRECT: Use useGlobalData Hook
```typescript
// In any component that needs data
const { invoices, isLoading, refreshAllData } = useGlobalData();

// Data is instantly available from cache
// No loading spinners between pages
// Updates happen automatically in background
```

#### ❌ WRONG: Direct API calls in components
```typescript
// NEVER do this - bypasses caching
const [invoices, setInvoices] = useState([]);
useEffect(() => {
  fetchInvoices().then(setInvoices); // Causes loading spinners
}, []);
```

#### ✅ CORRECT: Query Keys for Cache Invalidation
```typescript
// When adding new data types, add to syncManager.ts
if (data.hasUpdates.newEntityType) {
  queryClient.invalidateQueries({ queryKey: ['new-entity', businessProfileId] });
}
```

#### ❌ WRONG: Bypassing SyncManager
```typescript
// NEVER call queryClient.invalidateQueries directly
// Let syncManager handle all cache invalidation
```

### Adding New Features

#### 1. Add to useGlobalData Hook
```typescript
// In use-global-data.tsx
const newFeatureQuery = useQuery({
  queryKey: ['new-feature', user?.id, selectedProfileId],
  queryFn: () => getNewFeature(user.id, selectedProfileId),
  enabled: !!user?.id && !!selectedProfileId,
  placeholderData: (previousData) => previousData,
});
```

#### 2. Add to SyncManager
```typescript
// In syncManager.ts
interface SyncCheckResponse {
  hasUpdates: {
    // Add your new entity
    newFeature: boolean;
  };
  latestTimestamps: {
    newFeature: string | null;
  };
  counts: {
    newFeature: number;
  };
}

// In checkForUpdates method
if (data.hasUpdates.newFeature) {
  invalidations.push(queryClient.invalidateQueries({ 
    queryKey: ['new-feature', businessProfileId] 
  }));
}
```

#### 3. Use in Components
```typescript
// Instant data from cache, no loading
const { newFeatureData } = useGlobalData();
```

### Troubleshooting Infinite Loading

**Cause**: Component not using useGlobalData or wrong query keys
**Fix**: Ensure component uses cached data and syncManager can invalidate queries

#### ✅ CORRECT Component Pattern
```typescript
export const MyComponent = () => {
  const { invoices, customers } = useGlobalData(); // Uses cache
  
  // Data available instantly, no loading states
  return (
    <div>
      {invoices.map(invoice => ...)}
    </div>
  );
};
```

#### ❌ WRONG Component Pattern
```typescript
export const MyComponent = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true); // Causes loading
  
  useEffect(() => {
    fetchInvoices().then(data => {
      setInvoices(data);
      setLoading(false);
    });
  }, []); // Runs every time, causes infinite loading
};
```

### Performance Rules

1. **NEVER** fetch data directly in components
2. **ALWAYS** use useGlobalData for cached data
3. **ALWAYS** add new entities to syncManager
4. **NEVER** call invalidateQueries directly
5. **ALWAYS** use proper query keys: `['entity', userId, profileId]`

### Cache Invalidation Triggers

SyncManager automatically invalidates cache when:
- New invoices/contracts/decisions are created
- Existing data is modified
- 60-second background check detects changes

**Result**: Users see data instantly, updates happen silently

### Current SyncManager Entities

The syncManager already handles these entities:
- invoices
- contracts
- decisions
- ledger
- discussions
- employees
- bankAccounts
- operationsJobs
- operationsDrivers
- operationsVehicles
- cashRegister
- auditTrail

When adding new features, ALWAYS add them to both useGlobalData and syncManager to maintain performance.
