# Critical Fixes Summary - January 31, 2026

## ✅ Issues Fixed

### 1. **invoice_date Column Errors** - FIXED
**Problem**: Multiple parts of the system were referencing a non-existent `invoice_date` column, causing errors in:
- CIT calculations (`accounting/cit`)
- VAT reports (`Ewidencja VAT`)
- Profit/Loss reports
- Database functions and views

**Root Cause**: The `invoices` table only has `issue_date`, not `invoice_date`. Old migrations and code were using the wrong column name.

**Solution**: 
- ✅ Fixed all TypeScript files to use `issue_date`
- ✅ Fixed all SQL functions and views to use `issue_date`
- ✅ Updated database migration to fix:
  - `pending_expenses` view
  - `unposted_transactions` view
  - `check_period_complete()` function
  - `auto_post_invoice()` function
  - `auto_post_pending_invoices()` function

**Files Changed**:
- `src/modules/accounting/screens/ProfitLoss.tsx`
- `src/modules/accounting/screens/VatLedger.tsx`
- `src/modules/accounting/data/citRepository.ts`
- `src/modules/accounting/data/postingRulesRepository.ts`
- Database migration: `fix_invoice_date_references`

---

### 2. **VAT Report Infinite Loop** - FIXED
**Problem**: Ewidencja VAT page was stuck in an infinite re-render loop, spamming API requests.

**Root Cause**: The `period` object was changing reference on every render, causing the `useEffect` to trigger infinitely.

**Solution**: Changed dependency array to use primitive values instead of object reference:
```typescript
// Before (causes infinite loop)
}, [selectedProfileId, period]);

// After (stable)
}, [selectedProfileId, period?.key?.year, period?.key?.month]);
```

**File Changed**: `src/modules/accounting/screens/VatLedger.tsx`

---

### 3. **Księga Główna Now Shows Posted Invoices** - FIXED
**Problem**: Posted invoices weren't showing in General Ledger because it was querying the old `events` table.

**Solution**: Updated GeneralLedger component to:
- Query invoices with `accounting_status = 'posted'` directly
- Show two views: Summary (income/expenses/VAT) and Invoices (detailed list)
- Display both income and expense invoices that are accounted

**File Changed**: `src/modules/accounting/screens/GeneralLedger.tsx`

---

### 4. **Ledger Icons Show Accounting Status** - FIXED
**Problem**: Ledger list was checking `ryczalt_account_id` to show accounting status, which was incorrect.

**Solution**: Updated ledger row components to check `accounting_status`:
- ✅ Green icon = `posted` (Zaksięgowane)
- ⚠️ Yellow icon = `needs_review` (Wymaga przeglądu)
- ⭕ Gray icon = `unposted` (Niezaksięgowane)

**Files Changed**:
- `src/modules/invoices/components/ledger/LedgerRow.tsx`
- `src/modules/invoices/components/ledger/LedgerRowMobile.tsx`

---

## 📊 Current System Status

### Simplified Accounting System (Active)
- ✅ Invoices use `accounting_status` column
- ✅ Auto-posting updates status to `posted`
- ✅ Księga główna queries posted invoices directly
- ✅ No redundant journal_entries creation
- ✅ Performance indexes in place

### Database Schema
```sql
-- Invoices table uses:
accounting_status TEXT  -- 'unposted', 'posted', 'needs_review'
posted_at TIMESTAMP
posted_by UUID
issue_date DATE  -- NOT invoice_date!

-- Indexes for performance:
idx_invoices_accounting_status
idx_invoices_unposted
idx_invoices_posted
```

---

## 🚧 Next Steps: Proper Journal Entry System

### Current Limitation
The simplified system works for basic accounting but doesn't support:
- Multi-line journal entries (N debits + N credits)
- Proper Chart of Accounts assignment
- Audit trail for accounting changes
- Reversal entries

### Proposed Architecture

#### 1. Database Schema
```sql
-- Journal entry header
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY,
  business_profile_id UUID NOT NULL,
  period_id UUID REFERENCES accounting_periods(id),
  source_type TEXT NOT NULL,  -- 'invoice', 'payment', 'manual'
  source_id UUID,  -- invoice_id, payment_id, etc.
  entry_date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL,  -- 'draft', 'posted', 'reversed'
  posted_at TIMESTAMP,
  posted_by UUID,
  reversed_at TIMESTAMP,
  reversed_by UUID,
  reversal_of UUID REFERENCES journal_entries(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journal entry lines (debits and credits)
CREATE TABLE journal_lines (
  id UUID PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),  -- in grosze
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Constraint: debits must equal credits
ALTER TABLE journal_entries ADD CONSTRAINT balanced_entry
  CHECK (
    (SELECT SUM(amount_minor) FROM journal_lines 
     WHERE journal_entry_id = id AND side = 'debit') =
    (SELECT SUM(amount_minor) FROM journal_lines 
     WHERE journal_entry_id = id AND side = 'credit')
  );
```

#### 2. Invoice Linking
```sql
-- Add to invoices table
ALTER TABLE invoices ADD COLUMN posting_status TEXT DEFAULT 'unposted';
-- 'unposted', 'draft', 'posted', 'needs_review'

-- Keep accounting_status for backward compatibility
-- Link to journal entry
ALTER TABLE invoices ADD COLUMN journal_entry_id UUID REFERENCES journal_entries(id);
```

