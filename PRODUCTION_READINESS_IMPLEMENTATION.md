# Production Readiness Implementation for sp. z o.o. Accounting

## Overview
This document tracks the implementation of production-grade compliance and audit features for Polish sp. z o.o. (limited liability company) accounting system.

## ✅ Phase 1: Database Infrastructure (COMPLETED)

### Tables Created

#### 1. `accounting_periods` - Year-end Closing System
**Purpose**: Track fiscal years with year-end closing status and carry-forward balances

**Key Features**:
- Fiscal year definition (start_date, end_date)
- Status tracking: `open` → `closing` → `closed`
- Carry-forward balances (retained earnings, unpaid CIT)
- Calculated closing values (net profit/loss, revenue, expenses, CIT liability)
- Immutable once closed (RLS prevents updates to closed periods)
- Audit trail (created_by, updated_by, timestamps)

**Business Logic**:
- Only one `open` period per business profile at a time
- Closing triggers calculation of P&L and CIT
- Closed periods become read-only for compliance

---

#### 2. `audit_log` - Evidence Integrity
**Purpose**: Immutable audit trail for all critical business operations

**Key Features**:
- Tracks all create/update/delete operations
- Stores old and new values (JSONB)
- User identification and timestamp
- IP address and user agent capture
- **Immutable**: No updates or deletes allowed (RLS enforced)

**Triggered Automatically For**:
- Resolutions (uchwały)
- Capital events
- Shareholders
- Shareholder loans
- Shareholder reimbursements

**Compliance Benefit**: 
- Tax inspection: "Who changed this and when?"
- Shareholder disputes: "What was the original value?"
- Accountant handoff: Complete change history

---

#### 3. `shareholder_loans` - Pożyczka Wspólnika
**Purpose**: Track shareholder loans separately from capital contributions

**Key Features**:
- Loan direction: `to_company` (shareholder lends) or `from_company` (company lends)
- Interest rate tracking
- Repayment tracking with linked cash movements
- Status: `active` | `repaid` | `written_off`
- Version control and lock capability
- Audit trail integration

**Business Logic**:
- Links to `account_movements` for cash tracking
- Separate from capital contributions (critical for thin capitalization rules)
- Can be locked after finalization (prevents tampering)

**Compliance Benefit**: Art. 15c CIT thin capitalization compliance

---

#### 4. `shareholder_reimbursements` - Zwroty Kosztów
**Purpose**: Track shareholder expense reimbursements

**Key Features**:
- Expense details with receipt document link
- Approval workflow: `pending` → `approved` → `reimbursed`
- Links to cash movements when reimbursed
- Category tracking for expense classification

**Business Logic**:
- Requires approval before reimbursement
- Links to uploaded receipt documents
- Separate from loans and capital (clear audit trail)

---

#### 5. `compliance_deadlines` - Regulatory Timeline
**Purpose**: Track and remind about regulatory filing deadlines

**Deadline Types**:
- `nip8` - NIP-8 (data changes)
- `vatr` - VAT-R (VAT registration)
- `crbr` - CRBR (beneficial owners registry)
- `cit8` - CIT-8 (annual tax return) - **March 31**
- `financial_statements` - Financial statements to KRS - **June 30**
- `zgz` - Annual General Meeting - **June 30**
- `nzgz` - Extraordinary General Meeting
- `krs_update` - KRS data updates
- `custom` - User-defined deadlines

**Key Features**:
- Auto-generation function: `generate_compliance_deadlines(profile_id, fiscal_year)`
- Status tracking: `pending` → `in_progress` → `completed` | `overdue`
- Document evidence linking
- Filing number storage (e.g., UPO number)

**Business Logic**:
- Automatically generates standard deadlines for sp. z o.o.
- Adjusts based on entity type and VAT status
- Reminder dates for early warnings

---

### Audit Enhancements to Existing Tables

#### Enhanced Tables:
- `resolutions` - Added version, locked, created_by, updated_by
- `capital_events` - Added version, locked, created_by, updated_by
- `shareholders` - Added version, created_by, updated_by

#### Lock Mechanism:
```sql
-- Prevents modification of finalized records
locked = true → UPDATE triggers error
```

**Use Case**: After ZGZ approves a resolution, lock it to prevent tampering.

---

## 📊 TypeScript Types Created

Location: `src/types/accounting.ts`

New interfaces:
- `AccountingPeriod`
- `ShareholderLoan`
- `ShareholderReimbursement`
- `ComplianceDeadline`
- `ComplianceDeadlineType`
- `AuditLogEntry`

---

## 🔧 Repository Functions Created

Location: `src/integrations/supabase/repositories/accountingPeriodsRepository.ts`

### Accounting Periods
- `getAccountingPeriods()` - List all periods
- `getCurrentPeriod()` - Get active open period
- `createAccountingPeriod()` - Start new fiscal year
- `updateAccountingPeriod()` - Update period details
- `closePeriod()` - Close year with P&L calculation

