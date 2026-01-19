# Ryczałt Rate Model Fix - 2026-01-19

## Problem Statement

**Original (Wrong) Implementation:**
- `business_profiles.default_ryczalt_rate` - single company-wide rate
- Assumed one rate per company
- User asked for rate during business profile creation

**Why It's Wrong:**
In Polish ryczałt taxation, the rate depends on **the type of revenue** (product/service category), not the company. A single business can legitimately have multiple rates in the same month/year.

**Real-World Example (Construction Company):**
- Budowa mieszkalna (residential construction) → 5.5%
- Prace ogrodowe (garden work) → 8%
- Handel materiałami budowlanymi (building materials trade) → 3%

All three can appear on different invoices in the same month.

---

## Correct Model (Implemented)

### Database Schema

**1. Categories Table (Already Exists):**
```sql
ryczalt_revenue_categories (
  id UUID,
  name TEXT,
  rate DECIMAL(5,2),
  description TEXT,
  pkwiu_hint TEXT,
  pkd_hint TEXT,
  is_default BOOLEAN,
  is_active BOOLEAN
)
```

**2. Invoice Category Assignment (NEW):**
```sql
ALTER TABLE invoices
ADD COLUMN ryczalt_category_id UUID REFERENCES ryczalt_revenue_categories(id);

ADD COLUMN ryczalt_rate DECIMAL(5,2); -- Snapshot for history
```

**3. Register Lines (Already Exists):**
```sql
jdg_revenue_register_lines (
  ...
  category_id UUID,
  category_name TEXT, -- Snapshot
  ryczalt_rate DECIMAL(5,2), -- Snapshot
  ryczalt_tax_amount DECIMAL(15,2),
  ...
)
```

---

## Implementation Changes

### ✅ 1. BusinessProfileForm - Removed Single Rate Field

**Before:**
```tsx
<Input 
  type="number" 
  label="Stawka ryczałtu (%)"
  placeholder="np. 12"
/>
```

**After:**
```tsx
<div className="p-4 bg-blue-50 rounded-lg">
  <h4>Stawki ryczałtu przypisane do produktów/usług</h4>
  <p>W ryczałcie stawka zależy od rodzaju przychodu (produktu/usługi), nie od firmy.</p>
  <p>Przykład: Firma budowlana może mieć:</p>
  <ul>
    <li>Budowa mieszkalna → 5.5%</li>
    <li>Prace ogrodowe → 8%</li>
    <li>Handel materiałami → 3%</li>
  </ul>
  <p>Stawkę przypisujesz do każdej faktury podczas wystawiania.</p>
</div>
```

**File:** `src/modules/settings/screens/BusinessProfileForm.tsx`

---

### ✅ 2. KPiR View - Grouped by Rate

**Changes:**
- Groups register lines by `ryczalt_rate`
- Shows separate section for each rate
- Summary cards showing revenue and tax per rate
- Subtotals for each rate group

**Visual Structure:**
```
┌─ Podział według stawek ryczałtu ─────────────┐
│ ┌─ Stawka 3% ─┐ ┌─ Stawka 5.5% ─┐ ┌─ 8% ─┐ │
│ │ 5 wpisów    │ │ 12 wpisów     │ │ 3 wp. │ │
│ │ 50k PLN     │ │ 120k PLN      │ │ 20k   │ │
│ │ 1.5k podatek│ │ 6.6k podatek  │ │ 1.6k  │ │
│ └─────────────┘ └───────────────┘ └───────┘ │
└───────────────────────────────────────────────┘

┌─ Stawka ryczałtu: 3% ────────────────────────┐
│ LP | Data | Dokument | Kontrahent | Kategoria | Przychód | Podatek (3%) │
│ 1  | ...  | ...      | ...        | Handel    | 10k      | 300          │
│ 2  | ...  | ...      | ...        | Handel    | 15k      | 450          │
│ Suma dla stawki 3%:                           | 25k      | 750          │
└───────────────────────────────────────────────┘

┌─ Stawka ryczałtu: 5.5% ──────────────────────┐
│ LP | Data | Dokument | Kontrahent | Kategoria | Przychód | Podatek (5.5%) │
│ 1  | ...  | ...      | ...        | Budowa    | 50k      | 2,750          │
│ 2  | ...  | ...      | ...        | Budowa    | 30k      | 1,650          │
│ Suma dla stawki 5.5%:                         | 80k      | 4,400          │
└───────────────────────────────────────────────┘
```

**File:** `src/modules/accounting/components/KPiRView.tsx`

---

### ✅ 3. Posting Function - Enforces Category

**Updated:** `post_to_jdg_register(invoice_id)`

**Key Changes:**
```sql
-- CRITICAL: Invoice must have category
IF v_invoice.ryczalt_category_id IS NULL THEN
  RETURN jsonb_build_object(
    'success', FALSE, 
    'error', 'MISSING_CATEGORY',
    'message', 'Wybierz kategorię przychodu dla ryczałtu'
  );
END IF;

-- Get category and use its rate
SELECT * INTO v_category FROM ryczalt_revenue_categories 
WHERE id = v_invoice.ryczalt_category_id;

v_rate := v_category.rate; -- Use category rate, not profile rate

-- Snapshot both category and rate
INSERT INTO jdg_revenue_register_lines (
  ...
  ryczalt_rate, -- Snapshot
  category_id,
  category_name, -- Snapshot
  ...
);

-- Also snapshot rate on invoice for history
UPDATE invoices SET ryczalt_rate = v_rate WHERE id = p_invoice_id;
```

**Migration:** `add_ryczalt_category_to_invoices`

---

## Next Steps (TODO)

