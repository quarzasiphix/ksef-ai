# Simplified Accounting System Refactor

## Overview
Refactoring the accounting system to eliminate redundant journal_entries storage and use the existing `accounting_status` column on invoices table.

## Current Problems
1. **Double Storage**: Invoices are stored in both `invoices` table and `journal_entries` table
2. **Complexity**: Complex posting rules and journal entry creation
3. **Inefficiency**: Every invoice needs to be accounted, so creating separate journal entries is redundant
4. **Confusion**: Księga główna queries journal_entries instead of invoices directly

## New Simplified Approach

### Core Principle
**Use `accounting_status` column on invoices table instead of creating journal entries**

### Accounting Status Values
- `unposted` - Invoice not yet accounted
- `posted` - Invoice accounted (księgowane)
- `needs_review` - Requires manual review

### Changes Required

#### 1. Invoice Posting Logic
**Before**: Create journal_entries records
**After**: Update `accounting_status` to 'posted'

```sql
-- Old approach (complex)
INSERT INTO journal_entries (invoice_id, account_code, debit, credit, ...)
VALUES (...);

-- New approach (simple)
UPDATE invoices 
SET accounting_status = 'posted',
    posted_at = NOW(),
    posted_by = user_id
WHERE id = invoice_id;
```

#### 2. Księga Główna (General Ledger)
**Before**: Query `journal_entries` table
**After**: Query `invoices` table with `accounting_status = 'posted'`

```sql
-- New query for Księga główna
SELECT * FROM invoices
WHERE business_profile_id = ?
  AND accounting_status = 'posted'
  AND issue_date BETWEEN start_date AND end_date
ORDER BY issue_date DESC;
```

#### 3. Accounting Icon in Ledger List
Check `accounting_status` per business profile:
- ✅ Green checkmark: `accounting_status = 'posted'`
- ⚠️ Yellow warning: `accounting_status = 'needs_review'`
- ⭕ Gray circle: `accounting_status = 'unposted'`

#### 4. JDG Ryczalt Handling
For JDG profiles with ryczalt tax type:
- Save `ryczalt_account_id` on invoice
- Mark as `accounting_status = 'posted'`
- No separate journal entries needed

#### 5. Expense vs Income
Same invoice can be:
- **Income** for seller (based on their business_profile_id)
- **Expense** for buyer (based on shared invoice or their business_profile_id)

Determined by `transaction_type` field on invoice.

## Implementation Steps

### Step 1: Simplify Posting Functions
- Modify `auto_post_invoice` to only update `accounting_status`
- Remove journal_entries creation logic
- Keep ryczalt_account_id assignment for JDG

### Step 2: Update Księga Główna
- Change query from `journal_entries` to `invoices`
- Filter by `accounting_status = 'posted'`
- Show both income and expenses

### Step 3: Update Ledger Icons
- Check `accounting_status` instead of `journal_entry_id`
- Centralized function to determine accounting state

### Step 4: RLS Policies
Ensure invoices table RLS allows users to see:
- Invoices for their business profiles
- Shared invoices where they are receiver

### Step 5: Business Profile Protection
- Add unique constraint on business profiles per user
- Implement invitation system for multi-user companies

## Benefits
1. ✅ **Simpler**: No redundant data storage
2. ✅ **Faster**: Direct queries on invoices table
3. ✅ **Clearer**: Single source of truth
4. ✅ **Efficient**: Less database operations
5. ✅ **Maintainable**: Easier to understand and debug

## Migration Notes
- Existing journal_entries can remain for historical data
- New invoices will only use accounting_status
- Księga główna will show both old (from journal_entries) and new (from invoices) data during transition

## Database Changes Needed
1. Ensure `accounting_status` has proper default value
2. Add indexes on `accounting_status` for performance
3. Update RLS policies on invoices table
4. Add business_profile ownership constraints

## Files to Modify
1. `postingRulesRepository.ts` - Simplify posting functions
2. `AutoPostingButton.tsx` - Update success messages
3. Księga główna components - Query invoices instead of journal_entries
4. `LedgerRow.tsx` - Check accounting_status for icon
5. Invoice detail views - Show accounting status

## Testing Checklist
- [ ] Auto-post invoice updates accounting_status
- [ ] Księga główna shows posted invoices
- [ ] Ledger icons reflect accounting status
- [ ] JDG ryczalt accounts save correctly
- [ ] RLS policies work correctly
- [ ] Business profile protection works
- [ ] Shared invoices display correctly
