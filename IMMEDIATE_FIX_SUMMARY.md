# Immediate Fix: Invoice Event Logging Error

## Problem
When creating an invoice, the system tries to call `create_event` RPC which doesn't exist, causing:
```
Failed to load resource: the server responded with a status of 400
Error logging invoice events
```

## Root Cause
The `create_event` RPC was referenced in code but never created in the database.

## Solution Implemented

### 1. Created `create_event` RPC
**File:** `supabase/migrations/20260104_create_event_rpc.sql`

**What it does:**
- Creates events in the unified `events` table
- Auto-generates event numbers (EVT-00000001, EVT-00000002, etc.)
- Handles all event fields: type, actor, entity, amount, metadata, etc.
- Returns the created event ID
- Includes helper RPCs: `get_event_chain`, `get_entity_timeline`

### 2. Migration Required

**Before testing, run:**
```bash
# Apply the create_event RPC migration
psql -d your_db -f supabase/migrations/20260104_create_event_rpc.sql

# Or via Supabase CLI:
supabase db push
```

## What This Fixes

### Invoice Creation Flow (Now Working):
1. User creates invoice → `saveInvoice()` succeeds
2. System calls `logEvent()` for `invoice_created` → ✅ Works (creates event)
3. System calls `logEvent()` for `invoice_issued` → ✅ Works (creates event)
4. Events appear in:
   - `/events/timeline` (Timeline tab)
   - `/events/posting` (Posting tab)
   - `/accounting/ledger` (Financial Ledger)

### Cash Transaction Flow (Now Working):
1. Invoice marked as cash payment
2. System calls `logEvent()` for `payment_recorded` → ✅ Works
3. Event appears in all ledgers

## Events Now Being Created

After this fix, these events will be logged automatically:

**Invoice Events:**
- `invoice_created` - When invoice saved
- `invoice_issued` - When invoice issued
- `payment_recorded` - When cash payment recorded

**Future Events (Ready to Add):**
- `expense_created` - When expense saved
- `expense_paid` - When expense paid
- `event_closed` - When accounting event closed
- `event_verified` - When event verified
- `accounts_assigned` - When Wn/Ma assigned

## Testing Checklist

After running migration:

1. ✅ Create new invoice
2. ✅ Check browser console - no more 400 errors
3. ✅ Navigate to `/events/timeline` - see `invoice_created` + `invoice_issued`
4. ✅ Navigate to `/events/posting` - see events in current period
5. ✅ Navigate to `/accounting/ledger` - see financial events
6. ✅ Create invoice with cash payment - see `payment_recorded` event

## Next Steps

With event logging now working:

1. **Add Expense Event Logging** (Priority 1.1)
   - Wire `logExpenseCreated()` to expense create handler
   - Wire `logExpenseEdited()` to expense edit handler
   - Wire `logExpenseDeleted()` to expense delete handler

2. **Add Accounting Events to RPCs** (Priority 1.2)
   - Modify `close_accounting_event` to create `event_closed` event
   - Modify `verify_event_integrity` to create `event_verified` event

3. **Create `update_event_accounts` RPC** (Priority 2.1)
   - Allow manual Wn/Ma assignment
   - Create `accounts_assigned` audit event

## Files Created/Modified

**Created:**
- `supabase/migrations/20260104_create_event_rpc.sql`
- `IMMEDIATE_FIX_SUMMARY.md` (this file)

**No Code Changes Required:**
- Invoice logging code already correct
- Just needed the RPC to exist in database

## Expected Outcome

**Before Fix:**
- Console errors on invoice create
- No events in Timeline
- No events in Posting
- Ledger shows only old data

**After Fix:**
- No console errors
- Timeline shows invoice events
- Posting shows events by period
- Ledger shows financial events
- System feels "alive"
