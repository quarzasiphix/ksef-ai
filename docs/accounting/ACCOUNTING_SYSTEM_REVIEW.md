# Accounting System - Comprehensive Review & Roadmap

## Executive Summary

The accounting system is in **advanced development stage** with a sophisticated triple-entry accounting foundation built for Polish companies. The system currently supports **both JDG (Jednoosobowa Działalność Gospodarcza)** and **Sp. z o.o.** entities, but with different feature sets and UI flows.

**Current State**: ~60% complete
- ✅ Chart of Accounts (CoA) with Polish standards
- ✅ Triple-entry accounting events system
- ✅ Journal entries and ledger
- ✅ Basic tax reporting (JPK_V7M, ZUS, PIT/CIT)
- ✅ Capital events for Spółka
- ✅ Cash management (Kasa)
- ⚠️ Partial automation of account assignment
- ❌ Full CoA auto-application based on context
- ❌ Separate accounting flows for JDG vs Spółka
- ❌ Automated period closing
- ❌ Full financial statements generation

---

## 1. Architecture Overview

### 1.1 Core Philosophy

The system uses **triple-entry accounting** (not double-entry):
- **Traditional**: Debit + Credit = 0
- **Triple-entry**: Debit + Credit + Event = Immutable Audit Trail

Every financial transaction creates:
1. **Event** (immutable source of truth)
2. **Journal Entry** (accounting representation)
3. **Ledger Entries** (account movements)

### 1.2 Database Schema

#### Core Tables

**`chart_accounts`** - Chart of Accounts
```sql
- id, business_profile_id
- code (e.g., "201", "400-01")
- name (e.g., "Rozrachunki z dostawcami")
- account_type: asset|liability|equity|revenue|expense|off_balance
- parent_id (hierarchy support)
- is_synthetic (cannot post directly if true)
- default_vat_rate, vat_exempt
- is_active (soft delete only)
```

**`events`** - Unified event log (triple-entry source)
```sql
- id, business_profile_id, user_id
- event_type (invoice_created, payment_recorded, capital_contribution, etc.)
- entity_type, entity_id (what triggered this)
- occurred_at (when it happened)
- metadata (JSONB - flexible event data)
- posting_status: unposted|posted|rejected
```

**`journal_entries`** - Accounting entries
```sql
- id, business_profile_id, event_id
- entry_date, document_number
- description
- is_posted (finalized or draft)
- lines[] (debit/credit pairs)
```

**`journal_entry_lines`** - Individual debit/credit lines
```sql
- id, journal_entry_id, account_id
- debit_amount, credit_amount
- description
```

**`equity_transactions`** - Capital events (Spółka only)
```sql
- id, business_profile_id
- transaction_type: capital_contribution|withdrawal|dividend|retained_earnings
- amount, shareholder_name
- payment_method, cash_account_id, bank_account_id
- journal_entry_id (links to accounting)
```

**`accounting_periods`** - Fiscal year management
```sql
- id, business_profile_id
- fiscal_year, start_date, end_date
- status: open|closing|closed
- retained_earnings_brought_forward
- net_profit_loss, cit_liability
```

---

## 2. Current Features by Entity Type

### 2.1 JDG (Jednoosobowa Działalność Gospodarcza)

**What Works:**
- ✅ Invoice tracking (income/expense)
- ✅ JPK_V7M generation (monthly VAT report)
- ✅ ZUS payment tracking
- ✅ PIT advance calculations (quarterly)
- ✅ VAT threshold tracking (200k PLN limit)
- ✅ Cash register (Kasa) with KP/KW documents
- ✅ Basic expense categorization
- ✅ Tax timeline with deadlines

**What's Missing:**
- ❌ Automatic CoA assignment for invoices
- ❌ Full księga przychodów i rozchodów (KPiR) view
- ❌ Ryczałt (flat tax) specific features
- ❌ Automated year-end closing
- ❌ Multi-year comparison reports

**UI Location:**
- Main: `src/modules/accounting/screens/Accounting.tsx`
- Shows: Tax timeline, ZUS payments, JPK generation, VAT threshold

### 2.2 Sp. z o.o. (Spółka z ograniczoną odpowiedzialnością)

**What Works:**
- ✅ Full Chart of Accounts (Polish standard)
- ✅ Capital contribution tracking
- ✅ Shareholder management
- ✅ Journal entries (manual)
- ✅ General ledger view
- ✅ Balance sheet calculation
- ✅ CIT-8 reminder (annual)
- ✅ Equity transaction logging
- ✅ Decision-based accounting (uchwały)
- ✅ Asset management foundation

