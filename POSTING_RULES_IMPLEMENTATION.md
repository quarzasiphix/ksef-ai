# Rule-Based Posting System - Implementation Complete ✅

## 🎯 What Changed

**Before:** Manual account selection (Wn/Ma pickers) for every event  
**After:** Automatic rule-based posting with multi-line journal entries

---

## 📊 Architecture Overview

```
Document (Invoice/Expense) 
    ↓
Event Created
    ↓
Posting Rule Auto-Matched ← find_posting_rule()
    ↓
User Sees Preview (Auto Mode)
    ↓
Close Event
    ↓
Rule Expanded → Multi-Line Journal Entry
    ↓
Balance Sheet Updates
```

---

## 🗄️ Database Schema

### posting_rules
```sql
- id, business_profile_id
- name, rule_code, description
- document_type (sales_invoice, purchase_invoice, payment_received, etc.)
- transaction_type, payment_method, vat_scheme, vat_rate
- project_id, department_id (optional filters)
- is_active, is_system, priority
```

### posting_rule_lines
```sql
- id, posting_rule_id
- line_order (1, 2, 3...)
- side (debit/credit)
- account_code (references chart_accounts.code)
- amount_type (gross/net/vat/fixed/formula)
- amount_formula, fixed_amount
- description
```

---

## 🔧 Core Functions

### 1. find_posting_rule()
```sql
find_posting_rule(
  p_business_profile_id UUID,
  p_document_type TEXT,
  p_transaction_type TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_vat_scheme TEXT DEFAULT NULL,
  p_vat_rate DECIMAL DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (rule_id, rule_name, rule_code, description, lines JSONB)
```

**Matching Logic:**
- Exact match on `document_type` (required)
- Optional filters match if rule has them set
- Returns highest priority rule (lowest priority number)
- Returns rule with all lines as JSONB array

### 2. seed_posting_rules()
```sql
seed_posting_rules(p_business_profile_id UUID)
RETURNS JSONB
```

**Seeds 3 Core Rules:**
1. **Sales VAT 23%** (Sprzedaż – VAT 23%)
   - Wn: 202 Rozrachunki z odbiorcami (gross)
   - Ma: 700 Przychody ze sprzedaży (net)
   - Ma: 222 VAT należny (vat)

2. **Purchase + VAT** (Zakup – koszt operacyjny + VAT)
   - Wn: 400 Koszty operacyjne (net)
   - Wn: 221 VAT naliczony (vat)
   - Ma: 201 Rozrachunki z dostawcami (gross)

3. **Customer Payment - Bank** (Wpływ od klienta – przelew)
   - Wn: 130 Rachunek bankowy (gross)
   - Ma: 202 Rozrachunki z odbiorcami (gross)

### 3. close_accounting_event() - Updated
```sql
close_accounting_event(
  p_event_id UUID,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_posting_rule_id UUID DEFAULT NULL,           -- NEW: Rule-based posting
  p_debit_account_code TEXT DEFAULT NULL,        -- Legacy: Manual mode
  p_credit_account_code TEXT DEFAULT NULL,       -- Legacy: Manual mode
  p_bypass_reason TEXT DEFAULT NULL
)
RETURNS JSONB
```

**Logic:**
- If `p_posting_rule_id` provided → expand rule into multi-line journal
- Else if `p_debit_account_code` + `p_credit_account_code` → 2-line manual posting
- Calculates: `gross_amount`, `net_amount`, `vat_amount` from event
- Creates `gl_journal_entries` header
- Creates `gl_journal_lines` for each rule line
- Verifies debits = credits
- Links journal entry back to event

---

## 🎨 UI Changes

### Event Drawer - Księgowanie Section

**Auto Mode (Default):**
```
✓ Automatyczne księgowanie
Reguła: Sprzedaż – VAT 23%

Zapisy księgowe:
[Wn] 202 Rozrachunki z odbiorcami (gross)
[Ma] 700 Przychody ze sprzedaży (net)
[Ma] 222 VAT należny (vat)

[Tryb ręczny]
```

**Manual Mode (Toggle):**
```
Tryb ręczny

[Wn (Debet) Picker]
[Ma (Kredyt) Picker]

[Tryb automatyczny]
```

**Badge States:**
- 🟢 **Automatyczne** - Rule matched
- 🟡 **Ręczne** - No rule / manual override
- ✅ **Zaksięgowane** - Event closed

---

## 📋 Testing Guide

### 1. Seed Data
```typescript
// Seed Chart of Accounts
await supabase.rpc('seed_chart_accounts', {
  p_business_profile_id: 'your-profile-id'
});

// Seed Posting Rules
await supabase.rpc('seed_posting_rules', {
  p_business_profile_id: 'your-profile-id'
});
```

### 2. Create Invoice
- Go to Invoices → Create new sales invoice
- Amount: 1230 PLN (1000 net + 230 VAT @ 23%)
- Save → Event auto-created

