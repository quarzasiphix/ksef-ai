# Financial Contracts & Document System - Current State Analysis

**Date**: January 30, 2026  
**Purpose**: Document how financial contracts are used and accounted for, identify incomplete features in the half-baked contract/document system

---

## Executive Summary

The financial contracts and document system is **partially implemented** with solid foundations but significant gaps in accounting integration, automation, and workflow completion. The system has good data structures and UI components but lacks the critical bridge to the accounting system.

---

## 1. Current System Architecture

### 1.1 Contract Management Structure

**Core Tables**:
- `contracts` - Main contract storage with financial fields
- `invoice_contract_links` - Links contracts to invoices
- `invoice_agreement_history` - Tracks agreement status changes
- `document_templates` - Template system for document generation
- `generated_documents` - Created documents from templates

### 1.2 Contract Types Supported

```typescript
type ContractType =
  | 'general'        // Umowa ogólna
  | 'employment'     // Umowa o pracę
  | 'service'        // Umowa o świadczenie usług
  | 'lease'          // Umowa najmu
  | 'purchase'       // Umowa kupna-sprzedaży
  | 'board_member'   // Umowa z członkiem Zarządu
  | 'management_board' // Umowa Zarządu
  | 'supervisory_board' // Umowa Rady Nadzorczej
  | 'nda'            // NDA
  | 'partnership'    // Umowa partnerska
  | 'other';         // Inna
```

### 1.3 Document Blueprint System

**Advanced Template Framework**:
- **Document Blueprints** define behavior, not just content
- **Context-aware creation** based on section (operations, contracts, decisions, financial, audit)
- **Two-stage creation flow**: What → Minimal required fields
- **Gating panels** for decisions, financial impact, audit requirements

---

## 2. Contract Features - What's Working

### 2.1 ✅ Implemented Features

**Contract Management**:
- Full CRUD operations for contracts
- Contract categorization and typing
- Document folder organization
- PDF generation and storage
- Signature tracking capabilities

**Financial Contract Fields**:
```sql
-- Core financial fields in contracts table
expected_total_value DECIMAL
expected_monthly_value DECIMAL
billing_frequency VARCHAR
currency VARCHAR
payment_terms INTEGER
auto_invoice BOOLEAN
payment_account_id UUID
```

**Invoice Linking**:
- `invoice_contract_links` table for many-to-many relationships
- UI components for linking/unlinking invoices to contracts
- Bidirectional relationship tracking

**Agreement Workflow**:
- `invoice_agreement_history` tracks status changes
- Agreement statuses: draft → sent → received → under_discussion → approved → ready_for_ksef
- Audit trail for all status changes

**Document Generation**:
- Template system with variable substitution
- PDF generation capabilities
- Context-aware document creation

### 2.2 🚧 Partially Implemented

**Auto-Invoicing Framework**:
```sql
auto_generate_invoices BOOLEAN
next_payment_date DATE
payment_frequency TEXT
```
- Fields exist but automation logic not implemented
- No scheduled invoice generation from contracts
- No payment tracking against contract terms

**Decision Integration**:
```sql
decision_id UUID
decision_reference TEXT
```
- Links to decisions exist
- **Optional for JDG** - flexible for sole proprietorships
- **UI-enforced for spółka** - compliance through interface, not database constraints
- No automatic accounting event generation from decisions

---

## 3. Accounting Integration - Major Gaps

### 3.1 ❌ Critical Missing Features

**No Automatic Accounting Entries**:
- Contracts do **NOT** generate accounting events automatically
- No posting rules for contract-based revenue recognition
- No accrual accounting for contract milestones
- No deferred revenue handling for advance payments

**Missing Accounting Bridge**:
```typescript
// This doesn't exist - should connect contracts to accounting
interface ContractAccountingEntry {
  contract_id: string;
  accounting_event_id: string;
  entry_type: 'accrual' | 'recognition' | 'payment';
  amount: number;
  date: date;
}
```

**No Revenue Recognition Logic**:
- Contracts can define expected values but no recognition schedule
- No milestone-based revenue recognition
- No percentage-of-completion accounting
- No deferred liability tracking

### 3.2 📋 Required Accounting Integration

**1. Contract Creation → Accounting Event**
```sql
-- Should create accounting event on contract activation
INSERT INTO events (
  business_profile_id,
  event_type: 'contract_signed',
  entity_type: 'contract',
  entity_id: contract_id,
  amount: expected_total_value,
  decision_id: decision_id
);
```

