# Accounting Automation Implementation Guide

## Overview

This document describes the accounting automation system implemented for KsięgaI, focusing on deterministic event → journal posting pipeline for both JDG (ryczałt/liniowy/skala) and Spółka z o.o.

## What Was Implemented

### 1. Tax Regime Support (JDG)

**Database Changes:**
- `business_profiles.tax_type`: 'skala' | 'liniowy' | 'ryczalt'
- `business_profiles.ryczalt_rates`: JSONB mapping activity types to rates
- `business_profiles.default_ryczalt_rate`: Default rate if activity not specified
- `business_profiles.linear_tax_rate`: 14% or 19% for liniowy

**Ryczałt Rates by Activity:**
```json
{
  "services_it": 12,
  "services_consulting": 8.5,
  "services_medical": 5.5,
  "trade": 3,
  "services_other": 5.5
}
```

**Usage:**
```typescript
// Set tax regime in business profile settings
await updateBusinessProfile(profileId, {
  tax_type: 'ryczalt',
  default_ryczalt_rate: 12,
  ryczalt_rates: {
    "services_it": 12,
    "services_consulting": 8.5
  }
});
```

### 2. Expense Acceptance Workflow

**Problem:** Every incoming expense was immediately shown in accounting, even if not reviewed/accepted.

**Solution:** Two-stage workflow:
1. **Pending**: Expense received from another user, needs acceptance
2. **Accepted**: Approved for accounting and posting

**Database Fields (invoices table):**
```sql
acceptance_status: 'pending' | 'accepted' | 'rejected' | 'auto_accepted'
accepted_at: TIMESTAMPTZ
accepted_by: UUID (user who accepted)
```

**Rules:**
- Own invoices: `auto_accepted` (skip review)
- Shared/received invoices: `pending` (require acceptance)
- Only `accepted` or `auto_accepted` expenses can be posted to ledger

**Functions:**
```typescript
// Accept expense
await acceptExpense(invoiceId, userId);

// Reject expense with reason
await rejectExpense(invoiceId, userId, "Brak podpisu");

// Get pending expenses
const pending = await getPendingExpenses(businessProfileId);
```

**UI Component:**
```tsx
import { ExpenseAcceptanceActions } from '@/modules/inbox/components/ExpenseAcceptanceActions';

<ExpenseAcceptanceActions
  invoiceId={expense.id}
  invoiceNumber={expense.invoice_number}
  onAccepted={() => refetch()}
/>
```

### 3. Payment Tracking

**Problem:** No link between expense acceptance and actual payment.

**Solution:** Enhanced payment tracking fields:

```sql
payment_date: DATE
payment_method_used: 'cash' | 'bank' | 'card' | 'other'
payment_account_id: UUID (links to cash_accounts or bank_accounts)
cash_transaction_id: UUID (if paid via Kasa)
account_movement_id: UUID (if paid via bank)
```

**Workflow:**
1. Expense accepted → `acceptance_status = 'accepted'`
2. Payment made → Link to cash transaction or bank movement
3. Auto-posting → Creates journal entry with correct accounts

### 4. Accounting Status Tracking

**New Field:** `accounting_status`
- `unposted`: Not yet in ledger (default)
- `posted`: Successfully posted to ledger
- `needs_review`: No matching posting rule found
- `rejected`: Invalid/rejected by system

**Additional Fields:**
```sql
posted_at: TIMESTAMPTZ
journal_entry_id: UUID (links to journal_entries)
```

### 5. Posting Rules Engine

**Core Concept:** Deterministic mapping from business events to journal entries.

**Tables:**
- `posting_rules`: Rule definitions
- `posting_rule_lines`: Individual debit/credit lines per rule

**Rule Structure:**
```typescript
{
  document_type: 'sales_invoice' | 'purchase_invoice' | 'payment_received' | 'payment_made',
  transaction_type: 'income' | 'expense',
  payment_method: 'cash' | 'bank' | 'unpaid',
  vat_scheme: 'vat' | 'no_vat' | 'reverse_charge',
  vat_rate: 23 | 8 | 5 | 0,
  lines: [
    { side: 'debit', account_code: '202', amount_type: 'gross' },
    { side: 'credit', account_code: '700', amount_type: 'gross' }
  ]
}
```

