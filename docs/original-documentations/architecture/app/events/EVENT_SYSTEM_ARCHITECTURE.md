# Event System Architecture: Single Source of Truth

## Core Principle

**There is one event system. Everything else is a view, filter, or rule applied to events.**

## 1. Unified Event Model

Every financial and operational action in the system is an **Event** with dual temporal tracking:

### Event Structure

```typescript
interface UnifiedEvent {
  // Identity
  id: string;
  business_profile_id: string;
  event_type: EventType;
  event_number?: string;
  
  // Dual Temporal Tracking (CRITICAL)
  occurred_at: string;    // Economic date (invoice date, expense date)
  recorded_at: string;    // System/audit date (upload, OCR, creation)
  
  // Financial Properties
  amount?: number;
  currency?: string;
  direction?: 'incoming' | 'outgoing' | 'neutral';
  
  // Ledger Control
  posted: boolean;        // If true, appears in ledger
  needs_action: boolean;  // If true, appears in inbox
  
  // Status Progression
  status: EventStatus;    // captured → classified → approved → posted → settled
  
  // Authority & Compliance
  decision_id?: string;           // Required decision for this event
  decision_reference?: string;
  blocked_by?: string;            // Why event cannot progress
  
  // Source & Classification
  source: EventSource;    // inbox, manual, bank, contract, ocr
  classification?: string;
  
  // Actor & Entity
  actor_id: string;
  actor_name: string;
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  
  // Document Links
  document_type: DocumentType;
  document_id: string;
  document_number: string;
  counterparty?: string;
  
  // Audit Trail
  action_summary: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  parent_event_id?: string;
  is_material: boolean;
}
```

### Event Types

```typescript
type EventType =
  // Financial Events
  | 'invoice_issued'
  | 'invoice_received'
  | 'invoice_paid'
  | 'expense_captured'
  | 'expense_classified'
  | 'expense_approved'
  | 'expense_posted'
  | 'payment_received'
  | 'payment_sent'
  | 'bank_transaction_imported'
  | 'bank_transaction_matched'
  
  // Authority Events
  | 'decision_created'
  | 'decision_approved'
  | 'decision_rejected'
  
  // Contract Events
  | 'contract_created'
  | 'contract_signed'
  | 'contract_terminated'
  
  // Capital Events
  | 'capital_contribution'
  | 'capital_withdrawal'
  | 'dividend_declared'
  
  // Operational Events
  | 'employee_hired'
  | 'employee_terminated'
  | 'asset_acquired'
  | 'asset_disposed';
```

### Event Status Progression

```
captured → classified → approved → posted → settled
    ↓          ↓           ↓          ↓        ↓
  Inbox     Inbox      Inbox     Ledger   Ledger
```

**Rules**:
- `posted = false` → Event stays in Inbox
- `posted = true` → Event appears in Ledger
- `needs_action = true` → Event requires user intervention

## 2. View Definitions

### Audit Log (System Truth)
- **Query**: All events
- **Sort**: `recorded_at DESC`
- **Purpose**: Complete system history, compliance, debugging
- **Shows**: When things were entered into the system

### Ledger (Financial Timeline)
- **Query**: `WHERE posted = true`
- **Sort**: `occurred_at DESC`
- **Purpose**: Financial truth, accounting, reporting
- **Shows**: When economic events actually happened

### Inbox (Unresolved Events)
- **Query**: `WHERE posted = false AND needs_action = true`
- **Sort**: `recorded_at DESC`
- **Purpose**: Work queue, classification, approval
- **Shows**: Events that cannot be posted yet

**Inbox Reasons**:
1. Missing classification (expense category, VAT rate)
2. Missing decision (no authority to approve)
3. Missing contract (expense not linked to approved contract)
4. Missing payment match (bank transaction not matched to invoice)
5. Incomplete data (missing counterparty, amount, date)

