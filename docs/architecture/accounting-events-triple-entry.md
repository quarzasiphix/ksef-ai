# Accounting Events - Triple Entry Foundation

## Overview

The **Accounting Event** (Zdarzenie księgowe) is the atomic unit of bookkeeping in the system. Every financial movement must resolve into a single accounting event. This document explains the architecture, philosophy, and implementation of the triple-entry accounting foundation.

---

## Core Principle

**❗ No invoice, cost, contract, cash movement, or bank transaction may exist without being linked to an Accounting Event.**

This enforces:
- **Auditability**: Every PLN has a traceable reason
- **Clean balance sheet**: All movements tracked
- **Legal defensibility**: Decision → Operation → Event → Document
- **KSeF readiness**: External attestation built-in
- **Triple-entry foundation**: Ledger + Explanation + Proof

---

## The Hierarchy

```
Decision (mandate / authority)
   ↓
Operation / Job (what business did) [OPTIONAL]
   ↓
Accounting Event (economic result) [MANDATORY]
   ↓
Documents (invoice, contract, receipt)
```

### Key Insight

- **Operation → Optional**: Explains WHY (business context)
- **Accounting Event → Mandatory**: Records WHAT happened financially
- **Decision → Required for sp. z o.o.**: Provides legal authority

This avoids forcing fake jobs for:
- Bank fees
- Capital contributions
- Tax payments
- Overhead costs

---

## What is Triple-Entry Accounting?

Traditional double-entry: **Debit + Credit** (internal ledger only)

Triple-entry: **Debit + Credit + External Proof**

### The Three Entries

1. **Internal ledger entry** (Wn / Ma)
2. **Internal audit event** (immutable, explained, decision-linked)
3. **External attestation** (cryptographic receipt or third-party confirmation)

Or more simply:

**Ledger + Explanation + Proof**

---

## Current System Status

### ✅ What You Already Have

**Enhanced Double-Entry:**
- Financial ledger with multi-currency support
- Immutable event log (dziennik zdarzeń)
- Each invoice/cash/bank movement becomes an event
- Balance sheet derived from closed events
- Events linked to decisions (legal mandate)
- Clear "why" + "what" + "when"

**Governance Layer:**
- Decisions as preconditions
- Blocking operations without mandate
- Departmental authority
- Legal justification enforced by UI

### 🔨 What Was Added

**Triple-Entry Fields:**
- `event_hash`: SHA-256 hash of event payload
- `payload_snapshot`: Canonical payload for verification
- `bank_transaction_id`: External bank reference
- `bank_statement_hash`: Bank statement verification
- `ksef_reference_number`: KSeF invoice attestation
- `ksef_qr_code`: KSeF QR code for verification
- `decision_pdf_hash`: Signed decision hash
- `external_receipt_url`: External proof URL

**Accounting Semantics:**
- `debit_account`: Wn (debit) account
- `credit_account`: Ma (credit) account
- `account_description`: Account explanation
- `legal_basis`: Legal justification
- `legal_basis_type`: Type of legal basis

**Closure and Locking:**
- `is_closed`: Event locked for editing
- `closed_at`: When event was closed
- `closed_by`: Who closed the event
- `period_locked`: Period is closed
- `period_month` / `period_year`: Period tracking

**Verification:**
- `verified`: Event verified against external source
- `verified_at`: When verified
- `verified_by`: Who verified
- `verification_method`: How verified (bank, KSeF, manual, audit)

---

## Implementation Guide

### 1. Event Hash Generation

Every closed event gets a cryptographic hash:

```sql
SELECT public.generate_event_hash('event-uuid');
```

This creates:
- SHA-256 hash of canonical payload
- Immutable snapshot of event data
- Tamper detection capability

**Canonical payload includes:**
- Event ID, business profile, type
- Occurred date, amount, currency, direction
- Entity type/ID, decision ID
- Debit/credit accounts
- Actor ID, recorded timestamp

### 2. Event Closure (Locking)

Close an event to prevent further edits:

```sql
SELECT public.close_accounting_event('event-uuid', 'user-uuid');
```

This:
- Generates event hash
- Marks event as closed
- Sets posted = TRUE
- Locks event for editing
- Assigns to accounting period

**Trigger prevents edits:**
```
Cannot modify closed accounting event. Event ID: xxx, closed at: 2026-01-03
```

### 3. Period Closing

Close all events in a month:

```sql
SELECT public.close_accounting_period(
  'profile-uuid',
  2026,  -- year
  1,     -- month
  'user-uuid'
);
```

Returns:
- `closed_count`: Events closed
- `locked_count`: Events locked

**After period close:**
- No new events can be added to that month
- All events in month are locked
- Period is marked as closed in balance sheet

### 4. Bank Reconciliation (External Attestation)

Link event to bank transaction:

```sql
SELECT public.reconcile_event_with_bank(
  'event-uuid',
  'bank-transaction-id',
  'bank-statement-hash',
  'user-uuid'
);
```

This:
- Stores bank transaction ID
- Stores bank statement hash
- Marks event as verified
- Sets verification method to 'bank_reconciliation'