### Shareholder Loans
- `getShareholderLoans()` - List all loans
- `getShareholderLoansByShareholder()` - Filter by shareholder
- `createShareholderLoan()` - Record new loan
- `updateShareholderLoan()` - Update loan details
- `lockShareholderLoan()` - Finalize loan (immutable)

### Shareholder Reimbursements
- `getShareholderReimbursements()` - List all reimbursements
- `getShareholderReimbursementsByShareholder()` - Filter by shareholder
- `createShareholderReimbursement()` - Submit reimbursement request
- `updateShareholderReimbursement()` - Update details
- `approveReimbursement()` - Approve for payment

### Compliance Deadlines
- `getComplianceDeadlines()` - List deadlines (optionally by year)
- `getUpcomingDeadlines()` - Next 90 days
- `getOverdueDeadlines()` - Past due items
- `createComplianceDeadline()` - Add custom deadline
- `updateComplianceDeadline()` - Update details
- `completeDeadline()` - Mark as completed with evidence
- `generateComplianceDeadlines()` - Auto-generate for fiscal year

### Audit Log
- `getAuditLog()` - Query audit trail with filters
- `getRecordHistory()` - Full history for specific record

---

## 🎯 Next Steps (UI Implementation)

### Phase 2A: Year-End Closing Wizard
**Route**: `/accounting/year-end`

**Features**:
1. Review current period transactions
2. Calculate net profit/loss automatically
3. Calculate CIT liability (9% or 19%)
4. Preview carry-forward balances
5. Lock period (irreversible)
6. Generate closing resolution template

**Components Needed**:
- `YearEndDashboard.tsx` - Overview of current period
- `YearEndWizard.tsx` - Multi-step closing wizard
- `PeriodReview.tsx` - Transaction completeness check
- `ClosingCalculations.tsx` - P&L and CIT display

---

### Phase 2B: Shareholder Loans & Reimbursements
**Route**: `/accounting/shareholders/:id` (new tabs)

**Features**:
1. **Loans Tab**:
   - List active/repaid loans
   - Add new loan (to/from company)
   - Link to cash movements
   - Lock finalized loans
   - Interest calculation

2. **Reimbursements Tab**:
   - Submit expense reimbursement
   - Upload receipt
   - Approval workflow
   - Link to cash payment

**Components Needed**:
- `ShareholderLoansTab.tsx`
- `LoanForm.tsx`
- `ReimbursementsTab.tsx`
- `ReimbursementForm.tsx`

---

### Phase 2C: Compliance Timeline Dashboard
**Route**: `/accounting/compliance` (new page)

**Features**:
1. Timeline view of all deadlines
2. Upcoming deadlines widget (dashboard)
3. Overdue items (red alerts)
4. Mark as completed with evidence upload
5. Auto-generate deadlines for new fiscal year

**Components Needed**:
- `ComplianceTimeline.tsx` - Full page view
- `ComplianceWidget.tsx` - Dashboard widget
- `DeadlineCard.tsx` - Individual deadline display
- `CompleteDeadlineDialog.tsx` - Mark complete with evidence

---

### Phase 2D: CIT-8 & Financial Statements
**Route**: `/accounting/year-end/reports`

**Features**:
1. CIT-8 data export (JSON/XML for e-Deklaracje)
2. Balance Sheet PDF generation
3. P&L Statement PDF generation
4. Notes (Informacja dodatkowa) template
5. Resolution generator (approval of statements)

**Components Needed**:
- `CIT8Export.tsx`
- `FinancialStatements.tsx`
- `BalanceSheetPDF.tsx`
- `PLStatementPDF.tsx`
- `ResolutionGenerator.tsx`

---

## 🔒 Security & Compliance Features

### Row-Level Security (RLS)
✅ All tables have RLS enabled
✅ Users can only access their own business profile data
✅ Closed periods are read-only
✅ Audit log is append-only (no updates/deletes)

### Audit Trail
✅ All critical operations logged automatically
✅ Old and new values stored (JSONB)
✅ User identification and timestamps
✅ Immutable audit records

### Version Control
✅ Version number incremented on each update
✅ Lock mechanism prevents modification of finalized records
✅ Created_by and updated_by tracking

### Data Integrity
✅ Foreign key constraints
✅ Check constraints on enums
✅ Triggers for automatic audit logging
✅ Triggers prevent locked record updates

---

## 📋 Standard Compliance Deadlines (Auto-Generated)

For sp. z o.o. fiscal year 2024:

| Deadline | Date | Description |
|----------|------|-------------|
| CIT-8 | March 31, 2025 | Annual tax return |
| ZGZ | June 30, 2025 | Annual General Meeting |
| Financial Statements | June 30, 2025 | Submit to KRS |
| CRBR | July 31, 2024 | Beneficial owners update |
| VAT-R | January 25, 2024 | VAT registration (if applicable) |

---

## 🎓 Polish Accounting Doctrine Compliance

