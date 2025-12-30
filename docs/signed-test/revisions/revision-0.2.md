# KsiegaI Code Path Analysis - Revision 0.2

**Date**: December 29, 2025  
**Focus**: Write paths, event enforcement, payment reconciliation, UI bindings, decision gates

---

## Executive Summary

This document analyzes the **actual implementation** of KsiegaI's invoice write-path, event system, payment reconciliation, ledger UI, and decision enforcement. Key findings:

1. **Invoice mutations are direct** – No event enforcement, single `status` field instead of dual states
2. **Events logged to wrong table** – Uses legacy `company_events`, not unified `events`
3. **Payment systems are parallel** – Stripe and treasury don't reconcile
4. **Decision validation is UI-only** – No backend enforcement
5. **Ledger assumes events exist** – But invoice creation doesn't insert them

---

## 1. Invoice Write-Path Analysis

### 1.1 Direct Status Mutation (`invoiceRepository.ts:164-513`)

**Critical Finding**: `saveInvoice()` directly mutates `invoices` table without event insertion.

```typescript
// Line 781: Status hardcoded
status: 'draft' as const,

// Line 344: Boolean flag (no partial payments)
is_paid: invoice.isPaid,

// Line 358: Decision attached but not validated
decision_id: invoice.decisionId || null,
```

**Missing**:
- ❌ No `economic_state` or `accounting_state` columns
- ❌ No event insertion on create/update
- ❌ No `paid_amount` tracking
- ❌ No `issued_at`, `approved_at`, `posted_at` timestamps

---

### 1.2 Opportunistic Event Logging (`NewInvoice.tsx:860-903`)

Events are **only logged for cash payments**:

```typescript
if (formValues.paymentMethod === PaymentMethod.CASH && savedInvoice?.id) {
  await createCashTransaction({...});
  
  // Event logged ONLY here
  await createEvent({
    event_type: 'invoice_issued',
    entity_id: savedInvoice.id,
    decision_id: formValues.decisionId,
  });
}
```

**Result**: Non-cash invoices have **no audit trail**.

---

### 1.3 Decision Attachment Without Enforcement

**UI Validation** (`NewInvoice.tsx:965`):

```typescript
if (isSpoolka && !formValues.decisionId) {
  toast.error('Wybierz decyzję');
  return;
}
```

**Backend**: No validation. Could bypass via API.

**Missing Checks**:
- ❌ Decision status (active/expired)
- ❌ Amount limit enforcement
- ❌ Counterparty whitelist
- ❌ Usage counter increments

---

### 1.4 No Canonical "Issued" Action

**Current Flow**:
1. User saves → `status: 'draft'`
2. No explicit "Issue" action
3. No state transition events

**Should Be**:
1. Save → `economic_state: DRAFT`, `accounting_state: UNAPPROVED`
2. Issue → Event `INVOICE_ISSUED` → `economic_state: ISSUED`, `issued_at` set
3. Approve → Event `INVOICE_APPROVED` → `accounting_state: APPROVED`, `approved_at` set
4. Post → Event `INVOICE_POSTED` → `accounting_state: POSTED`, `posted_at` set

---

## 2. Event System Analysis

### 2.1 Wrong Table (`eventsRepository.ts:97-120`)

**Critical**: Events go to `company_events` (legacy), not unified `events` table.

```typescript
export async function createEvent(input: CreateEventInput) {
  const { data } = await supabase.rpc('log_company_event', {
    // Inserts into company_events, not events
  });
}
```

**Missing in `company_events`**:
- ❌ `posted`, `needs_action`, `status` fields
- ❌ `occurred_at` vs `recorded_at` distinction
- ❌ `amount`, `currency`, `direction`, `cash_channel`

---

### 2.2 Incomplete Event Taxonomy

**Defined** (`audit-events.ts:12-43`):
- ✅ `invoice_created`, `invoice_paid`, `payment_received`, `payment_made`, etc.

**Missing**:
- ❌ `INVOICE_APPROVED` (accounting state)
- ❌ `INVOICE_POSTED` (ledger posting)
- ❌ `PAYMENT_RECORDED` (generic payment capture)

**Not enforced**: UI submits string literals like `'invoice_issued'` which do not exist in the enum.

---

### 2.3 No Posting/Approval Workflow

**Answer**: Functions don't exist.

- No `postEvent()` flow
- No `approveEvent()` flow
- `posted` / `needs_action` columns never set

---

## 3. Payments + Treasury Truth Path

### 3.1 Two Parallel Systems

| System | Storage | Purpose | Trigger |
| --- | --- | --- | --- |
| Stripe | `invoice_payments` | Card payments | `update_invoice_payment_status()` |
| Treasury | `document_payments` + `account_movements` | Manual/cash/bank | None |

**Problem**: No reconciliation between them.

---

### 3.2 Silent Payment Recording (`treasuryRepository.ts:215-261`)