**2. Invoice Generation from Contracts**
```typescript
// Missing function
async function generateInvoicesFromContract(
  contractId: string,
  billingPeriod: DateRange
): Promise<Invoice[]> {
  // 1. Check contract billing frequency
  // 2. Calculate amount for period
  // 3. Generate invoice(s)
  // 4. Link to contract
  // 5. Create accounting events
}
```

**3. Accrual Accounting**
```typescript
// Missing function
async function recognizeContractRevenue(
  contractId: string,
  amount: number,
  recognitionDate: date
): Promise<AccountingEvent> {
  // 1. Create revenue recognition event
  // 2. Update deferred revenue liability
  // 3. Post to ledger via posting rules
}
```

---

## 4. Document System Analysis

### 4.1 ✅ Advanced Features Working

**Blueprint System**:
- 13 transport-specific document blueprints
- Context-aware creation (section-based filtering)
- Smart defaults and required field validation
- Gating panels for decisions, financial impact, audit

**Document Types**:
```typescript
type DocumentType = 
  | 'transport_order'      // Requires: job, client, financial impact
  | 'framework_contract_b2b' // Requires: client, decision, expires
  | 'job_settlement'       // Requires: job, auto-creates accounting entry
  | 'audit_note'          // Internal only, requires evidence
  // ... 9 more types
```

**Two-Stage Creation**:
- Stage A: Blueprint picker with badges (🔴 decision, 💰 financial, 🔒 audit)
- Stage B: Dynamic form based on blueprint requirements
- Context inheritance (job_id, client_id, etc.)

### 4.2 🚧 Half-Baked Features

**Financial Panel Integration**:
```typescript
financial_impact?: {
  has_impact: boolean;
  requires_amount?: boolean;
  auto_create_accounting_entry?: boolean; // Not implemented
};
```
- Blueprint defines financial impact but no automatic accounting entry creation
- No integration with posting rules system
- No ledger posting from document creation

**Decision Gate Enforcement**:
```typescript
requires_decision?: {
  required: boolean;
  decision_types?: string[];
  blocks_activation?: boolean; // UI-enforced for spółka, optional for JDG
};
```
- Decision requirements defined but **only enforced in UI for spółka**
- **JDG flexibility** - decisions optional for sole proprietorships
- **Spółka compliance** - UI blocks activation without decision
- No automatic decision linking

---

## 5. Current Data Flow Analysis

### 5.1 ✅ Working Flows

```
Contract Creation → Contract Storage
    ↓
Manual Invoice Creation → Invoice Storage
    ↓
Manual Invoice-Contract Linking → Link Table
    ↓
Agreement Status Tracking → History Table
```

### 5.2 ❌ Missing Critical Flows

```
Contract Creation → Accounting Event (MISSING)
    ↓
Auto Invoice Generation → Invoice Creation (MISSING)
    ↓
Revenue Recognition → Ledger Posting (MISSING)
    ↓
Document Creation → Accounting Entry (MISSING)
```

---

## 6. Integration Points with Accounting System

### 6.1 Existing Bridges

**Events Table Integration**:
- Contracts have `decision_id` field
- Events system supports contract entity type
- Triple-entry accounting framework exists

**Invoice System Integration**:
- Invoice-contract links exist
- Invoice agreement workflow implemented
- Invoice posting rules system works

### 6.2 Missing Bridges

**Contract → Accounting Events**:
```sql
-- Missing trigger/function
CREATE OR REPLACE FUNCTION create_contract_accounting_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Should create accounting event when contract is activated
  -- Should link to decision if required
  -- Should set up revenue recognition schedule
END;
$$ LANGUAGE plpgsql;
```

**Document → Accounting Entries**:
```typescript
// Missing integration
interface DocumentAccountingBridge {
  documentId: string;
  blueprintType: string;
  financialImpact: number;
  autoPostToLedger: boolean;
  postingRuleId?: string;
}
```

---

## 7. Implementation Status by Module

### 7.1 Contracts Module (70% Complete)

**✅ Done**:
- Contract CRUD operations
- Financial fields storage
- Invoice linking UI
- Agreement workflow
- Document generation

**❌ Missing**:
- Accounting event generation
- Auto-invoicing logic
- Revenue recognition
- Payment tracking
- Ledger integration

### 7.2 Documents Module (80% Complete)

**✅ Done**:
- Blueprint system
- Context-aware creation
- Two-stage flow
- Template generation
- Smart defaults

**❌ Missing**:
- Financial panel posting
- Decision gate enforcement
- Accounting entry creation
- Audit trail integration

### 7.3 Accounting Integration (20% Complete)

**✅ Done**:
- Events table exists
- Posting rules system
- Triple-entry framework

