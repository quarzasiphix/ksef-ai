# Week 2 KEYSTONE Implementation

## Objective
Make accounting **functionally usable for month-end**, not just "nice UI."

## What We Built

### 1. Backend: Posting Readiness View
**File:** `supabase/migrations/20260104_posting_readiness_and_close.sql`

**Purpose:** Single source of truth for gating logic used by:
- Event Detail Drawer (button enabling/disabling)
- Posting tab filters
- Month-end blocker lists

**Key Fields:**
```sql
CREATE VIEW events_posting_readiness AS
SELECT
  -- Event basics
  event_id, event_type, amount, currency, status,
  
  -- Posting status
  debit_account, credit_account, posted,
  
  -- Closure status
  is_closed, closed_at, closed_by,
  
  -- Verification status
  verified, verified_at, verified_by,
  
  -- Proof indicators
  event_hash, bank_transaction_id, ksef_reference_number, decision_id,
  
  -- Gating logic (computed)
  missing_accounts BOOLEAN,
  missing_required_links BOOLEAN,
  missing_required_proof BOOLEAN,
  can_close BOOLEAN,
  can_verify BOOLEAN,
  blocker_reasons TEXT[]
```

**Why This Matters:**
- No logic duplication in React
- Consistent gating everywhere
- Easy to extend with policies later

### 2. Backend: Close Event RPC
**Function:** `close_accounting_event(event_id, actor_id, actor_name, bypass_reason)`

**Enforcement:**
1. ✅ Policy-required links (entity, operation)
2. ✅ Policy-required proof (bank tx, KSeF for >15k)
3. ✅ Period not locked (unless bypass with reason)
4. ✅ Accounts assigned (Wn/Ma not null)
5. ✅ Generates `event_hash` from payload snapshot
6. ✅ Sets `posted`, `is_closed`, `closed_at`, `closed_by`
7. ✅ Records bypass reason if forced

**Returns:**
```json
{
  "success": true,
  "event_hash": "a3f2...9d1c",
  "closed_at": "2026-01-04T10:30:00Z",
  "period": { "year": 2026, "month": 1 }
}
```

**Or if blocked:**
```json
{
  "success": false,
  "error": "Event not ready to close",
  "blockers": ["missing_debit_account", "missing_ksef_proof"]
}
```

### 3. Backend: Verify Event RPC
**Function:** `verify_event_integrity(event_id, actor_id, actor_name, verification_method)`

**Process:**
1. Get stored `event_hash` and `payload_snapshot`
2. Recompute hash from snapshot
3. Compare: `stored_hash === computed_hash`
4. If match: mark as verified
5. If mismatch: return error (possible tampering)

**Returns:**
```json
{
  "success": true,
  "verified": true,
  "event_hash": "a3f2...9d1c",
  "verified_at": "2026-01-04T10:35:00Z",
  "verification_method": "manual"
}
```

### 4. Backend: Get Event Detail for Drawer
**Function:** `get_event_detail_for_drawer(event_id)`

**Returns comprehensive event detail:**
```json
{
  "event": { /* full event record */ },
  "readiness": { /* from events_posting_readiness view */ },
  "linked_entity": { "type": "invoice", "number": "FV/001/2026", ... },
  "linked_operation": { "type": "operation", "job_number": "TR/001/26", ... },
  "linked_decision": { "type": "decision", "decision_number": "DEC/001/26", ... }
}
```

### 5. Frontend: Event Detail Drawer
**File:** `src/modules/events/components/EventDetailDrawer.tsx`

**5 Non-Negotiable Sections:**

#### Section 1: Context
- Type, status, period, actor, department
- Occurred date, amount, currency
- Badge: Closed vs Open

#### Section 2: Chain (Links)
- Linked entity (invoice/expense)
- Linked operation/job
- Linked decision
- "Powiąż z..." button
- Badge: Complete vs Missing Required

#### Section 3: Accounting (Wn/Ma)
- Debit account (Wn)
- Credit account (Ma)
- Posting amount
- "Auto-przypisz Wn/Ma" button (Week 3)
- Badge: Posted vs Missing Accounts

#### Section 4: Proof
- Event hash (✓ or ✗)
- Bank transaction (✓ or ✗)
- KSeF reference (✓ or ✗)
- Decision (✓ or ✗)
- "Dodaj dowód" button
- Badge: Verified vs Missing Required

#### Section 5: Actions (Footer)
- **Zamknij** button (hard gated by `can_close`)
- **Zweryfikuj** button (hard gated by `can_verify`)
- Disabled states show tooltip with reason