```typescript
export async function createDocumentPayment(input) {
  const movement = await createMovement({...});
  const payment = await supabase.from('document_payments').insert({...});
  
  // ❌ No invoice update
  // ❌ No event insertion
  // ❌ No idempotency check
  
  return payment;
}
```

---

### 3.3 Stripe-Only Trigger

**SQL** (simplified from MCP query):

```sql
IF NEW.status = 'succeeded' THEN
  UPDATE invoices
  SET payment_status = 'paid',
      is_paid = TRUE,
      paid_at = NEW.succeeded_at
  WHERE id = NEW.invoice_id;
END IF;
```

**Problems**:
- ❌ Doesn't track `paid_amount`
- ❌ No partial payment handling
- ❌ No event insertion
- ❌ Only reacts to Stripe statuses

---

### 3.4 Where `paid_amount` Logic Should Live

**Proposed Trigger** (conceptual):

```sql
CREATE FUNCTION update_invoice_paid_amount()
RETURNS trigger AS $$
DECLARE
  total_paid NUMERIC;
  invoice_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(dp.amount), 0)
    INTO total_paid
  FROM document_payments dp
  JOIN account_movements am ON dp.movement_id = am.id
  WHERE dp.document_id = NEW.document_id
    AND am.is_reversed = FALSE;
  
  SELECT total_gross_value INTO invoice_total
  FROM invoices WHERE id = NEW.document_id;
  
  UPDATE invoices
  SET paid_amount = total_paid,
      economic_state = CASE
        WHEN total_paid >= invoice_total THEN 'PAID'
        WHEN total_paid > 0 THEN 'PARTIALLY_PAID'
        ELSE 'DUE'
      END
  WHERE id = NEW.document_id;
  
  RETURN NEW;
END;
$$;
```

---

### 3.5 Missing Payment Events

**Should insert**:

```typescript
await createEvent({
  business_profile_id: input.business_profile_id,
  event_type: 'payment_recorded',
  entity_type: 'invoice',
  entity_id: input.document_id,
  amount: input.amount,
  currency: input.currency,
  direction: direction === 'IN' ? 'incoming' : 'outgoing',
  status: 'posted',
  occurred_at: input.payment_date,
  recorded_at: new Date().toISOString(),
});
```

---

## 4. Ledger Page + Audit Panel UI Binding

### 4.1 Hybrid Entity Model (`LedgerPage.tsx:76-151`)

- Fetches aggregated ledger events from edge function
- Transforms to `TimelineLedgerEvent` UI model

```typescript
const { data: ledgerData } = useAggregatedLedger(selectedProfileId, filters);

const timelineEvents = (ledgerData?.events ?? []).map(event => ({
  id: event.id,
  occurredAt: event.occurred_at,
  amount: { value: event.amount, currency: event.currency },
  direction: event.direction === 'incoming' ? 'in' : 'out',
  status: normalizedStatus,
  documentId: event.document_id,
  documentType: event.document_type,
}));
```

**Problem**: Assumes `events` table contains invoice events. In reality, invoice creation never logs them.

---

### 4.2 No Dual-State UI

- `FinancialControlStrip` and ledger rows show a single `status`
- Cannot display combinations like "Paid, not posted"

**Should derive**:

| Badge | Condition |
| --- | --- |
| `Do zapłaty` | `economic_state IN ('ISSUED','DUE','OVERDUE')` |
| `Wymaga decyzji` | `accounting_state = 'UNAPPROVED'` |
| `Zapłacona, niezaksięgowana` | `economic_state = 'PAID'` AND `accounting_state != 'POSTED'` |

---

### 4.3 Sticky Audit Panel

- Tracks `selectedLedgerEntryId`
- Currently uses mock data for audit events

```typescript
const handleShowAudit = (eventId: string) => {
  setSelectedLedgerEntryId(eventId);
  setAuditPanelState('open');
};
```

**Missing**:
- Real fetch from audit trail
- Link from audit event back to ledger row (`handleLedgerEntryClickFromAudit`)

---

## 5. Decision Enforcement

### 5.1 Authorization System Exists But Unused

```typescript
export async function checkAuthorization(params) {
  const { data } = await supabase.rpc('check_authorization', {
    p_business_profile_id: params.businessProfileId,
    p_action_type: params.actionType,
    p_amount: params.amount,
  });
  return data?.[0] || { is_authorized: false };
}
```

**Problem**: Never invoked in invoice write-path.

---

### 5.2 UI-Only Validation

- Frontend enforces `decisionId` for spółka invoices
- Backend does **zero** validation

---

### 5.3 No Allowed Actions Enforcement

**Should check** before saving:

1. Decision status = `active`
2. Amount ≤ `amount_limit`
3. Counterparty in allowed list
4. Action type permitted (issue invoice, approve expense, etc.)
5. Increment usage counters (`total_invoices`, `total_amount_used`)

