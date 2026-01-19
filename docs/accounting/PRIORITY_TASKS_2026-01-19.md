# Priority Tasks Implementation - 2026-01-19

## ✅ Completed

### 1. Fixed Capital & Shareholders Routing
**Issue:** Buttons in SpzooAccounting pointed to `/spolka/capital` and `/spolka/shareholders` which don't exist

**Fix:** Updated all links to correct routes:
- `/spolka/capital` → `/accounting/capital-events`
- `/spolka/shareholders` → `/accounting/shareholders`

**Files:** `src/modules/accounting/screens/SpzooAccounting.tsx`

---

### 2. Integrated EmptyStateAccounting Component
**Requirement:** Show guided onboarding for new businesses with no financial activity

**Implementation:**
- Added `getAccountingSetupState()` call in both JdgAccounting and SpzooAccounting
- Check if `stage === 'empty' || stage === 'configured_no_activity'`
- Render `EmptyStateAccounting` component with:
  - Setup state (missing config, recommended actions, obligations timeline)
  - Entity type (dzialalnosc vs sp_zoo)
  - Navigation handler for CTAs

**Files:**
- `src/modules/accounting/screens/JdgAccounting.tsx`
- `src/modules/accounting/screens/SpzooAccounting.tsx`

**Result:** New businesses now see:
- Status card explaining "no records is normal"
- Recommended actions (create invoice, add expense, connect bank, fix config)
- Obligations timeline (ZUS, PIT, CIT, JPK based on profile settings)
- "Do I need to file with zero sales?" info

---

## 🔄 In Progress

### 3. Ryczałt Category Selection in Invoice Form
**Requirement:** Enforce category selection for JDG ryczałt income invoices

**What needs to happen:**
1. Add `ryczalt_category_id` field to invoice form schema
2. Fetch ryczałt categories from database (scoped to business profile)
3. Show category dropdown when:
   - Profile entity type = JDG (dzialalnosc)
   - Profile tax type = ryczałt
   - Invoice transaction type = income
4. Make field required (validation error if missing)
5. Display rate next to category name (read-only)
6. Show computed tax preview per invoice

**Files to modify:**
- `src/modules/invoices/screens/invoices/NewInvoice.tsx` - Add field to schema
- `src/modules/invoices/components/forms/InvoiceBasicInfoForm.tsx` - Add UI field
- Invoice repository - Save category ID

**Database:** Already has `ryczalt_category_id` and `ryczalt_rate` columns on invoices table

**Posting function:** Already enforces category presence and returns "MISSING_CATEGORY" error

---

## 📋 Pending (High Priority)

### 4. On-Demand Period Creation
**Requirement:** Auto-create accounting periods when posting documents

**Current behavior:** Posting fails if period doesn't exist for document date

**Desired behavior:**
```sql
-- In auto_post_invoice_unified or post_to_jdg_register:
IF NOT EXISTS (
  SELECT 1 FROM accounting_periods
  WHERE business_profile_id = p_business_profile_id
  AND period_year = EXTRACT(YEAR FROM v_invoice.issue_date)
  AND period_month = EXTRACT(MONTH FROM v_invoice.issue_date)
) THEN
  INSERT INTO accounting_periods (
    business_profile_id,
    period_year,
    period_month,
    is_locked,
    created_at
  ) VALUES (
    p_business_profile_id,
    EXTRACT(YEAR FROM v_invoice.issue_date),
    EXTRACT(MONTH FROM v_invoice.issue_date),
    false,
    NOW()
  );
END IF;
```

**Constraints:**
- Respect `accounting_start_date` - don't create periods before this date
- Don't create hundreds of periods for old start dates
- Only create period for the specific month being posted

**Files:**
- `supabase/migrations/[new]_auto_create_periods_on_posting.sql`

---

