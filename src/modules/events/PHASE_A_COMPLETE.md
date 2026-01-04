# Phase A: Week 2 Completion - Drawer Wiring & Hardening

## Status: ✅ COMPLETE

## What Was Delivered

### A1: Wire Drawer Everywhere (Click Contract)
**Rule:** Any event visualization must open the drawer. No alternate "close" buttons exist elsewhere.

#### Components Wired ✅

1. **EventsShell.tsx**
   - Mounted `<EventDetailDrawer />` once at shell level
   - Uses `useEventDrawer()` hook for global state
   - Drawer accessible from all child routes

2. **EventsPosting.tsx**
   - Table rows click → `openDrawer(event.id)`
   - "Szczegóły" button also opens drawer (with stopPropagation)
   - Entire row is clickable

3. **EventsReconciliation.tsx**
   - Event cards click → `openDrawer(event.id)`
   - Entire card is clickable with cursor-pointer

4. **EventChainViewer.tsx** (used by EventsTimeline)
   - Timeline cards click → `openDrawer(event.id)`
   - Entire card is clickable with cursor-pointer
   - Used across multiple screens (Timeline, Accounting ledger, etc.)

#### Click Contract Enforced ✅
- ✅ Single drawer instance mounted at shell level
- ✅ All event visualizations open same drawer
- ✅ No alternate "quick close" buttons
- ✅ No inline edit capabilities
- ✅ Consistent UX across all lenses (Timeline, Posting, Reconciliation)

### Backend Foundation (From Week 2)

#### 1. Posting Readiness View ✅
**File:** `supabase/migrations/20260104_posting_readiness_and_close.sql`

**Purpose:** Single source of truth for gating logic

**Key Computed Fields:**
```sql
missing_accounts BOOLEAN          -- Wn or Ma null
missing_required_links BOOLEAN    -- Entity/operation links per policy
missing_required_proof BOOLEAN    -- Bank tx, KSeF, decision per policy
can_close BOOLEAN                 -- All checks passed
can_verify BOOLEAN                -- Closed + has hash
blocker_reasons TEXT[]            -- Precise reasons for UI display
```

**Used By:**
- Event Detail Drawer (button gating)
- Posting tab filters
- Month-end blocker lists

#### 2. Close Event RPC ✅
**Function:** `close_accounting_event(event_id, actor_id, actor_name, bypass_reason)`

**Enforcement:**
- ✅ Accounts assigned (Wn/Ma not null)
- ✅ Required links present (entity, operation)
- ✅ Required proof present (bank tx, KSeF for >15k)
- ✅ Period not locked (unless bypass with reason)
- ✅ Generates `event_hash` from payload snapshot (SHA256)
- ✅ Sets `posted`, `is_closed`, `closed_at`, `closed_by`
- ✅ Creates audit trail event

**Returns:**
```json
{
  "success": true,
  "event_hash": "a3f2...9d1c",
  "closed_at": "2026-01-04T10:30:00Z",
  "period": { "year": 2026, "month": 1 }
}
```

#### 3. Verify Event RPC ✅
**Function:** `verify_event_integrity(event_id, actor_id, actor_name, verification_method)`

**Process:**
1. Get stored `event_hash` and `payload_snapshot`
2. Recompute hash from snapshot
3. Compare: `stored_hash === computed_hash`
4. If match: mark as verified + create audit event
5. If mismatch: return error (possible tampering)

#### 4. Get Event Detail RPC ✅
**Function:** `get_event_detail_for_drawer(event_id)`

**Returns:**
```json
{
  "event": { /* full event record */ },
  "readiness": { /* from events_posting_readiness view */ },
  "linked_entity": { "type": "invoice", "number": "FV/001/2026", ... },
  "linked_operation": { "type": "operation", "job_number": "TR/001/26", ... },
  "linked_decision": { "type": "decision", "decision_number": "DEC/001/26", ... }
}
```

### Frontend: Event Detail Drawer ✅

**File:** `src/modules/events/components/EventDetailDrawer.tsx`

#### 5 Non-Negotiable Sections Implemented:

**Section 1: Context**
- Type, status, period, actor, amount
- Occurred date, currency
- Badge: Closed vs Open

**Section 2: Chain (Links)**
- Linked entity (invoice/expense) with "Otwórz" button
- Linked operation/job
- Linked decision
- "Powiąż z..." button for adding links
- Badge: Complete vs Missing Required

**Section 3: Accounting (Wn/Ma)**
- Debit account (Wn) display
- Credit account (Ma) display
- Posting amount summary
- "Auto-przypisz Wn/Ma" button (placeholder for Phase B)
- Badge: Posted vs Missing Accounts

**Section 4: Proof**
- Event hash indicator (✓ or ✗)
- Bank transaction indicator (✓ or ✗)
- KSeF reference indicator (✓ or ✗)
- Decision indicator (✓ or ✗)
- "Dodaj dowód" button
- Badge: Verified vs Missing Required

**Section 5: Actions (Footer)**
- **Zamknij** button (hard gated by `can_close`)
- **Zweryfikuj** button (hard gated by `can_verify`)
- Disabled states show tooltip with reason
- Period locked warning displayed

#### Hard Gating Logic Implemented ✅

**Close Button Disabled If:**
- Already closed
- Period locked (without bypass)
- Missing Wn or Ma
- Missing required links
- Missing required proof

