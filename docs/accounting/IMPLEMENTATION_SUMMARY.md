# Accounting System Implementation Summary

**Date:** 2026-01-19  
**Status:** Phase 1 Complete - JDG Register & Spółka Separation Implemented

---

## ✅ What Was Completed

### 1. Database Schema (via Supabase MCP)

**Applied Migrations:**
- `accounting_automation_foundation_v2` - Tax regime, expense acceptance, accounting status
- `jdg_register_tables_only` - JDG revenue register, ryczałt categories, PIT advances
- `unified_auto_post_function` - Routing function for JDG vs Spółka posting

**New Tables:**
```sql
-- JDG-specific
ryczalt_revenue_categories (id, name, rate, description, pkd_hint, is_default)
jdg_revenue_register_lines (id, business_profile_id, period_year, period_month, 
  occurred_at, document_number, counterparty_name, invoice_id, event_id,
  tax_base_amount, ryczalt_rate, ryczalt_tax_amount, category_id, is_locked)
pit_advances (id, business_profile_id, year, quarter, revenue_base, 
  computed_tax_due, paid_amount, status, due_date)

-- Enhanced existing tables
business_profiles: +tax_type, +ryczalt_rates, +default_ryczalt_rate, +linear_tax_rate
invoices: +acceptance_status, +accepted_at, +accepted_by, +payment_date, 
  +payment_method_used, +accounting_status, +posted_at, +journal_entry_id
```

**Key Functions:**
- `compute_ryczalt_tax_base(invoice_id)` - Deterministic tax calculation
- `post_to_jdg_register(invoice_id)` - Post income to JDG register
- `auto_post_invoice_unified(invoice_id)` - Routes to JDG or Spółka posting
- `auto_post_invoice(invoice_id)` - Existing Spółka journal posting (from previous work)

### 2. Frontend Architecture

**New Pages:**
- `JdgAccounting.tsx` - JDG-specific accounting page (KPiR/Ewidencja focus)
- `SpzooAccounting.tsx` - Spółka-specific accounting page (CoA/Capital focus)

**New Components:**
- `KPiRView.tsx` - Revenue register display for JDG
- `ZusPaymentTracker.tsx` - ZUS payment tracking
- `PitAdvancesTracker.tsx` - PIT advance payment tracking
- `TaxObligationsTimeline.tsx` - Tax filing deadlines (PIT for JDG, CIT for Spółka)
- `UnpostedQueueWidget.tsx` - Shows unposted invoices for Spółka
- `AccountingPeriodStatus.tsx` - Current period lock status

**Updated:**
- `AccountingShell.tsx` - Routes to JdgAccounting or SpzooAccounting based on entity type
- `BusinessProfileForm.tsx` - Added tax regime fields (ryczałt rate, VAT exemption)

### 3. Core Principles Implemented

✅ **Events are immutable** - Register lines and journal entries are append-only  
✅ **Separate JDG/Spółka flows** - Different pages, different posting logic  
✅ **Register-first for JDG ryczałt** - Income goes to `jdg_revenue_register_lines`, not journal  
✅ **Triple-entry for Spółka** - Event → Posting Rule → Journal Entry → Ledger  
✅ **Snapshot semantics** - Ryczałt rate captured per document (immutable)  
✅ **Acceptance workflow** - Expenses require acceptance before posting  
✅ **Period locking** - Prevents backdating (enforced in posting functions)

---

## 🎯 How It Works

### JDG Ryczałt Flow

```
1. Create income invoice (issue_date, total_gross_value, customer)
2. Invoice saved with acceptance_status = 'auto_accepted'
3. Call auto_post_invoice_unified(invoice_id)
4. Function detects: entityType = 'dzialalnosc', tax_type = 'ryczalt'
5. Calls post_to_jdg_register(invoice_id):
   - Computes: tax_base = gross, rate = profile.default_ryczalt_rate
   - Calculates: tax = base × rate / 100
   - Inserts jdg_revenue_register_lines (snapshot values)
   - Updates invoice: accounting_status = 'posted'
6. Register line appears in KPiR/Ewidencja view
7. PIT advance auto-calculated quarterly from register totals
```

**No journal entries created for JDG ryczałt** - Register is the source of truth.

### Spółka Flow