**What's Missing:**
- ❌ Automated posting rules (invoice → journal entry)
- ❌ Period closing workflow
- ❌ Profit & Loss statement generation
- ❌ Dividend distribution workflow
- ❌ Full depreciation automation
- ❌ Consolidated financial statements
- ❌ Multi-entity consolidation

**UI Location:**
- Main: `src/modules/accounting/screens/Accounting.tsx` (different view for Spółka)
- CoA: `src/modules/accounting/screens/ChartOfAccounts.tsx`
- Ledger: `src/modules/accounting/screens/GeneralLedger.tsx`
- Capital: `src/modules/accounting/screens/CapitalEvents.tsx`

---

## 3. Chart of Accounts (CoA) Deep Dive

### 3.1 Current Implementation

**Structure:**
- Based on Polish accounting standards (Ustawa o rachunkowości)
- Hierarchical: Synthetic accounts → Analytic accounts
- Account classes: 0-9 (Polish convention)
  - **0xx**: Off-balance sheet
  - **1xx**: Fixed assets, cash, bank
  - **2xx**: Receivables, payables, accruals
  - **3xx**: Inventory
  - **4xx-6xx**: Expenses
  - **7xx**: Revenue
  - **8xx**: Equity
  - **9xx**: Off-balance sheet (closing)

**Seeding Function:**
```typescript
// Database function: seed_chart_accounts(p_business_profile_id)
// Creates default Polish CoA for new business profiles
```

**UI Features:**
- ✅ Accordion-style grouping (Assets, Liabilities, Equity, Revenue, Expenses)
- ✅ Subgroup categorization (e.g., "Środki pieniężne", "Należności")
- ✅ Real-time balance display
- ✅ Month delta and YTD delta
- ✅ Jump command (Ctrl+K) for quick navigation
- ✅ Soft delete (deactivate) with reference checking
- ✅ Account detail drawer with transaction history

**Code Location:**
- UI: `src/modules/accounting/screens/ChartOfAccounts.tsx`
- Grouping logic: `src/modules/accounting/lib/account-grouping.ts`
- Database: `supabase/migrations/20260104_chart_of_accounts.sql`

### 3.2 Auto-Application Gap

**Current State:**
The CoA exists but is **not automatically applied** to transactions. When a user creates an invoice or expense, the system:
1. Creates the invoice/expense record
2. Creates an event in the `events` table
3. **Does NOT** automatically create journal entries
4. **Does NOT** assign Wn (debit) and Ma (credit) accounts

**What's Needed:**
- Posting rules engine
- Context-aware account assignment
- Automatic journal entry generation

---

## 4. Accounting Automation Status

### 4.1 What's Automated

**Invoice Creation → Event:**
```typescript
// When invoice is saved:
1. Invoice record created in `invoices` table
2. Event logged: event_type = 'invoice_created'
3. Event metadata includes: invoice_id, amount, vat, customer
```

**Cash Transaction → Ledger:**
```typescript
// When KP/KW is created:
1. Cash transaction in `cash_transactions` table
2. Account movement in `account_movements` table
3. Event logged with cash_account_id
```

**Capital Contribution → Multiple Systems:**
```typescript
// When capital is contributed:
1. Equity transaction in `equity_transactions` table
2. Cash transaction (KP) if payment_method = 'cash'
3. Account movement created
4. Event logged
5. Document linked (if uploaded)
```

### 4.2 What's Manual

**Invoice → Journal Entry:**
Currently, accountants must manually:
1. Review invoice
2. Determine correct accounts (e.g., 400 for sales, 201 for payables)
3. Create journal entry with debit/credit lines
4. Post the entry

**Expense → CoA Assignment:**
No automatic mapping from expense categories to chart accounts.

**Period Closing:**
No automated workflow for:
- Closing revenue/expense accounts
- Calculating net profit
- Transferring to retained earnings
- Generating financial statements

---

## 5. Backend Architecture

### 5.1 Repository Pattern

**Data Access Layer:**
```
src/modules/accounting/data/
├── accountingRepository.ts      # CoA, journal entries, balance sheet
├── accountingPeriodsRepository.ts # Fiscal year management
├── capitalEventsRepository.ts   # Equity transactions
├── kasaRepository.ts            # Cash register
├── treasuryRepository.ts        # Bank accounts, movements
├── eventsRepository.ts          # Event logging
└── unifiedEventsRepository.ts   # Unified event system
```

**Key Functions:**
- `getChartOfAccounts(businessProfileId)` - Fetch CoA
- `createJournalEntry(entry, lines)` - Manual posting
- `calculateBalanceSheet(businessProfileId, periodEnd)` - Generate balance sheet
- `getEquityTransactions(businessProfileId)` - Capital events
- `logEvent(profileId, type, entityType, entityId, description, metadata)` - Event logging

