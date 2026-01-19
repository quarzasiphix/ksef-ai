# Accounting System Fixes - Session Summary 2026-01-19

## Critical Fixes Completed

### 1. ✅ Fixed Auto-Post Error (400 Bad Request)

**Error:** `column "invoice_number" does not exist` in `auto_post_pending_invoices`

**Root Cause:** Function was using incorrect column name from invoices table

**Fix:** Recreated function with correct column references

**Migration:** `fix_auto_post_pending_invoices_column_name`

**Impact:** "Auto-księguj wszystkie" button now works in Spółka accounting panel

---

### 2. ✅ Fixed "Ryczałt undefined%" in PIT Tab

**Problem:** PIT advances tracker showed "Ryczałt undefined% - rozliczenie kwartalne (PIT-28)"

**Root Cause:** Code expected single `defaultRyczaltRate` from business profile, but we removed that field (correctly) because ryczałt rates are per-invoice-category, not company-wide

**Fix:**
- Changed title to: "Ryczałt - rozliczenie kwartalne (PIT-28)" (no % shown)
- Updated calculation examples to show category-based rates:
  - "Usługi IT (12%): 50 000 PLN × 12% = 6 000 PLN"
  - "Handel (3%): 50 000 PLN × 3% = 1 500 PLN"

**File:** `src/modules/accounting/components/PitAdvancesTracker.tsx`

---

### 3. ✅ Removed Single Ryczałt Rate Field from Business Profile Form

**Problem:** Form asked for "Stawka ryczałtu (%)" - conceptually wrong because rate depends on product/service category, not company

**Fix:** Replaced input field with informational box explaining:
- "W ryczałcie stawka zależy od rodzaju przychodu (produktu/usługi), nie od firmy"
- Example: Construction company can have 5.5% (residential), 8% (garden), 3% (materials)
- "Stawkę przypisujesz do każdej faktury podczas wystawiania"

**File:** `src/modules/settings/screens/BusinessProfileForm.tsx`

---

### 4. ✅ KPiR Now Groups by Ryczałt Rate

**Problem:** KPiR showed flat list without separating different tax rates

**Fix:** Implemented proper grouping:

**Summary Cards:**
```
┌─ Stawka 3% ─┐  ┌─ Stawka 5.5% ─┐  ┌─ Stawka 8% ─┐
│ 5 wpisów    │  │ 12 wpisów     │  │ 3 wpisy     │
│ 25k PLN     │  │ 120k PLN      │  │ 20k PLN     │
│ 750 podatek │  │ 6.6k podatek  │  │ 1.6k podatek│
└─────────────┘  └───────────────┘  └─────────────┘
```

**Separate Tables per Rate:**
- Each rate gets its own section with header "Stawka ryczałtu: X%"
- Subtotals for each rate group
- Clear separation for tax calculation

**File:** `src/modules/accounting/components/KPiRView.tsx`

---

### 5. ✅ Database: Added Ryczałt Category to Invoices

**Migration:** `add_ryczalt_category_to_invoices`

**Changes:**
```sql
ALTER TABLE invoices
ADD COLUMN ryczalt_category_id UUID REFERENCES ryczalt_revenue_categories(id);

ADD COLUMN ryczalt_rate DECIMAL(5,2); -- Snapshot for history
```

**Updated Function:** `post_to_jdg_register`
- Now **requires** `ryczalt_category_id` on invoice
- Returns error "MISSING_CATEGORY" if not set
- Snapshots both category name and rate (immutable audit trail)
- Uses category rate, not profile rate

---

### 6. ✅ Business Start Date Implementation

**Added to `business_profiles` table:**
```sql
business_start_date DATE
accounting_start_date DATE
```

**Purpose:**
- `business_start_date`: When business actually started operating
- `accounting_start_date`: When user wants to start tracking in system (for migrations)

**Constraint:** `accounting_start_date >= business_start_date`

**Migration:** `add_business_start_date_to_profiles`

**UI Changes:**
- Added date picker fields to BusinessProfileForm
- Helper text explains usage for timeline and migration
- Form schema and validation updated

**Files:**
- `src/modules/settings/screens/BusinessProfileForm.tsx`
- `src/modules/settings/data/businessProfileRepository.ts`
- `src/shared/types/index.ts`

---

### 7. ✅ Setup State Engine (Empty State Foundation)

**Created:** `src/modules/accounting/domain/setupState.ts`

**Core Function:**
```typescript
getAccountingSetupState(businessProfileId) -> SetupState
```

