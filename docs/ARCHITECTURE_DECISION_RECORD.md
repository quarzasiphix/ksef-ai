# Architecture Decision Record (ADR)

**Date**: December 29, 2025  
**Status**: Active  
**Scope**: KsiegaI Core Accounting System

---

## Context

KsiegaI is transitioning from a document-centric system to an event-sourced, dual-state accounting platform. This ADR establishes the foundational architectural principles that govern all future development.

---

## Decisions

### 1. Events Are the Only Audit & Timeline Truth

**Decision**: The unified `events` table is the single source of truth for all financial activity, state transitions, and audit trails.

**Rationale**:
- Documents (invoices, expenses) are **snapshots** of intent, not reality
- Events capture **what actually happened** with timestamps, actors, and context
- Ledger, audit panels, and compliance reports derive from events only
- Immutable event log enables time-travel debugging and regulatory compliance

**Implications**:
- ✅ All state mutations MUST emit events
- ✅ UI reads from events for timeline/audit views
- ❌ No direct document mutations without corresponding events
- ❌ `company_events` table is deprecated (legacy only)

**Enforcement**:
- Backend commands are the only way to mutate financial state
- Commands atomically update snapshots + insert events
- UI cannot bypass command layer

---

### 2. Invoices Are Snapshots, Not Truth

**Decision**: The `invoices` table stores the **current materialized state** for query performance, but events are authoritative.

**Rationale**:
- Querying event log for every invoice list is too slow
- Snapshots enable efficient filtering, sorting, and aggregation
- In case of conflict, events win (snapshots can be rebuilt)

**Implications**:
- ✅ Snapshots updated atomically with events
- ✅ Snapshots include denormalized fields for performance
- ❌ Never trust snapshot alone for audit/compliance
- ❌ Never mutate snapshot without event

**Enforcement**:
- All writes go through command layer
- Snapshots are write-only from backend, read-only from UI
- Periodic reconciliation jobs verify snapshot consistency

---

### 3. Authority Model: JDG = Implicit, Spółka = Explicit

**Decision**: 
- **JDG (jednoosobowa działalność gospodarcza)**: Implicit authority—owner can issue, approve, and post invoices automatically
- **Spółka (company)**: Explicit authority—requires formal decision for approval and posting

**Rationale**:
- JDG is a sole proprietorship—owner has full authority by default
- Spółka requires governance—decisions document authorization for audit/legal purposes
- Different legal entities have different compliance requirements

**Implications**:

#### For JDG:
- ✅ `cmd_invoice_issue` auto-approves and optionally auto-posts
- ✅ No decision required for routine operations
- ✅ Events still logged for audit trail
- ❌ Cannot skip event logging (even if implicit)

#### For Spółka:
- ✅ `cmd_invoice_approve` requires active decision
- ✅ `cmd_invoice_post` requires approval first
- ✅ Decision enforcement at backend (not UI)
- ❌ Cannot approve/post without valid decision
- ❌ Cannot bypass decision checks via API

**Enforcement**:
- Business profile type checked in command layer
- Decision validation happens server-side
- Usage counters incremented atomically
- Approval events reference decision ID

---

### 4. Dual-State Model: Economic vs Accounting

**Decision**: Invoices have two independent state machines:

#### Economic State (business reality):
```
DRAFT → ISSUED → DUE → PARTIALLY_PAID → PAID → OVERDUE
```

#### Accounting State (audit control):
```
UNAPPROVED → APPROVED → POSTED → REVERSED
```

**Rationale**:
- Economic state tracks **money reality** (issued, paid, overdue)
- Accounting state tracks **ledger control** (approved, posted, closed)
- These are orthogonal concerns that must be tracked independently
- Example: Invoice can be PAID but UNAPPROVED (needs decision before posting)

**Implications**:
- ✅ UI shows both states simultaneously
- ✅ Ledger filters by `accounting_state = POSTED`
- ✅ Payment tracking uses `economic_state`
- ❌ Cannot post to ledger without approval
- ❌ Cannot reverse without posting first

**Enforcement**:
- Schema enforces valid state combinations
- Commands validate state transitions
- Events capture both state changes

---

### 5. Command Layer Is the Only Write Path

**Decision**: All financial mutations go through backend command RPCs:

```
cmd_invoice_create_draft
cmd_invoice_issue
cmd_invoice_approve
cmd_invoice_post
cmd_payment_record
cmd_invoice_reverse
```

**Rationale**:
- Centralized validation and business rules
- Atomic event + snapshot updates
- Authority enforcement in one place
- API abuse prevention
- Audit trail completeness

**Implications**:
- ✅ Commands validate authority before mutation
- ✅ Commands emit canonical events
- ✅ Commands update snapshots atomically
- ❌ UI cannot mutate `invoices` table directly
- ❌ No repository functions that bypass commands

**Enforcement**:
- RLS policies restrict direct writes
- UI uses command wrappers only
- Repository layer deprecated for writes

---

### 6. Event Types Are Canonical and Enforced

**Decision**: Event types are defined in a TypeScript enum and enforced at database level.

**Canonical Event Types (v1)**:
```typescript
enum EventType {
  // Invoice lifecycle
  INVOICE_CREATED = 'invoice_created',
  INVOICE_ISSUED = 'invoice_issued',
  INVOICE_APPROVED = 'invoice_approved',
  INVOICE_POSTED = 'invoice_posted',
  INVOICE_REVERSED = 'invoice_reversed',
  
  // Payment lifecycle
  PAYMENT_RECORDED = 'payment_recorded',
  PAYMENT_REVERSED = 'payment_reversed',
  
  // Decision lifecycle
  DECISION_CREATED = 'decision_created',
  DECISION_USED = 'decision_used',
  DECISION_EXPIRED = 'decision_expired',
}
```

