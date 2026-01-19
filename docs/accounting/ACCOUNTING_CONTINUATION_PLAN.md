# Accounting System - Continuation Plan

## Status: Phase 1 Complete ✅

**Database migrations applied successfully via Supabase MCP**
- ✅ Tax regime fields (ryczałt, liniowy, skala)
- ✅ Expense acceptance workflow
- ✅ Accounting status tracking
- ✅ BusinessProfileForm updated with tax configuration UI

---

## Architecture Overview

### Core Principles (Non-Negotiable)

1. **Events are immutable** - Corrections via reversals, not edits
2. **Separate JDG and Spółka flows** - Different accounting methods
3. **Triple-entry for Spółka** - Event → Journal → Ledger
4. **Double-entry for JDG** - Simplified KPiR
5. **Period locking** - Auto-lock on 20th of month
6. **Acceptance workflow** - Expenses require review before accounting

### Entity Type Separation

| Feature | JDG (działalność) | Spółka (sp_zoo/sa) |
|---------|-------------------|---------------------|
| **Accounting Method** | KPiR (simplified) | Full CoA (triple-entry) |
| **Tax** | PIT (skala/liniowy/ryczałt) | CIT (9% or 19%) |
| **Capital Events** | ❌ No | ✅ Yes (uchwały required) |
| **Shareholders** | ❌ No | ✅ Yes |
| **Balance Sheet** | ⚠️ Optional | ✅ Required |
| **CoA** | ⚠️ Simplified | ✅ Full Polish CoA |
| **Ledger** | ⚠️ KPiR format | ✅ Full journal entries |
| **Auto-posting** | ⚠️ Simplified rules | ✅ Complex rules |
| **ZUS** | ✅ Owner contributions | ⚠️ Employee payroll |

---

## Phase 2: Separate Accounting Pages (PRIORITY)

### 2.1 Create JDG Accounting Page

**File:** `src/modules/accounting/screens/JdgAccounting.tsx`

**Features:**
- KPiR view (Księga Przychodów i Rozchodów)
- Tax regime display (ryczałt rate, liniowy, skala)
- VAT threshold tracker (if applicable)
- ZUS payment tracker
- PIT advance calculator
- JPK_V7M generation
- Simple expense categorization

**Layout:**
```tsx
<JdgAccounting>
  <TaxRegimeCard /> {/* Shows: Ryczałt 12%, VAT exempt */}
  <VatThresholdTracker /> {/* Progress: 150k/200k PLN */}
  <KPiRTable /> {/* LP | Data | Dokument | Przychód | Koszt */}
  <ZusPayments /> {/* Monthly ZUS obligations */}
  <PitAdvances /> {/* Quarterly PIT payments */}
  <JpkGenerator /> {/* JPK_V7M download */}
</JdgAccounting>
```

**No Capital Events, No Shareholders, No Complex CoA**

### 2.2 Create Spółka Accounting Page

**File:** `src/modules/accounting/screens/SpzooAccounting.tsx`

**Features:**
- Full Chart of Accounts view
- Journal entries list
- General ledger
- Capital events (contributions, dividends)
- Shareholders management
- Balance sheet
- P&L statement
- Period locking UI
- Auto-posting dashboard

**Layout:**
```tsx
<SpzooAccounting>
  <AccountingPeriodStatus /> {/* Current period: Open/Locked */}
  <UnpostedTransactions /> {/* 15 documents need posting */}
  <AutoPostButton /> {/* Batch post all */}
  <Tabs>
    <Tab: CoA /> {/* Chart of Accounts */}
    <Tab: Ledger /> {/* General Ledger */}
    <Tab: Capital /> {/* Capital Events */}
    <Tab: Shareholders /> {/* Shareholders */}
    <Tab: Statements /> {/* Balance Sheet, P&L */}
  </Tabs>
</SpzooAccounting>
```

### 2.3 Update AccountingShell Router

**File:** `src/modules/accounting/screens/AccountingShell.tsx`

