# Ewidencja Przychodów - Refactor Architecture

## Core Principles

### 1. Auto-Accounting Anchored to Issue/Sale Date
**Tax Compliance First**: Revenue recognition for ryczałt is tied to the date of sale/service/issuance, NOT payment date.

**Implementation**:
- Register lines are created based on `issue_date` (or `sale_date` if different)
- Payment status is tracked separately as an overlay
- Users can see payment status badges, but accounting is independent

**Future Enhancement**:
- Add user preference: "Auto-post on issue" (default) vs "Auto-post on payment" (workflow preference)
- Clear labeling that payment-based posting is a workflow choice, not tax truth

### 2. Single-Period Workbench (Not Timeline Scroll)
**One place to work**: Each period is a self-contained workspace.

**Navigation**:
- Period Switcher: Dropdown (month + year) + arrows (◀ ▶) + "Bieżący okres" button
- No calendar wheel, no month chips, no horizontal scroll
- Clean, semantic period selection

**Period Status Strip**:
- Status badge: Do rozliczenia / Gotowe / Zamknięty / Po terminie
- Deadline: "Termin: 20 lut 2026" + "Pozostało: 31 dni"
- Primary CTA: "Napraw (X)" / "Zamknij okres" / "Zobacz protokół"

### 3. Period Workbench Layout
Each period answers 3 questions:
1. **Czy mam coś do zrobienia?** → "Do zaksięgowania" section
2. **Ile podatku i do kiedy?** → Period totals + deadline
3. **Co dokładnie składa się na sumę?** → "Zaksięgowane" section with rate groups

**Sections**:
- **Top Cards**: Przychód | Podatek ryczałt | Dokumenty (posted/total)
- **Section 1: Do zaksięgowania** (unposted invoices) - orange alert card
- **Section 2: Zaksięgowane** (posted register lines) - grouped by rate

### 4. Ryczałt Rate Chips
**Visual clarity without clutter**:
- Each invoice shows rate chip: `5.5%` / `8.5%` / `12%`
- Color-coded by rate (blue < green < yellow < orange < red)
- Optional: show category name if space allows: `5.5% Budowlanka`
- Future: `MIX` chip for item-level mixed rates (click opens breakdown)

**Rate Groups**:
- Posted invoices grouped by rate within period
- Group header shows: Rate chip + category name + account number
- Group summary: `52,940.40 zł → 2,911.72 zł` (revenue → tax)
- List of invoices in that rate bucket

### 5. Period Closure as Immutable Event
**Proper audit trail**:

**PeriodClose Event** (database table):
```sql
period_closes (
  id uuid,
  business_profile_id uuid,
  period_year int,
  period_month int,
  total_revenue numeric,
  total_tax numeric,
  rate_breakdown jsonb, -- [{rate: 5.5, revenue: X, tax: Y}, ...]
  included_register_line_ids uuid[],
  closed_by uuid,
  closed_at timestamp,
  notes text,
  status enum('closed', 'locked', 'unlocked')
)
```

**Closure Flow**:
1. Button: "Zamknij okres"
2. Modal shows validation checklist:
   - ✅ Wszystkie dokumenty zaksięgowane
   - ⚠️ Dokumenty z brakującą kategorią (if any)
   - ⚠️ Dokumenty z datą spoza okresu (if any)
3. If issues: CTA = "Napraw teraz" (filters to unposted)
4. If clean: Confirm → Create period_close event → Lock fields

**After Closing**:
- Period header shows "Zamknięty" badge
- "Zamknięto przez: X, dnia Y"
- Button: "Zobacz protokół" (opens period-close event details)
- Optional: "Odblokuj" (privileged role + requires reason → creates unlock event)

## Component Architecture

### New Components
1. **PeriodSwitcher** - Month/year dropdown + arrows + "Bieżący okres"
2. **PeriodStatusStrip** - Status badge + deadline + remaining days + primary CTA
3. **RyczaltRateChip** - Color-coded rate badge with optional category name
4. **EwidencjaPrzychodowWorkbench** - Main single-period view

### Data Flow
```
User selects period
  ↓
Load unposted invoices (issue_date in period, ryczalt_account_id IS NULL)
  ↓
Load posted register lines (occurred_at in period)
  ↓
Group posted lines by rate
  ↓
Calculate period totals
  ↓
Determine period status (pending/ready/closed/overdue)
  ↓
Render workbench
```

## Database Schema Considerations

### Current State
- `invoices.ryczalt_account_id` - Links invoice to ryczałt account
- `jdg_revenue_register_lines` - Posted register entries

### Future Enhancement (Item-Level Posting)
```sql
-- Allow different items in same invoice to have different ryczałt accounts
invoice_items (
  id uuid,
  invoice_id uuid,
  ryczalt_account_id uuid, -- Item-level override
  ...
)

-- Then register lines reference invoice_item_id instead of just invoice_id
jdg_revenue_register_lines (
  invoice_id uuid,
  invoice_item_id uuid, -- NEW: for item-level posting
  ...
)
```

**For now**: Keep invoice-level posting (simpler UX for most users).

## Implementation Status

### ✅ Completed
- PeriodSwitcher component (dropdown + arrows + "Bieżący okres")
- PeriodStatusStrip component (status + deadline + CTA)
- RyczaltRateChip component (color-coded rate badges)
- EwidencjaPrzychodowWorkbench (single-period view with sections)

### 🚧 In Progress
- Period closure flow (modal + validation + event creation)
- Unposted invoice assignment UI (assign ryczałt account)

### 📋 TODO
- Period closure event database table
- Unlock period flow (privileged + reason)
- Optional "Pokaż podatki" toggle for invoice ledger
- Quarterly/yearly period views (for reporting)
- Item-level mixed posting UI ("MIX" chip + breakdown)

## Migration Path

1. **Phase 1**: Deploy new workbench alongside old view (feature flag)
2. **Phase 2**: Migrate users to new workbench (default for new users)
3. **Phase 3**: Deprecate old calendar-based view
4. **Phase 4**: Add period closure events + audit trail
5. **Phase 5**: Item-level posting (for advanced users)

## Key UX Wins

✅ **No calendar wheel** - Simple dropdown + arrows
✅ **One place to work** - Single-period workbench
✅ **Clear next action** - "Do zaksięgowania" section with count
✅ **Tax visible where money is** - Rate groups with totals
✅ **Grandma-readable** - Status badges, clear language
✅ **Accountant-friendly** - Rate groups, period closure, audit trail
✅ **Tax-compliant** - Anchored to issue date, not payment
