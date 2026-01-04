# Events Module: Operational Readiness Plan

## Current State Summary

### ✅ What's Built (Infrastructure Layer)
1. **Phase A Complete:** Event Detail Drawer with hard gating
2. **Session 1-2 Complete:** Chart of Accounts with pickers
3. **Event types extended:** Added expense lifecycle events to type system

### ❌ What's Missing (Makes UI Feel Empty)
1. **Events not being created** for most operations
2. **No update_event_accounts RPC** (pickers don't persist changes)
3. **No posting templates** (auto-assign doesn't work)
4. **Posting/Reconciliation tabs** show empty states
5. **Timeline** has minimal activity

## Immediate Action Plan (Next 4 Hours of Work)

### Priority 1: Data Completeness (Make Events Visible)
**Goal:** Timeline shows 10-20 events per day instead of 0-2

#### Task 1.1: Wire Expense Event Logging ⏱️ 30 min
**Files to modify:**
- `src/modules/invoices/screens/expense/ExpenseList.tsx` (or find create/edit screens)
- `src/modules/invoices/data/expenseRepository.ts`

**Actions:**
1. Find expense create handler
2. Add `logExpenseCreated()` call after successful save
3. Find expense edit handler  
4. Add `logExpenseEdited()` call after successful update
5. Find expense delete handler
6. Add `logExpenseDeleted()` call

**Pattern:**
```typescript
import { logExpenseCreated } from '@/modules/invoices/utils/expenseEventLogger';

// After successful expense save
await logExpenseCreated(
  businessProfileId,
  expense.id,
  expense.number || `EXP-${expense.id.slice(0,8)}`,
  {
    amount: expense.amount,
    currency: expense.currency,
    category: expense.category,
    supplier: expense.supplier,
  }
);
```

**Expected outcome:** Creating 1 expense → see event in Timeline

#### Task 1.2: Add Accounting Events to RPCs ⏱️ 45 min
**File:** `supabase/migrations/20260104_posting_readiness_and_close.sql`

**Modify `close_accounting_event` RPC:**
```sql
-- After setting is_closed = TRUE, before RETURN
INSERT INTO events (
  business_profile_id,
  event_type,
  entity_type,
  entity_id,
  action_summary,
  actor_id,
  actor_name,
  occurred_at,
  metadata
) VALUES (
  v_event.business_profile_id,
  'event_closed',
  'accounting_event',
  p_event_id,
  'Zdarzenie zamknięte',
  p_actor_id,
  p_actor_name,
  NOW(),
  jsonb_build_object(
    'event_hash', v_event_hash,
    'period_year', v_period_year,
    'period_month', v_period_month,
    'debit_account', v_event.metadata->>'debit_account',
    'credit_account', v_event.metadata->>'credit_account'
  )
);
```

**Modify `verify_event_integrity` RPC similarly**

**Add new event types to events.ts:**
```typescript
| 'event_closed'
| 'event_verified'
| 'accounts_assigned'
```

**Expected outcome:** Closing event → see `event_closed` in Timeline

### Priority 2: Make Manual Posting Work ⏱️ 90 min
**Goal:** AccountPicker changes actually persist

#### Task 2.1: Create update_event_accounts RPC
**File:** `supabase/migrations/20260104_update_event_accounts.sql`

```sql
CREATE OR REPLACE FUNCTION update_event_accounts(
  p_event_id UUID,
  p_debit_account TEXT,
  p_credit_account TEXT,
  p_actor_id UUID,
  p_actor_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_old_debit TEXT;
  v_old_credit TEXT;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found');
  END IF;
  
  -- Check if closed
  IF v_event.metadata->>'is_closed' = 'true' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Cannot update closed event');
  END IF;
  
  -- Check if period locked
  -- TODO: Add period lock check
  
  -- Store old values
  v_old_debit := v_event.metadata->>'debit_account';
  v_old_credit := v_event.metadata->>'credit_account';
  
  -- Update accounts
  UPDATE events
  SET metadata = metadata || jsonb_build_object(
    'debit_account', p_debit_account,
    'credit_account', p_credit_account,
    'accounts_assigned_at', NOW(),
    'accounts_assigned_by', p_actor_name
  )
  WHERE id = p_event_id;
  
  -- Create audit event
  INSERT INTO events (
    business_profile_id,
    event_type,
    entity_type,
    entity_id,
    action_summary,
    actor_id,
    actor_name,
    occurred_at,
    metadata,
    parent_event_id
  ) VALUES (
    v_event.business_profile_id,
    'accounts_assigned',
    'accounting_event',
    p_event_id,
    'Przypisano konta księgowe',
    p_actor_id,
    p_actor_name,
    NOW(),
    jsonb_build_object(
      'old_debit', v_old_debit,
      'new_debit', p_debit_account,
      'old_credit', v_old_credit,
      'new_credit', p_credit_account
    ),
    p_event_id
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'debit_account', p_debit_account,
    'credit_account', p_credit_account
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_event_accounts TO authenticated;
```

#### Task 2.2: Wire AccountPicker onChange
**File:** `src/modules/events/components/EventDetailDrawer.tsx`

Replace placeholder onChange handlers:
```typescript
const updateAccountsMutation = useMutation({
  mutationFn: async ({ debitAccount, creditAccount }: { debitAccount?: string; creditAccount?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase.rpc('update_event_accounts', {
      p_event_id: eventId,
      p_debit_account: debitAccount || eventDetail.readiness.debit_account,
      p_credit_account: creditAccount || eventDetail.readiness.credit_account,
      p_actor_id: user.id,
      p_actor_name: user.email || 'Unknown',
    });
    
    if (error) throw error;
    if (!data.success) throw new Error(data.error);
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['event-detail', eventId] });
  },
});

// In AccountPicker onChange:
onChange={(code) => {
  updateAccountsMutation.mutate({ debitAccount: code });
}}
```

**Expected outcome:** Select Wn/Ma → persists → reopening drawer shows selection

### Priority 3: Make Posting Tab Operational ⏱️ 60 min
**Goal:** Show blocker chips, make readiness visible

#### Task 3.1: Add Blocker Chips to Posting Rows
**File:** `src/modules/events/screens/EventsPosting.tsx`

Add blocker display to each row:
```typescript
<div className="flex items-center gap-1">
  {event.metadata?.missing_accounts && (
    <Badge variant="destructive" className="text-xs">
      Brak Wn/Ma
    </Badge>
  )}
  {event.metadata?.missing_required_proof && (
    <Badge variant="destructive" className="text-xs">
      Brak dowodu
    </Badge>
  )}
  {event.metadata?.missing_required_links && (
    <Badge variant="destructive" className="text-xs">
      Brak powiązania
    </Badge>
  )}
  {event.metadata?.can_close && (
    <Badge variant="outline" className="bg-green-500/10 text-green-600 text-xs">
      Gotowe
    </Badge>
  )}
</div>
```

#### Task 3.2: Add Wn/Ma Columns to Table
Show debit/credit accounts in table:
```typescript
<div className="text-xs font-mono">
  {event.metadata?.debit_account || <span className="text-red-600">-</span>}
</div>
<div className="text-xs font-mono">
  {event.metadata?.credit_account || <span className="text-red-600">-</span>}
</div>
```

**Expected outcome:** Posting tab shows what needs to be done per event

### Priority 4: Timeline Improvements ⏱️ 30 min
**Goal:** Make Timeline feel like operational audit feed

#### Task 4.1: Add Summary Strip
**File:** `src/modules/events/screens/EventsTimeline.tsx`

```typescript
<div className="flex items-center gap-2 mb-4">
  <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>
    Wszystkie ({stats.total})
  </Button>
  <Button variant={filter === 'financial' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('financial')}>
    Finansowe ({stats.financial})
  </Button>
  <Button variant={filter === 'compliance' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('compliance')}>
    Compliance ({stats.compliance})
  </Button>
  <Button variant={filter === 'ops' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('ops')}>
    Operacyjne ({stats.ops})
  </Button>
</div>
```

#### Task 4.2: Improve Empty State
```typescript
{events.length === 0 && (
  <div className="text-center py-12">
    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
    <p className="text-lg font-medium mb-2">Brak zdarzeń</p>
    <p className="text-sm text-muted-foreground mb-4">
      Utwórz fakturę lub zaimportuj wyciąg bankowy, aby rozpocząć.
    </p>
    <div className="flex items-center justify-center gap-2">
      <Button onClick={() => navigate('/income/new')}>
        Nowa faktura
      </Button>
      <Button variant="outline" onClick={() => navigate('/expenses/new')}>
        Nowy wydatek
      </Button>
    </div>
  </div>
)}
```

## Testing Checklist

After completing Priority 1-4:

### Data Completeness Tests:
- [ ] Create 1 invoice → see `invoice_created` + `invoice_issued` in Timeline
- [ ] Create 1 expense → see `expense_created` in Timeline
- [ ] Edit expense → see `expense_edited` in Timeline
- [ ] Delete expense → see `expense_deleted` in Timeline

### Manual Posting Tests:
- [ ] Open event drawer
- [ ] Select Wn account from picker
- [ ] Select Ma account from picker
- [ ] Close drawer
- [ ] Reopen drawer → selections persisted
- [ ] See `accounts_assigned` event in Timeline

### Posting Tab Tests:
- [ ] Navigate to /events/posting
- [ ] See events grouped by period
- [ ] See blocker chips on rows (Brak Wn/Ma, Brak dowodu)
- [ ] See Wn/Ma columns showing assigned accounts
- [ ] Click row → drawer opens

### Timeline Tests:
- [ ] Navigate to /events/timeline
- [ ] See summary strip with counts
- [ ] Filter by Financial → see only financial events
- [ ] Empty state shows helpful message + action buttons

## Expected Outcomes

### Before:
- Timeline: 0-2 events
- Posting: Empty state
- Drawer: Pickers don't persist
- System feels dead

### After Priority 1-2:
- Timeline: 10-20 events per day
- Posting: Shows events with blockers
- Drawer: Manual posting works
- System feels alive

### After Priority 3-4:
- Posting: Operational workboard
- Timeline: Audit feed with filters
- Clear path to month-end

## Next Steps (After This)

### Week 3 Continuation:
1. **Posting Templates** (Session 3-4)
   - Templates table
   - apply_posting_template RPC
   - Auto-assign button functional

2. **Trial Balance** (Session 5)
   - Basic report with draft watermark
   - Drill-down to account ledger

3. **Bank Import** (Phase E1)
   - CSV upload
   - Staging table
   - Interpreter

## Files to Create/Modify

### New Files:
- [x] `src/modules/invoices/utils/expenseEventLogger.ts`
- [ ] `supabase/migrations/20260104_update_event_accounts.sql`
- [ ] `supabase/migrations/20260104_accounting_event_types.sql`

### Modified Files:
- [x] `src/shared/types/events.ts` (added expense event types)
- [ ] `src/modules/invoices/screens/expense/ExpenseList.tsx` (add event logging)
- [ ] `src/modules/events/components/EventDetailDrawer.tsx` (wire onChange)
- [ ] `src/modules/events/screens/EventsPosting.tsx` (add blocker chips)
- [ ] `src/modules/events/screens/EventsTimeline.tsx` (add filters)
- [ ] `supabase/migrations/20260104_posting_readiness_and_close.sql` (add audit events)

## Success Metrics

**Immediate (after Priority 1-2):**
- Events module no longer looks empty
- Manual posting works end-to-end
- Timeline shows real activity

**Short-term (after Priority 3-4):**
- Posting tab is operational workboard
- Timeline is useful audit feed
- Clear blockers visible everywhere

**Medium-term (Week 3):**
- 80% auto-posting via templates
- Trial balance report available
- Bank import pipeline working
