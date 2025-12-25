# Phase 2: Refactoring Faktury/Wydatki as Ledger Filters

## Overview
Transform existing document-centric pages (Faktury, Wydatki, Bank) into filtered views of the ledger. This completes the architectural shift to "ledger as truth layer."

## Current State

### Faktury Page (Income)
- **Location**: `src/modules/invoices/screens/income/IncomeList.tsx`
- **Current behavior**: Queries invoices directly from database
- **Shows**: List of income invoices with filters

### Wydatki Page (Expense)
- **Location**: `src/modules/invoices/screens/expense/ExpenseList.tsx`
- **Current behavior**: Queries expenses directly from database
- **Shows**: List of expense invoices with filters

### Bank Page
- **Location**: `src/modules/banking/screens/BankAccounts.tsx`
- **Current behavior**: Shows bank accounts and transactions
- **Shows**: Bank transaction list

## Target State

### All Pages Become Ledger Views
```typescript
// Faktury = Ledger filtered to invoice events
const invoiceEvents = getInvoiceEvents(allLedgerEvents);

// Wydatki = Ledger filtered to expense events
const expenseEvents = getExpenseEvents(allLedgerEvents);

// Bank = Ledger filtered to cash events
const cashEvents = getCashEvents(allLedgerEvents);
```

**One data source. Multiple lenses.**

## Implementation Strategy

### Step 1: Create Shared Ledger Hook
**File**: `src/modules/accounting/hooks/useLedgerData.ts`

```typescript
export function useLedgerData(filters?: LedgerFilters) {
  // Query all ledger events
  const { data: events, isLoading } = useQuery({
    queryKey: ['ledger', filters],
    queryFn: () => fetchLedgerEvents(filters),
  });

  return {
    events: events || [],
    isLoading,
    summary: calculateSummary(events || []),
  };
}
```

### Step 2: Create Filtered View Hooks
**File**: `src/modules/accounting/hooks/useFilteredLedger.ts`

```typescript
export function useInvoiceLedger(filters?: LedgerFilters) {
  const { events, isLoading } = useLedgerData(filters);
  const invoiceEvents = useMemo(() => 
    getInvoiceEvents(events), 
    [events]
  );
  
  return { events: invoiceEvents, isLoading };
}

export function useExpenseLedger(filters?: LedgerFilters) {
  const { events, isLoading } = useLedgerData(filters);
  const expenseEvents = useMemo(() => 
    getExpenseEvents(events), 
    [events]
  );
  
  return { events: expenseEvents, isLoading };
}

export function useCashLedger(filters?: LedgerFilters) {
  const { events, isLoading } = useLedgerData(filters);
  const cashEvents = useMemo(() => 
    getCashEvents(events), 
    [events]
  );
  
  return { events: cashEvents, isLoading };
}
```

### Step 3: Refactor Faktury Page
**File**: `src/modules/invoices/screens/income/IncomeList.tsx`

**Before**:
```typescript
const { data: invoices } = useQuery({
  queryKey: ['invoices', 'income'],
  queryFn: () => fetchInvoices({ type: 'income' }),
});
```

**After**:
```typescript
const { events: invoiceEvents } = useInvoiceLedger();

// Convert ledger events to invoice display format
const invoices = useMemo(() => 
  invoiceEvents.map(event => ({
    id: event.documentId,
    number: event.documentNumber,
    counterparty: event.counterparty,
    amount: event.amount,
    date: event.timestamp,
    isPaid: event.status === 'completed',
    // ... other fields
  })),
  [invoiceEvents]
);
```

**UI Changes**:
- Keep existing table/list UI
- Add "View in Ledger" button per row
- Show cash channel badge (Bank/Cash)
- Link to ledger filtered to this invoice

### Step 4: Refactor Wydatki Page
**File**: `src/modules/invoices/screens/expense/ExpenseList.tsx`

Same pattern as Faktury:
```typescript
const { events: expenseEvents } = useExpenseLedger();
```

### Step 5: Refactor Bank Page
**File**: `src/modules/banking/screens/BankAccounts.tsx`

```typescript
const { events: cashEvents } = useCashLedger();

// Group by bank account
const eventsByAccount = useMemo(() => 
  groupByBankAccount(cashEvents),
  [cashEvents]
);
```

## Data Migration

### Backend Changes Required

#### 1. Create Ledger Events Table
```sql
CREATE TABLE ledger_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  date DATE NOT NULL,
  event_type TEXT NOT NULL,
  event_label TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  direction TEXT NOT NULL,
  cash_channel TEXT NOT NULL DEFAULT 'none',
  linked_documents JSONB DEFAULT '[]'::jsonb,
  status TEXT,
  notes TEXT,
  business_profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ledger_timestamp ON ledger_events(timestamp DESC);
CREATE INDEX idx_ledger_document ON ledger_events(document_type, document_id);
CREATE INDEX idx_ledger_business ON ledger_events(business_profile_id);
CREATE INDEX idx_ledger_event_type ON ledger_events(event_type);
CREATE INDEX idx_ledger_links ON ledger_events USING gin(linked_documents);
```

#### 2. Create Event Generation Triggers

**On Invoice Insert**:
```sql
CREATE OR REPLACE FUNCTION generate_invoice_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ledger_events (
    timestamp, date, event_type, event_label,
    document_type, document_id, document_number,
    counterparty, amount, currency, direction,
    cash_channel, status, business_profile_id
  ) VALUES (
    NEW.created_at,
    NEW.issue_date,
    'invoice_issued',
    CASE 
      WHEN NEW.transaction_type = 'income' THEN 'Faktura wystawiona'
      ELSE 'Faktura kosztowa dodana'
    END,
    'invoice',
    NEW.id,
    NEW.number,
    COALESCE(NEW.customer_name, NEW.business_name),
    NEW.total_gross,
    NEW.currency,
    CASE 
      WHEN NEW.transaction_type = 'income' THEN 'incoming'
      ELSE 'outgoing'
    END,
    'none',
    CASE WHEN NEW.is_paid THEN 'completed' ELSE 'pending' END,
    NEW.business_profile_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoice_event_trigger
AFTER INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION generate_invoice_event();
```

