# Orphaned Events - Backwards Compatibility

## Overview

The backwards compatibility system handles events without `chain_id` (legacy data) gracefully, turning a potential bug into a guided workflow. Instead of breaking the UI, orphaned events are detected and users are provided with one-click repair options.

## Problem Statement

Some existing events may have:
- `events.chain_id IS NULL` (created before chain system)
- Objects without `primary_chain_id`

Without backwards compatibility, these orphaned events would:
- Break the Chain Viewer
- Not appear in timelines
- Cause confusion in the UI

## Solution: Guided Workflow

### UX: "Nieprzypisane do łańcucha" Banner

**Where:** Event Detail Drawer (top, above "Szczegóły zmian")

**When:** If `event.chain_id` is null

**What it shows:**
- Badge: "Nieprzypisane do łańcucha"
- Help text: "To zdarzenie jest starszego typu lub zostało utworzone bez łańcucha. Przypisz je, aby widzieć pełną historię."
- Three CTA buttons:
  1. **Przypisz automatycznie** (primary) - Auto-attach using deterministic algorithm
  2. **Wybierz łańcuch** (secondary) - Manual selection from search
  3. **Utwórz nowy łańcuch** (tertiary) - Create new chain for this event

## Auto-Attach Algorithm (Deterministic)

The `auto_attach_event` function uses a multi-strategy approach with confidence scoring:

### Strategy 1: Object Reference (Confidence: 1.0)
```sql
IF event.object_type IS NOT NULL AND event.object_id IS NOT NULL THEN
  SELECT chain_id FROM chains
  WHERE primary_object_type = event.object_type
    AND primary_object_id = event.object_id
```

This is the "home chain" model - highest confidence.

### Strategy 2: Entity Reference (Confidence: 0.9)
```sql
IF event.entity_type IS NOT NULL AND event.entity_id IS NOT NULL THEN
  SELECT chain_id FROM chains
  WHERE primary_object_type = event.entity_type
    AND primary_object_id = event.entity_id
```

Fallback to legacy fields.

### Strategy 3: Metadata Parsing (Confidence: 0.8)
```sql
-- Parse metadata for object IDs
invoice_id := metadata->>'invoice_id'
cash_entry_id := metadata->>'cash_entry_id'
bank_tx_id := metadata->>'bank_tx_id'

-- Find chain by metadata reference
```

Heuristic approach for events with embedded references.

### Strategy 4: Create New Chain (Confidence: 0.5)
```sql
-- If no chain found, create new one
chain_id := create_chain(
  business_profile_id,
  event.entity_type,
  event.entity_type,
  event.entity_id,
  'Zdarzenie ' || event.event_number
)
```

Last resort - ensures event is never truly orphaned.

## Manual Attach Workflow

### Choose Chain Modal

**Search Features:**
- Search by chain title, number, or type
- Relevance scoring based on:
  - Exact match on chain_number or title (1.0)
  - Same object type as event (0.8)
  - Same date as event (0.6)
  - Default (0.3)

**Top 5 Suggestions:**
- Most recent chains related to same counterparty
- Same invoice/document number
- Same day
- Sorted by relevance score

**Display:**
- Chain title and number
- Chain type and state
- Event count
- Last activity date
- "Polecane" badge for high relevance (≥0.8)

## Attach Rules

When attaching event to chain:

```typescript
// 1. Set chain_id
events.chain_id = selected_chain.id

// 2. Set causation_event_id (optional, for timeline ordering)
events.causation_event_id = last_event_in_chain.id

// 3. Add to chain_objects if has object_ref
IF event.object_type AND event.object_id THEN
  INSERT INTO chain_objects (
    chain_id,
    object_type,
    object_id,
    role = 'related'
  )
```

**Important:** Attaching never changes `review_status` - only timeline grouping.

## Database Functions

### `attach_event_to_chain(event_id, chain_id, causation_event_id?)`
Manually attach event to specific chain.

**Returns:**
```json
{
  "success": true,
  "event_id": "...",
  "chain_id": "...",
  "causation_event_id": "...",
  "method": "manual"
}
```

### `auto_attach_event(event_id)`
Automatically attach using deterministic algorithm.

**Returns:**
```json
{
  "success": true,
  "event_id": "...",
  "chain_id": "...",
  "method": "object_ref" | "entity_ref" | "metadata_invoice" | "new_chain",
  "confidence": 0.0-1.0,
  "created_new_chain": false
}
```

### `get_orphaned_events(business_profile_id, limit?)`
Get all orphaned events with suggested chains.

**Returns:**
```typescript
{
  event_id: string,
  event_type: string,
  action_summary: string,
  occurred_at: timestamp,
  suggested_chain_id?: string,
  suggested_chain_title?: string,
  confidence: number
}[]
```

### `search_chains_for_attach(business_profile_id, search_query?, event_id?, limit?)`
Search chains for manual attachment with relevance scoring.

### `bulk_auto_attach_orphaned_events(business_profile_id, limit?)`
Bulk auto-attach all orphaned events (for cleanup).

**Returns:**
```json
{
  "success": true,
  "processed": 150,
  "attached": 145,
  "failed": 5,
  "results": [...]
}
```

## Views

### `orphaned_events_summary`
Summary of orphaned events by business profile for monitoring.