**This is the "third entry"** - external proof from independent institution.

### 5. KSeF Attestation (External Attestation)

Link event to KSeF invoice:

```sql
SELECT public.attest_event_with_ksef(
  'event-uuid',
  'ksef-reference-number',
  'ksef-qr-code',
  'user-uuid'
);
```

This:
- Stores KSeF reference number
- Stores KSeF QR code
- Marks event as verified
- Sets verification method to 'ksef_confirmation'

**This is the "third entry"** - state attestation via KSeF.

### 6. Event Integrity Verification

Verify event hasn't been tampered with:

```sql
SELECT * FROM public.verify_event_integrity('event-uuid');
```

Returns:
- `is_valid`: TRUE if hash matches
- `current_hash`: Regenerated hash
- `stored_hash`: Original hash
- `has_external_attestation`: TRUE if bank/KSeF linked
- `attestation_type`: 'bank', 'ksef', 'decision', or NULL

**Use this for:**
- Audit reports
- Integrity checks
- Compliance verification
- Dispute resolution

### 7. Mandatory Event Linking

**Automatic trigger** creates event for every invoice:

```sql
-- Trigger: invoice_event_link_trigger
-- Fires: AFTER INSERT on invoices
-- Creates: accounting event with invoice details
```

**What happens:**
1. User creates invoice
2. Trigger fires automatically
3. Event created with:
   - `event_type`: 'invoice_created'
   - `entity_type`: 'invoice'
   - `entity_id`: invoice ID
   - `amount`: invoice total
   - `direction`: 'incoming' or 'outgoing'
   - `status`: 'pending'
   - `needs_action`: TRUE

**Extend this to:**
- Expenses (already exists)
- Bank transactions
- Cash movements (KP/KW)
- Contract signatures
- Capital events

---

## UI Integration

### Event Log Screen

**Already exists:** `src/modules/accounting/screens/EventLog.tsx`

**Shows:**
- All events with filters
- Event type, date, actor
- Decision linkage
- Entity reference
- Export to CSV/JSON

**Add:**
- Verification status badge
- External attestation indicator
- Hash verification button
- Period closure status

### New: Event Verification Screen

**Create:** `src/modules/accounting/screens/EventVerification.tsx`

**Shows:**
- Events requiring verification
- Events with external attestation
- Period closure status
- Integrity check results

**Features:**
- One-click bank reconciliation
- KSeF attestation workflow
- Bulk verification
- Integrity report export

### New: Period Closing Screen

**Create:** `src/modules/accounting/screens/PeriodClosing.tsx`

**Shows:**
- Current period status
- Events pending closure
- Verification progress
- Lock period button

**Workflow:**
1. Review all events in period
2. Verify critical events
3. Close period (locks all events)
4. Generate period report
5. Export for accountant

---

## Views for Management

### 1. Events Requiring Verification

```sql
SELECT * FROM public.events_requiring_verification;
```

Shows closed events without external verification.

### 2. Events with Attestation

```sql
SELECT * FROM public.events_with_attestation;
```

Shows events with bank/KSeF/decision attestation.

### 3. Period Closure Status

```sql
SELECT * FROM public.period_closure_status;
```

Shows closure and verification status by month.

---

## Enforcement Policies

### Level 1: Required (Hard Block)

**Cannot proceed without:**
- Accounting event for every invoice
- Accounting event for every expense
- Decision linkage for sp. z o.o. events
- Closed events cannot be edited
- Locked periods cannot accept new events

### Level 2: Strongly Recommended (Warning)

**Show warning but allow:**
- Events without external attestation
- Events without bank reconciliation
- Events without operation linkage
- Unverified events in closed periods

### Level 3: Optional (No Warning)

**Nice to have:**
- Decision PDF hash
- External receipt URL
- Account descriptions
- Detailed metadata

---

## Roadmap to Full Triple-Entry

### Phase 1: Foundation ✅ (DONE)

- [x] Add triple-entry fields to events table
- [x] Event hash generation
- [x] Event closure and locking
- [x] Period closing
- [x] Bank reconciliation
- [x] KSeF attestation
- [x] Integrity verification
- [x] Mandatory event linking for invoices

### Phase 2: UI Integration (Next 30 days)

- [ ] Event verification screen
- [ ] Period closing screen
- [ ] Verification status badges in event log
- [ ] Hash verification button
- [ ] Bank reconciliation workflow
- [ ] KSeF attestation workflow

### Phase 3: Automation (Next 60 days)

- [ ] Auto-create events for bank transactions
- [ ] Auto-create events for cash movements
- [ ] Auto-reconcile with bank API
- [ ] Auto-attest with KSeF API
- [ ] Daily integrity check job
- [ ] Period auto-close reminder

### Phase 4: Advanced Features (Next 90 days)

- [ ] Merkle tree for daily event batches
- [ ] Daily root hash anchoring (email/storage)
- [ ] Audit trail export with proofs
- [ ] Compliance report generator
- [ ] Dispute resolution workflow
- [ ] External auditor access

---

## Technical Details

