# Phase 1.5 Completion Report

**Date:** 2024-12-29  
**Status:** ✅ Complete - Event Write-Path Locked  
**Next:** Phase 2 - Dual-State Invoice Projection

---

## What Was Accomplished

### 1. Ledger Now Reads from Unified Events ✅

**Changed:** `useAggregatedLedger.ts`
- **Before:** Called edge function `aggregate-ledger-events` that aggregated from old tables (invoices, expenses, contracts, bank_transactions, account_movements)
- **After:** Directly queries `ledger_live` view which reads from `public.events`
- **Impact:** LedgerPage now shows events as the single source of truth

**Query Key Updated:** `aggregated-ledger` → `unified-ledger`

### 2. Replaced All `company_events` Callsites ✅

#### Invoice Components
- **`EventHistoryTimeline.tsx`** - Changed from `company_events` → `events`
- **`CollapsibleEventHistory.tsx`** - Changed from `company_events` → `events`

#### Decision/Amendment Repository
- **`amendmentRepository.ts`** - Replaced 7 direct `company_events` inserts with `create_event` RPC calls:
  - Decision version published
  - Amendment requested
  - Document uploaded
  - Amendment created
  - Amendment approved
  - Amendment rejected
  - Amendment cancelled

**Hard Rule Enforced:** Only `create_event()` RPC (service_role) can write events. No direct inserts.

### 3. Legacy Repository Deprecated ✅

**`eventsRepository.ts`** - All functions marked with `@deprecated` warnings:
- `getCompanyEvents()` → Use `getEvents()` from unified repository
- `createEvent()` → Use `logEvent()` or `createEvent()` from unified repository
- Still maintained for backward compatibility, will be removed in Phase 3

---

## Sample Event JSON for Phase 2 Trigger

Here's an actual `invoice_issued` event from production:

```json
{
  "id": "071e6d5d-c1fd-49d2-a3f8-e52b8fb23727",
  "event_type": "invoice_issued",
  "occurred_at": "2025-12-20T15:58:34.011831Z",
  "recorded_at": "2025-12-20T15:58:34.011831Z",
  "entity_type": "invoice",
  "entity_id": "b2810d14-cda5-4f8c-88ea-5184f7a30cc5",
  "entity_reference": null,
  "amount": "3200.00",
  "currency": "PLN",
  "direction": "incoming",
  "action_summary": "Invoice issued and posted to ledger",
  "changes": null,
  "metadata": null,
  "actor_id": "75376791-bc4d-4bc4-9348-2381d6ef9fa9",
  "actor_name": "System User",
  "decision_id": null,
  "posted": true,
  "status": "posted",
  "needs_action": false
}
```

**Key Fields for Projection Trigger:**
- `event_type` - Determines which state to update
- `entity_id` - The invoice to update
- `amount` - For `paid_amount` calculation
- `occurred_at` - For `issued_at`, `approved_at`, `posted_at`
- `actor_id`, `actor_name` - For `approved_by`, `posted_by`
- `decision_id` - For `approved_decision_id`
- `posted` - For `accounting_state` (POSTED vs APPROVED)
- `metadata` - May contain additional context (currently null in this example)

---

## Verification Status

### ✅ Completed
- [x] LedgerPage reads from `ledger_live` (public.events)
- [x] All `company_events` direct inserts replaced with RPC calls
- [x] Invoice event components query `events` table
- [x] Decision/amendment events use `create_event` RPC
- [x] Legacy repository deprecated with warnings

### 🔄 Pending (Phase 2)
- [ ] Audit panel integration with `get_entity_timeline()` (currently receives mock data)
- [ ] UI sanity checks (create invoice → verify events emitted)
- [ ] Full event chain verification in production

---

## Hard Constraints Now Enforced

1. **Events are immutable** - RLS policies prevent UPDATE/DELETE
2. **Inserts are service_role only** - RLS enforces backend-only writes
3. **Canonical event_type is enforced** - Database enum constraint
4. **Single source of truth** - Ledger reads from `public.events` only

---

## Next Steps: Phase 2 - Dual-State Invoice Projection

### Task 1: Add Dual-State Columns to Invoices

```sql
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS economic_state TEXT,
  ADD COLUMN IF NOT EXISTS accounting_state TEXT,
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_decision_id UUID,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS posted_by UUID,
  ADD COLUMN IF NOT EXISTS posting_ref TEXT;

-- Add constraints
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_economic_state_check
    CHECK (economic_state IN ('DRAFT', 'ISSUED', 'DUE', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')),
  ADD CONSTRAINT invoices_accounting_state_check
    CHECK (accounting_state IN ('UNAPPROVED', 'APPROVED', 'POSTED', 'REVERSED'));
```

### Task 2: Create Projection Trigger

The trigger will:
- Listen for `AFTER INSERT ON events`
- Filter for `entity_type = 'invoice'`
- Update the relevant invoice based on `event_type`:

**Event Type Mapping:**
- `invoice_created` → Set `economic_state = 'DRAFT'`, `accounting_state = 'UNAPPROVED'`
- `invoice_issued` → Set `economic_state = 'ISSUED'`, `issued_at = occurred_at`
- `invoice_approved` → Set `accounting_state = 'APPROVED'`, `approved_at/by/decision_id`
- `invoice_posted` → Set `accounting_state = 'POSTED'`, `posted_at/by/posting_ref`
- `payment_recorded` → Increment `paid_amount`, recalculate `economic_state` (PARTIALLY_PAID/PAID)
- `invoice_reversed` → Set `accounting_state = 'REVERSED'`

### Task 3: Backfill Existing Invoices

Query events to calculate current state for each invoice and update projection fields.

### Task 4: Test Dual-State Projection

Create new invoice → verify:
- `invoice_created` event → `economic_state = 'DRAFT'`
- `invoice_issued` event → `economic_state = 'ISSUED'`, `issued_at` set
- `payment_recorded` event → `paid_amount` updated, `economic_state` changes to PAID

---

## Architecture Wins

### Before Phase 1.5
- Ledger aggregated from multiple tables (invoices, expenses, contracts, etc.)
- Direct writes to `company_events` scattered across codebase
- No enforcement of event immutability
- Mixed sources of truth

### After Phase 1.5
- Ledger reads from single source: `public.events` (via `ledger_live`)
- All event writes go through `create_event()` RPC (service_role enforced)
- Database-level immutability guarantees
- Canonical event types enforced
- Foundation ready for event-driven projections

---

## Migration Statistics

### Files Modified: 5
1. `useAggregatedLedger.ts` - Migrated to ledger_live view
2. `EventHistoryTimeline.tsx` - Query events table
3. `CollapsibleEventHistory.tsx` - Query events table
4. `amendmentRepository.ts` - 7 RPC call replacements
5. `eventsRepository.ts` - Deprecation warnings added

### Database Queries Updated: 10+
- 1 ledger aggregation query
- 2 invoice event queries
- 7 decision/amendment event writes

### Hard Rules Enforced: 3
1. Events immutable (RLS)
2. Service role only writes (RLS)
3. Canonical event types (enum constraint)

---

**Phase 1.5 Complete** ✅  
**Ready for Phase 2:** Dual-State Invoice Projection

---

**Completed By:** Cascade AI  
**Review Status:** Pending  
**Production Deployment:** Ready for Phase 2
