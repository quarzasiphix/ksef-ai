# Event Components Documentation

This folder contains UI components that visualize and audit the event-first architecture of the platform.

## EventChainViewer

`EventChainViewer.tsx` renders a chronological feed of accounting/governance events for a business profile or a specific entity.

### Data Source
- `getEvents` (from `modules/accounting/data/unifiedEventsRepository`) queries the unified `public.events` table.
- Query key: `['unified-events', businessProfileId, filterType, entityType, entityId]` for cache segmentation.

### Props
| Prop | Type | Description |
|------|------|-------------|
| `businessProfileId` | `string` | **Required.** Filters events to a business profile (RLS enforced). |
| `limit` | `number` | Max events fetched (default `50`). |
| `showFilters` | `boolean` | Toggles filter/export actions (default `true`). |
| `entityType` | `string?` | Filters to entity class (e.g. `invoice`, `contract`). |
| `entityId` | `string?` | Filters to a single entity instance. |

### Rendering Flow
1. Fetch events via React Query and `getEvents` RPC.
2. Display loading state until data arrives.
3. Render timeline cards sorted newest → oldest.
4. Show badges using `EVENT_TYPE_LABELS` and `EVENT_TYPE_COLORS`.
5. Provide quick navigation to related entities (invoices, contracts, decisions, etc.).
6. Surface decision references, actor info, timestamps, and structured change logs.

### Usage Patterns
- **Entity timelines:** embed in invoice/contract detail pages by passing `entityType` + `entityId`.
- **Global audit view:** use with only `businessProfileId` to display full ledger of events.
- **Filtered views:** extend `showFilters` to expose custom filters (status, decision, etc.).

### Extending the Component
- Add more entity route mappings in `handleEntityClick` as new modules grow.
- Pass custom `limit` when embedding in small cards (e.g. dashboard widgets).
- Wrap in suspense boundaries for smoother lazy loading.
- Combine with `EventChainViewer` + `verify_event_integrity` RPC to expose hash verification badges.

## Event System Primer
- Events live in `public.events` (see `supabase/migrations/20251229_unified_events_system.sql` and `20260103_accounting_events_triple_entry.sql`).
- Every financial movement creates/links to an accounting event (ledger + audit + attestation).
- UI surfaces:
  - `/accounting/event-log` (Accounting shell)
  - `/settings/event-log` (Settings shell)
  - Embedded viewers via `EventChainViewer`.
- Each event carries:
  - Economic data (amount, currency, direction)
  - Authorization (decision_id)
  - Legal linkage (documents, contracts)
  - Integrity metadata (hashes, verification status)

For deeper architecture context, read `docs/architecture/accounting-events-triple-entry.md` and `docs/architecture/entity-links-system.md`.
