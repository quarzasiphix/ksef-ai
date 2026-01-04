# Event Creation Audit & Implementation Plan

## Current State Analysis

### Events ARE Being Created ✅
Based on code review:

**Invoices Module:**
- ✅ `invoice_created` - when invoice saved
- ✅ `invoice_issued` - when invoice issued
- ✅ `payment_recorded` - when cash payment recorded
- Location: `src/modules/invoices/screens/invoices/NewInvoice.tsx`

**Contracts Module:**
- ✅ Uses `logEvent` from unifiedEventsRepository
- Location: `src/modules/contracts/components/ContractNewModal.tsx`, `ContractNew.tsx`

**Banking Module:**
- ✅ Uses `logEvent` 
- Location: `src/modules/banking/components/BankAccountsSection.tsx`

**Kasa (Cash) Module:**
- ✅ Uses `logEvent`
- Location: `src/modules/accounting/screens/Kasa.tsx`

**Other Entities:**
- ✅ Customers: `src/modules/customers/screens/NewCustomer.tsx`
- ✅ Employees: `src/modules/employees/screens/NewEmployee.tsx`
- ✅ Products: `src/modules/products/screens/NewProduct.tsx`

### Critical Gaps (Events NOT Being Created) ❌

#### 1. Invoice Lifecycle Events Missing
- ❌ `invoice_edited` - when invoice updated
- ❌ `invoice_cancelled` - when invoice voided/cancelled
- ❌ `invoice_paid` - when payment received (bank transfer)
- ❌ `invoice_overdue` - when invoice becomes overdue

#### 2. Expense Events Missing Entirely
- ❌ `expense_created`
- ❌ `expense_edited`
- ❌ `expense_paid`
- ❌ `expense_cancelled`

#### 3. Bank Transaction Events Missing
- ❌ `bank_transaction_imported` - when bank statement imported
- ❌ `bank_transaction_matched` - when linked to invoice/expense
- ❌ `bank_transaction_split` - when split into multiple events
- ❌ `bank_transaction_reconciled` - when reconciliation confirmed

#### 4. Contract Lifecycle Events Incomplete
- ❌ `contract_signed` - when signatures complete
- ❌ `contract_amended` - when contract modified
- ❌ `contract_terminated` - when contract ends

#### 5. Document Events Missing
- ❌ `document_uploaded`
- ❌ `document_linked` - when attached to entity
- ❌ `document_removed`

#### 6. Decision Events Missing
- ❌ `decision_created`
- ❌ `decision_approved`
- ❌ `decision_signed`
- ❌ `decision_revoked`

#### 7. Accounting Events Missing
- ❌ `event_closed` - when accounting event closed (should be in close RPC)
- ❌ `event_verified` - when event verified (should be in verify RPC)
- ❌ `accounts_assigned` - when Wn/Ma assigned
- ❌ `posting_template_applied` - when auto-posting used

#### 8. Period Events Missing
- ❌ `period_commit_proposed` - when commit candidate created
- ❌ `period_commit_accepted` - when period locked
- ❌ `period_commit_superseded` - when new candidate replaces old

#### 9. Correction Events Missing
- ❌ `event_corrected` - when correction event created
- ❌ `event_reversed` - when reversal event created

## Implementation Priority

### Phase 1: Core Financial Events (IMMEDIATE)
**Goal:** Make Timeline/Posting screens show real activity

1. **Expense Events** (highest priority - completely missing)
   - Find expense create/edit/delete screens
   - Add event logging to all CRUD operations
   - Expected: 4 event types

2. **Invoice Payment Events** (high priority - partial)
   - Add `invoice_paid` when bank payment received
   - Add `invoice_cancelled` when voided
   - Expected: 2 event types

3. **Accounting Operation Events** (high priority - drawer actions)
   - Add to `close_accounting_event` RPC
   - Add to `verify_event_integrity` RPC
   - Add to future `update_event_accounts` RPC
   - Expected: 3 event types

### Phase 2: Bank Reconciliation Events (NEXT)
**Goal:** Make Reconciliation screen operational

4. **Bank Import Events**
   - Create when CSV/MT940 imported
   - Create when transactions staged
   - Expected: 2 event types

5. **Bank Matching Events**
   - Create when transaction matched to invoice/expense
   - Create when manual link created
   - Expected: 2 event types

### Phase 3: Document & Contract Events (LATER)
**Goal:** Complete audit trail

6. **Document Events**
   - Upload, link, remove
   - Expected: 3 event types

