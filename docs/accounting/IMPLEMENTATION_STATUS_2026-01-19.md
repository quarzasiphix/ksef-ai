# Implementation Status - 2026-01-19 Evening Session

## ✅ Completed Tasks

### 1. Fixed API Errors (Database Schema Mismatches)

**Problem:** Multiple 400 errors due to schema mismatches between code expectations and actual database

**Fixed:**

**A) `accounting_periods` table**
- Added `period_year`, `period_month`, `is_locked` columns
- Existing table had `fiscal_year`, `start_date`, `end_date`, `status` (annual periods)
- Now supports both annual and monthly period tracking
- Created unique index for monthly periods

**B) `bank_transactions` table**
- Added `business_profile_id` column for direct querying
- Populated from `bank_accounts` relationship
- Created index for performance

**C) `create_accounting_period` function**
- Recreated with correct return type (UUID)
- Now creates monthly periods with proper date calculations
- Validates month range (1-12)
- Prevents duplicates

**Migrations Applied:**
- `add_business_profile_id_to_bank_transactions`
- `fix_accounting_periods_schema_for_monthly_tracking`
- `recreate_create_accounting_period_function`

---

### 2. Added Accounting Error Reason Codes

**Schema:**
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
    'RPC_ERROR',
    'MISSING_PERIOD'
  )
);