**Rationale**:
- Prevents typos and inconsistencies
- Enables type-safe event handling
- Supports event-driven workflows
- Facilitates audit queries

**Implications**:
- ✅ DB constraint enforces valid event types
- ✅ TypeScript enum prevents invalid strings
- ❌ Cannot log arbitrary event types
- ❌ New event types require schema migration

**Enforcement**:
- CHECK constraint on `events.event_type`
- TypeScript enum in `audit-events.ts`
- Command layer validates before insert

---

### 7. Time Anchoring: Economic vs Audit Time

**Decision**: Events capture two timestamps:

- `occurred_at`: When the economic event happened (user-specified)
- `recorded_at`: When the system recorded it (system-generated)

**Rationale**:
- Economic time = when invoice was issued, payment received, etc.
- Audit time = when the system learned about it
- These can differ (late entry, corrections, imports)
- Both are needed for compliance and debugging

**Implications**:
- ✅ Ledger sorts by `occurred_at`
- ✅ Audit trail shows `recorded_at`
- ✅ Late entries are visible and traceable
- ❌ Cannot backdate `recorded_at`

**Enforcement**:
- `occurred_at` user-provided, validated
- `recorded_at` auto-generated by DB
- Both immutable after insert

---

### 8. Payment Reconciliation: Unified Truth

**Decision**: All payments (Stripe, bank, cash) flow through `cmd_payment_record`.

**Rationale**:
- Stripe and treasury systems currently parallel
- No single source of truth for "paid amount"
- Partial payments not tracked
- Events missing for manual payments

**Implications**:
- ✅ Stripe webhook calls `cmd_payment_record`
- ✅ Manual payments call `cmd_payment_record`
- ✅ All payments create `account_movement` + `document_payment` + event
- ✅ `paid_amount` updated atomically
- ❌ No direct invoice updates from triggers
- ❌ No payment without event

**Enforcement**:
- Idempotency via provider payment IDs
- Trigger removed from `invoice_payments`
- Command layer handles all payment logic

---

### 9. Decision Enforcement: Backend Only

**Decision**: Decision validation happens in command layer, not UI.

**Rationale**:
- UI validation can be bypassed via API
- Governance must be enforced server-side
- Audit trail must be complete
- Legal compliance requires backend enforcement

**Implications**:
- ✅ Commands check decision status, limits, allowed actions
- ✅ Usage counters incremented atomically
- ✅ Approval events reference decision ID
- ❌ UI validation is UX-only (not security)
- ❌ Cannot approve without valid decision

**Enforcement**:
- `cmd_invoice_approve` validates decision
- `cmd_invoice_post` requires approval
- RPC returns error if decision invalid
- Audit events capture decision usage

---

### 10. Ledger-Safe Operations: Postable, Reversible, Inspectable

**Decision**: All financial operations must be:

1. **Postable**: Can be written to ledger with clear debit/credit
2. **Reversible**: Can be corrected via reversal event (not deletion)
3. **Inspectable**: Full audit trail from event log

**Rationale**:
- Accounting requires immutability
- Corrections via reversals, not edits
- Audit trail must be complete and tamper-evident

**Implications**:
- ✅ Posted events cannot be deleted
- ✅ Corrections create new reversal events
- ✅ Audit panel shows full history
- ❌ No soft deletes after posting
- ❌ No silent edits to posted documents

**Enforcement**:
- `cmd_invoice_reverse` creates reversal event
- Posted events have `is_reversed` flag
- Period close prevents mutations

---

## Migration Path

### Phase 1: Event System (Week 1)
- Migrate to unified `events` table
- Define canonical event types
- Update `NewInvoice` to emit events

### Phase 2: Dual States (Week 2)
- Extend `invoices` schema
- Backfill existing data
- Update UI components

### Phase 3: Command Layer (Week 3)
- Create command RPCs
- Implement authority checks
- Migrate UI to commands

### Phase 4: Payment Unification (Week 4)
- Build `cmd_payment_record`
- Add idempotency
- Remove Stripe trigger

### Phase 5: Decision Enforcement (Week 5)
- Backend validation
- Usage tracking
- Audit events

### Phase 6: UX Polish (Week 6)
- Audit panel wiring
- Dual-state badges
- Timeline views

### Phase 7: Hardening (Week 7+)
- Period close
- Event hash chaining
- KSeF integration prep

---

## Non-Goals (Deferred)

The following are explicitly **out of scope** until core accounting is locked:

- ❌ Payroll
- ❌ AI auto-posting
- ❌ Advanced analytics
- ❌ PSD2 bank sync
- ❌ Multi-currency beyond EUR/PLN
- ❌ Inventory management

---

## Consequences

### Positive
- ✅ Deterministic system of record
- ✅ Complete audit trail
- ✅ Regulatory compliance ready
- ✅ Time-travel debugging
- ✅ Governance enforcement
- ✅ Performance via snapshots

### Negative
- ⚠️ More complex than CRUD
- ⚠️ Requires developer discipline
- ⚠️ Migration effort for existing data
- ⚠️ Learning curve for team

### Mitigations
- Clear command layer abstractions
- Comprehensive documentation
- Phased rollout with backfills
- UI hides complexity from users

---

## Review and Updates

This ADR is a living document. Changes require:

1. Discussion with technical lead
2. Impact analysis on existing code
3. Migration plan for breaking changes
4. Update to this document with rationale

**Last Updated**: December 29, 2025  
**Next Review**: After Phase 3 completion