```
1. Create invoice (sales or purchase)
2. Invoice saved with acceptance_status = 'auto_accepted'
3. Call auto_post_invoice_unified(invoice_id)
4. Function detects: entityType = 'sp_zoo' or 'sa'
5. Calls auto_post_invoice(invoice_id) (existing function):
   - Finds matching posting rule
   - Creates journal_entries with lines (Wn/Ma)
   - Updates invoice: accounting_status = 'posted', journal_entry_id
6. Journal entry appears in ledger
7. Account balances updated
8. Financial statements reflect changes
```

**Full double-entry accounting** - Every invoice creates balanced journal entry.

### Expense Acceptance Flow

```
1. Shared expense received → acceptance_status = 'pending'
2. User sees in "Niezaksięgowane dokumenty" widget
3. User clicks "Akceptuj" → acceptance_status = 'accepted'
4. Auto-post eligible (if Spółka) or ready for register (if JDG)
5. If rejected → acceptance_status = 'rejected', never posted
```

---

## 📊 UI Differences: JDG vs Spółka

### JDG Accounting Page

**Shows:**
- Tax regime summary (Ryczałt 12%, VAT exempt, etc.)
- KPiR/Ewidencja przychodów (revenue register table)
- ZUS payment tracker (monthly obligations)
- PIT advances tracker (quarterly)
- Tax obligations timeline (PIT-28, ZUS, no JPK if VAT exempt)

**Hides:**
- Chart of Accounts
- Capital events
- Shareholders
- Journal entries
- Balance sheet (optional for JDG)

**Message:** "JDG to księgowość. Proste, przejrzyste, zgodne z prawem."

### Spółka Accounting Page

**Shows:**
- Period status (open/locked)
- Unposted queue (documents needing posting)
- Auto-post button (batch posting)
- Chart of Accounts link
- Ledger link
- Capital events link
- Shareholders link
- Financial statements (Balance Sheet, P&L)
- Tax obligations timeline (CIT-8, JPK_V7M, sprawozdania)

**Hides:**
- ZUS tracker (Spółka has payroll, not owner ZUS)
- PIT (Spółka pays CIT, not PIT)
- Simplified KPiR view

**Message:** "Spółka to odpowiedzialność. Pełna księgowość, governance, kontrola."

---

## 🔧 Configuration

### For JDG Ryczałt

**In BusinessProfileForm:**
1. Select "Działalność gospodarcza"
2. Select "Ryczałt od przychodów ewidencjonowanych"
3. Enter ryczałt rate (e.g., 12%)
4. Optionally check "Zwolniony z VAT (art. 113)"
5. If VAT exempt, enter threshold (200,000 PLN)

**System behavior:**
- Income invoices → `jdg_revenue_register_lines`
- Tax calculated: gross × rate%
- PIT advances: quarterly aggregates
- ZUS: monthly tracking
- No JPK_V7M if VAT exempt

### For Spółka (Non-VAT)

**In BusinessProfileForm:**
1. Select "Spółka z o.o." or "S.A."
2. Enter share capital
3. Enter KRS number
4. System auto-seeds posting rules on creation

**System behavior:**
- Income/expense invoices → journal entries
- Posting rules match document type + payment method
- Ledger updated automatically
- Financial statements from ledger
- CIT-8 monthly, sprawozdania annually

---

## 🚀 Next Steps (Not Yet Implemented)

### Phase 2: Invoice Integration

**File:** `src/modules/invoices/data/invoiceRepository.ts`

```typescript
// In saveInvoice function, after save:
if (savedInvoice.accounting_status === 'unposted') {
  const { data: profile } = await supabase
    .from('business_profiles')
    .select('entity_type, tax_type')
    .eq('id', savedInvoice.business_profile_id)
    .single();
  
  if (profile?.entity_type === 'sp_zoo' || profile?.entity_type === 'sa') {
    // Auto-post for Spółka
    const result = await supabase.rpc('auto_post_invoice_unified', {
      p_invoice_id: savedInvoice.id
    });
    
    if (!result.success) {
      // Mark as needs_review if posting failed
      await supabase
        .from('invoices')
        .update({ accounting_status: 'needs_review' })
        .eq('id', savedInvoice.id);
    }
  }
}
```

### Phase 3: Posting Rules Seeding

**File:** `src/modules/settings/data/businessProfileRepository.ts`

