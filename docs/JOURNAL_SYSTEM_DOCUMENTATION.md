# Current Journal System Documentation

## Executive Summary

The current journal system in ksef-ai is a **hybrid approach** with multiple journal tables and simplified posting logic. The system has evolved over time and contains both legacy and modern components, creating some complexity that needs to be addressed in the rebuild.

## Current Architecture Overview

### 📊 **Journal Tables Structure**

The system currently has **THREE** different journal table sets:

#### 1. **Legacy Journal Tables** (Old System)
```sql
-- journal_entries (legacy, minimal usage)
- id, business_profile_id, user_id, entry_date, document_number
- description, is_posted, created_at, updated_at

-- journal_entry_lines (legacy, minimal usage)  
- id, journal_entry_id, account_id, debit_amount, credit_amount, description
```

#### 2. **GL Journal Tables** (General Ledger - Spółka Focus)
```sql
-- gl_journal_entries (general ledger headers)
- id, business_profile_id, event_id, period, entry_date
- description, reference_number, status, posted_at, posted_by

-- gl_journal_lines (general ledger lines)
- id, journal_entry_id, account_id, account_code, debit, credit, description
```

#### 3. **Simplified Posting** (Current Implementation)
Currently, the system **does NOT create journal entries** for most postings. Instead, it:
- Updates `invoices.accounting_status = 'posted'`
- Sets `invoices.posted_at` timestamp
- Stores `invoices.journal_entry_id = NULL` (not linked)

### 🔄 **Auto-Posting Flow**

#### **Current Implementation** (Simplified)

1. **Trigger**: User clicks "Auto-księguj" button
2. **Function Call**: `auto_post_invoice_simple()` or `auto_post_pending_invoices_simple()`
3. **Logic**: 
   - Checks if already posted
   - For JDG ryczalt: Validates `ryczalt_account_id` is assigned
   - Updates invoice status to `'posted'`
   - Sets `posted_at` timestamp
   - **NO journal entries created**

#### **Complex Implementation** (Not Currently Used)

The system has sophisticated posting rules that are **NOT ACTIVE**:

```sql
-- posting_rules (rule definitions)
- id, business_profile_id, name, rule_code, document_type
- transaction_type, payment_method, vat_scheme, vat_rate
- priority, is_active, is_system

-- posting_rule_lines (rule line definitions)  
- posting_rule_id, line_order, side, account_code, amount_type
- amount_formula, fixed_amount, description
```

**Example Rule**: "Sprzedaż – VAT 23%"
- Line 1: Debit account 202 (Rozrachunki z odbiorcami) - gross amount
- Line 2: Credit account 700 (Przychody ze sprzedaży) - net amount  
- Line 3: Credit account 222 (VAT należny) - VAT amount

### 📈 **Posting Rules System**

#### **Rule Matching Logic**
The `auto_post_invoice()` function (complex version) would:

1. **Find Matching Rule**:
   ```sql
   SELECT pr.*, prl.* 
   FROM posting_rules pr
   JOIN posting_rule_lines prl ON prl.posting_rule_id = pr.id
   WHERE pr.business_profile_id = ?
     AND pr.document_type = 'sales_invoice'
     AND pr.transaction_type = ?
     AND pr.is_active = TRUE
   ORDER BY pr.priority DESC
   ```

2. **Create Journal Entry**:
   ```sql
   INSERT INTO journal_entries (
     business_profile_id, user_id, entry_date,
     document_number, description, is_posted
   ) VALUES (?, ?, ?, ?, ?, TRUE)
   ```

3. **Create Journal Lines**:
   ```sql
   INSERT INTO journal_entry_lines (
     journal_entry_id, account_id, debit_amount, credit_amount, description
   )
   ```

#### **Rule Categories**
- **Sales Invoice**: VAT schemes, payment methods
- **Purchase Invoice**: Operating expenses, VAT deduction
- **Payments**: Bank transfers, cash
- **Corrections**: Credit notes, reversals

### 🏢 **Entity-Specific Behavior**

#### **JDG (Działalność jednostosobowa)**
- **Ryczalt**: Uses `jdg_revenue_register_lines` instead of journal
- **Skala/Liniowy**: Simplified posting (status update only)

#### **Spółka z o.o.**
- **Full Double-Entry**: Should use `gl_journal_entries` + `gl_journal_lines`
- **Complex Rules**: Multi-dimensional rule matching
- **Period Management**: Strict accounting period controls

### 📅 **Accounting Periods**

```sql
-- accounting_periods
- id, business_profile_id, fiscal_year, start_date, end_date
- status (open/closing/locked), is_locked
- period_year, period_month (auto-provisioned)
- retained_earnings_brought_forward, net_profit_loss
```

**Key Features**:
- **Auto-Provisioning**: Periods created automatically when needed
- **Locking**: Prevents posting to locked periods
- **Fiscal Management**: CIT calculations, profit/loss tracking

### 🔗 **Invoice-Journal Relationship**

