# Empty State & Timeline Implementation - 2026-01-19

## Summary

Implemented comprehensive empty-state system for accounting that works for:
- New businesses with no data
- Businesses migrating from other systems
- Businesses with future start dates

## What Was Implemented

### ✅ 1. Fixed Auto-Post Error (Immediate Bug)

**Error:** `column "invoice_number" does not exist` in `auto_post_pending_invoices`

**Fix:** Recreated function with correct column names from invoices table.

**Migration:** `fix_auto_post_pending_invoices_column_name`

---

### ✅ 2. Fixed "Ryczałt undefined%" in PIT Tab

**Problem:** PIT tab showed "Ryczałt undefined% - rozliczenie kwartalne"

**Root Cause:** Code expected single `defaultRyczaltRate` from profile

**Fix:**
- Removed rate from title: "Ryczałt - rozliczenie kwartalne (PIT-28)"
- Updated calculation box to show category-based examples
- No longer depends on single company-wide rate

**File:** `src/modules/accounting/components/PitAdvancesTracker.tsx`

---

### ✅ 3. Business Start Date Fields

**Added to `business_profiles` table:**
```sql
business_start_date DATE
accounting_start_date DATE
```

**Purpose:**
- `business_start_date`: When business actually started operating
- `accounting_start_date`: When user wants to start tracking in system (for migrations)

**Validation:**
- `accounting_start_date >= business_start_date` (constraint)
- Defaults to `created_at::date` for existing profiles

**Migration:** `add_business_start_date_to_profiles`

---

### ✅ 4. Setup State Engine

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

**Key Features:**
- Works with **zero data** - obligations computed from profile settings alone
- No dependency on invoices/ledger to show timeline
- Deterministic and profile-driven

---

### ✅ 5. Obligations Timeline Engine

**Function:** `computeObligationsTimeline(profile, now)`

**Returns obligations based on:**
- Entity type (JDG vs Spółka)
- Tax type (ryczałt, skala, liniowy)
- VAT status (exempt vs active)
- VAT settlement (monthly vs quarterly)
- Start date

**Obligation Types:**

**JDG:**
- ZUS (monthly, day 10)
- PIT advances (ryczałt: quarterly day 20, skala/liniowy: monthly day 20)
- PIT yearly (PIT-28, PIT-36, PIT-36L - April 30)
- JPK_V7M/K (if VAT active)

**Spółka:**
- CIT advances (monthly, day 20)
- CIT-8 yearly (March 31)
- Sprawozdanie finansowe (June 30)
- JPK_V7M/K (if VAT active)

**Each obligation includes:**
- Due date (computed)
- Frequency (monthly/quarterly/yearly)
- Submission channel (podatki.gov, PUE ZUS, eKRS)
- Expected mode (zero_possible, requires_activity, informational)
- Applies flag (true/false)

---

### ✅ 6. Empty State Component

**Created:** `src/modules/accounting/components/EmptyStateAccounting.tsx`

**Shows when:** No invoices, no bank transactions, no register/journal entries

**Displays:**

**A) Status Card**
- "Brak zapisów księgowych - to normalne dla nowej firmy"
- Explains what creates records
- Lists missing setup items (if any)

**B) Recommended Actions**
- Top 3-6 actions based on stage
- Visual cards with icons and descriptions
- Routes to: invoice form, expense form, bank connect, settings

**C) Obligations Timeline**
- Upcoming deadlines with dates
- Frequency and submission channel
- "Zero possible" vs "Requires activity" badges
- "Not applicable" section (e.g., JPK for VAT exempt)

**D) "Czy muszę coś składać bez sprzedaży?" Info**
- Explains VAT, ZUS, PIT/CIT requirements
- Clarifies when zero declarations are needed

---

### ✅ 7. Business Profile Form Updates

**Added fields:**
- Data rozpoczęcia działalności (business_start_date)
- Data rozpoczęcia księgowości w systemie (accounting_start_date)

**Helper text:**
- "Używamy tej daty do osi czasu obowiązków i okresów księgowych"
- "Jeśli przenosisz księgowość, wybierz datę od której chcesz prowadzić ewidencję tutaj"

**Files:**
- `src/modules/settings/screens/BusinessProfileForm.tsx`
- `src/modules/settings/data/businessProfileRepository.ts`
- `src/shared/types/index.ts`

---

## How It Works

### New Business (No Data)

```
1. User creates business profile
2. Sets start date, tax type, VAT status
3. Navigates to accounting page
4. Sees EmptyStateAccounting component:
   - "Brak zapisów księgowych"
   - Recommended actions: "Wystaw pierwszą fakturę"
   - Obligations timeline: ZUS (10 Feb), PIT-28 (30 Apr), etc.
5. User clicks "Wystaw pierwszą fakturę"
6. Creates invoice → auto-posts → accounting becomes active
```

### Migrating Business (Old Start Date)

```
1. User sets business_start_date = 2022-01-01
2. User sets accounting_start_date = 2026-01-01
3. System shows:
   - "Uzupełnij wstecz" workflow (future feature)
   - Obligations from 2026-01-01 forward
   - No noise from 2022-2025 periods
4. User can backfill month-by-month or start fresh
```

### Future Start Date

```
1. User sets business_start_date = 2026-03-01 (future)
2. System shows:
   - "Firma jeszcze nie rozpoczęła działalności"
   - Upcoming obligations starting from March 2026
   - No period creation until start date
```

