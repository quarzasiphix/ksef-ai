# Accounting System Documentation - Current State Analysis

**Date**: January 30, 2026  
**Purpose**: Document current posting rules, accounting posting, and period closing functionality for system improvement planning

---

## Executive Summary

The accounting system is a sophisticated multi-layer architecture designed for Polish tax compliance with support for different tax regimes (ryczałt, liniowy, skala). It features automated posting, period locking, and triple-entry accounting with external attestation capabilities.

---

## 1. Core Architecture

### 1.1 Philosophical Foundation

**Triple-Entry Accounting System**:
- **Ledger Entry** (first entry) - Traditional double-entry bookkeeping
- **Explanation/Context** (second entry) - Business context and decisions
- **External Attestation** (third entry) - Bank reconciliation, KSeF confirmation, decision documents

**Decision → Operation → Event → Document Flow**:
```
Decision (mandate/authority) 
    ↓ 
Operation/Job (what business did) [optional]
    ↓ 
Accounting Event (economic result) [mandatory]
    ↓ 
Documents (invoice, contract, receipt)
```

### 1.2 Tax Regime Support

**Supported Tax Types**:
- `skala` - Progressive tax scale
- `liniowy` - Flat 19% tax rate
- `ryczalt` - Flat rate by activity type (PKD-based)

**Ryczałt Rate Configuration**:
```json
{
  "services_it": 12,
  "services_consulting": 8.5,
  "trade": 3,
  "services_other": 5.5
}
```

---

## 2. Database Schema Overview

### 2.1 Core Tables

#### `events` - Triple-Entry Foundation
```sql
-- Key fields for accounting events
event_hash TEXT                    -- SHA-256 immutability hash
payload_snapshot JSONB             -- Canonical payload snapshot
debit_account TEXT                 -- Wn (Debit) account
credit_account TEXT                -- Ma (Credit) account
legal_basis TEXT                   -- Decision/contract/law reference
is_closed BOOLEAN                  -- Edit lock status
period_locked BOOLEAN              -- Period lock status
verified BOOLEAN                   -- External verification
bank_transaction_id TEXT           -- Bank reconciliation
ksef_reference_number TEXT        -- KSeF attestation
```

#### `accounting_periods` - Period Management
```sql
period_year INTEGER
period_month INTEGER
status TEXT ('open', 'closing', 'locked')
auto_lock_enabled BOOLEAN
auto_lock_day INTEGER (default 20)
total_revenue DECIMAL(15,2)
total_expenses DECIMAL(15,2)
net_result DECIMAL(15,2)
```

#### `posting_rules` - Automation Engine
```sql
document_type TEXT                 -- 'invoice', 'expense', etc.
transaction_type TEXT              -- 'income', 'expense'
payment_method TEXT
vat_scheme TEXT
priority INTEGER                   -- Rule matching priority
is_system BOOLEAN                  -- Built-in vs custom rules
```

#### `posting_rule_lines` - Rule Details
```sql
side TEXT ('debit' | 'credit')
account_code TEXT
amount_type TEXT ('gross' | 'net' | 'vat' | 'fixed' | 'formula')
amount_formula TEXT                -- For complex calculations
fixed_amount DECIMAL
```

### 2.2 Invoice Integration

#### Enhanced `invoices` table
```sql
acceptance_status TEXT ('pending', 'accepted', 'rejected', 'auto_accepted')
accounting_status TEXT ('unposted', 'posted', 'needs_review', 'rejected')
ryczalt_account_id UUID            -- Links to ryczałt chart of accounts
journal_entry_id UUID              -- Links to generated journal entry
posted_at TIMESTAMPTZ
```

---

## 3. Posting Rules System

### 3.1 Rule Matching Logic

**Function**: `find_posting_rule(p_business_profile_id, p_document_type, p_transaction_type, p_payment_method, p_vat_scheme, p_vat_rate)`

**Priority-Based Matching**:
1. Rules are ordered by `priority` (ascending)
2. More specific rules have higher priority
3. System rules (is_system=true) serve as fallbacks

**Rule Matching Criteria**:
- `document_type` - Invoice, receipt, proforma, etc.
- `transaction_type` - Income vs expense
- `payment_method` - Bank transfer, cash, card
- `vat_scheme` - VAT exempt, standard, reverse charge
- `vat_rate` - 23%, 8%, 5%, 0%

### 3.2 Auto-Posting Functions

#### `auto_post_invoice(p_invoice_id)`
**Process**:
1. Find matching posting rule
2. Generate journal entry lines based on rule
3. Create accounting event
4. Link invoice to journal entry
5. Update invoice accounting_status = 'posted'

#### `auto_post_pending_invoices(p_business_profile_id, p_limit, p_start_date, p_end_date)`
**Batch Processing**:
- Processes up to 100 invoices per call
- Returns detailed results with success/failure counts
- Handles missing ryczałt accounts gracefully