### Invoices Page
- **Query**: `WHERE posted = true AND event_type IN ('invoice_issued', 'invoice_received', 'invoice_paid')`
- **Sort**: `occurred_at DESC`
- **Purpose**: Filtered ledger view with invoice-specific UI
- **NOT a separate data model**

### Expenses Page
- **Query**: `WHERE posted = true AND event_type IN ('expense_posted', 'expense_paid')`
- **Sort**: `occurred_at DESC`
- **Purpose**: Filtered ledger view with expense-specific UI
- **NOT a separate data model**

### Bank Page
- **Query**: `WHERE event_type IN ('bank_transaction_imported', 'payment_received', 'payment_sent')`
- **Sort**: `occurred_at DESC`
- **Purpose**: Cash flow view, transaction matching
- **Shows**: Both posted and unmatched transactions

## 3. Decision System (Authority Gates)

### Core Concept

**In a spółka, nothing operational or financial is allowed unless a higher authority approved it.**

### Decision Hierarchy

```
Wspólnicy (Shareholders)
    ↓ strategic decisions
Zarząd (Management Board)
    ↓ operational decisions
Operations
    ↓ execution (events)
```

### Decision Structure

```typescript
interface Decision {
  id: string;
  decision_type: DecisionType;
  decision_number: string;
  
  // Authority
  authority_level: 'shareholders' | 'board' | 'manager';
  approved_by: string[];
  approved_at: string;
  
  // Scope (what this decision allows)
  allows_actions: string[];        // ['expense_approval', 'contract_signing']
  expense_limit?: number;
  contract_types?: string[];
  time_period?: { start: string; end: string };
  
  // Enforcement
  is_active: boolean;
  blocks_without: string;          // "Events blocked: expense approval"
  
  // Document
  title: string;
  description: string;
  document_url?: string;
}
```

### Decision Types

```typescript
type DecisionType =
  | 'budget_approval'           // Allows expenses up to limit
  | 'contract_authority'        // Allows signing contracts
  | 'hiring_authority'          // Allows hiring employees
  | 'capital_event'             // Allows capital changes
  | 'operational_policy';       // General operational rules
```

### Enforcement Logic

```typescript
function canPostEvent(event: UnifiedEvent): EnforcementCheck {
  // Check if event requires a decision
  const requiredDecision = getRequiredDecision(event);
  
  if (!requiredDecision) {
    return { is_allowed: true };
  }
  
  // Check if decision exists and is active
  const decision = findActiveDecision(requiredDecision, event);
  
  if (!decision) {
    return {
      is_allowed: false,
      blocked_by: requiredDecision,
      error_message: `Brak decyzji: ${requiredDecision}. Wydarzenie zablokowane.`
    };
  }
  
  // Check if decision scope covers this event
  if (!decision.allows_actions.includes(event.event_type)) {
    return {
      is_allowed: false,
      blocked_by: decision.id,
      error_message: `Decyzja ${decision.decision_number} nie obejmuje tego typu działania.`
    };
  }
  
  // Check limits (e.g., expense amount)
  if (event.amount && decision.expense_limit && event.amount > decision.expense_limit) {
    return {
      is_allowed: false,
      blocked_by: decision.id,
      error_message: `Kwota przekracza limit decyzji (${decision.expense_limit} PLN).`
    };
  }
  
  return { is_allowed: true };
}
```

## 4. Data Flow

### Event Lifecycle

```
1. CAPTURE
   - Source: Inbox upload, manual entry, bank import, OCR
   - Status: captured
   - posted: false
   - needs_action: true
   - recorded_at: NOW
   - occurred_at: extracted or user-provided

2. CLASSIFY
   - User adds: category, VAT, counterparty
   - Status: classified
   - posted: false
   - needs_action: true (still needs approval)

3. APPROVE
   - Check: canPostEvent(event)
   - If blocked: event.blocked_by = decision_id
   - If allowed: status = approved
   - posted: false (not yet in ledger)
   - needs_action: false (no longer in inbox)

4. POST
   - Event moves to ledger
   - posted: true
   - Status: posted
   - Appears in: Ledger, Invoices/Expenses pages

5. SETTLE
   - Payment matched or completed
   - Status: settled
   - posted: true
   - Linked to payment event
```