```tsx
// Detect entity type
const isSpZoo = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

// Route to appropriate page
{isSpZoo ? <SpzooAccounting /> : <JdgAccounting />}
```

---

## Phase 3: Invoice Integration with Ledger

### 3.1 Auto-Post on Invoice Save (Spółka Only)

**File:** `src/modules/invoices/data/invoiceRepository.ts`

**Current:** Invoice saved → No accounting entry
**Target:** Invoice saved → Auto-post to ledger (if spółka)

```typescript
// In saveInvoice function, after invoice is saved:
if (businessProfile.entityType === 'sp_zoo' || businessProfile.entityType === 'sa') {
  // Auto-post to ledger
  try {
    const result = await autoPostInvoice(savedInvoice.id);
    if (result.success) {
      console.log('Auto-posted to ledger:', result.journal_entry_id);
    } else {
      console.warn('Auto-post failed:', result.error);
      // Mark as needs_review
    }
  } catch (error) {
    console.error('Auto-post error:', error);
  }
}
```

### 3.2 Acceptance Workflow Integration

**For shared/received expenses:**
1. Expense received → `acceptance_status = 'pending'`
2. User reviews in inbox
3. Accept → `acceptance_status = 'accepted'`
4. Auto-post (if spółka) → `accounting_status = 'posted'`

**UI Changes:**
- ExpenseList: Show acceptance badge
- Expense detail: Add accept/reject buttons
- Inbox: Filter pending expenses

---

## Phase 4: Posting Rules Seeding

### 4.1 Auto-Seed on Profile Creation

**File:** `src/modules/settings/data/businessProfileRepository.ts`

```typescript
// After creating spółka profile:
if (newProfile.entityType === 'sp_zoo' || newProfile.entityType === 'sa') {
  await seedBasicSpzooPostingRules(newProfile.id);
  await seedChartAccounts(newProfile.id); // If not exists
}
```

### 4.2 Posting Rules Management UI

**File:** `src/modules/accounting/screens/PostingRules.tsx`

**Features:**
- List all rules
- Create custom rule
- Edit rule (non-system only)
- Test rule against sample invoice
- Activate/deactivate rule

---

## Phase 5: ZUS Filing for JDG Ryczałt

### 5.1 ZUS Payment Tracker

**File:** `src/modules/accounting/components/ZusPaymentTracker.tsx`

**Features:**
- Monthly ZUS obligation calculator
- Payment status (paid/unpaid/overdue)
- Quick add ZUS expense
- Link to ZUS payment proof
- Historical payments

**Calculation:**
```typescript
// For ryczałt JDG:
const zusMonthly = {
  pension: 1380.48, // Emerytalne
  disability: 540.00, // Rentowe
  sickness: 320.00, // Chorobowe (optional)
  health: 450.00, // Zdrowotne
  total: 2690.48
};
```

### 5.2 ZUS Declaration Generator

**File:** `src/modules/accounting/services/zusDeclarationService.ts`

**Features:**
- Generate ZUS DRA form (XML)
- Pre-fill from business profile
- Download for e-ZUS submission
- Track submission status

---

## Phase 6: Period Locking UI

### 6.1 Accounting Periods Management

**File:** `src/modules/accounting/screens/AccountingPeriods.tsx`

**Features:**
- Calendar view of periods
- Status indicators (open/locked)
- Lock/unlock buttons
- Period summary (revenue, expenses, net)
- Validation before lock
- Unlock with reason (audit trail)

**UI:**
```tsx
<AccountingPeriods>
  <PeriodGrid>
    {periods.map(period => (
      <PeriodCard
        year={period.year}
        month={period.month}
        status={period.status}
        revenue={period.total_revenue}
        expenses={period.total_expenses}
        onLock={() => lockPeriod(period.id)}
        onUnlock={() => unlockPeriod(period.id)}
      />
    ))}
  </PeriodGrid>
</AccountingPeriods>
```