### 3.3 Rule Examples

**Income Invoice Posting**:
```
Rule: Sales Revenue (VAT-registered)
Debit: 201-001 (Bank Account)
Credit: 701-001 (Sales Revenue)
Credit: 221-001 (VAT Payable)
```

**Ryczałt Income Posting**:
```
Rule: Ryczałt Revenue (12% IT services)
Debit: 201-001 (Bank Account)
Credit: 701-001 (Sales Revenue)
```

---

## 4. Period Management System

### 4.1 Period Lifecycle

#### 1. **Open Period** (default)
- New transactions can be posted
- Existing transactions can be modified
- Auto-lock countdown active

#### 2. **Closing Period** (manual trigger)
- Validation checks run
- Summary calculations performed
- User confirmation required

#### 3. **Locked Period** (final)
- No new postings allowed
- No modifications allowed
- Audit trail preserved

### 4.2 Auto-Lock Mechanism

**Function**: `auto_lock_previous_month()`

**Trigger Conditions**:
- Current day ≥ `auto_lock_day` (default 20th)
- Period status = 'open'
- No unposted transactions in period

**Process**:
1. Calculate previous month boundaries
2. Check for unposted transactions
3. If clean, lock period automatically
4. Calculate financial summaries

### 4.3 Manual Period Operations

#### `lock_accounting_period(p_period_id, p_user_id, p_reason)`
**Validation**:
- Check for unposted transactions
- Calculate period summaries
- Create audit event

#### `unlock_accounting_period(p_period_id, p_user_id, p_reason)`
**Privileged Operation**:
- Requires admin/owner role
- Creates unlock audit event
- Resets period status to 'open'

---

## 5. Event System & Triple Entry

### 5.1 Event Creation

**Automatic Event Generation**:
- Every invoice triggers event creation
- Events link to decisions, contracts, or legal basis
- Events capture business context

**Event Types**:
- `invoice_created` - New invoice issued
- `expense_accepted` - Expense approved
- `period_unlocked` - Period manually unlocked
- `payment_recorded` - Payment processed

### 5.2 Event Closure & Verification

#### `close_accounting_event(p_event_id, p_user_id)`
**Process**:
1. Generate SHA-256 hash of event payload
2. Mark event as closed (immutable)
3. Set posting status
4. Assign to accounting period

#### External Attestation Functions:
- `reconcile_event_with_bank()` - Bank transaction linkage
- `attest_event_with_ksef()` - KSeF reference linkage
- `verify_event_integrity()` - Hash validation

### 5.3 Immutability Enforcement

**Database Triggers**:
- `prevent_closed_event_modification()` - Blocks edits to closed events
- `prevent_locked_period_posting()` - Blocks posting to locked periods
- `enforce_invoice_event_link()` - Ensures every invoice has event

---

## 6. Ryczałt (Flat Rate) System

### 6.1 Account Structure

**Ryczałt Chart of Accounts**:
- Revenue accounts by rate (701-101, 701-102, etc.)
- Tax settlement accounts
- Personal withdrawal tracking

### 6.2 Rate Assignment

**Account Assignment Process**:
1. Invoice created with `ryczalt_account_id = NULL`
2. User assigns invoice to ryczałt account
3. Auto-posting uses assigned account
4. Missing accounts trigger assignment modal

### 6.3 Posting Functions

#### `post_invoice_items_to_ryczalt(p_invoice_ids)`
**Batch Processing**:
- Groups invoices by ryczałt rate
- Creates register lines
- Updates invoice accounting status

#### `post_to_jdg_register(p_invoice_id, p_account_id)`
**Individual Posting**:
- Creates single register line
- Links invoice to ryczałt account
- Generates accounting event

---

## 7. Current Implementation Status

### 7.1 ✅ Completed Features

**Core Infrastructure**:
- Triple-entry event system with hashing
- Period locking with auto-lock mechanism
- Posting rules engine with priority matching
- Tax regime support (ryczałt, liniowy, skala)
- Expense acceptance workflow
- External attestation framework

**User Interface**:
- Auto-posting buttons (single/batch)
- Period status indicators
- Ryczałt account assignment modals
- Period closure workflows
- Financial ledger views

**Database Functions**:
- 25+ specialized accounting functions
- Comprehensive trigger system
- Audit trail enforcement
- Data integrity validation

### 7.2 🚧 In Progress Features

**Advanced Automation**:
- Item-level mixed rate posting
- Automated tax calculations
- Bank reconciliation matching
- KSeF integration attestation

**Reporting & Analytics**:
- Period closure reports
- Tax obligation tracking
- Financial statement generation
- Audit trail exports

### 7.3 📋 Planned Enhancements

**Multi-Entity Support**:
- Inter-company transactions
- Consolidated reporting
- Entity-level posting rules

**Advanced Compliance**:
- CIT calculations and provisions
- Fixed asset depreciation
- Shareholder loan management
- Annual closing procedures