**Hard Gating Logic:**
```typescript
// Close button disabled if:
- already closed
- period locked (without bypass)
- missing Wn or Ma
- missing required links
- missing required proof

// Verify button disabled if:
- already verified
- not closed yet
- no event_hash to verify
```

**Blocker Display:**
If `blocker_reasons.length > 0`, show red alert box:
```
⚠ Blokery zamknięcia
• Brak konta Wn (debet)
• Brak referencji KSeF (wymagane dla kwot >15k)
```

### 6. Frontend: Drawer State Management
**File:** `src/modules/events/hooks/useEventDrawer.ts`

**Zustand store:**
```typescript
interface EventDrawerStore {
  eventId: string | null;
  isOpen: boolean;
  openDrawer: (eventId: string) => void;
  closeDrawer: () => void;
}
```

**Usage:**
```typescript
const { openDrawer } = useEventDrawer();

// In any event card/row component:
<EventCard onClick={() => openDrawer(event.id)} />
```

## Next Steps (To Complete Week 2)

### 1. Wire Drawer to Existing Components
Update these files to open drawer on click:

- `src/components/events/EventChainViewer.tsx`
  - Import `useEventDrawer`
  - Add `onClick={() => openDrawer(event.id)}` to event cards

- `src/modules/accounting/components/LedgerEventRow.tsx`
  - Import `useEventDrawer`
  - Add `onClick={() => openDrawer(event.id)}` to row

- `src/modules/accounting/components/timeline/LedgerEventCard.tsx`
  - Import `useEventDrawer`
  - Add `onClick={() => openDrawer(event.id)}` to card

- `src/modules/events/screens/EventsPosting.tsx`
  - Import `useEventDrawer`
  - Add `onClick={() => openDrawer(event.id)}` to table rows

- `src/modules/events/screens/EventsReconciliation.tsx`
  - Import `useEventDrawer`
  - Add `onClick={() => openDrawer(event.id)}` to table rows

### 2. Add Drawer to Layout
Update `src/modules/events/components/EventsShell.tsx`:
```typescript
import { EventDetailDrawer } from './EventDetailDrawer';
import { useEventDrawer } from '../hooks/useEventDrawer';

export function EventsShell() {
  const { eventId, isOpen, closeDrawer } = useEventDrawer();
  
  return (
    <>
      {/* Existing layout */}
      <EventDetailDrawer 
        eventId={eventId} 
        isOpen={isOpen} 
        onClose={closeDrawer} 
      />
    </>
  );
}
```

### 3. Run Migration
```bash
# Apply the posting readiness migration
supabase db push

# Or if using migration files:
psql -d your_db -f supabase/migrations/20260104_posting_readiness_and_close.sql
```

### 4. Test End-to-End Flow
1. Open any event from Timeline/Posting/Reconciliation
2. Drawer opens with 5 sections
3. Check gating:
   - If missing Wn/Ma → "Zamknij" disabled with tooltip
   - If missing proof → blocker shown
4. Assign Wn/Ma (manually for now, auto in Week 3)
5. Click "Zamknij" → event closes, hash generated
6. Click "Zweryfikuj" → hash verified

## What This Enables

### Immediate Capabilities
✅ **Any event can be completed end-to-end from drawer**
✅ **Hard gating prevents invalid closures**
✅ **Blocker reasons are precise and actionable**
✅ **Verification ensures integrity**

### Month-End Readiness
With just this Week 2 implementation:
- Events can be properly closed with proof
- Posting readiness is visible at a glance
- Blockers are surfaced early
- Verification creates audit trail

### What's Still Missing (Week 3+)
- Auto-assign Wn/Ma (posting templates)
- Chart of Accounts
- Trial balance report
- Period close UI with candidate proposal
- Bank reconciliation workflow

## Architecture Alignment

### Guardrails Enforced
✅ **Drawer-First Discipline:** All mutations through drawer
✅ **No Bypass Routes:** Only RPCs can close/verify
✅ **Event-First:** Closure creates audit event
✅ **Deterministic Hashing:** Payload snapshot → SHA256

### NOT Yet Implemented (Week 5)
- Commit-bound events (`included_in_commit_id`)
- Period commit candidates
- Canonical commit enforcement
- Fork retention

## Success Criteria

Week 2 is complete when:
1. ✅ Drawer opens from all event visualization components
2. ✅ Close button is hard-gated by readiness
3. ✅ Verify button works and checks hash
4. ✅ Blocker reasons are displayed clearly
5. ✅ No shortcuts exist (no quick close buttons)

**After Week 2, accounting becomes "doable" even without auto-posting.**