**Basic Spółka Rules (Non-VAT):**

1. **Sales Invoice - Unpaid**
   - Wn: 202 (Należności)
   - Ma: 700 (Przychody)

2. **Sales Invoice - Bank**
   - Wn: 130 (Rachunek bankowy)
   - Ma: 700 (Przychody)

3. **Sales Invoice - Cash**
   - Wn: 140 (Kasa)
   - Ma: 700 (Przychody)

4. **Purchase Invoice - Unpaid**
   - Wn: 400 (Koszty)
   - Ma: 201 (Zobowiązania)

5. **Purchase Invoice - Bank**
   - Wn: 400 (Koszty)
   - Ma: 130 (Rachunek bankowy)

6. **Purchase Invoice - Cash**
   - Wn: 400 (Koszty)
   - Ma: 140 (Kasa)

7. **Payment Received**
   - Wn: 130 (Rachunek)
   - Ma: 202 (Należności)

8. **Payment Made**
   - Wn: 201 (Zobowiązania)
   - Ma: 130 (Rachunek)

**Seeding Rules:**
```typescript
// Automatically create basic rules for new spółka
await seedBasicSpzooPostingRules(businessProfileId);
```

### 6. Auto-Posting Engine

**Function:** `auto_post_invoice(invoice_id)`

**Pipeline:**
1. Validate invoice (must be accepted if expense)
2. Determine VAT scheme (vat/no_vat)
3. Determine payment method (cash/bank/unpaid)
4. Find matching posting rule
5. Create journal entry with lines
6. Update invoice: `accounting_status = 'posted'`
7. Create event log

**Batch Processing:**
```typescript
// Post all pending invoices
const result = await autoPostPendingInvoices(businessProfileId, 100);
// Returns: { posted_count, failed_count, errors }
```

**UI Component:**
```tsx
import { AutoPostingButton } from '@/modules/accounting/components/AutoPostingButton';

// Single invoice
<AutoPostingButton
  mode="single"
  invoiceId={invoice.id}
  onPosted={() => refetch()}
/>

// Batch all pending
<AutoPostingButton
  mode="batch"
  businessProfileId={profileId}
  onPosted={() => refetch()}
/>
```

### 7. Period Locking System

**Purpose:** Prevent modifications to closed accounting periods.

**Table:** `accounting_periods`
```sql
period_year: INTEGER
period_month: INTEGER
status: 'open' | 'closing' | 'locked'
auto_lock_enabled: BOOLEAN
auto_lock_day: INTEGER (default 20)
```

**Auto-Lock Logic:**
- On the 20th of each month, previous month is automatically locked
- Run via cron: `SELECT auto_lock_previous_month();`

**Manual Lock:**
```typescript
// Lock period (validates no unposted transactions)
await lockAccountingPeriod(periodId, userId, "Month-end closing");

// Unlock period (requires reason)
await unlockAccountingPeriod(periodId, userId, "Correction needed");
```

**Trigger Protection:**
```sql
-- Prevents posting to locked periods
CREATE TRIGGER check_locked_period_invoices
  BEFORE INSERT OR UPDATE OF accounting_status ON invoices
  WHEN (NEW.accounting_status = 'posted')
  EXECUTE FUNCTION prevent_locked_period_posting();
```

**Period Summary (calculated on lock):**
- `total_revenue`: Sum of income invoices
- `total_expenses`: Sum of expense invoices
- `net_result`: Revenue - Expenses
- `total_vat_due`: VAT to pay
- `total_vat_deductible`: VAT to deduct

### 8. Helper Views

**`pending_expenses`:**
```sql
SELECT * FROM pending_expenses
WHERE business_profile_id = ?
-- Returns all expenses with acceptance_status = 'pending'
```