### 1. Invoice Form - Category Selection

**Need to add to invoice creation form:**
```tsx
// For JDG ryczałt income invoices only
{isJdgRyczalt && transactionType === 'income' && (
  <FormField name="ryczalt_category_id">
    <FormLabel>Kategoria przychodu (ryczałt)</FormLabel>
    <Select>
      <SelectTrigger>Wybierz kategorię</SelectTrigger>
      <SelectContent>
        {ryczaltCategories.map(cat => (
          <SelectItem value={cat.id}>
            {cat.name} ({cat.rate}%)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    <FormDescription>
      Stawka ryczałtu zależy od rodzaju usługi/produktu
    </FormDescription>
  </FormField>
)}
```

**Files to Update:**
- `src/modules/invoices/screens/InvoiceForm.tsx` (or equivalent)
- Load categories from `ryczalt_revenue_categories`
- Save `ryczalt_category_id` with invoice

---

### 2. Category Management UI (Optional, Later)

**Allow users to manage their own categories:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Kategorie przychodów (ryczałt)</CardTitle>
  </CardHeader>
  <CardContent>
    <CategoryList>
      {categories.map(cat => (
        <CategoryRow>
          <Name>{cat.name}</Name>
          <Rate>{cat.rate}%</Rate>
          <PKD>{cat.pkd_hint}</PKD>
          <Actions>
            <Edit />
            <Delete />
          </Actions>
        </CategoryRow>
      ))}
    </CategoryList>
    <Button>Dodaj kategorię</Button>
  </CardContent>
</Card>
```

**For now:** Use system-provided categories (already seeded):
- Usługi IT i programowanie (12%)
- Usługi doradcze i konsultingowe (8.5%)
- Usługi medyczne (5.5%)
- Handel (3%)
- Usługi inne (5.5%)

---

## Data Flow

### Creating Invoice (JDG Ryczałt)

```
1. User creates income invoice
2. Form shows: "Kategoria przychodu (ryczałt)" dropdown
3. User selects: "Budowa mieszkalna (5.5%)"
4. Invoice saved with:
   - ryczalt_category_id = <category-uuid>
   - ryczalt_rate = NULL (not set yet)
```

### Posting to Register

```
1. Call: post_to_jdg_register(invoice_id)
2. Function checks: ryczalt_category_id exists? ✓
3. Loads category: rate = 5.5%
4. Calculates: tax = 50,000 × 5.5% = 2,750 PLN
5. Inserts register line:
   - ryczalt_rate = 5.5% (snapshot)
   - category_name = "Budowa mieszkalna" (snapshot)
   - ryczalt_tax_amount = 2,750
6. Updates invoice:
   - ryczalt_rate = 5.5% (snapshot for history)
   - accounting_status = 'posted'
```

### Viewing KPiR

```
1. Load all register lines for year
2. Group by ryczalt_rate
3. Show sections:
   - Stawka 3%: 5 invoices, 25k revenue, 750 tax
   - Stawka 5.5%: 12 invoices, 120k revenue, 6.6k tax
   - Stawka 8%: 3 invoices, 20k revenue, 1.6k tax
4. Total: 20 invoices, 165k revenue, 8.95k tax
```

---

## Why Snapshots?

**Problem:** What if category rate changes?

**Example:**
- Jan 2026: "Usługi IT" = 12%
- Invoice created Jan 15, 2026 with 12% rate
- Feb 2026: Government changes rate to 14%
- Category updated to 14%

**Without snapshots:** Historical invoice would show 14% (wrong!)

**With snapshots:**
- `jdg_revenue_register_lines.ryczalt_rate = 12%` (immutable)
- `invoices.ryczalt_rate = 12%` (immutable)
- Audit trail preserved
- Tax office can verify: "This invoice was correctly taxed at 12% on that date"

---

## Testing Checklist

### Test Category Assignment
- [ ] Create JDG profile with ryczałt
- [ ] Create income invoice
- [ ] Verify category dropdown appears
- [ ] Select category (e.g., "Handel 3%")
- [ ] Save invoice
- [ ] Verify `ryczalt_category_id` saved

### Test Posting with Category
- [ ] Post invoice to register
- [ ] Verify register line created
- [ ] Verify `ryczalt_rate` = 3% (from category)
- [ ] Verify `category_name` = "Handel" (snapshot)
- [ ] Verify tax calculated correctly

### Test Missing Category
- [ ] Create invoice without category
- [ ] Try to post
- [ ] Verify error: "MISSING_CATEGORY"
- [ ] Verify invoice status = 'needs_review'

### Test KPiR Grouping
- [ ] Create 3 invoices with different rates (3%, 5.5%, 8%)
- [ ] Post all to register
- [ ] View KPiR
- [ ] Verify 3 separate sections
- [ ] Verify summary cards show correct totals per rate
- [ ] Verify subtotals match

### Test Rate Change (Snapshot)
- [ ] Create invoice with category (rate 12%)
- [ ] Post to register
- [ ] Change category rate to 14%
- [ ] View register line
- [ ] Verify still shows 12% (snapshot preserved)

---

## Summary

**Fixed:**
- ✅ Removed single company-wide rate field
- ✅ Added category reference to invoices
- ✅ Updated posting function to enforce category
- ✅ KPiR now groups by rate
- ✅ Snapshots preserve historical rates

**Still TODO:**
- ⚠️ Add category selection to invoice form
- ⚠️ Category management UI (optional)

**Impact:**
- Correct tax calculation per revenue type
- Proper separation in KPiR book
- Audit-proof with snapshots
- Matches Polish tax law requirements

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-19  
**Status:** Core model fixed, invoice form integration pending