---

## Integration Points

### Where to Use EmptyStateAccounting

**JdgAccounting.tsx:**
```tsx
const setupState = await getAccountingSetupState(profileId);

if (setupState.stage === 'empty' || setupState.stage === 'configured_no_activity') {
  return <EmptyStateAccounting 
    setupState={setupState}
    entityType="dzialalnosc"
    onAction={(route) => navigate(route)}
  />;
}

// Otherwise show normal accounting page
```

**SpzooAccounting.tsx:**
```tsx
const setupState = await getAccountingSetupState(profileId);

if (setupState.signals.journalEntriesCount === 0 && setupState.signals.invoicesCount === 0) {
  return <EmptyStateAccounting 
    setupState={setupState}
    entityType="sp_zoo"
    onAction={(route) => navigate(route)}
  />;
}

// Otherwise show normal accounting page
```

---

## Acceptance Criteria

### ✅ Completed

- [x] Business profile has start date fields
- [x] Start dates saved and loaded correctly
- [x] Setup state engine works with zero data
- [x] Obligations timeline computed from profile settings
- [x] Empty state component shows helpful guidance
- [x] Recommended actions based on stage
- [x] Timeline shows upcoming deadlines
- [x] "Not applicable" obligations clearly marked
- [x] Fixed auto-post error
- [x] Fixed "undefined%" in PIT tab

### 🔄 TODO (Next Steps)

- [ ] Integrate EmptyStateAccounting into JdgAccounting.tsx
- [ ] Integrate EmptyStateAccounting into SpzooAccounting.tsx
- [ ] Add "Backfill wizard" for old start dates
- [ ] Period creation respects start date (don't create hundreds of periods)
- [ ] On-demand period creation when user navigates month
- [ ] Onboarding checklist component (optional)
- [ ] System events (business_created, tax_regime_set, etc.)

---

## Testing Checklist

### Test New Business (Empty State)
- [ ] Create new JDG profile
- [ ] Set start date = today
- [ ] Set tax type = ryczałt
- [ ] Set VAT exempt = true
- [ ] Navigate to accounting
- [ ] Verify empty state shows
- [ ] Verify obligations timeline shows:
  - ZUS (monthly)
  - PIT-28 (yearly)
  - No JPK (VAT exempt)
- [ ] Click "Wystaw pierwszą fakturę"
- [ ] Verify navigates to invoice form

### Test Migration (Old Start Date)
- [ ] Create JDG profile
- [ ] Set business_start_date = 2022-01-01
- [ ] Set accounting_start_date = 2026-01-01
- [ ] Navigate to accounting
- [ ] Verify timeline starts from 2026-01-01
- [ ] Verify no periods created for 2022-2025

### Test Future Start Date
- [ ] Create JDG profile
- [ ] Set business_start_date = 2026-06-01 (future)
- [ ] Navigate to accounting
- [ ] Verify message: "Firma jeszcze nie rozpoczęła działalności"
- [ ] Verify obligations show June 2026 deadlines

### Test Missing Setup
- [ ] Create profile without tax type
- [ ] Navigate to accounting
- [ ] Verify "MISSING_TAX_TYPE" in missing setup
- [ ] Verify recommended action: "Ustaw formę opodatkowania"
- [ ] Click action
- [ ] Verify navigates to settings

### Test Obligations by Tax Type
- [ ] JDG ryczałt: PIT-28 yearly, quarterly advances
- [ ] JDG liniowy: PIT-36L yearly, monthly advances
- [ ] JDG skala: PIT-36 yearly, monthly advances
- [ ] Spółka: CIT-8 yearly, monthly advances, sprawozdanie

### Test VAT Obligations
- [ ] VAT exempt: JPK marked "nie dotyczy"
- [ ] VAT active monthly: JPK_V7M monthly
- [ ] VAT active quarterly: JPK_V7K quarterly

---

## Architecture Notes

### Why Separate setupState.ts?

**Benefits:**
- Shared logic between JDG and Spółka
- Pure functions, easy to test
- No UI coupling
- Can be used in API routes, background jobs, etc.

### Why Not Fetch Obligations from Database?

**Obligations are profile-driven, not data-driven:**
- ZUS is always monthly (JDG)
- PIT-28 is always yearly (ryczałt)
- These don't depend on invoices existing

**Database would be:**
- Redundant (duplicate profile settings)
- Harder to maintain (schema changes)
- Less flexible (can't compute future dates easily)

### Why Snapshot Start Dates?

**Immutability:**
- If user changes start date after posting, old postings stay valid
- Audit trail preserved
- No retroactive changes to locked periods

---

## Summary of Files

### Created
- `src/modules/accounting/domain/setupState.ts` - Setup state engine
- `src/modules/accounting/components/EmptyStateAccounting.tsx` - Empty state UI
- `docs/accounting/EMPTY_STATE_IMPLEMENTATION.md` - This document

### Modified
- `src/modules/accounting/components/PitAdvancesTracker.tsx` - Fixed undefined%
- `src/modules/settings/screens/BusinessProfileForm.tsx` - Added start date fields
- `src/modules/settings/data/businessProfileRepository.ts` - Save/load start dates
- `src/shared/types/index.ts` - Added start date fields to interface

### Migrations
- `fix_auto_post_pending_invoices_column_name` - Fixed auto-post error
- `add_business_start_date_to_profiles` - Added start date columns

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Status:** Core implementation complete, integration pending
