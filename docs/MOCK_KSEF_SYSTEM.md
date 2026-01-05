# Mock KSeF System - Development Bypass

## Overview

A temporary mock KSeF system has been implemented to allow development and testing of the event closure workflow without requiring actual KSeF integration.

## What Was Changed

### 1. Removed KSeF Requirement from Posting Readiness

**Migration:** `20260105_mock_ksef_bypass_final.sql`

The `events_posting_readiness` view was updated to **remove** the KSeF blocker:

```sql
-- REMOVED (commented out):
-- CASE WHEN e.direction = 'incoming' AND e.amount > 15000 
--      AND e.metadata->>'ksef_reference_number' IS NULL 
--      THEN TRUE

-- Now only checks for bank transaction proof:
CASE
  WHEN e.cash_channel = 'bank' AND e.metadata->>'bank_transaction_id' IS NULL THEN TRUE
  ELSE FALSE
END AS missing_required_proof
```

**Result:** Events are no longer blocked by missing `ksef_reference_number`.

### 2. Account Selection Fix

The `set_event_accounts` function (from migration `20260105_fix_set_event_accounts.sql`) properly stores account selections in metadata under the keys that the readiness view checks:

- `debit_account` (legacy key)
- `debit_account_code` (new key)
- `credit_account` (legacy key)
- `credit_account_code` (new key)

This ensures that when you select Wn/Ma accounts in the Event Detail Drawer, the event becomes unblocked.

## Current Workflow

### Event Closure Flow (Without KSeF)

1. **Open Event Detail Drawer**
2. **Select Accounts:**
   - Choose Wn (Debet) account
   - Choose Ma (Kredyt) account
   - Accounts are saved via `set_event_accounts` RPC
3. **Event Unblocks:**
   - `missing_accounts` → `FALSE`
   - `can_close` → `TRUE`
   - "Zamknij zdarzenie" button becomes enabled
4. **Close Event:**
   - Click "Zamknij zdarzenie"
   - Event is closed and posted
   - No KSeF check required

### What's Bypassed

- ❌ KSeF reference number requirement for incoming invoices > 15k PLN
- ❌ KSeF integration API calls
- ❌ KSeF validation

### What Still Works

- ✅ Account selection (Wn/Ma)
- ✅ Event hash generation
- ✅ Bank transaction proof (if cash_channel = 'bank')
- ✅ Entity linking validation
- ✅ Period locking
- ✅ Event closure workflow
- ✅ Posting to ledger

## Testing the Fix

### Test Account Selection

1. Open any event in Event Detail Drawer
2. Switch to "Tryb ręczny" if needed
3. Select a Wn (Debet) account from dropdown
4. Select a Ma (Kredyt) account from dropdown
5. **Expected:** Accounts are saved immediately
6. **Expected:** Event readiness updates (blockers removed)
7. **Expected:** "Zamknij zdarzenie" button becomes enabled

### Verify in Database

```sql
-- Check if accounts were saved
SELECT 
  id,
  metadata->>'debit_account' as debit,
  metadata->>'credit_account' as credit
FROM events
WHERE id = 'YOUR_EVENT_ID';

-- Check readiness
SELECT 
  event_id,
  debit_account,
  credit_account,
  missing_accounts,
  can_close,
  blocker_reasons
FROM events_posting_readiness
WHERE event_id = 'YOUR_EVENT_ID';
```

## Before Production

### ⚠️ IMPORTANT: Remove Mock System

Before deploying to production, you **MUST**:

1. **Remove the mock bypass migration**
   - Delete or revert `20260105_mock_ksef_bypass_final.sql`

2. **Restore original KSeF checks**
   - Restore the original `events_posting_readiness` view with KSeF validation:
   ```sql
   CASE 
     WHEN e.direction = 'incoming' 
       AND e.amount > 15000 
       AND e.metadata->>'ksef_reference_number' IS NULL 
     THEN TRUE
     -- ... other checks
   END AS missing_required_proof
   ```

3. **Implement real KSeF integration**
   - KSeF API client
   - Invoice submission to KSeF
   - Reference number retrieval
   - Error handling
   - Retry logic

4. **Update event creation workflow**
   - Add KSeF submission step
   - Store `ksef_reference_number` in event metadata
   - Handle KSeF errors gracefully

## KSeF Integration Checklist (Future)

When implementing real KSeF:

- [ ] KSeF API client library
- [ ] Authentication with KSeF
- [ ] Invoice XML generation (FA format)
- [ ] Submit invoice to KSeF
- [ ] Retrieve KSeF reference number
- [ ] Store reference in event metadata
- [ ] Handle KSeF errors (validation, network, etc.)
- [ ] Retry logic for failed submissions
- [ ] KSeF status polling
- [ ] Update UI to show KSeF status
- [ ] Restore KSeF requirement in `events_posting_readiness`
- [ ] Remove mock bypass migration

## Current State Summary

✅ **Working:**
- Account selection in Event Detail Drawer
- Event closure workflow
- Posting to ledger
- All validation except KSeF

⚠️ **Bypassed (Temporary):**
- KSeF reference requirement
- KSeF API integration

🔴 **Not Implemented Yet:**
- Real KSeF integration
- KSeF invoice submission
- KSeF reference storage

## Troubleshooting

### Issue: Accounts not saving

**Check:**
1. Is `set_event_accounts` function present?
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'set_event_accounts';
   ```

2. Are accounts valid and active?
   ```sql
   SELECT code, name, is_active 
   FROM chart_accounts 
   WHERE business_profile_id = 'YOUR_PROFILE_ID';
   ```

3. Check browser console for errors
4. Check network tab for RPC call response

### Issue: Event still blocked after selecting accounts

**Check:**
1. Verify accounts were saved:
   ```sql
   SELECT metadata->>'debit_account', metadata->>'credit_account'
   FROM events WHERE id = 'EVENT_ID';
   ```

2. Check readiness view:
   ```sql
   SELECT * FROM events_posting_readiness WHERE event_id = 'EVENT_ID';
   ```

3. Refresh the Event Detail Drawer (query invalidation should happen automatically)

### Issue: Other blockers preventing closure

**Check blocker_reasons:**
```sql
SELECT blocker_reasons FROM events_posting_readiness WHERE event_id = 'EVENT_ID';
```

Common blockers:
- `missing_debit_account` - No Wn account selected
- `missing_credit_account` - No Ma account selected
- `missing_entity_link` - Invoice/expense not linked
- `missing_bank_proof` - Bank transaction ID missing (for bank payments)
- `period_locked` - Accounting period is locked

## Files Modified

1. `supabase/migrations/20260105_mock_ksef_bypass_final.sql` - KSeF bypass
2. `supabase/migrations/20260105_fix_set_event_accounts.sql` - Account selection fix (already applied)
3. `docs/MOCK_KSEF_SYSTEM.md` - This documentation

## Summary

The mock KSeF system allows you to:
- ✅ Test event closure workflow
- ✅ Select and save Wn/Ma accounts
- ✅ Close events without KSeF
- ✅ Continue development

Remember to implement real KSeF integration before production deployment.