**Returns:**
- `stage`: empty | configured_no_activity | activity_unposted | active
- `missingSetup`: Array of blockers (MISSING_TAX_TYPE, MISSING_START_DATE, etc.)
- `recommendedActions`: Ordered CTAs with routes
- `obligationsTimeline`: Computed obligations from profile settings
- `signals`: Activity counts (invoices, bank, register, journal, etc.)

**Key Feature:** Works with **zero data** - obligations computed from profile settings alone, no dependency on invoices/ledger

---

### 8. ✅ Obligations Timeline Engine

**Function:** `computeObligationsTimeline(profile, now)`

**Computes obligations based on:**
- Entity type (JDG vs Spółka)
- Tax type (ryczałt, skala, liniowy)
- VAT status (exempt vs active)
- VAT settlement (monthly vs quarterly)
- Start date

**JDG Obligations:**
- ZUS (monthly, day 10)
- PIT advances (ryczałt: quarterly day 20, skala/liniowy: monthly day 20)
- PIT yearly (PIT-28, PIT-36, PIT-36L - April 30)
- JPK_V7M/K (if VAT active)

**Spółka Obligations:**
- CIT advances (monthly, day 20)
- CIT-8 yearly (March 31)
- Sprawozdanie finansowe (June 30)
- JPK_V7M/K (if VAT active)

**Each obligation includes:**
- Due date (computed from start date)
- Frequency (monthly/quarterly/yearly)
- Submission channel (podatki.gov, PUE ZUS, eKRS)
- Expected mode (zero_possible, requires_activity, informational)
- Applies flag (true/false based on VAT exempt, etc.)

---

### 9. ✅ Empty State Component

**Created:** `src/modules/accounting/components/EmptyStateAccounting.tsx`

**Shows when:** No invoices, no bank transactions, no register/journal entries

**Displays:**

**A) Status Card**
- "Brak zapisów księgowych - to normalne dla nowej firmy"
- Explains what creates records
- Lists missing setup items with amber warnings

**B) Recommended Actions (Top 3-6)**
- Visual cards with icons: FileText, Receipt, Landmark, CheckCircle2
- Routes to: invoice form, expense form, bank connect, settings
- Priority-sorted based on stage

**C) Obligations Timeline**
- Upcoming deadlines with formatted dates
- Frequency and submission channel badges
- "Zero possible" vs "Requires activity" indicators
- "Not applicable" section (e.g., JPK for VAT exempt)

**D) "Czy muszę coś składać bez sprzedaży?" Info**
- VAT czynny: możliwy obowiązek JPK_V7 nawet z zerowymi wartościami
- VAT zwolniony: brak obowiązku JPK_V7
- ZUS (JDG): składki co miesiąc niezależnie od przychodów
- PIT/CIT: zaliczki tylko przy przychodach, roczne zeznanie zawsze

---

## Files Created

1. `src/modules/accounting/domain/setupState.ts` - Setup state and obligations engine
2. `src/modules/accounting/components/EmptyStateAccounting.tsx` - Empty state UI
3. `docs/accounting/RYCZALT_RATE_MODEL_FIX.md` - Ryczałt model documentation
4. `docs/accounting/EMPTY_STATE_IMPLEMENTATION.md` - Empty state documentation
5. `docs/accounting/UX_FIXES_2026-01-19.md` - UX fixes documentation
6. `docs/accounting/SESSION_SUMMARY_2026-01-19.md` - This file

---

## Files Modified

1. `src/modules/accounting/components/PitAdvancesTracker.tsx` - Fixed undefined%, tax-regime aware
2. `src/modules/accounting/components/KPiRView.tsx` - Groups by ryczałt rate
3. `src/modules/accounting/screens/JdgAccounting.tsx` - Data-driven from profile
4. `src/modules/accounting/components/ZusPaymentTracker.tsx` - Added "Przykład" badge
5. `src/modules/settings/screens/BusinessProfileForm.tsx` - Removed single rate, added start dates
6. `src/modules/settings/data/businessProfileRepository.ts` - Save/load start dates
7. `src/shared/types/index.ts` - Added start date fields to BusinessProfile

---

## Database Migrations Applied

1. `fix_auto_post_pending_invoices_column_name` - Fixed auto-post function
2. `add_ryczalt_category_to_invoices` - Added category to invoices, updated posting function
3. `add_business_start_date_to_profiles` - Added start date columns

---

## Next Steps (TODO)

### Priority 1: Integrate Empty State into Accounting Pages