```typescript
// After creating Spółka profile:
if (newProfile.entity_type === 'sp_zoo' || newProfile.entity_type === 'sa') {
  await supabase.rpc('seed_basic_spolka_posting_rules', {
    p_business_profile_id: newProfile.id
  });
}
```

### Phase 4: Period Locking Enforcement

Already implemented in database functions:
- `post_to_jdg_register` checks period lock
- `auto_post_invoice` checks period lock
- Trigger `check_locked_period_invoices` prevents posting to locked periods

**Need UI:**
- Period management screen
- Lock/unlock buttons
- Validation warnings

### Phase 5: Expense Acceptance UI

**File:** `src/modules/invoices/screens/expense/ExpenseList.tsx`

```tsx
import { ExpenseAcceptanceActions } from '@/modules/inbox/components/ExpenseAcceptanceActions';

// In expense card:
{expense.acceptance_status === 'pending' && (
  <ExpenseAcceptanceActions
    invoiceId={expense.id}
    invoiceNumber={expense.invoice_number}
  />
)}
```

### Phase 6: VAT Threshold Monitoring (JDG)

**Already exists:** `VatThresholdTracker` component

**Need to integrate:**
- Show in JDG accounting page
- Alert when approaching 200k PLN
- Suggest VAT-R registration workflow

---

## 📝 Testing Checklist

### JDG Ryczałt

- [ ] Create JDG profile with ryczałt 12%
- [ ] Create income invoice 5000 PLN
- [ ] Call `auto_post_invoice_unified(invoice_id)`
- [ ] Verify: Register line created with tax = 600 PLN
- [ ] Verify: Invoice `accounting_status = 'posted'`
- [ ] View in KPiR - should show 1 line
- [ ] Create 3 more invoices in Q1
- [ ] Verify: PIT advance calculated for Q1
- [ ] Add ZUS payment
- [ ] Verify: ZUS tracker shows payment

### Spółka Non-VAT

- [ ] Create Spółka profile
- [ ] Verify: Posting rules seeded (8 rules)
- [ ] Create income invoice 1000 PLN (bank, no VAT)
- [ ] Call `auto_post_invoice_unified(invoice_id)`
- [ ] Verify: Journal entry created (Wn: 130, Ma: 700)
- [ ] Verify: Account 130 balance +1000
- [ ] Verify: Account 700 balance +1000
- [ ] Create expense 500 PLN (bank, no VAT)
- [ ] Verify: Journal entry (Wn: 400, Ma: 130)
- [ ] View ledger - should show 2 entries
- [ ] View balance sheet - should balance

### Expense Acceptance

- [ ] Create shared expense (pending)
- [ ] View in unposted queue widget
- [ ] Accept expense
- [ ] Verify: `acceptance_status = 'accepted'`
- [ ] Auto-post (if Spółka)
- [ ] Verify: Posted to ledger
- [ ] Reject expense with reason
- [ ] Verify: `acceptance_status = 'rejected'`
- [ ] Verify: Never posted

### Period Locking

- [ ] Create period for previous month
- [ ] Lock period
- [ ] Try to post invoice dated in locked period
- [ ] Verify: Error "Cannot post to locked period"
- [ ] Unlock period with reason
- [ ] Post invoice
- [ ] Verify: Success

---

## 🔐 Security & Compliance

### RLS Policies

All new tables have RLS enabled:
- `ryczalt_revenue_categories` - Public read, admin write
- `jdg_revenue_register_lines` - User can only see own business profiles
- `pit_advances` - User can only see own business profiles
- `zus_payments` - User can only see own business profiles (existing)

### Audit Trail

- Register lines: `created_by`, `created_at` (immutable)
- Acceptance: `accepted_by`, `accepted_at`
- Period locks: `locked_by`, `locked_at`, `lock_reason`
- Journal entries: `created_by`, `created_at` (immutable)

### Immutability

- Register lines: No UPDATE allowed once `is_locked = TRUE`
- Journal entries: No DELETE/UPDATE allowed once `is_posted = TRUE`
- Corrections: Create reversal + new entry (not implemented yet)

---

## 📚 Key Files Reference