### 5. Accounting Error Reason Codes
**Requirement:** Add `accounting_error_reason` column and enhance unposted queue widget

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
    'RPC_ERROR'
  )
);
```

**UI Enhancement:**
- UnpostedQueueWidget shows expandable list with reasons
- Each reason has actionable next step:
  - `PENDING_ACCEPTANCE` → "Accept expense in inbox"
  - `LOCKED_PERIOD` → "Unlock period or change document date"
  - `MISSING_RULE` → "Add posting rule for this document type"
  - `MISSING_PAYMENT_METHOD` → "Set payment method on invoice"
  - `INVALID_PROFILE_CONFIG` → "Complete business profile setup"
  - `MISSING_CATEGORY` → "Select ryczałt category on invoice"
  - `RPC_ERROR` → "Contact support with error details"

**Files:**
- `supabase/migrations/[new]_add_accounting_error_reason.sql`
- `src/modules/accounting/components/UnpostedQueueWidget.tsx`

---

### 6. Acceptance Workflow UI
**Requirement:** Show pending expenses in inbox and unposted queue

**Rules:**
- Own expenses: auto-accepted
- Shared/received expenses: pending until accepted
- Pending items must not be postable

**UI Components:**

**A) Inbox/Expenses List:**
- Show status badge: "Oczekuje akceptacji" vs "Zaakceptowano"
- Provide Accept/Reject buttons
- Filter by acceptance status

**B) Accounting Screen:**
- Unposted queue shows: "X expenses waiting for acceptance"
- Link to inbox with filter applied
- Clear explanation: "Cannot post until accepted"

**Files:**
- `src/modules/inbox/screens/UnifiedInboxPage.tsx`
- `src/modules/invoices/screens/expense/ExpenseList.tsx`
- `src/modules/accounting/components/UnpostedQueueWidget.tsx`

---

### 7. Guardrails & Consistency Checks
**Requirement:** Prevent silent wrong accounting

**A) Locked Period Blocking:**
- Posting into locked period must hard-fail (already exists conceptually)
- UI must communicate clearly: "Period is locked - cannot post"
- Provide action: "Unlock period" or "Change document date"

**B) Ryczałt Category Enforcement:**
- UI must prevent invoice finalization without category
- Not just RPC error - block at form level
- Already partially implemented - complete in invoice form

**C) VAT-Exempt Timeline Filtering:**
- VAT-exempt profiles should not see JPK filing tasks
- Timeline engine already computes this - verify UI respects it
- EmptyStateAccounting already shows "nie dotyczy" for JPK

**Files:**
- Posting functions (already have checks)
- Invoice form (add validation)
- Timeline components (verify filtering)

---

## Implementation Order (Recommended)

**Priority 1 (Immediate):**
1. ✅ Fix routing (DONE)
2. ✅ Integrate empty state (DONE)
3. 🔄 Ryczałt category in invoice form (IN PROGRESS)

**Priority 2 (This Session):**
4. On-demand period creation
5. Error reason codes

**Priority 3 (Next Session):**
6. Acceptance workflow UI
7. Guardrails verification

---

## Non-Negotiable Rules (From User)

### Product Separation
- **JDG (działalność)** = "register-first" (ewidencja przychodów), no journal/CoA as primary system
- **Sp. z o.o.** = full posting rules → journal entries → ledger → statements
- Do NOT blend UIs or data concepts

### Ryczałt Rates
- Per revenue category (invoice/service line), NOT company-wide
- Business profile must NOT ask for single %
- Invoice creation must require category selection
- Snapshot rate at posting time (immutability)

### Business Start Dates
- `business_start_date`: when business actually started
- `accounting_start_date`: when user starts tracking in system (migration cutoff)
- Timeline and period generation use `accounting_start_date` as earliest boundary

### Obligations Timeline
- Computed from profile settings (entity type, tax type, VAT status, start dates)
- Do NOT require ledger/register existence
- Works for brand-new businesses with zero data

### Acceptance Workflow
- Own expenses: auto-accepted
- Shared/received: pending until accepted
- Pending items must not be postable

### Consistency Checks
- Posting into locked period must hard-fail
- Ryczałt income without category must be impossible in UI
- VAT-exempt profiles should not see VAT filing tasks

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Status:** 2/7 tasks completed, 1 in progress