---

## Phase 7: Financial Statements

### 7.1 Balance Sheet (Spółka)

**File:** `src/modules/accounting/screens/BalanceSheet.tsx`

**Already exists but needs:**
- Integration with posted journal entries
- Real-time calculation from ledger
- Period comparison (current vs previous)
- Export to PDF/Excel

### 7.2 P&L Statement (Spółka)

**File:** `src/modules/accounting/screens/ProfitAndLoss.tsx`

**Features:**
- Revenue breakdown by account
- Expense breakdown by account
- Net profit/loss calculation
- Period comparison
- Export to PDF/Excel

### 7.3 KPiR View (JDG)

**File:** `src/modules/accounting/screens/KPiRView.tsx`

**Format:**
```
LP | Data | Numer | Kontrahent | Opis | Przychód | Koszt | Uwagi
1  | 2026-01-15 | FV/001/2026 | ABC Sp. z o.o. | Usługi IT | 5000.00 | - | -
2  | 2026-01-16 | - | XYZ | Hosting | - | 200.00 | -
```

**Features:**
- Filter by date range
- Filter by category
- Export to Excel
- Print-ready format

---

## Implementation Order (Recommended)

### Week 1: Separate Pages
1. ✅ Update BusinessProfileForm (DONE)
2. Create `JdgAccounting.tsx`
3. Create `SpzooAccounting.tsx`
4. Update `AccountingShell.tsx` router
5. Test entity type detection

### Week 2: Invoice Integration
1. Update `invoiceRepository.ts` with auto-post
2. Add acceptance workflow to ExpenseList
3. Add accept/reject buttons to expense detail
4. Test: Create invoice → Auto-post → Verify ledger

### Week 3: Posting Rules & Seeding
1. Auto-seed rules on profile creation
2. Create PostingRules management UI
3. Test: Create spółka → Verify rules exist
4. Test: Create invoice → Verify rule match

### Week 4: ZUS & Period Locking
1. Create ZusPaymentTracker component
2. Create AccountingPeriods UI
3. Implement lock/unlock with validation
4. Test: Lock period → Try to post → Verify blocked

### Week 5: Financial Statements
1. Update BalanceSheet with real-time data
2. Create ProfitAndLoss component
3. Create KPiRView component
4. Add export functionality

---

## Database Schema Summary

### Existing Tables (Used)
- `business_profiles` - Entity data + tax regime
- `invoices` - Income/expense with acceptance + accounting status
- `journal_entries` - Accounting entries (spółka)
- `journal_entry_lines` - Debit/credit lines
- `chart_accounts` - Chart of Accounts
- `events` - Immutable event log
- `equity_transactions` - Capital events (spółka)
- `shareholders` - Shareholder management (spółka)

### New Tables (Created)
- `posting_rules` - Auto-posting rules
- `posting_rule_lines` - Rule debit/credit mappings
- `accounting_periods` - Period locking

### Missing Tables (Need to Create)
- `zus_payments` - ZUS payment tracking (JDG)
- `pit_advances` - PIT advance payments (JDG)
- `cit_advances` - CIT advance payments (spółka)

---

## Testing Checklist

### JDG Ryczałt Flow
- [ ] Create JDG profile with ryczałt 12%
- [ ] Create income invoice 5000 PLN
- [ ] Verify: No auto-posting (JDG uses KPiR)
- [ ] View in KPiR format
- [ ] Add ZUS payment
- [ ] Calculate PIT advance
- [ ] Generate JPK_V7M

### Spółka Non-VAT Flow
- [ ] Create spółka profile
- [ ] Verify: Posting rules seeded
- [ ] Verify: CoA seeded
- [ ] Create income invoice 1000 PLN (bank, no VAT)
- [ ] Verify: Auto-posted to ledger
- [ ] Check journal entry: Wn: 130, Ma: 700
- [ ] Check account balances updated
- [ ] Lock period
- [ ] Try to post to locked period (should fail)