---

## 6. Gap Summary

### 6.1 Schema Gaps

| Column | Table | Purpose |
| --- | --- | --- |
| `economic_state` | `invoices` | DRAFT → ISSUED → DUE → PAID → OVERDUE |
| `accounting_state` | `invoices` | UNAPPROVED → APPROVED → POSTED → REVERSED |
| `paid_amount` | `invoices` | Partial payment tracking |
| `issued_at` / `issued_by` | `invoices` | Timestamp + actor for issuance |
| `approved_at` / `approved_by` | `invoices` | Decision to post |
| `posted_at` / `posted_by` / `posting_ref` | `invoices` | Ledger entry linkage |

### 6.2 Event System Gaps

| Gap | Impact |
| --- | --- |
| Events logged to `company_events` | Ledger read layer never sees invoice events |
| Missing accounting event types | Can't track approvals/postings |
| No canonical statuses | `posted`, `needs_action` unused |
| Events missing financial payload | Ledger lacks amount/direction/currency |

### 6.3 Payment Gaps

| Gap | Impact |
| --- | --- |
| Stripe vs treasury split | No single source of truth |
| Trigger updates only Stripe invoices | Manual payments ignored |
| No `paid_amount` column | Can't show partials |
| No payment events | Ledger misses cash movements |
| No idempotency | Double-booking risk |

### 6.4 Decision Gaps

| Gap | Impact |
| --- | --- |
| Backend doesn't validate decisions | API bypass possible |
| No amount/counterparty enforcement | Exposes governance risk |
| No usage tracking | Can't audit decision consumption |

### 6.5 UI Gaps

| Gap | Impact |
| --- | --- |
| Ledger assumes events exist | Empty or stale timeline |
| No dual badges | Can't communicate dual-state mismatch |
| Audit panel uses mock data | No actual audit trail |

---

## 7. Implementation Roadmap

### Phase 1: Schema Extension (1–2 days)
1. Add dual-state columns + timestamps
2. Introduce `paid_amount`
3. Backfill existing invoices

### Phase 2: Event Enforcement (2–3 days)
1. Migrate logging to unified `events` table
2. Add missing event types
3. Create triggers for invoice and payment events

### Phase 3: Payment Reconciliation (1–2 days)
1. Build unified payments view
2. Trigger to update `paid_amount` on any payment
3. Insert payment events with financial payload
4. Add idempotency constraints

### Phase 4: Decision Enforcement (1–2 days)
1. Backend validation within `saveInvoice()`
2. RPC to increment usage
3. Audit trail entries for decision checks

### Phase 5: UI Refactor (2–3 days)
1. Rewire FinancialControlStrip to dual states
2. Hook audit panel to real events
3. Filter ledger by `posted = true`

---

## 8. Critical Code Locations

| Area | Files |
| --- | --- |
| Invoice write-path | `src/modules/invoices/data/invoiceRepository.ts` (164-513) |
| UI submit handler | `src/modules/invoices/screens/invoices/NewInvoice.tsx` (700-953) |
| Event logging | `src/modules/accounting/data/eventsRepository.ts` |
| Event taxonomy | `src/modules/accounting/ledger/types/audit-events.ts` |
| Payments | `src/modules/accounting/data/treasuryRepository.ts` (215-261), trigger `update_invoice_payment_status()` |
| Ledger UI | `src/modules/accounting/screens/LedgerPage.tsx`, `components/FinancialLedger.tsx` |
| Decision enforcement | `src/modules/authorization/data/authorizationRepository.ts`, `NewInvoice.tsx` |

---

## 9. Q&A

1. **Do you update invoice status directly?** Yes, `saveInvoice()` sets `status: 'draft'` with no events.
2. **Do you insert events as part of mutation?** Only for cash payments; otherwise silent.
3. **Where do you attach `decision_id`?** UI form (`NewInvoice.tsx:804`) and repository (`invoiceRepository.ts:358`).
4. **Canonical "issued" action?** None. No `INVOICE_ISSUED` event or state transition.
5. **Event taxonomy stable?** Defined but not enforced; code uses mismatched strings.
6. **Are events append-only?** Yes; repository exposes no update/delete.
7. **Is `posted/needs_action/status` used?** No; fields exist only in schema.
8. **Where should `paid_amount` live?** Trigger on `document_payments` that updates `invoices`.
9. **Does payment create event?** No, payment state changes are unlogged.
10. **Idempotency risk?** High; `createDocumentPayment()` lacks safeguards.
11. **What do ledger rows represent?** Aggregated events from `events` table (if populated).
12. **Active entity ID for audit panel?** `selectedLedgerEntryId` in `LedgerPage.tsx`.
13. **Do you block posting without decision?** Only via UI; backend allows it.
14. **Are allowed actions enforced?** No; `checkAuthorization()` unused.

---

**End of Analysis**
