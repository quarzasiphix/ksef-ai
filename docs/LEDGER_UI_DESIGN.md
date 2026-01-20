# Ledger UI Design System
## Mental Model Transformation

### From: Filtered Table → To: Chronological Ledger

**Old Mental Model (Bad)**
"This is a filtered table of invoices for a selected period."

**New Mental Model (Good)**
"This is a chronological income/expense ledger, grouped by periods, with summaries."

---

## Core Design Principles

### 1. Default View: Grouped List (Not Filtered List)

**Default State (No Filters Applied)**
- Show ALL income/expenses
- Grouped by month
- Months sorted newest → oldest
- Each month is a collapsible group
- Inline summaries per group

**Example Structure:**
```
▼ Styczeń 2026
   SUMA: 31 000,00 zł
   ─────────────────────────────
   F/1/26/1   Anna Kopacka        9 000,00 zł
   F/1/26/2   Adam Frąca         15 000,00 zł
   F/1/26/3   Firma XYZ          7 000,00 zł

▶ Grudzień 2025
   SUMA: 180 980,00 zł

▶ Listopad 2025
   SUMA: 55 735,60 zł
```

### 2. Period Navigation (Not Calendar Selector)

**Remove:**
- Date picker
- "zakres dat" dropdown as primary control

**Replace With: Period Navigator (Notion-style)**
```
Okresy przychodów
[ 2026 ] [ 2025 ] [ 2024 ]
```

**Behavior:**
- Clicking a year expands months inline
- No modal, no calendar grid
- Zero friction navigation

**Optional Enhancements:**
- Keyboard shortcuts for power users
- "Collapse all / Expand all" toggle

### 3. Sum Placement (Critical)

**Wrong:** "Suma wyświetlonych" floats randomly, disconnected from structure

**Correct:** Each group header owns its sum

**Month Header Layout:**
```
Styczeń 2026                    31 000,00 zł
──────────────────────────────────────────
```

**Design Rules:**
- Same column as prices
- Slightly muted, not shouting
- Consistent alignment
- Matches: Notion, bank apps, accounting registers

### 4. Row Layout (Correct Hierarchy)

**Wrong Layout:**
```
[ actions ]              [ PRICE ]
```

**Correct Layout:**
```
[ MAIN INFO ]     [ PRICE ]     [ ••• ]
```

**Rules:**
- Price is the anchor (right-aligned in its column)
- Actions are tertiary (only show on hover/focus)
- Main info takes primary space

### 5. Price Typography (Accounting-Grade)

**Requirements:**
- Tabular numerals (monospace digits)
- Medium weight
- Aligned decimals
- Slightly muted currency symbol

**Example:**
```
9 000,00 zł   ✓ Correct
€9,000.00     ✗ Wrong (fintech hype)
```

**Goal:**
- Accountant calm
- Not fintech hype
- Not dashboard "metrics"

### 6. Row Content (Reduce Visual Noise)

**Each Row Shows Only:**
- Document number
- Counterparty (short name)
- Status (paid / overdue)
- Amount

**Remove / De-emphasize:**
- Repeated "Bez VAT"
- Redundant icons
- Secondary metadata (unless expanded)

**Optional:**
- Click row → right-side detail drawer
- Do not overload list rows

### 7. Filters: Inverted Logic (Power Users Only)

**Current Problem:**
- Filters always visible
- Visually loud
- Feel mandatory

**New Rule:**
Filters are optional tools, not structure.

**Default State:**
Filters collapsed behind: `Filtry ▼`

**Filter Panel (Advanced):**
- Status
- VAT / non-VAT
- Contractor
- Amount range
- Accounting state

**Result:**
- Grandma → safe
- Accountant → powerful
- UI → calm

### 8. Tabs: Rethink or Demote

**Current Tabs:**
- Wszystkie
- Faktury VAT
- Rachunki

These are data types, not views.

**Better Options:**
- Move into filters
- Or keep as subtle chips inside filter panel

**If You Keep Them:**
- Visually lighter
- Secondary hierarchy
- Never above the list title

### 9. Notion Inspiration (What to Copy, What NOT to)

**Copy from Notion:**
- ✓ Grouping by date
- ✓ Collapsible sections
- ✓ Inline sums
- ✓ Calm spacing
- ✓ Predictable structure

**Do NOT Copy:**
- ✗ Infinite toggles
- ✗ Excessive icons
- ✗ Nested property chaos

**Remember:** You are building accounting software, not a notes app.

---

## UX Principles Summary

**The income/expense list should behave like a chronological ledger, grouped by accounting periods, with inline summaries and minimal controls by default.**

**Filters and actions should be hidden until needed.**

**The list should feel calm, predictable, and accountant-grade, inspired by Notion's grouped database views.**

---

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Group invoices by month (newest first)
- [ ] Collapsible month sections
- [ ] Inline sum per month in header
- [ ] Remove calendar selector
- [ ] Add period navigator (year buttons)

### Phase 2: Row Design
- [ ] Swap price ↔ actions (price right, actions on hover)
- [ ] Apply accounting-grade typography to prices
- [ ] Simplify row content (remove noise)
- [ ] Tabular numerals for amounts

### Phase 3: Filters & Navigation
- [ ] Collapse filters by default
- [ ] Move tabs to filter panel or demote visually
- [ ] Add "Collapse all / Expand all"
- [ ] Keyboard shortcuts (optional)

### Phase 4: Polish
- [ ] Consistent spacing (Notion-like)
- [ ] Hover states for actions
- [ ] Detail drawer on row click (optional)
- [ ] Mobile responsiveness

---

## Technical Notes

### Grouping Logic
```typescript
// Group invoices by year-month
const groupedByMonth = invoices.reduce((acc, invoice) => {
  const date = new Date(invoice.issueDate);
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (!acc[key]) acc[key] = [];
  acc[key].push(invoice);
  return acc;
}, {} as Record<string, Invoice[]>);

// Sort months newest → oldest
const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));
```

### Sum Calculation
```typescript
const monthSum = groupedByMonth[monthKey].reduce((sum, inv) => 
  sum + (inv.totalGrossValue || 0), 0
);
```

### Collapsible State
```typescript
const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
  new Set([sortedMonths[0]]) // Default: expand current month only
);
```

---

## Visual Reference

### Header Hierarchy
```
┌─────────────────────────────────────────────────────┐
│ Centrum kontroli przychodów                         │
│ Zarządzaj fakturami przychodowymi...                │
│                                                      │
│ Okresy przychodów                                   │
│ [ 2026 ] [ 2025 ] [ 2024 ]                         │
└─────────────────────────────────────────────────────┘
```

### Month Group
```
┌─────────────────────────────────────────────────────┐
│ ▼ Styczeń 2026                    31 000,00 zł     │
│ ─────────────────────────────────────────────────── │
│   F/1/26/1  Anna Kopacka           9 000,00 zł  ••• │
│   F/1/26/2  Adam Frąca            15 000,00 zł  ••• │
│   F/1/26/3  Firma XYZ              7 000,00 zł  ••• │
└─────────────────────────────────────────────────────┘
```

### Collapsed Month
```
┌─────────────────────────────────────────────────────┐
│ ▶ Grudzień 2025                  180 980,00 zł     │
└─────────────────────────────────────────────────────┘
```

---

## Applies To

- **Income List** (`IncomeList.tsx`)
- **Expense List** (`ExpenseList.tsx`)

Both should follow identical patterns for consistency.