### Inbox → Ledger Pipeline

```typescript
// Inbox query
const inboxEvents = await db.events
  .where('posted', false)
  .where('needs_action', true)
  .orderBy('recorded_at', 'desc');

// User classifies event
await classifyEvent(eventId, {
  category: 'office_supplies',
  vat_rate: 23,
  counterparty: 'Office Depot'
});

// User approves event
const check = canPostEvent(event);
if (!check.is_allowed) {
  throw new Error(check.error_message);
}

await approveEvent(eventId);

// Event automatically moves to ledger
await postEvent(eventId);

// Event disappears from inbox
// Event appears in ledger and expenses page
```

## 5. Sidebar Hierarchy

### New Structure

```
PIENIĄDZE (daily work, simple language)
├─ Księga (financial timeline, default view)
├─ Skrzynka (inbox - do rozliczenia)
├─ Faktury (filtered ledger view)
├─ Wydatki (filtered ledger view)
├─ Bank (cash flow + matching)
└─ Kasa (cash register)

RAPORTY (accountant/pro)
├─ Analizy (analytics dashboard)
├─ Bilans (balance sheet)
└─ Kapitał (capital events)

ZGODNOŚĆ / ZASADY (compliance & rules)
├─ Decyzje (authority gates)
├─ Umowy (contracts)
└─ Rejestr spółki (NIP, KRS, VAT)

DANE (master data)
├─ Klienci (customers)
├─ Produkty (products)
├─ Pracownicy (employees)
└─ Magazyn (warehouse)

SYSTEM
└─ Ustawienia (settings)
```

### Rationale

- **PIENIĄDZE first**: Daily work, high frequency
- **Księga as default**: Single source of financial truth
- **Skrzynka second**: Work queue, needs attention
- **Faktury/Wydatki**: Specialized views, not separate modules
- **RAPORTY**: Professional tools, lower frequency
- **ZGODNOŚĆ**: Legal backbone, reference material
- **DANE**: Master data, supporting information

## 6. Dual Date Handling

### Display Rules

**Ledger View**:
- Primary sort: `occurred_at`
- Display: "16 kwietnia 2024" (economic date)
- Tooltip: "Zarejestrowano: 18 kwietnia 2024" (system date)

**Audit View**:
- Primary sort: `recorded_at`
- Display: "18 kwietnia 2024, 14:32" (system timestamp)
- Tooltip: "Data zdarzenia: 16 kwietnia 2024" (economic date)

**Inbox View**:
- Primary sort: `recorded_at` (newest uploads first)
- Display: Both dates clearly labeled

### Why Dual Dates Matter

1. **Accounting**: Ledger must reflect economic reality (`occurred_at`)
2. **Audit**: System must track when data entered (`recorded_at`)
3. **Compliance**: Tax authorities care about economic dates
4. **Debugging**: System issues traced via `recorded_at`

## 7. In-Product Explanations

### Decisions Page Header

```
┌─────────────────────────────────────────────────────────────┐
│ DECYZJE (AUTHORITY GATES)                                   │
│                                                              │
│ W spółce z o.o. nic nie dzieje się bez zgody wyższej        │
│ instancji. Decyzje definiują, kto może co zrobić.          │
│                                                              │
│ Hierarchia:                                                  │
│ • Wspólnicy → decyzje strategiczne                          │
│ • Zarząd → decyzje operacyjne                               │
│ • Operacje → wykonanie (zdarzenia)                          │
│                                                              │
│ Każda decyzja określa:                                       │
│ • Co pozwala zrobić                                          │
│ • Co jest zablokowane bez niej                              │
└─────────────────────────────────────────────────────────────┘
```

