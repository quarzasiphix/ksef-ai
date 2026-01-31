# Journal Entry System - Implementation Complete

## ✅ Database Schema Created

### Tables

**journal_entries** - Journal entry header
- `id` - UUID primary key
- `business_profile_id` - Link to business profile
- `period_id` - Link to accounting period
- `source_type` - Type of source (invoice, payment, manual, etc.)
- `source_id` - Reference to source document
- `entry_date` - Date of entry
- `description` - Entry description
- `reference_number` - External reference (invoice number, etc.)
- `entry_status` - Status (draft, posted, reversed, void)
- `posted_at`, `posted_by` - Posting audit
- `reversed_at`, `reversed_by`, `reversal_of`, `reversal_reason` - Reversal tracking
- `created_at`, `created_by`, `updated_at`, `updated_by` - Audit trail
- `notes`, `tags` - Metadata

**journal_lines** - Journal entry lines (N debits + N credits)
- `id` - UUID primary key
- `journal_entry_id` - Link to journal entry
- `account_id` - Link to chart of accounts
- `side` - 'debit' or 'credit'
- `amount_minor` - Amount in grosze (smallest currency unit)
- `description` - Line description
- `line_number` - For ordering
- `project_id`, `department_id`, `cost_center` - Dimensions (future)
- `tags` - Metadata

**invoices** - Updated columns
- `posting_status` - Status (unposted, draft, posted, needs_review, error)
- `journal_entry_id` - Link to journal entry (already existed)

### Views

**journal_entries_with_lines** - Convenient view joining entries with lines
- Aggregates all lines as JSONB array
- Calculates total debits and credits
- Includes account codes and names

### Constraints

- **Balance validation**: Debits must equal credits (enforced at application level)
- **Unique line numbers**: Per journal entry
- **Status checks**: Can only update/delete drafts
- **Reversal validation**: Reversed entries must have reversal timestamp

### Indexes

- `idx_journal_entries_business_profile` - Fast lookup by business profile
- `idx_journal_entries_status` - Filter by status
- `idx_journal_entries_source` - Find entries by source
- `idx_journal_lines_account` - Account-level queries
- `idx_journal_lines_entry` - Line lookup
- `idx_invoices_posting_status` - Find unposted invoices

### RLS Policies

All tables have Row Level Security enabled:
- Users can only access journal entries for their business profiles
- Can only modify draft entries
- Posted entries are read-only (must be reversed, not edited)

---

## 📁 TypeScript Implementation

### Types (`accounting/types/journal.ts`)

```typescript
JournalEntry - Full journal entry with lines
JournalLine - Individual debit/credit line
CreateJournalEntryInput - Input for creating entries
CreateJournalLineInput - Input for creating lines
PostingValidationResult - Validation results
```

### Repository (`accounting/data/journalRepository.ts`)

**Core Functions:**
- `createJournalEntry()` - Create entry with lines
- `getJournalEntry()` - Get entry by ID
- `getJournalEntries()` - List entries with filters
- `postJournalEntry()` - Post a draft entry
- `updateJournalLines()` - Update lines (drafts only)
- `deleteJournalEntry()` - Delete draft entry
- `reverseJournalEntry()` - Reverse posted entry

**Invoice Integration:**
- `getInvoiceJournalEntries()` - Get all journal entries for invoice
- `createJournalFromInvoice()` - Create journal from invoice
- `postInvoiceJournal()` - Post journal and update invoice status

**Validation:**
- `validateJournalBalance()` - Ensure debits = credits
- Prevents posting unbalanced entries
- Checks for zero amounts, duplicate line numbers

---

## 🎯 How It Works

### 1. Create Draft Journal Entry

```typescript
const entry = await createJournalEntry({
  business_profile_id: profileId,
  source_type: 'invoice',
  source_id: invoiceId,
  entry_date: '2026-01-31',
  description: 'Sprzedaż - FV/2026/01/001',
  reference_number: 'FV/2026/01/001',
  lines: [
    { account_id: '...', side: 'debit', amount: 1000.00, line_number: 1 },
    { account_id: '...', side: 'credit', amount: 813.01, line_number: 2 },
    { account_id: '...', side: 'credit', amount: 186.99, line_number: 3 },
  ]
});
```

### 2. Validation

Before creating, the system validates:
- ✅ At least one debit and one credit
- ✅ Debits equal credits (within 0.01 PLN tolerance)
- ✅ All amounts > 0
- ✅ No duplicate line numbers

