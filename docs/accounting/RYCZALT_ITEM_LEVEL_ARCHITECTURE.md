# Ryczałt Item-Level Category Architecture

## Problem Statement

**Current (Wrong) Model:**
- Ryczałt category assigned at invoice level
- Assumes all items on invoice have same tax rate
- Breaks when invoice has mixed services/goods (e.g., 8.5% consulting + 3% trade)

**Correct Model:**
- Ryczałt category assigned per invoice item
- Each item can have different rate
- Posting aggregates by category to create register lines

---

## Why This Matters

### Legal Requirement
Polish tax law requires **accurate categorization of each revenue type** because:
- Different PKWiU codes → different ryczałt rates
- Mixed invoices are common (e.g., IT services 12% + hardware resale 3%)
- Tax office expects breakdown by category in Ewidencja przychodów

### User Pain Point
If user sells:
- Consulting (12%)
- Software licenses (8.5%)
- Hardware (3%)

...on the same invoice, they need per-item categorization or they'll miscalculate tax.

---

## Database Schema (Implemented)

### Invoice Items Table
```sql
ALTER TABLE invoice_items
ADD COLUMN ryczalt_category_id UUID REFERENCES ryczalt_revenue_categories(id),
ADD COLUMN ryczalt_rate DECIMAL(5,2),           -- Snapshot at posting
ADD COLUMN ryczalt_category_name TEXT;          -- Snapshot at posting
```

### Helper Functions

**1. Check for Mixed Categories**
```sql
SELECT invoice_has_mixed_ryczalt_categories('invoice-uuid');
-- Returns: true if items have different categories
```

**2. Get Category Breakdown**
```sql
SELECT * FROM get_invoice_ryczalt_breakdown('invoice-uuid');
-- Returns:
-- category_id | category_name | rate | net_amount | tax_amount
-- uuid-1      | Usługi IT     | 12.0 | 5000.00    | 600.00
-- uuid-2      | Handel        | 3.0  | 2000.00    | 60.00
```

---

## Phased Rollout Strategy

### Phase 1: Invoice-Level (Current - MVP)
**Status:** ✅ Implemented

**How it works:**
- Single `ryczalt_category_id` on `invoices` table
- Posting assumes all items share this category
- Works for 90% of small businesses (single-category invoices)

**Limitations:**
- Cannot handle mixed-rate invoices
- User must create separate invoices for different categories

**UI:**
- Category dropdown in invoice header (PostInvoiceDialog)
- Required field for JDG ryczałt income invoices
- Simple, fast UX

---

### Phase 2: Item-Level Optional (Next - 2-4 weeks)
**Status:** 🔄 Schema ready, UI pending

**How it works:**
- Add optional per-item category in invoice form
- If all items have same category → auto-fill from invoice-level
- If user manually sets different categories → flag as "mixed"
- Posting validates: all items must have category if invoice is mixed

**UI Changes:**
1. **Invoice Form (Advanced Mode)**
   - Add "Kategoria ryczałtu" column to items table
   - Hidden by default, shown when "Zaawansowane" toggled
   - Auto-fill from invoice-level category if set

2. **PostInvoiceDialog**
   - If `invoice_has_mixed_ryczalt_categories()` → show breakdown table
   - Validate: all items must have category before posting
   - Show total tax per category

3. **Validation**
   ```typescript
   if (isJdgRyczalt && isIncome) {
     const hasMixed = await checkMixedCategories(invoiceId);
     if (hasMixed) {
       const allItemsHaveCategory = items.every(i => i.ryczalt_category_id);
       if (!allItemsHaveCategory) {
         throw new Error('Wszystkie pozycje muszą mieć przypisaną kategorię');
       }
     } else {
       // Fall back to invoice-level category
       if (!invoice.ryczalt_category_id) {
         throw new Error('Musisz wybrać kategorię ryczałtu');
       }
     }
   }
   ```

**Backward Compatibility:**
- Existing invoices with invoice-level category continue to work
- Posting backfills item-level categories from invoice-level if missing
- No data migration needed

---

### Phase 3: Split Posting (Future - 1-2 months)
**Status:** 📋 Planned

**How it works:**
- Posting creates **multiple register lines per invoice** (one per category)
- Each line references same `invoice_id` but different `ryczalt_category_id`
- Ewidencja przychodów shows breakdown by category

**Database Changes:**
```sql
-- jdg_revenue_register_lines already has ryczalt_category_id
-- Just need to allow multiple lines per invoice

ALTER TABLE jdg_revenue_register_lines
DROP CONSTRAINT IF EXISTS unique_invoice_per_register;

-- Add constraint: unique per invoice + category
ALTER TABLE jdg_revenue_register_lines
ADD CONSTRAINT unique_invoice_category_per_register
UNIQUE (invoice_id, ryczalt_category_id);
```

**Posting Logic:**
```sql
-- Instead of one INSERT per invoice:
INSERT INTO jdg_revenue_register_lines (...)
SELECT 
  invoice_id,
  ryczalt_category_id,
  ryczalt_category_name,
  ryczalt_rate,
  SUM(net_value) as amount,
  SUM(net_value * ryczalt_rate / 100) as tax_amount,
  ...
FROM invoice_items
WHERE invoice_id = p_invoice_id
GROUP BY ryczalt_category_id, ryczalt_category_name, ryczalt_rate;
```

**UI Impact:**
- Ewidencja przychodów table shows multiple rows per invoice
- Grouping by invoice number with expandable breakdown
- Monthly totals by category (required for PIT-28 declaration)

---

## UI/UX Design Decisions

### Default Behavior (Keep Simple)
- **New invoice:** Category selection hidden by default
- **Single-category business:** Never sees item-level UI
- **Mixed-category business:** Opts in via "Zaawansowane" toggle