#### **Current State**
```sql
-- invoices table (relevant columns)
- accounting_status (unposted/posted/needs_review)
- journal_entry_id (UUID, NULL in most cases)
- posted_at (timestamp)
- posted_by (UUID)
- posting_ref (text)
```

**Problem**: `journal_entry_id` exists but is **NULL** for most posted invoices because simplified posting doesn't create journal entries.

#### **Event System**
```sql
-- events table (audit trail)
- business_profile_id, event_type, entity_type, entity_id
- description, metadata (JSONB)
```

Events are created for posting actions with metadata like:
```json
{
  "journal_entry_id": "uuid",
  "period_id": "uuid", 
  "rule_code": "SALES_VAT_23",
  "amount": 1234.56
}
```

### 🚀 **Auto-Posting Components**

#### **Frontend: AutoPostingButton.tsx**
- **Single Mode**: Post one invoice
- **Batch Mode**: Post multiple invoices with date range
- **Error Handling**: Shows assignment modal for missing ryczalt accounts
- **Query Invalidation**: Refreshes UI after posting

#### **Backend Functions**

1. **`auto_post_invoice_simple()`**:
   - Validates invoice exists
   - Checks ryczalt account assignment (if needed)
   - Updates `accounting_status = 'posted'`
   - Returns success/error status

2. **`auto_post_pending_invoices_simple()`**:
   - Processes multiple invoices
   - Handles missing account assignments
   - Returns posting statistics

3. **Complex Functions** (Not Used):
   - `auto_post_invoice()`: Full rule-based posting
   - `ensure_accounting_period()`: Period management
   - `post_to_jdg_register()`: Ryczalt register posting

### 📊 **Data Flow Analysis**

#### **Current Simplified Flow**
```
Invoice Created → User Clicks "Auto-księguj" → 
auto_post_invoice_simple() → 
Update invoices.accounting_status = 'posted' → 
Create events record → 
UI shows "Zaksięgowane" status
```

#### **Intended Complex Flow** (Not Active)
```
Invoice Created → User Clicks "Auto-księguj" → 
Find posting rule → 
Create journal_entry → 
Create journal_entry_lines → 
Update invoices.accounting_status + journal_entry_id → 
Create events record → 
UI shows full posting details
```

### ⚠️ **Current Issues & Technical Debt**

#### **1. Multiple Journal Systems**
- **Legacy**: `journal_entries` + `journal_entry_lines`
- **GL**: `gl_journal_entries` + `gl_journal_lines`  
- **Simplified**: No journal entries created

#### **2. Incomplete Implementation**
- Posting rules exist but aren't used
- `invoices.journal_entry_id` is NULL for most postings
- Complex auto-posting functions exist but simplified versions are called

#### **3. Entity Inconsistency**
- JDG uses simplified posting
- Spółka should use full double-entry but doesn't
- Ryczalt uses separate register system

#### **4. Missing Features**
- No reversal/correction mechanism
- No audit trail for journal changes
- No posting versioning
- Limited period enforcement

### 🎯 **Recommendations for Rebuild**

#### **Keep This**
- **Posting Rules Engine**: Sophisticated rule matching is valuable
- **Accounting Periods**: Solid period management
- **Event System**: Good audit trail foundation
- **Multi-Entity Support**: JDG vs Spółka differentiation

#### **Fix This**
- **Single Journal System**: Choose one approach (recommend GL tables)
- **Complete Integration**: Actually use the posting rules
- **Proper Linking**: Connect invoices to journal entries
- **Consistent Flow**: Same posting process for all entities

#### **Add This**
- **Reversal Mechanism**: Proper correction posting
- **Version Control**: Track posting rule changes
- **Enhanced Audit**: Full journal change tracking
- **Performance**: Optimized rule matching

### 🔍 **Database Schema Assessment**

#### **Strengths**
- Well-structured posting rules
- Comprehensive account chart
- Good period management
- Flexible rule line definitions

#### **Weaknesses**  
- Multiple conflicting journal tables
- Incomplete foreign key relationships
- Missing constraints (balanced debits/credits)
- No posting workflow enforcement

### 📋 **Migration Strategy**

#### **Phase 1: Consolidate**
1. Choose primary journal system (recommend `gl_*` tables)
2. Migrate any data from legacy systems
3. Update all references to use new system

#### **Phase 2: Integrate**  
1. Connect simplified posting to actual journal creation
2. Implement posting rule engine
3. Link invoices to journal entries properly

#### **Phase 3: Enhance**
1. Add reversal/correction functionality
2. Implement advanced audit trails
3. Add performance optimizations

---

## Conclusion

The current journal system has **excellent foundations** (posting rules, periods, events) but **incomplete implementation**. The sophisticated rule-based posting exists but isn't used, leading to a simplified status-only approach.

For the rebuild, **keep the posting rules engine** and **consolidate to a single journal system**. This will provide the proper double-entry accounting while maintaining the flexibility for different entity types.

The key insight is that most of the complex logic already exists - it just needs to be properly integrated and used consistently across all entity types.