### 3. Post Entry

```typescript
await postJournalEntry(entry.id);
// Changes status from 'draft' to 'posted'
// Sets posted_at and posted_by
// If linked to invoice, updates invoice.posting_status
```

### 4. Reversal (if needed)

```typescript
await reverseJournalEntry(entry.id, 'Correction needed');
// Creates reversing entry with flipped debits/credits
// Marks original as 'reversed'
// Links entries together
```

---

## 🔄 Integration with Existing System

### Backward Compatibility

**Old System** (accounting_status on invoices):
- Still works for simple accounting
- `accounting_status = 'posted'` means invoice is accounted

**New System** (journal entries):
- `posting_status = 'posted'` means invoice has journal entry
- `journal_entry_id` links to the journal entry
- Both statuses are synced when posting via journal

### Migration Path

1. **Phase 1** (Current): Both systems coexist
   - Simple auto-posting uses `accounting_status`
   - Manual posting uses journal entries
   - Księga główna shows both

2. **Phase 2** (Future): Gradual migration
   - Auto-posting creates journal entries
   - Old posted invoices migrated to journal entries
   - `accounting_status` becomes read-only

3. **Phase 3** (Final): Full journal system
   - All accounting via journal entries
   - `accounting_status` deprecated
   - Full audit trail and reversal support

---

## 🚧 Next Steps

### 1. Build Posting Editor UI ✅ (Ready to implement)

Component: `accounting/posting/PostingEditor.tsx`

Features:
- Add/remove debit lines
- Add/remove credit lines
- Live balance validation
- Account picker with search
- Quick actions (split line, add VAT, balance)
- Save as draft / Post

### 2. Auto-Posting with CoA Assignment

Function: `autoPostInvoiceWithJournal()`

Logic:
```typescript
1. Get invoice details
2. Determine accounts based on:
   - Contractor mapping (if exists)
   - Category mapping (if exists)
   - Default by transaction type
3. If confident (high confidence):
   - Create journal entry
   - Post immediately
4. If uncertain (low confidence):
   - Mark invoice as 'needs_review'
   - Add to review queue
```

### 3. Review Queue UI

Component: `accounting/posting/ReviewQueue.tsx`

Shows:
- Invoices with `posting_status = 'needs_review'`
- Reason why auto-posting failed
- Quick edit button to open posting editor
- Batch actions

### 4. Remove CoA from Event Drawer

Update: `events/EventDetailDrawer.tsx`

Changes:
- Remove "Księgowanie" section
- Keep only audit trail
- Add read-only link "Zobacz księgowanie" if journal exists
- Link opens posting editor in read-only mode

---

## 📊 Example Journal Entry

**Invoice**: FV/2026/01/001 - 1,000 PLN (813.01 net + 186.99 VAT)

**Journal Entry**:
```
Wn (Debit)  201 - Należności      1,000.00
Ma (Credit) 700 - Przychody         813.01
Ma (Credit) 221 - VAT należny       186.99
                                  ---------
Total                             1,000.00 = 1,000.00 ✓
```

**Database**:
```sql
journal_entries:
  id: abc-123
  description: "Sprzedaż - FV/2026/01/001"
  entry_status: 'posted'
  
journal_lines:
  1. account: 201, side: debit,  amount: 100000 grosze
  2. account: 700, side: credit, amount: 81301 grosze
  3. account: 221, side: credit, amount: 18699 grosze
```

---

## 🎨 UI Components Needed

1. **PostingEditor** - Multi-line journal entry editor
2. **ReviewQueue** - List of invoices needing manual CoA
3. **JournalEntryView** - Read-only view of posted entries
4. **AccountPicker** - Search and select CoA accounts
5. **BalanceIndicator** - Live debit/credit balance display

---

## ✅ Benefits

1. **Proper Accounting** - Full double-entry bookkeeping
2. **Audit Trail** - Complete history of all entries
3. **Reversals** - Proper correction mechanism
4. **Multi-line Support** - Complex transactions (VAT, splits, etc.)
5. **Flexibility** - Manual adjustments, opening balances, etc.
6. **Query Power** - Account-level reporting and analysis
7. **Future-proof** - Supports dimensions (projects, departments)

---

**Status**: Database and repository complete ✅  
**Next**: Build posting editor UI  
**Last Updated**: 2026-01-31 11:45 AM