**JdgAccounting.tsx:**
```tsx
import { getAccountingSetupState } from '../domain/setupState';
import { EmptyStateAccounting } from '../components/EmptyStateAccounting';

// Inside component:
const [setupState, setSetupState] = useState<SetupState | null>(null);

useEffect(() => {
  async function loadSetupState() {
    const state = await getAccountingSetupState(selectedProfile.id);
    setSetupState(state);
  }
  loadSetupState();
}, [selectedProfile.id]);

if (setupState?.stage === 'empty' || setupState?.stage === 'configured_no_activity') {
  return <EmptyStateAccounting 
    setupState={setupState}
    entityType="dzialalnosc"
    onAction={(route) => navigate(route)}
  />;
}

// Otherwise show normal accounting page
```

**SpzooAccounting.tsx:** Same pattern

---

### Priority 2: Invoice Form - Add Ryczałt Category Selection

**For JDG ryczałt income invoices:**
```tsx
{isJdgRyczalt && transactionType === 'income' && (
  <FormField name="ryczalt_category_id">
    <FormLabel>Kategoria przychodu (ryczałt)</FormLabel>
    <Select>
      <SelectTrigger>Wybierz kategorię</SelectTrigger>
      <SelectContent>
        {ryczaltCategories.map(cat => (
          <SelectItem value={cat.id}>
            {cat.name} ({cat.rate}%)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <FormDescription>
      Stawka ryczałtu zależy od rodzaju usługi/produktu
    </FormDescription>
  </FormField>
)}
```

**Load categories:**
```tsx
const { data: categories } = await supabase
  .from('ryczalt_revenue_categories')
  .select('*')
  .eq('is_active', true)
  .order('rate');
```

---

### Priority 3: Backfill Wizard (Optional, for Migration)

**When `business_start_date` is old and no data exists:**
- Show "Uzupełnij wstecz" workflow
- Guide user month-by-month
- Import invoices (KSeF / CSV / manual)
- Auto-post/register
- Lock periods as finished

---

### Priority 4: Period Auto-Creation

**Modify posting functions:**
```sql
-- In auto_post_invoice_unified or post_to_jdg_register:
-- 1. Check if period exists for invoice date
IF NOT EXISTS (
  SELECT 1 FROM accounting_periods
  WHERE business_profile_id = p_business_profile_id
  AND period_year = EXTRACT(YEAR FROM v_invoice.issue_date)
  AND period_month = EXTRACT(MONTH FROM v_invoice.issue_date)
) THEN
  -- 2. Auto-create period
  INSERT INTO accounting_periods (...);
END IF;

-- 3. Then proceed with posting
```

---

### Priority 5: Error Reason Codes

**Add to invoices table:**
```sql
ALTER TABLE invoices
ADD COLUMN accounting_error_reason TEXT CHECK (
  accounting_error_reason IN (
    'PENDING_ACCEPTANCE',
    'LOCKED_PERIOD',
    'MISSING_RULE',
    'MISSING_PAYMENT_METHOD',
    'INVALID_PROFILE_CONFIG',
    'MISSING_CATEGORY',
    'RPC_ERROR'
  )
);
```

**Update UnpostedQueueWidget:**
- Show expandable list with reasons
- Display actionable next steps per error type

---

## Testing Checklist

### ✅ Completed Tests
- [x] Auto-post function works (fixed 400 error)
- [x] PIT tab shows correct description (no undefined%)
- [x] KPiR groups by rate correctly
- [x] Business profile form saves start dates
- [x] Ryczałt category enforced on posting

### 🔄 Pending Tests
- [ ] Empty state shows for new business
- [ ] Obligations timeline computed correctly
- [ ] Recommended actions navigate properly
- [ ] Invoice form requires category (when implemented)
- [ ] Migration workflow (old start date)
- [ ] Future start date handling

---

## Summary

**Fixed 5 critical bugs:**
1. Auto-post 400 error
2. "Ryczałt undefined%" in PIT tab
3. Single company-wide rate removed
4. KPiR now groups by rate
5. Ryczałt category required on invoices

**Implemented 4 major features:**
1. Business start date for timeline
2. Setup state engine
3. Obligations timeline (works with zero data)
4. Empty state component

**Created comprehensive documentation:**
- Ryczałt rate model fix
- Empty state implementation
- UX fixes summary
- Session summary (this document)

**Next critical task:** Integrate EmptyStateAccounting into JdgAccounting.tsx and SpzooAccounting.tsx, then add ryczałt category selection to invoice form.

---

**Session Date:** 2026-01-19  
**Status:** Core fixes complete, integration pending  
**Bugs Fixed:** 5  
**Features Added:** 4  
**Migrations Applied:** 3  
**Documentation Created:** 4 files