```sql
SELECT 
  business_profile_id,
  orphaned_count,
  with_object_ref,    -- High confidence
  with_entity_ref,    -- Medium confidence
  without_ref,        -- Low confidence
  oldest_orphan,
  newest_orphan
FROM orphaned_events_summary
```

## UI Components

### `OrphanedEventBanner`
Banner component for Event Detail Drawer.

**Props:**
```typescript
{
  eventId: string,
  onAttached?: (result: AttachEventResult) => void,
  onChooseChain?: () => void,
  onCreateChain?: () => void
}
```

**Features:**
- Auto-attach with loading state
- Success message with confidence badge
- Error handling
- Three action buttons

### `ChooseChainModal`
Modal for manual chain selection.

**Props:**
```typescript
{
  eventId: string,
  businessProfileId: string,
  isOpen: boolean,
  onClose: () => void,
  onAttached?: (result: AttachEventResult) => void
}
```

**Features:**
- Real-time search
- Relevance-based sorting
- Chain details display
- Loading and error states

## Chain Viewer Integration (Optional)

### Orphan Events Filter

Add filter chip to Chain Viewer:
```
"Nieprzypisane (X)"
```

Clicking shows orphan events list with "Attach" actions.

**Benefits:**
- Helps accountants clean old data
- Visibility into data quality
- Bulk cleanup capability

## Preventing Future Orphans

### Enforcement (Optional)

Uncomment trigger in migration to enforce:
```sql
CREATE TRIGGER trigger_prevent_orphan_events
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_orphan_events();
```

**Rule:** All new events must have either:
- `chain_id`, OR
- `object_ref` (object_type + object_id) with `autoCreateChain=true`

Reject if neither provided (except system migrations/import tools).

This makes orphan events a migration-only problem.

## Implementation Checklist

- [x] Database functions created
- [x] TypeScript types defined
- [x] Repository functions implemented
- [x] OrphanedEventBanner component created
- [x] ChooseChainModal component created
- [ ] Integrate banner into EventDetailDrawer
- [ ] Add orphan filter to Chain Viewer (optional)
- [ ] Test auto-attach with various scenarios
- [ ] Test manual attach workflow
- [ ] Run bulk cleanup on production data

## Usage Examples

### Detect and Show Banner

```typescript
// In EventDetailDrawer
const isOrphaned = !event.chain_id;

{isOrphaned && (
  <OrphanedEventBanner
    eventId={event.id}
    onAttached={(result) => {
      // Refresh event data
      refetchEvent();
      toast.success('Zdarzenie przypisane do łańcucha');
    }}
    onChooseChain={() => setShowChooseChainModal(true)}
    onCreateChain={() => {
      // Create new chain workflow
    }}
  />
)}
```

### Auto-Attach Event

```typescript
import { autoAttachEvent } from '@/modules/events/data/orphanedEventsRepository';

const result = await autoAttachEvent(eventId);

if (result.success) {
  console.log(`Attached to chain ${result.chain_id}`);
  console.log(`Method: ${result.method}, Confidence: ${result.confidence}`);
  if (result.created_new_chain) {
    console.log('Created new chain');
  }
}
```

### Manual Chain Selection

```typescript
import { searchChainsForAttach, attachEventToChain } from '@/modules/events/data/orphanedEventsRepository';

// Search chains
const chains = await searchChainsForAttach({
  business_profile_id: profileId,
  search_query: 'F/004',
  event_id: eventId,
  limit: 10,
});

// Attach to selected chain
const result = await attachEventToChain({
  event_id: eventId,
  chain_id: selectedChainId,
});
```

### Bulk Cleanup

```typescript
import { bulkAutoAttachOrphanedEvents } from '@/modules/events/data/orphanedEventsRepository';

const result = await bulkAutoAttachOrphanedEvents(businessProfileId, 100);

console.log(`Processed: ${result.processed}`);
console.log(`Attached: ${result.attached}`);
console.log(`Failed: ${result.failed}`);
```

## Confidence Levels

| Confidence | Level | Color | Description |
|-----------|-------|-------|-------------|
| ≥ 0.9 | High | Green | Object/entity reference match |
| ≥ 0.7 | Medium | Yellow | Metadata parsing |
| < 0.7 | Low | Orange | Heuristic or new chain |

## Important Notes

1. **Review Status Preservation:** Attaching events to chains NEVER changes `review_status`. It only affects timeline grouping.

2. **No Silent Edits:** The backwards-compat attach does not bypass review logic. Acceptance remains tied to specific versions.

3. **Idempotent:** Running auto-attach multiple times on same event is safe - it checks if already attached.

4. **Audit Trail:** All attach operations are logged with method and confidence for transparency.

5. **Migration-Only Problem:** With enforcement enabled, orphaned events become a one-time migration issue, not an ongoing problem.

## Summary

The orphaned events compatibility system:

✅ **Prevents UI breakage** - Graceful degradation  
✅ **Guided workflow** - Clear user actions  
✅ **Deterministic algorithm** - Predictable results  
✅ **Confidence scoring** - Transparency  
✅ **Manual override** - User control  
✅ **Bulk cleanup** - Scalable  
✅ **Review preservation** - No workflow bypass  

This turns a backwards compatibility challenge into a smooth user experience.