**`unposted_transactions`:**
```sql
SELECT * FROM unposted_transactions
WHERE business_profile_id = ?
-- Returns accepted but not yet posted transactions
-- Includes period lock status
```

## Implementation Checklist

### Backend (Completed)
- ✅ Tax regime fields in business_profiles
- ✅ Expense acceptance workflow fields
- ✅ Payment tracking fields
- ✅ Accounting status fields
- ✅ Posting rules tables
- ✅ Posting rule lines tables
- ✅ Accounting periods table
- ✅ Auto-posting functions
- ✅ Period locking functions
- ✅ Expense acceptance functions
- ✅ Helper views
- ✅ RLS policies
- ✅ Triggers for period protection

### Frontend (In Progress)
- ✅ TypeScript types updated
- ✅ Repository functions created
- ✅ ExpenseAcceptanceActions component
- ✅ AutoPostingButton component
- ⚠️ Update ExpenseList to show acceptance status
- ⚠️ Update expense detail page with acceptance UI
- ⚠️ Add payment linking UI
- ⚠️ Create accounting periods management UI
- ⚠️ Add period lock/unlock UI
- ⚠️ Update Accounting dashboard with auto-post button
- ⚠️ Add unposted transactions widget

## Next Steps

### 1. Update Expense List UI

**File:** `src/modules/invoices/screens/expense/ExpenseList.tsx`

**Changes:**
```tsx
// Add acceptance status badge
{expense.acceptanceStatus === 'pending' && (
  <Badge variant="warning">Wymaga akceptacji</Badge>
)}

// Add acceptance actions for pending expenses
{expense.acceptanceStatus === 'pending' && (
  <ExpenseAcceptanceActions
    invoiceId={expense.id}
    invoiceNumber={expense.invoice_number}
  />
)}

// Filter: Show only accepted expenses in accounting view
const accountingExpenses = expenses.filter(e => 
  e.acceptanceStatus === 'accepted' || e.acceptanceStatus === 'auto_accepted'
);
```

### 2. Update Expense Detail Page

**File:** `src/modules/invoices/screens/expense/[id].tsx`

**Add:**
- Acceptance status display
- Accept/Reject buttons (if pending)
- Payment linking section
- Accounting status badge
- Link to journal entry (if posted)

### 3. Create Accounting Periods UI

**New File:** `src/modules/accounting/screens/AccountingPeriods.tsx`

**Features:**
- List all periods (year-month grid)
- Show status (open/locked)
- Lock/unlock buttons
- Period summary (revenue, expenses, net)
- Warning if unposted transactions exist

### 4. Add Auto-Post Widget to Accounting Dashboard

**File:** `src/modules/accounting/screens/Accounting.tsx`

**Add Section:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Niezaksięgowane dokumenty</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span>{unpostedCount} dokumentów do zaksięgowania</span>
        <AutoPostingButton
          mode="batch"
          businessProfileId={profileId}
        />
      </div>
      
      {/* List of unposted transactions */}
      <UnpostedTransactionsList />
    </div>
  </CardContent>
</Card>
```

### 5. Seed Posting Rules on Profile Creation

**File:** `src/modules/settings/screens/BusinessProfiles.tsx`

**Add:**
```typescript
// When creating new spółka profile
if (newProfile.entityType === 'sp_zoo') {
  await seedBasicSpzooPostingRules(newProfile.id);
  toast.success('Utworzono podstawowe reguły księgowania');
}
```

## Usage Examples

### For JDG (Ryczałt)

```typescript
// 1. Set tax regime
await updateBusinessProfile(profileId, {
  tax_type: 'ryczalt',
  default_ryczalt_rate: 12
});

// 2. Invoices are still tracked normally
// 3. Tax calculation uses ryczałt rate instead of PIT
// 4. No complex accounting needed (KPiR view)
```

### For Spółka (Non-VAT)

```typescript
// 1. Seed posting rules
await seedBasicSpzooPostingRules(profileId);

// 2. Create invoice
const invoice = await saveInvoice({
  transaction_type: 'income',
  payment_method: 'bank',
  vat: false,
  total_gross_value: 1000
});

