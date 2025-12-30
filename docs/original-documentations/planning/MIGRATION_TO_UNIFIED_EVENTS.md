# Migration to Unified Event System

## Overview

This document outlines the migration path from the current architecture to the unified event system where:
- One event table is the source of truth
- Ledger, Inbox, Invoices, Expenses are filtered views
- Decisions act as authority gates
- Dual dates track economic vs system time

## Current State Analysis

### Existing Data Models

**Events** (`src/shared/types/events.ts`):
- Has `occurred_at` (economic date)
- Has `created_at` (system date)
- Missing: `posted`, `needs_action`, `blocked_by`

**Ledger** (`src/modules/accounting/types/ledger.ts`):
- Separate LedgerEvent type
- Has `timestamp` and `date`
- Missing: `recorded_at`, enforcement logic

**Inbox**:
- Separate module
- Not connected to event system

### Gap Analysis

| Feature | Current | Target | Action Required |
|---------|---------|--------|-----------------|
| Dual dates | Partial | Full | Add `recorded_at` to events |
| Posted flag | Missing | Required | Add `posted` boolean |
| Needs action | Missing | Required | Add `needs_action` boolean |
| Blocking | Missing | Required | Add `blocked_by`, `blocked_reason` |
| Decision enforcement | Missing | Required | Implement enforcement logic |
| Inbox as view | No | Yes | Refactor inbox to query events |
| Ledger as view | No | Yes | Refactor ledger to query events |

## Migration Strategy

### Phase 1: Schema Extension (Non-Breaking)

**Add new fields to existing event table**:

```sql
ALTER TABLE events ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS posted BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS needs_action BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS blocked_by TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE events ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS vat_rate NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cash_channel TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS direction TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'PLN';
ALTER TABLE events ADD COLUMN IF NOT EXISTS counterparty TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS document_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'captured';

-- Backfill recorded_at from created_at
UPDATE events SET recorded_at = created_at WHERE recorded_at IS NULL;

-- Backfill posted for existing events (assume posted if created)
UPDATE events SET posted = true WHERE posted IS NULL AND event_type IN (
  'invoice_issued', 'expense_created', 'payment_made', 'payment_received'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_posted ON events(posted);
CREATE INDEX IF NOT EXISTS idx_events_needs_action ON events(needs_action);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_recorded_at ON events(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
```

### Phase 2: Decision Table

**Create decisions table**:

```sql
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  decision_type TEXT NOT NULL,
  decision_number TEXT NOT NULL,
  
  -- Authority
  authority_level TEXT NOT NULL CHECK (authority_level IN ('shareholders', 'board', 'manager')),
  approved_by TEXT[] NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  
  -- Scope
  allows_actions TEXT[] NOT NULL,
  expense_limit NUMERIC,
  contract_types TEXT[],
  time_period_start DATE,
  time_period_end DATE,
  
  -- Enforcement
  is_active BOOLEAN DEFAULT true,
  blocks_without TEXT NOT NULL,
  
  -- Document
  title TEXT NOT NULL,
  description TEXT,
  document_url TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_profile_id, decision_number)
);

CREATE INDEX idx_decisions_active ON decisions(business_profile_id, is_active);
CREATE INDEX idx_decisions_type ON decisions(decision_type);
```

### Phase 3: Update TypeScript Types

**Merge event types**:

```typescript
// Before: Multiple separate types
// events.ts: CompanyEvent
// ledger.ts: LedgerEvent
// inbox: No type

// After: Single unified type
// unified-event.ts: UnifiedEvent (already created)
```

**Update imports across codebase**:

```bash
# Find all imports of old types
grep -r "import.*CompanyEvent" src/
grep -r "import.*LedgerEvent" src/

# Replace with UnifiedEvent
# This will be done file by file in Phase 4
```

### Phase 4: Refactor Components

#### 4.1 Ledger Component

**Before** (`src/modules/accounting/components/FinancialLedger.tsx`):
```typescript
// Queries LedgerEvent[]
const events = useLedgerData(filters);
```