---

## 8. Technical Architecture

### 8.1 Frontend Components

**Accounting Module Structure**:
```
src/modules/accounting/
├── components/
│   ├── AutoPostingButton.tsx
│   ├── PeriodClosureModal.tsx
│   ├── FinancialLedger.tsx
│   └── RyczaltAccountAssignmentModal.tsx
├── data/
│   └── postingRulesRepository.ts
├── services/
│   └── periodLockingService.ts
└── utils/
    └── periodState.ts
```

### 8.2 Backend Services

**Key Repository Functions**:
- `getPostingRules()` - Rule retrieval
- `autoPostInvoice()` - Single posting
- `autoPostPendingInvoices()` - Batch posting
- `lockAccountingPeriod()` - Period management
- `acceptExpense()` - Expense workflow

### 8.3 Database Functions

**Core SQL Functions**:
- `find_posting_rule()` - Rule matching
- `auto_post_invoice_unified()` - Unified posting
- `close_accounting_period()` - Period closure
- `generate_event_hash()` - Integrity verification
- `prevent_locked_period_posting()` - Validation

---

## 9. Integration Points

### 9.1 Invoice System Integration

**Event-Driven Architecture**:
- Invoice creation → Accounting event
- Payment recording → Bank reconciliation
- KSeF submission → External attestation

**Status Synchronization**:
- `invoices.accounting_status` mirrors posting status
- `invoices.journal_entry_id` links to ledger
- `events.entity_id` provides audit trail

### 9.2 Banking Integration

**Reconciliation Workflow**:
1. Bank transaction imported
2. System matches to accounting events
3. External attestation recorded
4. Event marked as verified

### 9.3 KSeF Integration

**Attestation Process**:
1. Invoice submitted to KSeF
2. KSeF reference number received
3. Event attested with KSeF data
4. Triple-entry completeness achieved

---

## 10. Performance & Scalability

### 10.1 Optimizations

**Database Indexes**:
- Event hash indexes for integrity checks
- Period-based indexes for fast queries
- Account code indexes for reporting
- Status-based filtered indexes

**Query Optimization**:
- Materialized views for period summaries
- Partitioned tables by period
- Cached rule matching results
- Batch processing for bulk operations

### 10.2 Caching Strategy

**Frontend Caching**:
- React Query for posting rules
- Period status caching
- Account balance caching

**Backend Caching**:
- Rule matching results
- Period summaries
- Account hierarchies

---

## 11. Security & Compliance

### 11.1 Access Control

**Row Level Security (RLS)**:
- Business profile isolation
- Role-based permissions
- Audit trail preservation

**Privilege Separation**:
- Posting vs. viewing permissions
- Period locking requires elevated rights
- Unlock operations require justification

### 11.2 Audit Trail

**Comprehensive Logging**:
- Every posting creates event
- Period changes logged
- User actions tracked
- Data integrity verified

**Legal Compliance**:
- Polish tax law compliance
- KSeF readiness
- Audit trail preservation
- Data retention policies

---

## 12. Recommendations for Improvement

### 12.1 High Priority

1. **Complete Period Closure Reports**
   - Generate formal closure documents
   - Include tax calculations
   - Digital signature support

2. **Enhanced Error Handling**
   - Graceful rule matching failures
   - User-friendly error messages
   - Recovery procedures

3. **Performance Optimization**
   - Implement query result caching
   - Optimize batch posting
   - Add database connection pooling

### 12.2 Medium Priority

1. **Advanced Reporting**
   - Financial statement generation
   - Tax obligation reports
   - Audit trail exports

2. **Multi-Currency Support**
   - Currency conversion rules
   - Exchange rate tracking
   - Multi-currency reporting

3. **Fixed Asset Management**
   - Asset registration
   - Depreciation calculations
   - Disposal tracking

### 12.3 Long-term Enhancements

1. **AI-Powered Rule Suggestions**
   - Machine learning for rule matching
   - Anomaly detection
   - Automated rule optimization

2. **Advanced Consolidation**
   - Multi-entity reporting
   - Inter-company transactions
   - Currency translation

3. **Real-Time Analytics**
   - Live financial dashboards
   - Predictive analytics
   - Cash flow forecasting

---

## Conclusion

The current accounting system represents a sophisticated, well-architected solution that balances automation with control. The triple-entry approach provides strong audit trails, while the posting rules engine offers flexible automation. The period locking system ensures data integrity and compliance.

Key strengths:
- **Comprehensive audit trail** with triple-entry verification
- **Flexible automation** through rule-based posting
- **Strong compliance** with Polish tax regulations
- **Scalable architecture** supporting multiple tax regimes

Areas for improvement focus on completing the reporting layer, enhancing user experience, and adding advanced features for complex business scenarios.

The system is production-ready for basic accounting operations and provides a solid foundation for advanced features.