### 3. Open Event Drawer
- Navigate to Events timeline
- Click on invoice event
- **Expected:** Księgowanie section shows:
  - Badge: "Automatyczne"
  - Rule name: "Sprzedaż – VAT 23%"
  - 3 account lines preview (Wn 202, Ma 700, Ma 222)

### 4. Close Event
- Click "Zamknij" button
- **Expected:** Success message
- Event status → Closed

### 5. Verify Journal Entry
- Go to Księga główna → Zapisy księgowe
- Find the journal entry
- **Expected:**
  - 3 lines created:
    - Wn 202: 1230.00 (gross)
    - Ma 700: 1000.00 (net)
    - Ma 222: 230.00 (vat)
  - Total debits = Total credits = 1230.00

### 6. Verify Balance Sheet
- Go to Bilans
- **Expected:**
  - Assets: 202 Rozrachunki +1230
  - Revenue: 700 Przychody +1000
  - Liabilities: 222 VAT należny +230

### 7. Test Manual Mode
- Create another invoice
- Open event drawer
- Click "Tryb ręczny"
- Select accounts manually
- Close event
- **Expected:** 2-line journal entry (old behavior)

---

## 🔍 How Rules Work

### Matching Priority
1. **Exact document_type match** (required)
2. **Optional filters** (if rule has them):
   - transaction_type
   - payment_method
   - vat_scheme
   - vat_rate
   - project_id
   - department_id
3. **Lowest priority number wins** (priority: 10 beats 20)

### Amount Calculation
Each rule line specifies `amount_type`:
- **gross**: Full invoice amount (1230)
- **net**: Amount without VAT (1000)
- **vat**: VAT amount only (230)
- **fixed**: Hardcoded amount
- **formula**: Custom calculation (future)

### Example: Sales Invoice VAT 23%
```
Invoice: 1230 PLN (1000 net + 230 VAT)

Rule expands to:
Line 1: Wn 202 = 1230 (gross)
Line 2: Ma 700 = 1000 (net)
Line 3: Ma 222 = 230 (vat)

Total Wn: 1230
Total Ma: 1230
✓ Balanced
```

---

## 🚀 Benefits

### For Users
- **Zero manual work** - Rules auto-apply
- **Visual transparency** - See accounts before closing
- **Error prevention** - Can't forget VAT line
- **Consistency** - Same transaction = same posting

### For Accountants
- **Audit trail** - Know which rule was used
- **Flexibility** - Override with manual mode
- **Scalability** - Add rules for new scenarios
- **Compliance** - Enforce posting standards

### For System
- **Multi-line support** - Not limited to 2 accounts
- **VAT handling** - Automatic net/vat split
- **Future-proof** - Ready for complex rules
- **KSeF integration** - Auto-post from e-invoices

---

## 📦 What's Included

### Database Migrations
- `20260104_posting_rules.sql` - Tables + RLS + find_posting_rule
- `20260104_seed_posting_rules.sql` - Seed function with 3 core rules
- `20260104_close_event_with_rules.sql` - Updated close RPC

### UI Components
- `EventDetailDrawer.tsx` - Updated with auto-posting UI
- `AccountPicker.tsx` - Fixed RPC call (still used in manual mode)

### Documentation
- `POSTING_RULES_IMPLEMENTATION.md` - This file
- `PHASE_0-5_COMPLETE.md` - Previous implementation summary

---

## 🎯 Next Steps (Future Enhancements)

### Phase 2: More Rules
Add rules for:
- Sales VAT 8%, 5%, 0%
- Purchase fixed assets
- Payroll
- VAT settlement
- CIT advances
- ZUS payments

### Phase 3: Rule Management UI
- `/accounting/posting-rules` page
- Create/edit/deactivate rules
- Test rule matching
- Import/export rules

### Phase 4: Advanced Features
- Formula-based amounts
- Conditional logic (if/then)
- Multi-currency support
- Project/department overrides
- AI rule suggestions

### Phase 5: Automation
- KSeF auto-posting
- Bank statement auto-matching
- Recurring transaction rules
- Bulk posting

---

## ⚠️ Known Limitations

1. **TypeScript warnings** - Deprecated react-query APIs (non-blocking)
2. **VAT calculation** - Assumes `vat_amount` in event metadata
3. **Manual mode** - Still creates 2-line entries (legacy)
4. **No rule editor** - Must seed or insert SQL directly
5. **Single currency** - PLN only for now

---

## 🏁 Success Criteria Met

✅ User never manually selects accounts (default flow)  
✅ Multi-line journal entries work (3+ accounts)  
✅ VAT automatically split into separate line  
✅ Visual preview before closing  
✅ Manual override available  
✅ Backward compatible (manual mode)  
✅ Balance Sheet derives from journal lines  
✅ Audit trail preserved  

**The rule-based posting system is fully operational.**