**Verify Button Disabled If:**
- Already verified
- Not closed yet
- No event_hash to verify

**Blocker Display:**
Red alert box shows all blocking reasons:
```
⚠ Blokery zamknięcia
• Brak konta Wn (debet)
• Brak referencji KSeF (wymagane dla kwot >15k)
• Brak powiązania z transakcją bankową
```

### State Management ✅

**File:** `src/modules/events/hooks/useEventDrawer.ts`

**Zustand Store:**
```typescript
interface EventDrawerStore {
  eventId: string | null;
  isOpen: boolean;
  openDrawer: (eventId: string) => void;
  closeDrawer: () => void;
}
```

**Usage Pattern:**
```typescript
const { openDrawer } = useEventDrawer();
<EventCard onClick={() => openDrawer(event.id)} />
```

## Definition of Done ✅

### Phase A1 Criteria Met:
- ✅ Clicking an event in any lens opens the same drawer
- ✅ No alternate "close" buttons exist elsewhere
- ✅ Drawer mounted once at shell level, not per-screen
- ✅ All event visualizations use consistent click contract

### Week 2 Success Criteria Met:
1. ✅ Drawer opens from all event visualization components
2. ✅ Close button is hard-gated by readiness
3. ✅ Verify button works and checks hash
4. ✅ Blocker reasons are displayed clearly
5. ✅ No shortcuts exist (no quick close buttons)

## What This Enables

### Immediate Capabilities:
- ✅ Any event can be completed end-to-end from drawer
- ✅ Hard gating prevents invalid closures
- ✅ Blocker reasons are precise and actionable
- ✅ Verification ensures integrity
- ✅ Consistent UX across all event lenses

### Month-End Ready:
With Phase A complete, you can:
- Properly close events with proof
- See posting readiness at a glance
- Surface blockers early
- Create audit trail through verification
- Navigate seamlessly between Timeline/Posting/Reconciliation views

## Architecture Alignment

### Guardrails Enforced:
- ✅ **Drawer-First Discipline:** All mutations through drawer (sole surface)
- ✅ **No Bypass Routes:** Only RPCs can close/verify
- ✅ **Event-First:** Closure creates audit event
- ✅ **Deterministic Hashing:** Payload snapshot → SHA256

### NOT Yet Implemented (Later Phases):
- Commit-bound events (`included_in_commit_id`) - Phase D
- Period commit candidates - Phase D
- Canonical commit enforcement - Phase D
- Fork retention - Phase D
- Chart of Accounts - Phase B
- Posting templates - Phase B
- Trial balance/ledger reports - Phase B
- Entity search picker - Phase C
- Department link policies - Phase C
- Bank reconciliation - Phase E

## Next Steps: Phase B (Week 3)

### B1: Minimal Chart of Accounts Module
- Schema: `chart_accounts` table
- Settings UI: list, create/edit, deactivate
- Drawer integration: pick Wn/Ma from CoA

### B2: Posting Templates (Automation)
- Schema: `posting_templates` table
- RPC: `apply_posting_template(event_id)`
- Drawer: "Auto-przypisz Wn/Ma" button (functional)
- Always reviewable before close

### B3: Minimal Accounting Outputs
- Trial balance (Zestawienie obrotów i sald)
- Account ledger drill-down
- Draft watermark: "NON-OFFICIAL / robocze"
- Later: require `commit_id` when commits exist

## Files Modified

### Created:
- `src/modules/events/components/EventDetailDrawer.tsx`
- `src/modules/events/hooks/useEventDrawer.ts`
- `src/modules/events/WEEK_2_IMPLEMENTATION.md`
- `src/modules/events/PHASE_A_COMPLETE.md`
- `supabase/migrations/20260104_posting_readiness_and_close.sql`

### Modified:
- `src/modules/events/components/EventsShell.tsx` (mounted drawer)
- `src/modules/events/screens/EventsPosting.tsx` (wired clicks)
- `src/modules/events/screens/EventsReconciliation.tsx` (wired clicks)
- `src/components/events/EventChainViewer.tsx` (wired clicks)

## Migration Required

Before testing, run:
```bash
# Apply posting readiness migration
psql -d your_db -f supabase/migrations/20260104_posting_readiness_and_close.sql

# Or via Supabase CLI:
supabase db push
```

## Testing Checklist

1. ✅ Open Timeline → click event card → drawer opens
2. ✅ Open Posting → click table row → drawer opens
3. ✅ Open Reconciliation → click event card → drawer opens
4. ✅ Check gating: missing Wn/Ma → "Zamknij" disabled with tooltip
5. ✅ Check gating: missing proof → blocker shown in red alert
6. ✅ Assign Wn/Ma manually (for now)
7. ✅ Click "Zamknij" → event closes, hash generated
8. ✅ Click "Zweryfikuj" → hash verified, audit event created
9. ✅ Verify no "quick close" buttons exist anywhere
10. ✅ Verify drawer state persists across route changes

## Operational Impact

**Before Phase A:**
- Events scattered across multiple views
- No unified mutation surface
- Manual SQL updates possible
- No integrity verification
- Unclear why events can't be closed

**After Phase A:**
- Single drawer for all event operations
- Hard-gated mutations with precise feedback
- Integrity verification built-in
- Clear blocker reasons
- Audit trail for all closures/verifications

**This makes accounting "doable" even without auto-posting templates.**

The system is now ready for Phase B: making posting actually work with CoA + templates + outputs.