**After**:
```typescript
// Queries UnifiedEvent[] where posted = true
const { events } = useQuery({
  queryKey: ['events', 'ledger', filters],
  queryFn: async () => {
    const result = await supabase
      .from('events')
      .select('*')
      .eq('posted', true)
      .order('occurred_at', { ascending: false });
    return result.data;
  }
});
```

#### 4.2 Inbox Component

**Before** (`src/modules/inbox/screens/InboxList.tsx`):
```typescript
// Separate inbox data source
const inboxItems = useInboxData();
```

**After**:
```typescript
// Query events where posted = false AND needs_action = true
const { events: inboxEvents } = useQuery({
  queryKey: ['events', 'inbox'],
  queryFn: async () => {
    const result = await supabase
      .from('events')
      .select('*')
      .eq('posted', false)
      .eq('needs_action', true)
      .order('recorded_at', { ascending: false });
    return result.data;
  }
});
```

#### 4.3 Invoices Component

**Before**:
```typescript
// Separate invoice query
const invoices = useInvoices();
```

**After**:
```typescript
// Ledger filtered to invoice events
const { events: invoiceEvents } = useQuery({
  queryKey: ['events', 'invoices'],
  queryFn: async () => {
    const result = await supabase
      .from('events')
      .select('*')
      .eq('posted', true)
      .in('event_type', ['invoice_issued', 'invoice_received', 'invoice_paid'])
      .order('occurred_at', { ascending: false });
    return result.data;
  }
});
```

#### 4.4 Expenses Component

**Before**:
```typescript
// Separate expense query
const expenses = useExpenses();
```

**After**:
```typescript
// Ledger filtered to expense events
const { events: expenseEvents } = useQuery({
  queryKey: ['events', 'expenses'],
  queryFn: async () => {
    const result = await supabase
      .from('events')
      .select('*')
      .eq('posted', true)
      .in('event_type', ['expense_posted', 'expense_paid'])
      .order('occurred_at', { ascending: false });
    return result.data;
  }
});
```

### Phase 5: Add Enforcement Logic

**Integrate decision checking**:

```typescript
// When user tries to approve an event
async function approveEvent(eventId: string) {
  const event = await getEvent(eventId);
  const decisions = await getActiveDecisions(event.business_profile_id);
  
  // Check enforcement
  const check = await canPostEvent(event, decisions);
  
  if (!check.is_allowed) {
    // Block event
    await updateEvent(eventId, {
      blocked_by: check.blocked_by || check.required_decision,
      blocked_reason: check.error_message,
      needs_action: true,
      posted: false,
    });
    
    throw new Error(check.error_message);
  }
  
  // Approve and post
  await updateEvent(eventId, {
    status: 'posted',
    posted: true,
    needs_action: false,
    blocked_by: null,
    blocked_reason: null,
  });
}
```

### Phase 6: UI Updates

#### 6.1 Ledger Date Display

```typescript
// Show occurred_at as primary date
<div className="text-sm font-medium">
  {format(new Date(event.occurred_at), 'dd MMMM yyyy', { locale: pl })}
</div>

// Show recorded_at in tooltip
<Tooltip content={`Zarejestrowano: ${format(new Date(event.recorded_at), 'dd MMM yyyy, HH:mm')}`}>
  <InfoIcon className="h-4 w-4" />
</Tooltip>
```

#### 6.2 Inbox Explanations

```typescript
// Empty state
{inboxEvents.length === 0 && (
  <EmptyState
    icon={Inbox}
    title="Skrzynka pusta"
    description={
      <>
        <p>Tutaj pojawiają się zdarzenia, które nie mogą być jeszcze zaksięgowane, ponieważ:</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>• Brakuje klasyfikacji (kategoria, VAT)</li>
          <li>• Brakuje decyzji (brak uprawnień)</li>
          <li>• Brakuje powiązania z umową</li>
          <li>• Brakuje dopasowania płatności</li>
        </ul>
        <p className="mt-2">Gdy uzupełnisz dane, zdarzenie automatycznie trafi do księgi.</p>
      </>
    }
  />
)}
```