### Auto-Fill Logic
```typescript
// When user selects invoice-level category:
if (invoiceLevelCategory && !items.some(i => i.ryczalt_category_id)) {
  // Auto-fill all items with invoice-level category
  items.forEach(item => {
    item.ryczalt_category_id = invoiceLevelCategory;
  });
}

// When user changes item category:
const uniqueCategories = new Set(items.map(i => i.ryczalt_category_id));
if (uniqueCategories.size > 1) {
  showWarning('Faktura zawiera różne kategorie ryczałtu - upewnij się, że jest to zamierzone');
}
```

### Validation Rules
1. **Invoice-level category set + no item-level categories:**
   - ✅ Valid - use invoice-level for all items

2. **All items have same category:**
   - ✅ Valid - single-category invoice

3. **Items have different categories:**
   - ✅ Valid - mixed invoice (requires item-level)
   - ⚠️ Warning: "Faktura zawiera różne stawki ryczałtu"

4. **Some items missing category:**
   - ❌ Invalid - cannot post
   - Error: "Wszystkie pozycje muszą mieć przypisaną kategorię"

---

## Posting Workflow Changes

### Current (Phase 1)
```typescript
// PostInvoiceDialog.tsx
if (needsRyczaltCategory && selectedCategoryId) {
  await supabase
    .from('invoices')
    .update({ ryczalt_category_id: selectedCategoryId })
    .eq('id', invoice.id);
}

await supabase.rpc('post_to_jdg_register', { p_invoice_id: invoice.id });
```

### Phase 2 (Item-Level Optional)
```typescript
// PostInvoiceDialog.tsx
const hasMixed = await checkMixedCategories(invoice.id);

if (hasMixed) {
  // Validate all items have categories
  const { data: items } = await supabase
    .from('invoice_items')
    .select('id, ryczalt_category_id')
    .eq('invoice_id', invoice.id);
  
  if (items.some(i => !i.ryczalt_category_id)) {
    throw new Error('Wszystkie pozycje muszą mieć przypisaną kategorię');
  }
} else {
  // Backfill items with invoice-level category
  if (selectedCategoryId) {
    await supabase
      .from('invoice_items')
      .update({ ryczalt_category_id: selectedCategoryId })
      .eq('invoice_id', invoice.id)
      .is('ryczalt_category_id', null);
  }
}

await supabase.rpc('post_to_jdg_register', { p_invoice_id: invoice.id });
```

### Phase 3 (Split Posting)
```sql
-- Backend RPC function
CREATE OR REPLACE FUNCTION post_to_jdg_register(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_breakdown RECORD;
BEGIN
  -- Create one register line per category
  FOR v_breakdown IN 
    SELECT * FROM get_invoice_ryczalt_breakdown(p_invoice_id)
  LOOP
    INSERT INTO jdg_revenue_register_lines (
      invoice_id,
      ryczalt_category_id,
      ryczalt_category_name,
      ryczalt_rate,
      amount,
      tax_amount,
      ...
    ) VALUES (
      p_invoice_id,
      v_breakdown.category_id,
      v_breakdown.category_name,
      v_breakdown.rate,
      v_breakdown.net_amount,
      v_breakdown.tax_amount,
      ...
    );
  END LOOP;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

---

## Migration Path for Existing Data

### No Breaking Changes
- Existing invoices with `invoices.ryczalt_category_id` continue to work
- Posting backfills `invoice_items.ryczalt_category_id` from invoice-level
- Historical register lines remain unchanged

### Optional Cleanup (Future)
```sql
-- After Phase 2 is stable, optionally migrate invoice-level to item-level
UPDATE invoice_items ii
SET ryczalt_category_id = i.ryczalt_category_id
FROM invoices i
WHERE ii.invoice_id = i.id
  AND ii.ryczalt_category_id IS NULL
  AND i.ryczalt_category_id IS NOT NULL;
```

---

## Testing Strategy

### Phase 1 (Current)
- [x] Post JDG ryczałt invoice with invoice-level category
- [x] Block posting without category
- [x] Snapshot rate and category name

### Phase 2 (Item-Level Optional)
- [ ] Create invoice with all items same category → auto-fill works
- [ ] Create invoice with mixed categories → validation requires all items
- [ ] Post mixed invoice → creates single register line (aggregated)
- [ ] Edit posted invoice → categories locked

### Phase 3 (Split Posting)
- [ ] Post mixed invoice → creates multiple register lines
- [ ] Ewidencja przychodów shows breakdown by category
- [ ] Monthly totals by category for PIT-28
- [ ] Historical invoices still show correctly

---

## Key Architectural Principles

### 1. Item-Level is Source of Truth
- `invoice_items.ryczalt_category_id` is authoritative
- `invoices.ryczalt_category_id` is convenience/default (Phase 1 compatibility)
- Posting reads from items, not invoice header

### 2. Snapshots Prevent Historical Changes
- `ryczalt_rate` and `ryczalt_category_name` frozen at posting
- If category definition changes later, posted invoices unaffected
- Audit trail preserved

### 3. Backward Compatibility Always
- Phase 1 invoices work in Phase 2/3
- No forced migration
- Graceful degradation

### 4. Validation at Posting, Not Entry
- User can create invoice with incomplete categories
- Posting validates and blocks if incomplete
- Allows drafts without forcing category selection upfront

---

## Related Documentation

- `POSTING_WORKFLOW_IMPLEMENTATION.md` - Overall posting workflow
- `RYCZALT_RATE_MODEL_FIX.md` - Category vs rate model
- `SESSION_PROGRESS_2026-01-19_EVENING.md` - Implementation status

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19 20:30  
**Status:** Phase 1 complete, Phase 2 schema ready, UI pending