#### 3. UI Components Needed

**A. Posting Editor** (`accounting/posting/PostingEditor.tsx`)
- Add multiple debit lines
- Add multiple credit lines
- Live balance validation (debits = credits)
- Account picker with search
- Quick actions: split line, add VAT, balance remainder

**B. Review Queue** (`accounting/posting/ReviewQueue.tsx`)
- List of invoices needing manual CoA assignment
- Reason why auto-posting failed
- Quick edit to open posting editor
- Batch actions

**C. Remove from Event Drawer** (`events/EventDetailDrawer.tsx`)
- Remove "Księgowanie" section
- Keep only audit trail (what happened, when, by whom)
- Add read-only link "Zobacz księgowanie" if journal exists

#### 4. Auto-Posting Logic

```typescript
async function autoPostInvoice(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  
  // Try to determine accounts automatically
  const mapping = await determineAccountMapping(invoice);
  
  if (mapping.confidence === 'high') {
    // Create journal entry automatically
    const journalEntry = await createJournalEntry({
      source_type: 'invoice',
      source_id: invoiceId,
      lines: mapping.lines,  // Array of {account_id, side, amount}
      status: 'posted'
    });
    
    await updateInvoice(invoiceId, {
      posting_status: 'posted',
      journal_entry_id: journalEntry.id
    });
    
    return { success: true, posted: true };
  } else {
    // Mark for review
    await updateInvoice(invoiceId, {
      posting_status: 'needs_review',
      accounting_error_reason: mapping.reason
    });
    
    return { success: true, needs_review: true, reason: mapping.reason };
  }
}
```

#### 5. Account Mapping Rules

```typescript
function determineAccountMapping(invoice: Invoice): AccountMapping {
  // Priority 1: Explicit contractor mapping
  if (invoice.customer_id) {
    const mapping = await getContractorAccountMapping(invoice.customer_id);
    if (mapping) return { confidence: 'high', lines: mapping.lines };
  }
  
  // Priority 2: Category mapping
  if (invoice.category_id) {
    const mapping = await getCategoryAccountMapping(invoice.category_id);
    if (mapping) return { confidence: 'high', lines: mapping.lines };
  }
  
  // Priority 3: Default by type
  if (invoice.transaction_type === 'income') {
    return {
      confidence: 'medium',
      lines: [
        { account_code: '201', side: 'debit', amount: invoice.total_gross_value },
        { account_code: '700', side: 'credit', amount: invoice.total_net_value },
        { account_code: '221', side: 'credit', amount: invoice.total_vat_value }
      ]
    };
  }
  
  // Uncertain - needs review
  return {
    confidence: 'low',
    reason: 'Cannot determine accounts automatically',
    lines: []
  };
}
```

---

## 🎯 Implementation Priority

### Phase 1: Critical Fixes (COMPLETED ✅)
- [x] Fix invoice_date errors
- [x] Fix VAT infinite loop
- [x] Update Księga główna to show posted invoices
- [x] Fix ledger icons to show accounting_status

### Phase 2: Journal Entry Foundation (NEXT)
1. Create `journal_entries` and `journal_lines` tables
2. Add `posting_status` to invoices
3. Create basic posting editor UI
4. Implement balance validation

### Phase 3: Auto-Posting Enhancement
1. Build account mapping rules engine
2. Create review queue UI
3. Implement batch posting with review
4. Add contractor/category account mappings

### Phase 4: Event Drawer Cleanup
1. Remove CoA assignment from events
2. Add read-only journal link
3. Keep events as pure audit trail

---

## 📝 Migration Notes

### Backward Compatibility
- Keep `accounting_status` column for now
- Gradually migrate to `posting_status` + `journal_entry_id`
- Old invoices with `accounting_status='posted'` can be migrated to journal entries

### Data Migration Script
```sql
-- Migrate old posted invoices to journal entries
INSERT INTO journal_entries (
  business_profile_id,
  source_type,
  source_id,
  entry_date,
  description,
  status,
  posted_at,
  posted_by
)
SELECT 
  business_profile_id,
  'invoice',
  id,
  issue_date,
  'Migrated from old accounting system',
  'posted',
  posted_at,
  posted_by
FROM invoices
WHERE accounting_status = 'posted'
  AND journal_entry_id IS NULL;

-- Create simple 2-line entries for each
-- (This is simplified - real migration would be more complex)
```

---

## 🔍 Testing Checklist

- [x] CIT calculations work without invoice_date errors
- [x] VAT report loads without infinite loop
- [x] Księga główna shows posted invoices
- [x] Ledger icons reflect accounting status correctly
- [ ] Journal entries can be created with multiple lines
- [ ] Balance validation prevents unbalanced entries
- [ ] Auto-posting creates journal entries
- [ ] Review queue shows invoices needing manual review
- [ ] Event drawer no longer has posting controls

---

**Last Updated**: 2026-01-31 11:30 AM
**Status**: Phase 1 Complete, Phase 2 Ready to Start