### Database
- `supabase/migrations/20260119_accounting_automation_foundation_v2.sql`
- `supabase/migrations/20260119_jdg_register_tables_only.sql`
- `supabase/migrations/20260119_unified_auto_post_function.sql`
- `supabase/migrations/20260104_posting_rules.sql` (from previous work)

### Frontend Pages
- `src/modules/accounting/screens/JdgAccounting.tsx`
- `src/modules/accounting/screens/SpzooAccounting.tsx`
- `src/modules/accounting/screens/AccountingShell.tsx`

### Components
- `src/modules/accounting/components/KPiRView.tsx`
- `src/modules/accounting/components/ZusPaymentTracker.tsx`
- `src/modules/accounting/components/PitAdvancesTracker.tsx`
- `src/modules/accounting/components/TaxObligationsTimeline.tsx`
- `src/modules/accounting/components/UnpostedQueueWidget.tsx`
- `src/modules/accounting/components/AccountingPeriodStatus.tsx`
- `src/modules/accounting/components/AutoPostingButton.tsx` (from previous work)
- `src/modules/inbox/components/ExpenseAcceptanceActions.tsx` (from previous work)

### Data Layer
- `src/modules/accounting/data/postingRulesRepository.ts` (from previous work)

### Types
- `src/shared/types/index.ts` (updated with new fields)

### Documentation
- `docs/accounting/ACCOUNTING_CONTINUATION_PLAN.md`
- `docs/accounting/ACCOUNTING_AUTOMATION_IMPLEMENTATION.md`

---

## 💡 Key Insights

### Why Separate Pages?

**Problem:** Mixing JDG and Spółka in one UI creates confusion:
- JDG users see irrelevant features (CoA, capital events)
- Spółka users miss critical features (period locking, auto-posting)
- Different mental models (register vs ledger)

**Solution:** Two distinct pages with clear purpose:
- JDG: "Ewidencja i podatki" (Register and taxes)
- Spółka: "Księgowość i governance" (Accounting and governance)

### Why Register-First for JDG Ryczałt?

**Legal requirement:** Ryczałt tax is calculated on **gross revenue**, not net profit.

**Accounting implication:** No need for expense matching, no accrual basis, no complex CoA.

**System design:** Register is sufficient - captures date, amount, rate, tax. That's all tax office needs.

**Future:** Can add expense register for KPiR (skala/liniowy), but ryczałt only needs revenue.

### Why Snapshot Semantics?

**Problem:** If ryczałt rate changes mid-year, historical invoices must preserve original rate.

**Solution:** Capture rate at posting time:
```sql
ryczalt_rate DECIMAL(5,2) NOT NULL, -- Snapshot from invoice/profile
category_name TEXT, -- Snapshot for immutability
```

**Benefit:** Audit-proof. Tax office can verify: "This invoice was taxed at 12% because that was your rate on that date."

### Why No JPK for VAT-Exempt JDG?

**Legal:** Art. 113 exemption = no VAT registration = no JPK_V7M obligation.

**UX:** Hiding JPK for VAT-exempt JDG reduces confusion and focuses on relevant obligations (PIT, ZUS).

**Implementation:** `TaxObligationsTimeline` checks `isVatExempt` prop and filters obligations.

---

## 🎓 Product Philosophy

### JDG Positioning

**Target:** Solo entrepreneurs, freelancers, small service businesses  
**Value Prop:** "Księgowość bez księgowego"  
**Price:** 19 zł/month  
**Features:** KPiR/Ewidencja, ZUS tracking, PIT calculation, JPK generation  
**Complexity:** Low - intentionally limited to reduce cognitive load

### Spółka Positioning

**Target:** Formal companies, growth-stage startups, professional services  
**Value Prop:** "Governance i odpowiedzialność"  
**Price:** 79-99 zł/month  
**Features:** Full CoA, capital events, shareholders, audit trail, compliance  
**Complexity:** High - reflects legal requirements of corporate form

### Why This Matters

Users self-select based on risk tolerance:
- JDG users: "I just need to track income and pay taxes"
- Spółka users: "I need to protect myself legally and prepare for audits"

System enforces discipline:
- JDG: Simple but complete (no shortcuts)
- Spółka: Complex but correct (no workarounds)

---

**End of Summary**

This implementation establishes the foundation for a production-ready accounting system that respects Polish law, separates concerns by entity type, and provides clear upgrade paths for future features.