### 5.2 Database Functions (RPC)

**`seed_chart_accounts(p_business_profile_id)`**
- Creates default Polish CoA
- Called when business profile is created or manually

**`get_account_balances(p_business_profile_id)`**
- Returns current balance, month delta, YTD delta for all accounts
- Used by CoA UI to show real-time balances

**`get_trial_balance(p_business_profile_id, p_period_end)`**
- Calculates trial balance (sum of debits = sum of credits)
- Used for balance sheet generation

**`deactivate_chart_account(p_account_id, p_actor_name, p_reason)`**
- Soft delete with reference checking
- Prevents deletion if account is used in events

**`reactivate_chart_account(p_account_id, p_actor_name)`**
- Reactivates deactivated account

### 5.3 Event System

**Unified Events Architecture:**
```typescript
interface Event {
  id: string;
  business_profile_id: string;
  event_type: string; // 'invoice_created', 'payment_recorded', etc.
  entity_type: string; // 'invoice', 'expense', 'equity_transaction'
  entity_id: string;
  occurred_at: string;
  metadata: JSONB; // Flexible event data
  posting_status: 'unposted' | 'posted' | 'rejected';
}
```

**Event Types:**
- `invoice_created`, `invoice_issued`, `invoice_paid`
- `expense_recorded`, `expense_paid`
- `payment_recorded`
- `capital_contribution`, `capital_withdrawal`
- `cash_transaction_created`
- `period_closed`

**Event Flow:**
```
Transaction → Event → (Manual) Journal Entry → Ledger → Financial Statements
```

---

## 6. JDG vs Spółka Differences

### 6.1 Legal & Accounting Differences

| Aspect | JDG | Sp. z o.o. |
|--------|-----|------------|
| **Accounting Method** | KPiR (Księga Przychodów i Rozchodów) or Ryczałt | Full accounting (Pełna księgowość) |
| **Tax** | PIT (Personal Income Tax) | CIT (Corporate Income Tax) |
| **Capital** | No capital structure | Share capital, retained earnings |
| **Shareholders** | Owner = business | Separate legal entity |
| **Financial Statements** | Not required | Required (Balance Sheet, P&L) |
| **Audit** | Not required (usually) | Required if thresholds met |
| **VAT** | Optional (threshold 200k PLN) | Usually required |
| **ZUS** | Owner pays | Company + employees pay |
| **Decisions** | Owner decides | Uchwały (resolutions) required |

### 6.2 System Implications

**JDG Needs:**
- Simplified accounting (KPiR view)
- PIT calculations (skala, liniowy, ryczałt)
- VAT threshold tracking
- Owner's personal ZUS tracking
- Simple expense categorization
- No capital events
- No shareholders

**Spółka Needs:**
- Full Chart of Accounts
- CIT calculations
- Capital contribution tracking
- Shareholder management
- Decision-based accounting (uchwały)
- Dividend distribution
- Financial statements (balance sheet, P&L, cash flow)
- Audit trail for compliance
- Period closing workflow

### 6.3 Current UI Separation

**Detection:**
```typescript
const isSpZoo = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
```

**Conditional Rendering:**
```typescript
// In Accounting.tsx
if (isSpZoo) {
  // Show: Capital transactions, decisions, full CoA access
  // Hide: VAT threshold, PIT calculations
} else {
  // Show: VAT threshold, PIT advances, simplified view
  // Hide: Capital events, shareholders
}
```

**Tax Reports:**
```typescript
// JDG: JPK_V7M (monthly), ZUS (monthly), PIT (quarterly)
// Spółka: CIT-8 (annual), ZUS (monthly if employees)
```

---

## 7. What's Missing for Full Accounting

### 7.1 Critical Gaps

**1. Automated Posting Rules**
- Need: Rule engine to map transactions → journal entries
- Example: Invoice with VAT 23% → Wn: 202 (Należności), Ma: 700 (Przychody), Ma: 221 (VAT należny)

**2. Context-Aware CoA Assignment**
- Need: Smart account picker based on transaction context
- Example: When creating expense for "office rent" → suggest account 421 (Usługi obce)

**3. Period Closing Workflow**
- Need: Automated year-end closing
- Steps:
  1. Close all revenue accounts (7xx) → 860 (Wynik finansowy)
  2. Close all expense accounts (4xx-6xx) → 860
  3. Calculate net profit/loss
  4. Transfer to 820 (Zyski zatrzymane)
  5. Lock period

