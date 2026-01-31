# Event Drawer Cleanup - Complete ✅

## 🎯 Objective

Remove Chart of Accounts assignment from Event Drawer to maintain proper separation of concerns:
- **Events** = Audit trail only (immutable record of what happened)
- **Accounting** = Financial posting with CoA assignment (via Posting Queue)

## ✅ Changes Made

### 1. **Removed Accounting Section**

**Before:**
- Event Drawer had "Księgowanie" section with:
  - Auto-posting mode with posting rules
  - Manual mode with Wn/Ma account pickers
  - Account assignment UI
  - Close event with accounting logic

**After:**
- Event Drawer is now audit-only:
  - Context (event details, date, amount)
  - Links (invoice, operation, decision)
  - Change details (if applicable)
  - Proof/Evidence (hash, bank transaction, KSeF reference)
  - Verification actions

### 2. **Removed Dependencies**

**Removed imports:**
- `Calculator` icon (was used for accounting section)
- `AccountPicker` component (was used for manual account selection)

**Removed state:**
- `isManualMode` - toggle between auto/manual posting
- `debitAccount` - selected debit account
- `creditAccount` - selected credit account

**Removed queries:**
- `postingRule` query - fetching auto-posting rules

**Removed mutations:**
- `setAccountsMutation` - setting event accounts

**Removed functions:**
- `handleToggleManualMode` - switching posting modes

### 3. **Simplified Close Event**

**Before:**
```typescript
closeEventMutation.mutate() // with posting rule or manual accounts
```

**After:**
```typescript
closeEventMutation.mutate() // simple close without accounting
```

The close event mutation now only closes the event without any accounting logic.

## 📋 New Workflow

### **Old Workflow (Removed):**
```
Event Drawer → Assign CoA accounts → Close event → Posted
```

### **New Workflow:**
```
1. Invoice accepted → Auto-posting tries CoA assignment
   ├─ Success → Posted automatically
   └─ Needs review → Added to Posting Queue

2. Posting Queue → Manual CoA assignment → Post → Posted

3. Event Drawer → View audit trail only (read-only)
```

## 🎨 Event Drawer Sections (After Cleanup)

1. **Context** - Event type, status, date, period, actor, amount
2. **Links** - Invoice, operation, decision references
3. **Change Details** - Field-level changes (if applicable)
4. **Proof** - Evidence and verification status
5. **Actions** - Verify integrity, close event (no accounting)

## 🔍 What Events Are For

Events are now **purely audit trail**:
- ✅ Record what happened
- ✅ Track who did it and when
- ✅ Link to source documents
- ✅ Verify integrity with hashing
- ✅ Provide immutable history

Events are **NOT** for:
- ❌ Chart of Accounts assignment
- ❌ Financial posting
- ❌ Accounting decisions

## 💡 Where Accounting Happens

All accounting now happens in the **Accounting module**:

### **Posting Queue** (`/accounting/posting-queue`)
- Shows invoices needing CoA assignment
- Manual posting with multi-line journal entries
- Account selection with search
- Balance validation

### **General Ledger** (`/accounting/general-ledger`)
- Shows all posted journal entries
- Account-level reporting
- Trial balance

### **Chart of Accounts** (`/accounting/chart-of-accounts`)
- Manage accounts
- Seed default accounts
- Activate/deactivate accounts

## 📁 Files Modified

**Modified:**
- `events/components/EventDetailDrawer.tsx`
  - Removed accounting section (lines 264-405)
  - Removed AccountPicker import
  - Removed accounting state and queries
  - Simplified close event mutation
  - Renumbered sections (Proof is now Section 3)

**Not Modified:**
- Event-related database functions still exist
- `close_accounting_event` RPC still works
- Event readiness checks still function

## 🚀 Benefits

1. **Separation of Concerns**
   - Events = audit trail
   - Accounting = financial posting
   - Clear boundaries

2. **Better UX**
   - Dedicated posting interface with multi-line support
   - Review queue for invoices needing attention
   - No confusion between audit and accounting

3. **Proper Accounting**
   - Multi-line journal entries
   - Balance validation
   - Full CoA integration
   - Reversal support

4. **Maintainability**
   - Simpler Event Drawer code
   - Accounting logic centralized
   - Easier to extend

## ✅ Testing Checklist

- [ ] Event Drawer opens without errors
- [ ] Event details display correctly
- [ ] Links section shows invoice/operation/decision
- [ ] Proof section shows evidence
- [ ] Close event button works
- [ ] No accounting UI visible
- [ ] Posting Queue shows unposted invoices
- [ ] Manual posting works via Posting Queue

## 📝 Notes

- Event Drawer is now **read-only** for accounting purposes
- All accounting actions happen in **Accounting module**
- Events remain the **source of truth** for audit trail
- Journal entries are the **source of truth** for financial records

---

**Status**: Event Drawer cleanup complete ✅  
**Next**: Test end-to-end posting workflow  
**Last Updated**: 2026-01-31 12:10 PM
