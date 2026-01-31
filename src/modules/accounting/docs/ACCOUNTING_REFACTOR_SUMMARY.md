# Accounting System Refactor - Implementation Summary

## ✅ Completed Changes

### 1. Simplified Invoice Posting System
**Problem**: Double storage of invoice data in both `invoices` and `journal_entries` tables.

**Solution**: Use `accounting_status` column on invoices table instead of creating journal entries.

#### Database Functions Created
- `auto_post_invoice_simple(p_invoice_id)` - Posts single invoice by updating accounting_status
- `auto_post_pending_invoices_simple(p_business_profile_id, p_limit, p_start_date, p_end_date)` - Batch posts invoices

#### Accounting Status Values
- `unposted` - Invoice not yet accounted (default)
- `posted` - Invoice accounted (księgowane)
- `needs_review` - Requires manual review (e.g., missing ryczalt account)

### 2. Updated TypeScript Repository
**File**: `src/modules/accounting/data/postingRulesRepository.ts`

Changed `autoPostInvoice()` and `autoPostPendingInvoices()` to call simplified database functions.

### 3. Updated Ledger Display Icons
**Files**: 
- `src/modules/invoices/components/ledger/LedgerRow.tsx`
- `src/modules/invoices/components/ledger/LedgerRowMobile.tsx`

Accounting icon now checks `accounting_status` instead of `ryczalt_account_id`:
- ✅ **Green**: `accounting_status = 'posted'` (Zaksięgowane)
- ⚠️ **Yellow**: `accounting_status = 'needs_review'` (Wymaga przeglądu)
- ⭕ **Gray**: `accounting_status = 'unposted'` (Niezaksięgowane)

### 4. Database Performance Indexes
Added indexes for better query performance:
- `idx_invoices_accounting_status` - Composite index on (business_profile_id, accounting_status, issue_date)
- `idx_invoices_unposted` - Partial index for unposted invoices
- `idx_invoices_posted` - Partial index for posted invoices (Księga główna queries)

### 5. General Ledger Repository
**File**: `src/modules/accounting/data/generalLedgerRepository.ts`

New repository for querying posted invoices:
- `getPostedInvoices()` - Get all accounted invoices for Księga główna
- `getAccountingSummary()` - Calculate income, expenses, and VAT summary
- `getUnpostedInvoicesCount()` - Count unaccounted invoices

## 📋 How It Works Now

### Posting an Invoice
1. User clicks "Auto-księguj" button
2. System calls `auto_post_invoice_simple(invoice_id)`
3. Function checks:
   - If already posted → return error
   - If JDG ryczalt without account → mark as `needs_review`
   - Otherwise → mark as `posted`
4. Invoice `accounting_status` updated to `posted`
5. UI shows green checkmark icon

### Księga Główna (General Ledger)
Instead of querying `journal_entries`, now queries:
```sql
SELECT * FROM invoices
WHERE business_profile_id = ?
  AND accounting_status = 'posted'
ORDER BY issue_date DESC
```

Shows both income and expenses that have been accounted.

### JDG Ryczalt Handling
For JDG profiles with ryczalt tax type:
1. Income invoices require `ryczalt_account_id` to be set
2. If not set, invoice marked as `needs_review`
3. User assigns ryczalt account via modal
4. Invoice can then be posted successfully

## 🔄 Migration Notes

### Backward Compatibility
- Existing `journal_entries` remain for historical data
- New invoices only use `accounting_status`
- Old posting functions still exist but are not called

### Data Integrity
- RLS policies already in place for invoices table
- Users can only see invoices for their business profiles
- Shared invoices visible to receivers

## 📊 Benefits

1. **Simpler Architecture**
   - Single source of truth (invoices table)
   - No redundant data storage
   - Easier to understand and maintain

2. **Better Performance**
   - Direct queries on invoices table
   - Optimized indexes for accounting queries
   - Fewer database operations

3. **Clearer Accounting Status**
   - Visual indicators in ledger list
   - Easy to see which invoices are accounted
   - Centralized status checking

4. **Flexible for Different Business Types**
   - Works for JDG with ryczalt
   - Works for Sp. z o.o. with full accounting
   - Same system for income and expenses

## 🚧 Remaining Tasks

### 1. Update Księga Główna UI
**File**: `src/modules/accounting/screens/GeneralLedger.tsx`

Currently queries `events` table. Should be updated to:
- Use `getPostedInvoices()` from generalLedgerRepository
- Display both income and expenses
- Show accounting summary

### 2. Business Profile Ownership Protection
Prevent duplicate business profiles across users:
- Add unique constraint on business profiles
- Implement invitation system for multi-user companies
- Add `company_members` table integration

### 3. Fix Zaliczki CIT Page
Ensure CIT advance payments page works correctly with new accounting system.

### 4. Documentation Updates
- Update user documentation
- Add migration guide for existing data
- Document new accounting workflow

## 🧪 Testing Checklist

- [x] Auto-post single invoice updates accounting_status
- [x] Batch auto-post processes multiple invoices
- [x] Ledger icons show correct accounting status
- [x] JDG ryczalt accounts handled correctly
- [ ] Księga główna displays posted invoices
- [ ] Accounting summary calculations correct
- [ ] RLS policies work correctly
- [ ] Shared invoices display properly
- [ ] Mobile view works correctly

## 📝 Database Schema Changes

### Invoices Table
- Uses existing `accounting_status` column
- Values: `unposted`, `posted`, `needs_review`
- Indexed for performance

### New Indexes
```sql
idx_invoices_accounting_status (business_profile_id, accounting_status, issue_date DESC)
idx_invoices_unposted (business_profile_id, issue_date) WHERE accounting_status = 'unposted'
idx_invoices_posted (business_profile_id, issue_date DESC) WHERE accounting_status = 'posted'
```

### New Functions
- `auto_post_invoice_simple(p_invoice_id UUID)`
- `auto_post_pending_invoices_simple(p_business_profile_id UUID, p_limit INT, p_start_date DATE, p_end_date DATE)`

## 🔐 Security Considerations

### RLS Policies (Already in Place)
- Users can only view/edit invoices for their business profiles
- Company members with permissions can access invoices
- Shared invoices visible to receivers
- Admin users have full access

### Data Access
- `accounting_status` updates require user authentication
- Only authorized users can post invoices
- Audit trail via `posted_at` and `posted_by` columns

## 📖 Usage Examples

### Post Single Invoice
```typescript
import { autoPostInvoice } from '@/modules/accounting/data/postingRulesRepository';

const result = await autoPostInvoice(invoiceId);
if (result.success) {
  console.log('Invoice posted successfully');
}
```

### Get Posted Invoices for Księga Główna
```typescript
import { getPostedInvoices } from '@/modules/accounting/data/generalLedgerRepository';

const invoices = await getPostedInvoices(
  businessProfileId,
  '2026-01-01',
  '2026-01-31'
);
```

### Check Accounting Status in UI
```typescript
const accountingIcon = invoice.accounting_status === 'posted' 
  ? <GreenCheckmark />
  : invoice.accounting_status === 'needs_review'
  ? <YellowWarning />
  : <GrayCircle />;
```

## 🎯 Next Steps

1. Update GeneralLedger.tsx to use new repository
2. Implement business profile ownership protection
3. Fix Zaliczki CIT page
4. Complete testing
5. Deploy to production
6. Monitor for issues
7. Update user documentation

---

**Last Updated**: 2026-01-31
**Status**: In Progress - Core functionality completed, UI updates pending