**4. Financial Statements Generation**
- Need: Automated P&L, Balance Sheet, Cash Flow
- Current: Only balance sheet calculation exists

**5. KPiR View for JDG**
- Need: Księga Przychodów i Rozchodów format
- Columns: LP, Data, Numer dowodu, Opis, Przychód, Koszt, Uwagi
- Current: Only invoice/expense lists

**6. Depreciation Automation**
- Need: Monthly depreciation calculation and posting
- Current: Manual depreciation entries only

**7. VAT Declarations**
- Need: JPK_V7M with automatic Wn/Ma from invoices
- Current: JPK generation exists but without accounting integration

### 7.2 Nice-to-Have Features

- Multi-currency support (beyond PLN)
- Budget vs actual comparison
- Cash flow forecasting
- Automated bank reconciliation
- OCR for expense receipts
- Integration with external accounting software
- Multi-entity consolidation
- Advanced reporting (custom queries)

---

## 8. Roadmap for Full Accounting System

### Phase 1: Automated Posting (Priority: HIGH)

**Goal:** Automatically create journal entries from business events

**Tasks:**
1. **Create posting rules engine**
   - Database table: `posting_rules`
   - Fields: event_type, conditions (JSONB), debit_account_code, credit_account_code, amount_field
   - Example: `{ event_type: 'invoice_created', vat: true } → Wn: 202, Ma: 700, Ma: 221`

2. **Implement auto-posting function**
   - Trigger: When event is created
   - Logic: Match event → find rule → create journal entry → post
   - Fallback: If no rule, mark as 'needs_review'

3. **Build rule management UI**
   - Screen: `/accounting/posting-rules`
   - Features: CRUD for rules, test rule against sample events

**Estimated Time:** 2-3 weeks

### Phase 2: Context-Aware CoA (Priority: HIGH)

**Goal:** Smart account suggestions based on transaction context

**Tasks:**
1. **Account recommendation engine**
   - Input: Transaction type, description, category, amount
   - Output: Suggested account with confidence score
   - ML approach: Train on historical data (optional)
   - Rule-based approach: Keyword matching + category mapping

2. **Enhanced account picker**
   - Show: Recent accounts, suggested accounts, all accounts
   - Search: By code, name, description
   - Filters: By account type, VAT rate

3. **Category → Account mapping**
   - Table: `expense_categories_to_accounts`
   - Map: "office_rent" → 421, "salaries" → 440, etc.

**Estimated Time:** 2 weeks

### Phase 3: JDG-Specific Features (Priority: MEDIUM)

**Goal:** Complete KPiR and simplified accounting for JDG

**Tasks:**
1. **KPiR view**
   - Screen: `/accounting/kpir`
   - Format: Traditional KPiR columns
   - Export: PDF, Excel

2. **Ryczałt support**
   - Flat tax rate configuration
   - No expense tracking (revenue only)
   - Simplified reporting

3. **PIT automation**
   - Calculate advances (skala, liniowy)
   - Generate PIT-5 data
   - Track payments

**Estimated Time:** 2-3 weeks

### Phase 4: Spółka-Specific Features (Priority: MEDIUM)

**Goal:** Complete financial statements and period closing

**Tasks:**
1. **Period closing workflow**
   - UI wizard: `/accounting/close-period`
   - Steps: Review → Close accounts → Calculate profit → Lock
   - Validation: Trial balance, all entries posted

2. **P&L statement**
   - Calculation: Sum of revenue - sum of expenses
   - Format: Polish standard (Rachunek zysków i strat)
   - Export: PDF, Excel

3. **Cash flow statement**
   - Method: Indirect (from P&L and balance sheet changes)
   - Categories: Operating, investing, financing

4. **Dividend workflow**
   - UI: `/accounting/dividends`
   - Logic: Check retained earnings → create dividend event → post → create payment

**Estimated Time:** 3-4 weeks

### Phase 5: Advanced Features (Priority: LOW)

**Goal:** Enterprise-grade features

**Tasks:**
1. **Depreciation automation**
   - Monthly job: Calculate and post depreciation
   - Methods: Straight-line, declining balance

2. **Budget management**
   - Budget creation UI
   - Budget vs actual reports
   - Variance analysis

3. **Multi-entity consolidation**
   - Combine financial statements from multiple entities
   - Eliminate intercompany transactions

4. **Advanced reporting**
   - Custom report builder
   - Saved report templates
   - Scheduled report generation

**Estimated Time:** 4-6 weeks

---

## 9. Technical Recommendations

### 9.1 Immediate Actions

