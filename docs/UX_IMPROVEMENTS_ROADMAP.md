# UX Improvements Roadmap

## Philosophy
Transform from "accounting tool" into "decision system" by linking entities, reducing cognitive load, and adding meaning layers without adding noise.

## High-ROI Improvements (Prioritized)

### 1. Financial Threads (HIGHEST ROI)
**Problem**: Invoices, expenses, bank transactions, and contracts exist in isolation. Users think in flows, not modules.

**Solution**: Contextual relationship panel on detail pages
- Right-side panel showing related entities
- Manual linking initially, AI suggestions later
- Opens related items as tabs (no navigation away)

**Implementation**:
- Component: `FinancialThreadsPanel.tsx`
- Shows: Related expenses, bank transactions, contracts
- Visual: Clickable chips with icons and counts
- Data: Start with manual `relations` field on entities

**ROI**: Transforms app from record-keeping to decision-making tool

---

### 2. Sidebar Modes (MASSIVE CLARITY WIN)
**Problem**: Sidebar mixes 3 mental models (money flow, legal structure, operations) causing cognitive overload.

**Solution**: Collapsible top-level modes
- **Finanse**: Invoices, Expenses, Bank, Cash
- **Dokumenty**: Contracts, Decisions, Registry
- **Operacje**: Clients, Products, Employees
- **Analiza**: Reports, KPIs
- **Ustawienia**: Collapsed by default

**Behavior**:
- Only one mode expanded at a time
- Others auto-collapse
- Reduces visual noise dramatically

**ROI**: Massive usability improvement for non-accountants

---

### 3. Meaning Layers on Invoice Rows
**Problem**: Invoices are visually clean but flat. Users open them just to check status.

**Solution**: Add secondary signals without noise
- **Cost ratio indicator**: ●●●○ (visual dots showing expense ratio)
- **Cashflow impact label**: 
  - 🟢 Positive (paid, profitable)
  - 🟡 Neutral (pending)
  - 🔴 Locked (issues)
- **Timeline hint**: Issued → Paid → Booked (mini progress)

**ROI**: Users get instant intuition without opening invoices

---

### 4. Contextual Peek Panel (Split View Lite)
**Problem**: Users need to check related data without losing context.

**Solution**: Slide-in panel (not full split screen)
- Hover/click "Powiązane koszty" on income list
- Shows filtered expenses in slide-in
- Same pattern as Documents sidebar
- No navigation, stays in flow

**Use Cases**:
- Income list → peek at related expenses
- Contract → peek at invoices
- Client → peek at products/contracts

**ROI**: Keeps users in flow state

---

### 5. Next Action Concept
**Problem**: Users browse aimlessly instead of acting purposefully.

**Solution**: Show 1-3 contextual actions (never more)
- Dashboard: "Najbliższe działania"
- Module headers: Context-specific actions
- Examples:
  - "3 invoices unpaid → review"
  - "2 expenses not booked"
  - "Contract missing for revenue"

**Key Rule**: Max 3 items, otherwise hide

**ROI**: Users log in with purpose

---

### 6. Enhanced Workspace Tab Badges
**Problem**: Tab status is binary (active/inactive). Need meaning-based signals.

**Solution**: Color-coded badges by meaning
- 🔴 Red = Risk (unpaid, overdue, missing data)
- 🟡 Yellow = Attention needed (review, approval)
- 🔵 Blue = Informational (new, updated)

**Additional**:
- Auto-group by section (already implemented)
- Session restore: "Return to last working set"

**ROI**: App becomes "I can leave and come back exactly where my brain was"

---

### 7. "Why is this here?" Hover Tooltips
**Problem**: Complex screens confuse new users and non-accountants.

**Solution**: Contextual explanations on hover
- On metrics: "This number exists because..."
- On fields: "Required for legal compliance because..."
- On decisions: "This was auto-created because..."

**Benefits**:
- No tutorial needed
- No onboarding hell
- Helps decision-makers understand context

**ROI**: Reduces support burden, increases confidence

---

## What NOT to Add (Subtraction = Progress)

❌ More filters everywhere  
❌ More dashboard cards  
❌ More top-level menu items  
❌ Full split-screen layouts (too heavy)  
❌ Complex onboarding flows  

---

## Implementation Priority

### Phase 1 (Immediate - Highest ROI)
1. **Financial Threads Panel** (2-3 days)
2. **Sidebar Modes Refactor** (2 days)
3. **Meaning Layers on Invoices** (1-2 days)

### Phase 2 (High Value)
4. **Contextual Peek Panel** (2 days)
5. **Next Action Concept** (1-2 days)
6. **Enhanced Tab Badges** (1 day)

### Phase 3 (Polish)
7. **Why is this here Tooltips** (ongoing, add as needed)

---

## Success Metrics

- **Reduced clicks**: Users find related data without navigation
- **Reduced time-to-insight**: Status visible without opening records
- **Increased confidence**: Non-accountants understand context
- **Session continuity**: Users return to exact working state

---

## Technical Notes

### Data Model Changes (Minimal)
- Add `relations` field to invoices/expenses (array of entity references)
- Add `status_metadata` for timeline/impact indicators
- Add `next_actions` computed field for contextual suggestions

### UI Patterns to Reuse
- Slide-in panels (already used in Documents)
- Chip components (already styled)
- Tab system (already robust)
- Glass effect styling (already consistent)

### Performance Considerations
- Lazy load related entities
- Cache relationship queries
- Debounce peek panel triggers