7. **Contract Lifecycle Events**
   - Signed, amended, terminated
   - Expected: 3 event types

### Phase 4: Period Close Events (LATER)
**Goal:** Git-like commit workflow

8. **Period Commit Events**
   - Proposed, accepted, superseded
   - Expected: 3 event types

## Immediate Action Items

### Action 1: Find Expense Module Structure
```bash
# Search for expense creation screens
find src/modules -name "*expense*" -o -name "*Expense*"
```

### Action 2: Add Expense Event Logging
**Files to modify:**
- Expense create screen
- Expense edit screen
- Expense delete/cancel handler

**Pattern to follow (from invoices):**
```typescript
import { logEvent } from '@/modules/accounting/data/unifiedEventsRepository';

// After successful create
await logEvent(
  businessProfileId,
  'expense_created',
  'expense',
  expenseId,
  `Wydatek utworzony: ${expenseNumber}`,
  {
    metadata: {
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category,
    }
  }
);
```

### Action 3: Add Accounting Events to RPCs
**File:** `supabase/migrations/20260104_posting_readiness_and_close.sql`

**Modify `close_accounting_event` to create audit event:**
```sql
-- After setting is_closed = TRUE
INSERT INTO events (
  business_profile_id,
  event_type,
  entity_type,
  entity_id,
  action_summary,
  actor_id,
  actor_name,
  metadata
) VALUES (
  v_event.business_profile_id,
  'event_closed',
  'accounting_event',
  p_event_id,
  'Zdarzenie zamknięte',
  p_actor_id,
  p_actor_name,
  jsonb_build_object(
    'event_hash', v_event_hash,
    'period_year', v_period_year,
    'period_month', v_period_month
  )
);
```

### Action 4: Add Invoice Payment Event
**File:** Invoice payment handler (need to find)

**When bank payment received:**
```typescript
await logEvent(
  businessProfileId,
  'invoice_paid',
  'invoice',
  invoiceId,
  `Faktura opłacona: ${invoiceNumber}`,
  {
    metadata: {
      payment_method: 'bank_transfer',
      bank_transaction_id: transactionId,
      amount: paymentAmount,
    }
  }
);
```

## Expected Outcomes

### After Phase 1 Implementation:
- **Timeline:** Shows 10-20 events per day (invoices + expenses + accounting ops)
- **Posting:** Shows all events with proper period assignment
- **Reconciliation:** Shows closed/verified events

### After Phase 2 Implementation:
- **Reconciliation:** Shows bank import activity
- **Reconciliation:** Shows matching suggestions
- **Timeline:** Shows bank transaction flow

### After Phase 3 Implementation:
- **Timeline:** Complete audit trail for all entities
- **Drawer:** Shows full event chain for any document

### After Phase 4 Implementation:
- **Period Close:** Shows commit history
- **Reports:** Can reference canonical commits

## Testing Checklist

After implementing each phase:

1. ✅ Create 1 invoice → see `invoice_created` + `invoice_issued` in Timeline
2. ✅ Create 1 expense → see `expense_created` in Timeline
3. ✅ Open event drawer → assign Wn/Ma → see `accounts_assigned` in Timeline
4. ✅ Close event → see `event_closed` in Timeline
5. ✅ Verify event → see `event_verified` in Timeline
6. ✅ Import bank statement → see `bank_transaction_imported` in Timeline
7. ✅ Match transaction → see `bank_transaction_matched` in Timeline

## Files to Modify

### Immediate (Phase 1):
- [ ] Find expense create screen
- [ ] Find expense edit screen
- [ ] Find invoice payment handler
- [ ] Modify `close_accounting_event` RPC
- [ ] Modify `verify_event_integrity` RPC
- [ ] Create `update_event_accounts` RPC with event logging

### Next (Phase 2):
- [ ] Bank import screen (to be created)
- [ ] Bank matching logic (to be created)

### Later (Phase 3-4):
- [ ] Document upload handlers
- [ ] Contract lifecycle handlers
- [ ] Period commit handlers

## Success Metrics

**Before:**
- Events module looks empty
- Timeline shows 0-2 events
- Posting tab shows empty state
- Reconciliation tab shows empty state

**After Phase 1:**
- Timeline shows 10-20 events per day
- Posting tab shows events grouped by period
- Drawer actions create audit trail
- System feels "alive"

**After Phase 2:**
- Reconciliation tab shows real work queue
- Bank import creates visible activity
- Matching workflow is traceable

**After All Phases:**
- Complete audit trail for all operations
- No silent state changes
- Every action has event proof
- Period close has commit history