1. **Separate JDG and Spółka accounting flows**
   - Create: `src/modules/accounting/screens/JdgAccounting.tsx`
   - Create: `src/modules/accounting/screens/SpzooAccounting.tsx`
   - Route based on `entityType`

2. **Implement posting rules table**
   ```sql
   CREATE TABLE posting_rules (
     id UUID PRIMARY KEY,
     business_profile_id UUID, -- NULL = global rule
     event_type TEXT NOT NULL,
     conditions JSONB, -- Match conditions
     debit_account_code TEXT NOT NULL,
     credit_account_code TEXT NOT NULL,
     amount_field TEXT, -- Which field to use for amount
     priority INT DEFAULT 0,
     is_active BOOLEAN DEFAULT TRUE
   );
   ```

3. **Create auto-posting trigger**
   ```sql
   CREATE TRIGGER auto_post_event
     AFTER INSERT ON events
     FOR EACH ROW
     EXECUTE FUNCTION auto_create_journal_entry();
   ```

### 9.2 Architecture Patterns

**1. Event-Driven Accounting**
- All transactions emit events
- Events trigger posting rules
- Journal entries are derived, not primary

**2. Immutable Events**
- Events are never deleted, only marked as 'reversed'
- Corrections create new events with negative amounts

**3. Separation of Concerns**
- Business logic (invoices, expenses) → Events
- Accounting logic (journal entries) → Separate layer
- Reporting (financial statements) → Read-only views

### 9.3 Testing Strategy

**Unit Tests:**
- Posting rules engine
- Account balance calculations
- Period closing logic

**Integration Tests:**
- Invoice → Event → Journal Entry → Ledger
- Capital contribution → Cash transaction → Account movement

**E2E Tests:**
- Complete accounting cycle (invoice to financial statement)
- Period closing workflow
- Multi-entity scenarios

---

## 10. Summary & Next Steps

### Current State Assessment

**Strengths:**
- ✅ Solid triple-entry foundation
- ✅ Polish accounting standards compliance
- ✅ Flexible event system
- ✅ Separate entity type handling
- ✅ Good UI/UX for CoA navigation

**Weaknesses:**
- ❌ Manual journal entry creation
- ❌ No automated posting rules
- ❌ Incomplete JDG features (no KPiR view)
- ❌ Incomplete Spółka features (no period closing)
- ❌ Limited financial statement generation

### Recommended Priority Order

1. **Phase 1: Automated Posting** (Highest ROI)
   - Eliminates manual work
   - Reduces errors
   - Enables real-time accounting

2. **Phase 2: Context-Aware CoA** (User Experience)
   - Makes system easier to use
   - Reduces learning curve
   - Improves data quality

3. **Phase 3: JDG Features** (Market Coverage)
   - Serves majority of Polish businesses
   - Simpler to implement
   - Faster time to market

4. **Phase 4: Spółka Features** (Premium Tier)
   - Higher value customers
   - More complex requirements
   - Justifies higher pricing

5. **Phase 5: Advanced Features** (Differentiation)
   - Enterprise customers
   - Competitive advantage
   - Long-term vision

### Success Metrics

- **Automation Rate**: % of transactions auto-posted
- **User Time Saved**: Hours per month vs manual accounting
- **Error Rate**: Accounting errors per 1000 transactions
- **Adoption**: % of users using full accounting features
- **Compliance**: % of financial statements passing audit

---

## Appendix: Code References

### Key Files

**Frontend:**
- `src/modules/accounting/screens/Accounting.tsx` - Main accounting dashboard
- `src/modules/accounting/screens/ChartOfAccounts.tsx` - CoA management
- `src/modules/accounting/screens/GeneralLedger.tsx` - Ledger view
- `src/modules/accounting/components/AccountDetailDrawer.tsx` - Account details
- `src/modules/accounting/lib/account-grouping.ts` - CoA grouping logic

**Backend:**
- `src/modules/accounting/data/accountingRepository.ts` - Main data access
- `src/modules/accounting/data/eventsRepository.ts` - Event logging
- `src/modules/accounting/accounting.ts` - Type definitions

**Database:**
- `supabase/migrations/20260104_chart_of_accounts.sql` - CoA schema
- `supabase/migrations/20260103_accounting_events_triple_entry.sql` - Event system
- `supabase/migrations/20260104_journal_entries.sql` - Journal entries

### Database Schema Diagram

```
business_profiles
    ↓
chart_accounts ← journal_entry_lines → journal_entries
    ↓                                         ↓
events ← equity_transactions          accounting_periods
    ↓
cash_transactions → account_movements
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Author:** Cascade AI  
**Status:** Ready for Review