ADD COLUMN accounting_error_details JSONB;
```

**Purpose:** Makes unposted queue actionable - every error has a specific reason code and next action

**Migration:** `add_accounting_error_reason_to_invoices`

---

### 3. Implemented On-Demand Period Creation

**Created Functions:**

**A) `ensure_accounting_period_exists(business_profile_id, document_date)`**
- Checks if period exists for document date
- Auto-creates if missing
- Respects `accounting_start_date` boundary
- Prevents creating periods before accounting start date

**B) Updated `post_to_jdg_register(invoice_id)`**
- Now calls `ensure_accounting_period_exists` before posting
- Enforces ryczałt category requirement
- Sets `accounting_error_reason` on failures:
  - `MISSING_CATEGORY` - ryczałt income without category
  - `INVALID_PROFILE_CONFIG` - category not found
  - `MISSING_PERIOD` - period creation failed
- Snapshots `ryczalt_rate` and `ryczalt_category_name` for audit trail
- Clears error reason on successful posting

**Migration:** `on_demand_period_creation_in_posting`

**Result:** "Period not found" errors eliminated - first posting action auto-creates period

---

### 4. Fixed Routing for Capital & Shareholders Modules

**Changed:**
- `/spolka/capital` → `/accounting/capital-events`
- `/spolka/shareholders` → `/accounting/shareholders`

**File:** `src/modules/accounting/screens/SpzooAccounting.tsx`

---

### 5. Integrated EmptyStateAccounting Component

**Files Modified:**
- `src/modules/accounting/screens/JdgAccounting.tsx`
- `src/modules/accounting/screens/SpzooAccounting.tsx`

**Implementation:**
- Added `getAccountingSetupState()` call on mount
- Shows `EmptyStateAccounting` when `stage === 'empty' || 'configured_no_activity'`
- Passes setup state, entity type, and navigation handler

**Result:** New businesses see:
- Status card explaining zero records is normal
- Recommended actions (create invoice, add expense, connect bank, fix config)
- Obligations timeline (ZUS, PIT, CIT, JPK) computed from profile settings
- "Do I need to file with zero sales?" info

---

### 6. Created Ryczałt Categories Repository

**File:** `src/modules/accounting/data/ryczaltCategoriesRepository.ts`

**Functions:**
- `listRyczaltRevenueCategories(businessProfileId)` - fetches global + profile-specific categories
- `getRyczaltCategory(categoryId)` - get single category
- `createRyczaltCategory(category)` - create custom category

**Purpose:** Data layer for ryczałt category selection in invoice form

---

### 7. Added ryczalt_category_id to Invoice Form Schema

**File:** `src/modules/invoices/screens/invoices/NewInvoice.tsx`

**Changes:**
- Added `ryczalt_category_id: z.string().optional()` to schema
- Added validation refine with message: "W ryczałcie musisz wybrać kategorię przychodu"
- Runtime validation will be based on business profile (JDG + ryczałt + income)

---

## 🔄 In Progress

### 8. Ryczałt Category Selection UI

**Next Steps:**
1. Add category dropdown to `InvoiceBasicInfoForm.tsx`
2. Show only when: `entityType === 'dzialalnosc' && taxType === 'ryczalt' && transactionType === 'income'`
3. Fetch categories using `listRyczaltRevenueCategories`
4. Display format: "Budowa mieszkalna (5.5%)"
5. Add helper text: "Stawka jest przypisana do rodzaju przychodu, nie do firmy"
6. Make required with validation

**Status:** Schema ready, repository ready, UI integration pending

---

## 📋 Pending Tasks

### 9. Fix Period Creation Modal Copy

**Current Issue:** Modal says it will "migrate older invoices" - dangerous unless true

**Required Change:**
```
"Utworzymy okres księgowy dla [miesiąc]. Jeśli w tym miesiącu są dokumenty do zaksięgowania, pojawią się w kolejce."
```

**If migration is real:**
- Log an event
- Show exactly what was changed (counts)
- Allow rollback via explicit admin action

**File:** `src/modules/accounting/components/AccountingPeriodStatus.tsx`

---

### 10. Enhance UnpostedQueueWidget with Error Reasons

**Requirements:**
- Group by `accounting_error_reason`
- Show single-line fix CTA per reason:
  - `PENDING_ACCEPTANCE` → "Zaakceptuj wydatek w skrzynce" (link to inbox filtered)
  - `MISSING_CATEGORY` → "Wybierz kategorię ryczałtu" (open invoice with category focus)
  - `MISSING_RULE` → "Dodaj regułę księgowania" (open posting rules manager)
  - `LOCKED_PERIOD` → "Odblokuj okres lub zmień datę" (open period page)
  - `INVALID_PROFILE_CONFIG` → "Uzupełnij profil firmy" (link to settings)
  - `MISSING_PAYMENT_METHOD` → "Ustaw metodę płatności" (open invoice)
  - `RPC_ERROR` → "Skontaktuj się z wsparciem" (show error details)

**File:** `src/modules/accounting/components/UnpostedQueueWidget.tsx`

---

### 11. Acceptance Workflow UI

**A) Expense List + Inbox:**
- Show badge for `acceptance_status`
- Accept/Reject buttons for pending expenses
- Filter by acceptance status

**B) Accounting Page:**
- Unposted queue shows: "X expenses waiting for acceptance"
- CTA to filtered inbox
- Clear explanation: "Cannot post until accepted"

**C) Posting Guard:**
- If `acceptance_status != 'accepted'/'auto_accepted'`, refuse posting
- Set `accounting_error_reason = 'PENDING_ACCEPTANCE'`

**Files:**
- `src/modules/inbox/screens/UnifiedInboxPage.tsx`
- `src/modules/invoices/screens/expense/ExpenseList.tsx`
- `src/modules/accounting/components/UnpostedQueueWidget.tsx`

---

### 12. Guardrails Verification

**A) Locked Period Blocking:**
- Verify posting functions reject locked periods
- UI must communicate clearly
- Provide action: "Unlock period" or "Change document date"

**B) Ryczałt Category Enforcement:**
- Complete UI integration (in progress)
- Block invoice finalization without category
- Not just RPC error - prevent at form level

**C) VAT-Exempt Timeline Filtering:**
- Verify EmptyStateAccounting respects VAT exempt status
- JPK tasks should be marked "nie dotyczy" for VAT exempt
- Timeline engine already computes this - verify UI implementation

---

## Summary

**Completed:** 7/12 tasks
**In Progress:** 1/12 tasks
**Pending:** 4/12 tasks

**Critical Path Remaining:**
1. Complete ryczałt category UI in invoice form (highest priority)
2. Fix period creation modal copy
3. Enhance UnpostedQueueWidget with actionable error reasons
4. Implement acceptance workflow UI

**Database:** All schema changes complete, posting functions updated with on-demand period creation and error reason codes

**Frontend:** Empty state integrated, routing fixed, repository layer ready for ryczałt categories

**Next Session:** Focus on completing ryczałt category UI and UnpostedQueueWidget enhancements to make the system fully "first-business friendly" and "accounting-safe"

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19 19:35  
**Session Duration:** ~2 hours  
**Status:** Core backend complete, UI integration 60% done