#### 6.3 Blocked Event UI

```typescript
// Show blocking message
{event.blocked_by && (
  <Alert variant="warning">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Zdarzenie zablokowane</AlertTitle>
    <AlertDescription>
      {event.blocked_reason}
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => createDecision(event)}>
          Utwórz decyzję
        </Button>
        <Button size="sm" variant="outline">
          Zobacz wymagania
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

#### 6.4 Decisions Page Header

```typescript
<PageHeader
  title="DECYZJE"
  subtitle="Authority Gates"
  description={
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <p>
        W spółce z o.o. nic nie dzieje się bez zgody wyższej instancji. 
        Decyzje definiują, kto może co zrobić.
      </p>
      <div className="mt-4">
        <h4 className="font-semibold">Hierarchia:</h4>
        <ul>
          <li>Wspólnicy → decyzje strategiczne</li>
          <li>Zarząd → decyzje operacyjne</li>
          <li>Operacje → wykonanie (zdarzenia)</li>
        </ul>
      </div>
      <div className="mt-4">
        <h4 className="font-semibold">Każda decyzja określa:</h4>
        <ul>
          <li>Co pozwala zrobić</li>
          <li>Co jest zablokowane bez niej</li>
        </ul>
      </div>
    </div>
  }
/>
```

### Phase 7: Testing & Validation

**Test scenarios**:

1. **Event Lifecycle**:
   - Upload expense → appears in inbox
   - Classify expense → still in inbox
   - Approve expense (with decision) → moves to ledger
   - Approve expense (without decision) → blocked

2. **View Consistency**:
   - Event in ledger → appears in Księga
   - Invoice event → appears in Księga AND Faktury
   - Expense event → appears in Księga AND Wydatki
   - Unposted event → appears ONLY in Skrzynka

3. **Date Handling**:
   - Ledger sorted by `occurred_at`
   - Inbox sorted by `recorded_at`
   - Audit log sorted by `recorded_at`
   - Tooltips show both dates

4. **Decision Enforcement**:
   - Event without decision → blocked
   - Event with expired decision → blocked
   - Event exceeding limit → blocked
   - Event with valid decision → allowed

## Rollout Plan

### Week 1: Database Migration
- [ ] Run schema extension scripts
- [ ] Backfill existing data
- [ ] Verify data integrity
- [ ] Create decisions table

### Week 2: Type System
- [ ] Deploy unified-event.ts
- [ ] Update imports in core modules
- [ ] Update API layer
- [ ] Test type safety

### Week 3: Component Refactoring
- [ ] Refactor Ledger component
- [ ] Refactor Inbox component
- [ ] Add enforcement logic
- [ ] Test event flow

### Week 4: UI Polish
- [ ] Add dual date displays
- [ ] Add inbox explanations
- [ ] Add blocked event UI
- [ ] Add decisions page header

### Week 5: Testing
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] User acceptance testing
- [ ] Bug fixes

### Week 6: Deployment
- [ ] Deploy to staging
- [ ] Monitor for issues
- [ ] Deploy to production
- [ ] User training

## Rollback Plan

If critical issues arise:

1. **Database**: Keep old columns, don't drop
2. **Code**: Feature flag to switch between old/new queries
3. **UI**: Graceful degradation if new fields missing

## Success Metrics

- ✅ Zero data duplication between modules
- ✅ Single event table as source of truth
- ✅ Inbox automatically updates when events posted
- ✅ Decisions block events correctly
- ✅ Dual dates tracked and displayed
- ✅ No performance regression
- ✅ User confusion reduced (fewer "where is X?" questions)

## Post-Migration Cleanup

After 2 weeks of stable operation:

1. Remove old LedgerEvent type
2. Remove old inbox data model
3. Remove duplicate event columns
4. Update documentation
5. Archive old code

---

**Remember**: This is an architectural refactor, not a feature addition. The goal is clarity, not complexity.