### Expense Acceptance Flow
- [ ] Receive shared expense (pending)
- [ ] View in inbox
- [ ] Accept expense
- [ ] Verify: Auto-posted (if spółka)
- [ ] Reject expense with reason
- [ ] Verify: Not in accounting

---

## API Endpoints (Supabase RPC)

### Already Implemented
- `seed_basic_spolka_posting_rules(profile_id)` ✅
- `auto_post_invoice(invoice_id)` ✅
- `auto_post_pending_invoices(profile_id, limit)` ✅
- `accept_expense(invoice_id, user_id)` ✅
- `reject_expense(invoice_id, user_id, reason)` ✅
- `lock_accounting_period(period_id, user_id, reason)` ✅
- `unlock_accounting_period(period_id, user_id, reason)` ✅
- `auto_lock_previous_month()` ✅

### Need to Implement
- `calculate_zus_obligation(profile_id, month)` - ZUS calculator
- `calculate_pit_advance(profile_id, quarter)` - PIT advance
- `generate_kpir_export(profile_id, start_date, end_date)` - KPiR export
- `generate_balance_sheet(profile_id, period_end)` - Balance sheet
- `generate_profit_loss(profile_id, period_start, period_end)` - P&L

---

## Performance Considerations

### Indexing Strategy
- ✅ `idx_invoices_acceptance_status` on `acceptance_status = 'pending'`
- ✅ `idx_invoices_accounting_status` on `accounting_status = 'unposted'`
- ⚠️ Need: `idx_journal_entries_business_profile_date` on `(business_profile_id, entry_date)`
- ⚠️ Need: `idx_events_business_profile_type` on `(business_profile_id, event_type)`

### Caching Strategy
- Cache CoA per business profile (rarely changes)
- Cache posting rules per business profile
- Cache period status (check before every post)
- Invalidate on: CoA change, rule change, period lock

### Batch Operations
- Auto-post: Limit 100 invoices per batch
- Period summary: Calculate on lock, not on every view
- Financial statements: Generate on demand, cache for 1 hour

---

## Security & Compliance

### Audit Trail
- All period locks/unlocks logged
- All expense acceptances/rejections logged
- All journal entries immutable (no edits)
- All reversals create new entries

### RLS (Row Level Security)
- ✅ Enabled on all accounting tables
- ✅ Users can only access their business profiles
- ✅ System rules cannot be deleted by users
- ✅ Locked periods prevent modifications

### Data Integrity
- ✅ Double-entry validation (debits = credits)
- ✅ Period lock prevents backdating
- ✅ Acceptance workflow prevents premature accounting
- ✅ Immutable events preserve history

---

## Migration Path for Existing Data

### For Existing Invoices
```sql
-- Set default acceptance status
UPDATE invoices 
SET acceptance_status = 'auto_accepted' 
WHERE acceptance_status IS NULL;

-- Set default accounting status
UPDATE invoices 
SET accounting_status = 'unposted' 
WHERE accounting_status IS NULL;
```

### For Existing Business Profiles
```sql
-- Set default tax type for JDG
UPDATE business_profiles 
SET tax_type = 'skala' 
WHERE entity_type = 'dzialalnosc' 
AND tax_type IS NULL;

-- Seed posting rules for existing spółki
SELECT seed_basic_spolka_posting_rules(id) 
FROM business_profiles 
WHERE entity_type IN ('sp_zoo', 'sa');
```

---

## Next Immediate Actions

1. **Create JdgAccounting.tsx** - Separate page for JDG
2. **Create SpzooAccounting.tsx** - Separate page for Spółka
3. **Update AccountingShell.tsx** - Route based on entity type
4. **Update invoiceRepository.ts** - Add auto-post on save
5. **Create ZusPaymentTracker.tsx** - ZUS tracking for JDG
6. **Create AccountingPeriods.tsx** - Period management UI

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Status:** Phase 1 Complete, Ready for Phase 2