### Inbox Empty State

```
┌─────────────────────────────────────────────────────────────┐
│ Skrzynka pusta                                               │
│                                                              │
│ Tutaj pojawiają się zdarzenia, które nie mogą być jeszcze   │
│ zaksięgowane, ponieważ:                                      │
│                                                              │
│ • Brakuje klasyfikacji (kategoria, VAT)                     │
│ • Brakuje decyzji (brak uprawnień)                          │
│ • Brakuje powiązania z umową                                │
│ • Brakuje dopasowania płatności                             │
│                                                              │
│ Gdy uzupełnisz dane, zdarzenie automatycznie trafi do       │
│ księgi.                                                      │
└─────────────────────────────────────────────────────────────┘
```

### Blocked Event Display

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Zdarzenie zablokowane                                     │
│                                                              │
│ Brak decyzji: Budżet operacyjny 2024                        │
│                                                              │
│ To wydatek wymaga zatwierdzenia przez Zarząd.               │
│ Utwórz decyzję lub poproś o zatwierdzenie.                  │
│                                                              │
│ [Utwórz decyzję] [Zobacz wymagania]                         │
└─────────────────────────────────────────────────────────────┘
```

## 8. Implementation Checklist

### Phase 1: Event Model Extension
- [ ] Add `occurred_at` and `recorded_at` to all events
- [ ] Add `posted` boolean flag
- [ ] Add `needs_action` boolean flag
- [ ] Add `blocked_by` reference
- [ ] Add `source` field
- [ ] Migrate existing events to new schema

### Phase 2: View Refactoring
- [ ] Refactor Inbox to query `posted = false AND needs_action = true`
- [ ] Refactor Ledger to query `posted = true`, sort by `occurred_at`
- [ ] Refactor Invoices to filter ledger by event type
- [ ] Refactor Expenses to filter ledger by event type
- [ ] Add Audit view with `recorded_at` sorting

### Phase 3: Decision System
- [ ] Create Decision model with enforcement fields
- [ ] Implement `canPostEvent()` enforcement logic
- [ ] Add decision references to events
- [ ] Create Decisions page with explainer header
- [ ] Add "blocked by" UI to inbox items

### Phase 4: Sidebar Restructure
- [ ] Reorganize nav config: PIENIĄDZE/RAPORTY/ZGODNOŚĆ/DANE
- [ ] Move Księga to top of PIENIĄDZE
- [ ] Move Skrzynka second in PIENIĄDZE
- [ ] Group Analizy/Bilans/Kapitał under RAPORTY
- [ ] Group Decyzje/Umowy/Rejestr under ZGODNOŚĆ

### Phase 5: UX Polish
- [ ] Add dual date display to ledger rows
- [ ] Add inbox empty state explanation
- [ ] Add blocked event warnings
- [ ] Add decision explainer to Decisions page
- [ ] Add tooltips for `occurred_at` vs `recorded_at`

## 9. Non-Goals

- ❌ Do NOT add new features unless necessary
- ❌ Do NOT duplicate data models
- ❌ Do NOT turn decisions into document storage
- ❌ Do NOT redesign visuals unless hierarchy requires it
- ❌ Do NOT remove existing functionality
- ❌ Do NOT create tutorials or popups

## 10. Success Criteria

✅ Single event table is source of truth  
✅ Ledger is filtered view of posted events  
✅ Inbox is filtered view of unposted events  
✅ Invoices/Expenses are filtered ledger views  
✅ Decisions block events until requirements met  
✅ Dual dates tracked and displayed correctly  
✅ Sidebar hierarchy reflects mental models  
✅ In-product explanations are clear and minimal  
✅ No data duplication between modules  
✅ Audit trail preserved via `recorded_at`  

---

**Remember**: The event system is the spine. Everything else is a lens through which we view events.