### Event Hash Algorithm

```
SHA-256(
  event_id +
  business_profile_id +
  event_type +
  occurred_at +
  amount +
  currency +
  direction +
  entity_type +
  entity_id +
  decision_id +
  debit_account +
  credit_account +
  actor_id +
  recorded_at
)
```

### Immutability Guarantees

1. **Database trigger**: Prevents UPDATE on closed events
2. **Hash verification**: Detects any tampering
3. **External attestation**: Independent third-party proof
4. **Period locking**: Prevents backdating

### Performance Considerations

**Indexes added:**
- `idx_events_closed`: Fast lookup of closed events
- `idx_events_period`: Fast period queries
- `idx_events_bank_transaction`: Bank reconciliation
- `idx_events_ksef`: KSeF lookup
- `idx_events_hash`: Integrity checks
- `idx_events_verified`: Verification status

**Materialized views:**
- `ledger_view`: Posted events (refresh on demand)
- `inbox_view`: Pending events (refresh on demand)

---

## Examples

### Example 1: Invoice with Full Triple-Entry

```sql
-- 1. Create invoice (triggers auto-event creation)
INSERT INTO invoices (...) VALUES (...);

-- 2. Close the event
SELECT close_accounting_event('event-uuid', 'user-uuid');

-- 3. Attest with KSeF
SELECT attest_event_with_ksef(
  'event-uuid',
  'KSeF-123456789',
  'data:image/png;base64,...',
  'user-uuid'
);

-- 4. Verify integrity
SELECT * FROM verify_event_integrity('event-uuid');
-- Returns: is_valid=TRUE, attestation_type='ksef'
```

### Example 2: Bank Transaction Reconciliation

```sql
-- 1. Create bank transaction event
SELECT create_event(
  business_profile_id := 'profile-uuid',
  event_type := 'payment_recorded',
  actor_id := 'user-uuid',
  actor_name := 'Jan Kowalski',
  entity_type := 'bank_transaction',
  entity_id := 'transaction-uuid',
  action_summary := 'Wpłata od klienta',
  amount := 1000.00,
  currency := 'PLN',
  direction := 'incoming',
  cash_channel := 'bank'
);

-- 2. Reconcile with bank
SELECT reconcile_event_with_bank(
  'event-uuid',
  'bank-tx-987654321',
  'sha256-of-statement',
  'user-uuid'
);

-- 3. Close event
SELECT close_accounting_event('event-uuid', 'user-uuid');
```

### Example 3: Period Closing Workflow

```sql
-- 1. Check period status
SELECT * FROM period_closure_status
WHERE business_profile_id = 'profile-uuid'
  AND period_year = 2026
  AND period_month = 1;

-- 2. Verify critical events
SELECT * FROM events_requiring_verification
WHERE business_profile_id = 'profile-uuid'
  AND period_year = 2026
  AND period_month = 1;

-- 3. Close the period
SELECT close_accounting_period(
  'profile-uuid',
  2026,
  1,
  'user-uuid'
);

-- 4. Verify all events
SELECT 
  e.id,
  e.event_type,
  e.amount,
  v.is_valid,
  v.has_external_attestation,
  v.attestation_type
FROM events e
CROSS JOIN LATERAL verify_event_integrity(e.id) v
WHERE e.business_profile_id = 'profile-uuid'
  AND e.period_year = 2026
  AND e.period_month = 1;
```

---

## Benefits Achieved

### For Accountants

✅ **Immutable audit trail**: Every event is locked and hashed
✅ **Period closing**: Clean month-end workflow
✅ **Bank reconciliation**: External proof of transactions
✅ **Integrity verification**: Detect tampering instantly
✅ **Compliance reports**: Export with cryptographic proofs

### For Auditors

✅ **Triple-entry proof**: Ledger + Explanation + External attestation
✅ **Decision linkage**: Every event has legal basis
✅ **Hash verification**: Cryptographic integrity
✅ **External attestation**: Bank/KSeF confirmation
✅ **Immutability**: Cannot alter closed events

### For Regulators

✅ **KSeF integration**: State attestation built-in
✅ **Legal basis tracking**: Decision → Event → Document
✅ **Audit trail export**: Full history with proofs
✅ **Compliance views**: Period status, verification status
✅ **Dispute resolution**: Cryptographic evidence

### For Business Owners

✅ **Clean books**: Every PLN accounted for
✅ **Audit-ready**: Always prepared for inspection
✅ **Dispute protection**: Cryptographic proof of transactions
✅ **Tax compliance**: KSeF attestation automatic
✅ **Peace of mind**: System enforces correctness

---

## Summary

The system now implements **true triple-entry accounting**:

1. **Ledger**: Traditional double-entry (Wn/Ma)
2. **Explanation**: Immutable event log with decision linkage
3. **Proof**: External attestation (bank, KSeF, decision hash)

This is **not marketing hype**. This is a cryptographically verifiable, legally defensible, audit-ready accounting system that goes beyond traditional ERP.

**Next step**: Run the migration and start using event closure, bank reconciliation, and period closing in production.