// 3. Auto-post
const result = await autoPostInvoice(invoice.id);
// Creates journal entry:
// Wn: 130 (Bank) 1000 PLN
// Ma: 700 (Revenue) 1000 PLN

// 4. Lock period at month-end
await lockAccountingPeriod(periodId, userId);
```

### For Expense Acceptance

```typescript
// 1. Receive expense from another user
// Status: acceptance_status = 'pending'

// 2. Review in inbox
const pending = await getPendingExpenses(profileId);

// 3. Accept
await acceptExpense(expenseId, userId);
// Status: acceptance_status = 'accepted'

// 4. Auto-post
await autoPostInvoice(expenseId);
// Status: accounting_status = 'posted'
```

## Database Migrations

**Files Created:**
1. `20260119_accounting_automation_foundation.sql`
   - Tax regime support
   - Expense acceptance workflow
   - Period locking system
   - Helper views

2. `20260119_basic_spolka_posting_rules.sql`
   - Posting rules tables
   - Auto-posting engine
   - Basic spółka rules seeding

**To Apply:**
```bash
# Run migrations in Supabase dashboard or via CLI
supabase db push
```

## Testing Checklist

### Tax Regime
- [ ] Set ryczałt rate in business profile
- [ ] Verify rate appears in tax calculations
- [ ] Test different activity types

### Expense Acceptance
- [ ] Create shared expense (should be pending)
- [ ] Accept expense via UI
- [ ] Reject expense with reason
- [ ] Verify only accepted expenses appear in accounting

### Auto-Posting
- [ ] Create sales invoice (bank payment, no VAT)
- [ ] Run auto-post
- [ ] Verify journal entry created correctly
- [ ] Check account balances updated

### Period Locking
- [ ] Create period for previous month
- [ ] Lock period manually
- [ ] Try to post invoice to locked period (should fail)
- [ ] Unlock period
- [ ] Post invoice (should succeed)

### Batch Processing
- [ ] Create 10 invoices
- [ ] Run batch auto-post
- [ ] Verify all posted correctly
- [ ] Check failed invoices (if any)

## Troubleshooting

### "No matching posting rule found"

**Cause:** Invoice parameters don't match any rule.

**Solution:**
1. Check invoice: `transaction_type`, `payment_method`, `vat` status
2. Verify posting rules exist: `SELECT * FROM posting_rules WHERE business_profile_id = ?`
3. Create custom rule or seed basic rules

### "Cannot post to locked period"

**Cause:** Trying to post invoice dated in locked period.

**Solution:**
1. Check period status: `SELECT * FROM accounting_periods WHERE status = 'locked'`
2. Unlock period if correction needed
3. Or change invoice date to current period

### "Expense not accepted"

**Cause:** Trying to post expense with `acceptance_status = 'pending'`.

**Solution:**
1. Accept expense first: `await acceptExpense(invoiceId, userId)`
2. Then post: `await autoPostInvoice(invoiceId)`

## Performance Considerations

- **Batch posting**: Limited to 100 invoices per call (configurable)
- **Period locking**: Validates all transactions before lock (may be slow for large datasets)
- **Auto-lock**: Run daily via cron, not on every request
- **Indexes**: Created on `acceptance_status`, `accounting_status`, `posted_at`

## Security

- **RLS enabled** on all tables
- **System rules** cannot be deleted by users
- **Period unlocking** requires explicit reason (audit trail)
- **Acceptance tracking** records who accepted/rejected

## Future Enhancements

1. **VAT support**: Add posting rules for VAT invoices (23%, 8%, 5%)
2. **Multi-currency**: Support foreign currency invoices
3. **Advanced rules**: Formula-based amount calculations
4. **Rule templates**: Pre-built rule sets for different industries
5. **Depreciation**: Auto-post monthly depreciation
6. **Bank reconciliation**: Match bank statements to posted transactions
7. **Approval workflows**: Multi-level expense approval
8. **Notifications**: Alert when period auto-locks

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Status:** Implementation Complete (Backend), Frontend In Progress