### Capital vs Loans vs Reimbursements
✅ **Share Capital** (`capital_events`) - Wkład kapitałowy
✅ **Shareholder Loans** (`shareholder_loans`) - Pożyczka wspólnika
✅ **Reimbursements** (`shareholder_reimbursements`) - Zwroty kosztów

**Why This Matters**:
- Thin capitalization rules (Art. 15c CIT)
- Tax deductibility of interest
- Shareholder liability
- Audit clarity

### Year-End Closing
✅ Zysk/strata netto → kapitał własny (retained earnings)
✅ Separate YTD vs closed year
✅ Carry-forward balances
✅ CIT liability calculation

### Corporate Governance
✅ Resolutions (uchwały) with approval workflow
✅ ZGZ requirement (annual meeting)
✅ Financial statement approval
✅ Profit allocation decisions

---

## 🚀 Migration Status

All migrations successfully applied to Supabase project: `rncrzxjyffxmfbnxlqtm`

1. ✅ `create_accounting_periods_table`
2. ✅ `create_audit_log_table`
3. ✅ `create_shareholder_loans_table`
4. ✅ `create_shareholder_reimbursements_table`
5. ✅ `create_compliance_deadlines_table`
6. ✅ `add_audit_columns_to_critical_tables`

---

## 📝 Usage Examples

### Start New Fiscal Year
```typescript
import { createAccountingPeriod, generateComplianceDeadlines } from '@/integrations/supabase/repositories/accountingPeriodsRepository';

// Create new period
const period = await createAccountingPeriod({
  business_profile_id: profileId,
  fiscal_year: 2025,
  start_date: '2025-01-01',
  end_date: '2025-12-31',
  status: 'open',
  retained_earnings_brought_forward: 50000,
  unpaid_cit_brought_forward: 0,
});

// Auto-generate compliance deadlines
await generateComplianceDeadlines(profileId, 2025);
```

### Record Shareholder Loan
```typescript
import { createShareholderLoan } from '@/integrations/supabase/repositories/accountingPeriodsRepository';

const loan = await createShareholderLoan({
  business_profile_id: profileId,
  shareholder_id: shareholderId,
  loan_type: 'to_company',
  amount: 100000,
  currency: 'PLN',
  loan_date: '2025-01-15',
  interest_rate: 0.05, // 5%
  purpose: 'Working capital',
  status: 'active',
  created_by: userId,
});
```

### Close Fiscal Year
```typescript
import { closePeriod } from '@/integrations/supabase/repositories/accountingPeriodsRepository';

const closedPeriod = await closePeriod(periodId, {
  net_profit_loss: 150000,
  total_revenue: 500000,
  total_expenses: 350000,
  cit_liability: 13500, // 9% of 150k
  cit_rate: 0.09,
});
```

### Track Compliance
```typescript
import { getUpcomingDeadlines, completeDeadline } from '@/integrations/supabase/repositories/accountingPeriodsRepository';

// Get upcoming deadlines
const upcoming = await getUpcomingDeadlines(profileId, 90);

// Mark CIT-8 as completed
await completeDeadline(deadlineId, documentId, 'UPO-123456789');
```

---

## 🎯 Production Readiness Checklist

### Database ✅
- [x] Accounting periods table
- [x] Audit log table
- [x] Shareholder loans table
- [x] Shareholder reimbursements table
- [x] Compliance deadlines table
- [x] Audit columns on critical tables
- [x] RLS policies
- [x] Audit triggers
- [x] Lock mechanism

### TypeScript ✅
- [x] Type definitions
- [x] Repository functions
- [x] Error handling

### UI (Pending)
- [ ] Year-end closing wizard
- [ ] Shareholder loans management
- [ ] Reimbursements workflow
- [ ] Compliance timeline
- [ ] CIT-8 export
- [ ] Financial statements generator

### Documentation ✅
- [x] Implementation guide
- [x] Usage examples
- [x] Compliance mapping

---

## 📚 References

### Polish Regulations
- **CIT Act** (Ustawa o CIT) - Art. 15c (thin capitalization)
- **KSH** (Kodeks spółek handlowych) - sp. z o.o. requirements
- **Accounting Act** (Ustawa o rachunkowości) - Financial statements
- **CRBR** - Beneficial owners registry

### Deadlines
- CIT-8: Art. 27 ust. 1 CIT Act (3 months after fiscal year end)
- Financial Statements: Art. 69 Accounting Act (6 months after fiscal year end)
- ZGZ: Art. 231 KSH (within 6 months)

---

## 🔄 Next Session Tasks

1. Build year-end closing wizard UI
2. Add shareholder loans/reimbursements tabs
3. Create compliance timeline dashboard
4. Implement CIT-8 export functionality
5. Generate financial statement PDFs

---

*Last Updated: December 16, 2025*
*Database Schema Version: 1.0*
*Status: Phase 1 Complete - Ready for UI Implementation*