**❌ Missing**:
- Contract event creation
- Document posting
- Revenue recognition
- Auto-invoicing bridge

---

## 8. Critical Issues & Risks

### 8.1 🚨 High Priority Issues

1. **No Financial Recognition**:
   - Contracts worth millions can be created without any accounting impact
   - Revenue can be recognized without proper audit trail
   - No compliance with Polish accounting standards

2. **Decision Isolation**:
   - Decision system exists but doesn't enforce financial consequences
   - Contracts can reference decisions but no validation
   - No automatic posting from decision approval

3. **Document-Financial Disconnect**:
   - Financial documents don't create accounting entries
   - Blueprint system defines financial impact but doesn't execute it
   - Risk of unaudited financial commitments

### 8.2 ⚠️ Medium Priority Issues

1. **Auto-Invoicing Incomplete**:
   - Fields exist but no automation
   - Payment tracking not implemented
   - Cash flow prediction missing

2. **Milestone Tracking Missing**:
   - No contract milestone management
   - No percentage-of-completion accounting
   - No progress billing

---

## 9. Recommended Implementation Plan

### 9.1 Phase 1: Critical Accounting Bridge (2-3 weeks)

**1. Contract Accounting Events**
```sql
-- Create trigger for contract activation
CREATE OR REPLACE FUNCTION trigger_contract_accounting_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO events (
    business_profile_id,
    event_type: 'contract_activated',
    entity_type: 'contract',
    entity_id: NEW.id,
    amount: NEW.expected_total_value,
    decision_id: NEW.decision_id,
    debit_account: '201-001', -- Bank/Receivable
    credit_account: '201-002' -- Deferred Revenue
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**2. Document Financial Posting**
```typescript
// Extend document creation to post to ledger
async function createDocumentWithAccounting(
  document: GeneratedDocument,
  blueprint: DocumentBlueprint
): Promise<void> {
  if (blueprint.financial_impact?.auto_create_accounting_entry) {
    await postDocumentToLedger(document, blueprint);
  }
}
```

**3. Decision Gate Enforcement (UI-Based)**
```typescript
// Enforce decisions based on entity type
const enforceDecisionGate = (blueprint: DocumentBlueprint, entityType: 'jdg' | 'spolka') => {
  if (entityType === 'spolka' && blueprint.requires_decision?.required && !decisionId) {
    throw new Error('Spółka contracts require decision approval');
  }
  // JDG: decisions optional, show warning but allow
  if (entityType === 'jdg' && blueprint.requires_decision?.required && !decisionId) {
    showWarning('Consider adding decision for better audit trail');
  }
};
```

### 9.2 Phase 2: Auto-Invoicing System (3-4 weeks)

**1. Contract Billing Engine**
```typescript
class ContractBillingEngine {
  async generateScheduledInvoices(): Promise<Invoice[]> {
    // 1. Find contracts with auto_generate_invoices = true
    // 2. Check billing frequency and next_payment_date
    // 3. Generate invoices for due period
    // 4. Link to contracts
    // 5. Create accounting events
  }
}
```

**2. Revenue Recognition Scheduler**
```typescript
class RevenueRecognitionEngine {
  async recognizeContractRevenue(): Promise<void> {
    // 1. Calculate earned revenue for period
    // 2. Create accounting events
    // 3. Update deferred revenue
    // 4. Post to ledger
  }
}
```

### 9.3 Phase 3: Advanced Features (4-6 weeks)

**1. Milestone Management**
```sql
CREATE TABLE contract_milestones (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  milestone_name TEXT,
  due_date DATE,
  amount DECIMAL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP
);
```

**2. Progress Billing**
```typescript
interface ProgressBilling {
  calculatePercentageComplete(contractId: string): number;
  generateProgressInvoice(contractId: string, percentage: number): Invoice;
  recognizeRevenue(milestoneId: string): AccountingEvent;
}
```

---

## 10. Technical Implementation Details

### 10.1 Required Database Changes

**New Tables**:
```sql
-- Contract accounting events bridge
CREATE TABLE contract_accounting_events (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  event_id UUID REFERENCES events(id),
  event_type TEXT NOT NULL,
  amount DECIMAL,
  recognition_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Milestone tracking
CREATE TABLE contract_milestones (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  name TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  amount DECIMAL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  invoice_id UUID REFERENCES invoices(id)
);
```

**New Functions**:
```sql
-- Auto-invoice generation
CREATE OR REPLACE FUNCTION generate_contract_invoices(
  p_business_profile_id UUID,
  p_billing_date DATE
) RETURNS TABLE (
  generated_count INTEGER,
  total_amount DECIMAL
);

-- Revenue recognition
CREATE OR REPLACE FUNCTION recognize_contract_revenue(
  p_contract_id UUID,
  p_amount DECIMAL,
  p_recognition_date DATE
) RETURNS BOOLEAN;
```

### 10.2 Required Frontend Components

**1. Contract Accounting Panel**
```typescript
interface ContractAccountingPanelProps {
  contractId: string;
  onAccountingEventCreated: (event: AccountingEvent) => void;
}
```

**2. Decision Gate Component**
```typescript
interface DecisionGateProps {
  blueprint: DocumentBlueprint;
  entityType: 'jdg' | 'spolka';
  onDecisionLinked: (decisionId: string) => void;
}

const DecisionGate: React.FC<DecisionGateProps> = ({ 
  blueprint, 
  entityType, 
  onDecisionLinked 
}) => {
  const isRequired = blueprint.requires_decision?.required;
  const isStrict = entityType === 'spolka' && isRequired;
  
  return (
    <Alert severity={isStrict ? 'error' : 'warning'}>
      {isStrict ? 'Decision required for spółka compliance' : 'Decision recommended for JDG'}
      <DecisionPicker onSelect={onDecisionLinked} />
    </Alert>
  );
};
```

**3. Auto-Invoicing Settings**
```typescript
interface AutoInvoicingSettingsProps {
  contract: Contract;
  onSettingsUpdate: (settings: AutoInvoicingSettings) => void;
}
```

---

## 11. Compliance & Legal Considerations

### 11.1 Polish Accounting Standards

**Required Compliance**:
- **KSR 6**: Tangible fixed assets (for lease contracts)
- **KSR 7**: Revenue recognition (for service contracts)
- **KSR 12**: Deferred tax (for advance payments)
- **Ustawa o Rachunkowości**: Contract disclosure requirements

**Implementation Requirements**:
- Proper revenue recognition timing
- Deferred liability accounting
- Contract disclosure in financial statements
- Audit trail for all contract modifications

### 11.2 Legal Defensibility

**Current Risks**:
- Contracts can be modified without accounting reflection
- Financial commitments not properly recorded
- No audit trail for contract-based revenue

**Entity-Specific Requirements**:

**Spółka z o.o. (Strict)**:
- **Mandatory decisions** for significant contracts (corporate governance)
- **Board resolutions** required for commitments above thresholds
- **Shareholder approval** for major contracts
- **Full audit trail** with decision documentation

**JDG - Sole Proprietorship (Flexible)**:
- **Decisions optional** - owner discretion
- **Recommended audit trail** but not required
- **Simplified compliance** - owner is decision-maker
- **Warning system** for best practices

**Required Fixes**:
- **Entity-aware decision enforcement** in UI
- **Immutable contract versions** for both types
- **Automatic accounting event creation** (mandatory for both)
- **Complete audit trail** (stricter for spółka)

---

## 12. Conclusion & Recommendations

### 12.1 Current State Assessment

**Strengths**:
- Solid data foundation with comprehensive contract fields
- Advanced document blueprint system
- Good UI components for manual operations
- Existing accounting framework to build upon

**Critical Gaps**:
- **No automatic accounting integration** (major compliance risk)
- **Decision system isolated** from financial consequences
- **Auto-invoicing framework exists but not implemented**
- **Revenue recognition completely missing**

### 12.2 Priority Recommendations

**Immediate (Critical)**:
1. **Implement contract accounting event creation** - Basic compliance requirement
2. **Add decision gate enforcement** - Prevent unauthorized financial commitments
3. **Create document financial posting** - Bridge blueprint system to ledger

**Short-term (High Value)**:
1. **Build auto-invoicing engine** - Automate revenue generation
2. **Add revenue recognition scheduler** - Proper timing of revenue
3. **Implement milestone tracking** - Progress billing support

**Long-term (Strategic)**:
1. **Advanced contract analytics** - Cash flow prediction
2. **Multi-currency contract support** - International contracts
3. **Contract workflow automation** - Full lifecycle management

### 12.3 Success Metrics

**Technical Metrics**:
- 100% of contracts create accounting events
- 90% of financial documents post to ledger automatically
- Auto-invoicing reduces manual invoice creation by 80%

**Business Metrics**:
- Compliance with Polish accounting standards
- Reduced manual accounting errors
- Improved cash flow predictability
- Faster financial closing cycles

The system has excellent foundations but requires critical accounting integration to be production-ready for financial compliance. The blueprint system is particularly well-designed and just needs the accounting bridge to be complete.
