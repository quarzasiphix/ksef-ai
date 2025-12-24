# Ledger Module

## Architecture: One Truth, Three Views

This module implements proper accounting infrastructure with three distinct but interconnected views:

### 1. Audit Events (Dziennik zdarzeń)
**Answers:** "What happened, who did it, and what changed?"

- Immutable event log
- Every user action creates an event
- Stores before/after diffs
- Links to all related entities
- The "black box recorder"

**Files:** `types/audit-events.ts`

### 2. Payments Subledger (Księga płatności)
**Answers:** "What money moved, between which accounts, and what did it settle?"

- Operational finance layer
- Tracks all cash/bank movements
- Links to invoices, contracts, events
- Reconciliation with bank statements
- Status: pending → confirmed → reconciled

**Files:** `types/payment-transactions.ts`

### 3. General Ledger (Księga główna)
**Answers:** "What is the accounting impact (Wn/Ma), when, and in which period?"

- Accounting truth (double-entry bookkeeping)
- Journal entries with debit/credit lines
- Chart of Accounts (Polish standards)
- Period locking
- Immutable: corrections via reversals only

**Files:** `types/general-ledger.ts`

## Event Sourcing Chain

```
User Action
    ↓
Audit Event (always)
    ↓
Payment Transaction (if money moved)
    ↓
GL Journal Entry (if accounting impact)
```

**Example: Invoice Payment**
1. User marks invoice as paid
2. Event: `payment_received` created
3. Payment transaction: money into bank account
4. GL entry: Dr Bank / Cr Accounts Receivable

## Key Principles

### Immutability
- **Never edit** ledger records
- Corrections = reversal + new entry
- Maintains audit trail integrity
- Accountants trust this

### Linkage
- Every payment links to event_id
- Every GL entry links to event_id
- Bidirectional navigation: Event → Payment → GL
- Enterprise-grade traceability

### Separation of Concerns
- Audit trail ≠ Accounting ledger
- Different "doubles" (before/after vs debit/credit)
- Each view serves distinct purpose
- No duplication of truth

## Implementation Phases

### Phase 1: Payments Subledger ✓ (Types defined)
- [x] Define payment_transactions schema
- [ ] Create database tables
- [ ] Implement payment transaction creation
- [ ] Build "Księga płatności" UI
- [ ] Add reconciliation features

### Phase 2: General Ledger
- [x] Define GL schema (entries + lines)
- [x] Define Chart of Accounts schema
- [ ] Create database tables
- [ ] Implement posting rules engine
- [ ] Build GL UI
- [ ] Add period locking

### Phase 3: Integration
- [ ] Link invoices → payments → GL
- [ ] Unified traceability UI
- [ ] Automatic posting from invoices
- [ ] Bank reconciliation workflow

## Database Tables

### payment_transactions
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  business_profile_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out', 'transfer')),
  account_from_id UUID,
  account_to_id UUID,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL,
  exchange_rate NUMERIC(10,4),
  counterparty_type TEXT,
  counterparty_id UUID,
  reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'reconciled', 'reversed')),
  invoice_id UUID,
  contract_id UUID,
  event_id UUID NOT NULL,
  gl_entry_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### gl_journal_entries
```sql
CREATE TABLE gl_journal_entries (
  id UUID PRIMARY KEY,
  business_profile_id UUID NOT NULL,
  period TEXT NOT NULL, -- YYYY-MM
  entry_date DATE NOT NULL,
  source_type TEXT NOT NULL,
  source_id UUID,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'posted', 'reversed')),
  event_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  posted_by UUID
);
```

### gl_lines
```sql
CREATE TABLE gl_lines (
  id UUID PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES gl_journal_entries(id),
  account_code TEXT NOT NULL,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  description TEXT,
  counterparty_id UUID,
  line_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### chart_of_accounts
```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY,
  business_profile_id UUID NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense', 'off_balance')),
  parent_account_code TEXT,
  level INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_profile_id, account_code)
);
```

### audit_events
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  business_profile_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_display_name TEXT,
  diff_json JSONB,
  summary TEXT,
  correlation_id UUID,
  related_invoice_id UUID,
  related_payment_id UUID,
  related_gl_entry_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## UI Organization

### Księgowość (Accounting) Module
- **Przegląd** - Dashboard with summary
- **Analizy** - Analytics (implemented)
- **Księga płatności** - Payments subledger (Phase 1)
- **Księga główna** - General ledger (Phase 2)
- **Dziennik zdarzeń** - Audit trail
- **Plan kont** - Chart of Accounts

### Traceability Flow
From any screen, click to navigate:
- Event → Payment Transaction → GL Entry
- Invoice → Payment → GL Entry
- GL Entry → Source Document → Event

## Golden Rules

1. **Never edit ledger records** - only reverse and re-post
2. **Every financial action creates an event** - no exceptions
3. **Payments link to events** - required, not optional
4. **GL entries link to events** - required, not optional
5. **Period locking prevents backdating** - integrity over convenience
6. **Corrections are visible** - reversal + new entry with reference

## Next Steps

1. Create database migration for payment_transactions
2. Implement payment transaction repository
3. Build Księga płatności UI with filters and reconciliation
4. Link invoice payment actions to create payment transactions
5. Add event creation to all financial actions