**On Payment Update**:
```sql
CREATE OR REPLACE FUNCTION generate_payment_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_paid = TRUE AND OLD.is_paid = FALSE THEN
    INSERT INTO ledger_events (
      timestamp, date, event_type, event_label,
      document_type, document_id, document_number,
      counterparty, amount, currency, direction,
      cash_channel, status, business_profile_id,
      linked_documents
    ) VALUES (
      NOW(),
      CURRENT_DATE,
      CASE 
        WHEN NEW.transaction_type = 'income' THEN 'payment_received'
        ELSE 'payment_sent'
      END,
      CASE 
        WHEN NEW.transaction_type = 'income' THEN 'Płatność otrzymana'
        ELSE 'Płatność wysłana'
      END,
      'payment',
      gen_random_uuid(),
      'PAY-' || NEW.number,
      COALESCE(NEW.customer_name, NEW.business_name),
      NEW.total_gross,
      NEW.currency,
      CASE 
        WHEN NEW.transaction_type = 'income' THEN 'incoming'
        ELSE 'outgoing'
      END,
      COALESCE(NEW.payment_method, 'bank'),
      'completed',
      NEW.business_profile_id,
      jsonb_build_array(
        jsonb_build_object(
          'type', 'invoice',
          'id', NEW.id,
          'number', NEW.number,
          'relationship', 'Rozlicza fakturę'
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_event_trigger
AFTER UPDATE ON invoices
FOR EACH ROW
WHEN (NEW.is_paid IS DISTINCT FROM OLD.is_paid)
EXECUTE FUNCTION generate_payment_event();
```

#### 3. Backfill Existing Data
```sql
-- Generate events for existing invoices
INSERT INTO ledger_events (
  timestamp, date, event_type, event_label,
  document_type, document_id, document_number,
  counterparty, amount, currency, direction,
  cash_channel, status, business_profile_id
)
SELECT 
  created_at,
  issue_date,
  'invoice_issued',
  CASE 
    WHEN transaction_type = 'income' THEN 'Faktura wystawiona'
    ELSE 'Faktura kosztowa dodana'
  END,
  'invoice',
  id,
  number,
  COALESCE(customer_name, business_name),
  total_gross,
  currency,
  CASE 
    WHEN transaction_type = 'income' THEN 'incoming'
    ELSE 'outgoing'
  END,
  'none',
  CASE WHEN is_paid THEN 'completed' ELSE 'pending' END,
  business_profile_id
FROM invoices
WHERE NOT EXISTS (
  SELECT 1 FROM ledger_events 
  WHERE document_id = invoices.id 
  AND event_type = 'invoice_issued'
);
```

## UI Consistency Rules

### All Filtered Views Must:
1. **Show cash channel** - Bank/Cash badge on each row
2. **Link to ledger** - "View in Ledger" action
3. **Use same filters** - Period, status, counterparty
4. **Show same summary** - Total incoming/outgoing/net
5. **Open documents as tabs** - Not full-page navigation

### Visual Indicators
- 🏦 Bank transactions
- 💵 Cash transactions
- ↔️ Mixed payments
- 📄 Document-only (no payment yet)

## Testing Strategy

### Phase 2A: Parallel Running
1. Keep old queries active
2. Add new ledger queries alongside
3. Compare results in dev
4. Verify data consistency

### Phase 2B: Gradual Rollout
1. Enable ledger view for test users
2. Monitor performance
3. Gather feedback
4. Fix edge cases

### Phase 2C: Full Cutover
1. Remove old queries
2. Delete redundant code
3. Update documentation
4. Announce to users

## Performance Considerations

### Query Optimization
- Index on `(business_profile_id, timestamp DESC)`
- Index on `(event_type, status)`
- Materialized view for summaries
- Cache frequently accessed periods

### Pagination
- Cursor-based pagination on timestamp
- Load 50 events at a time
- Infinite scroll for smooth UX

### Real-time Updates
- WebSocket for new events
- Optimistic UI updates
- Background sync every 30s

## Rollback Plan

If issues arise:
1. Feature flag to switch back to old queries
2. Keep old code for 2 sprints
3. Monitor error rates
4. Gradual rollback if needed

## Success Metrics

Track these to measure success:

1. **Query performance**: Ledger queries < 100ms
2. **Data consistency**: 100% match with old queries
3. **User satisfaction**: No complaints about missing data
4. **Code reduction**: 30% less query code
5. **Bug reduction**: Fewer data sync issues

## Timeline

- **Week 1**: Backend migration (tables, triggers, backfill)
- **Week 2**: Create hooks and utilities
- **Week 3**: Refactor Faktury page
- **Week 4**: Refactor Wydatki page
- **Week 5**: Refactor Bank page
- **Week 6**: Testing and polish
- **Week 7**: Gradual rollout
- **Week 8**: Full cutover and cleanup

## Next Steps

1. ✅ Create ledger query utilities
2. ✅ Add ledger to sidebar navigation
3. 🔄 Create `useLedgerData` hook
4. 🔄 Create filtered view hooks
5. 🔄 Backend: Create ledger_events table
6. 🔄 Backend: Create event triggers
7. 🔄 Backfill existing data
8. 🔄 Refactor Faktury page
9. 🔄 Refactor Wydatki page
10. 🔄 Test and validate

The ledger is no longer a feature. **The ledger is the foundation.**
