# Ledger as Truth Layer - Architectural Decision

## Core Principle

**The ledger is the PRIMARY financial reality.**  
**Faktury, Wydatki, Kontrakty are FILTERED VIEWS into that reality.**

This is the mental flip that most accounting apps never make.

## Three-Layer Mental Model

### Layer 1: Documents (Intent)
Documents represent **intention**, not reality:

- **Invoice** = "I intend to get paid"
- **Expense** = "I intend to pay"
- **Contract** = "I expect future money movements"

**Documents do not move money by themselves.**

### Layer 2: Events (Truth)
Events represent **what actually happened**:

- Invoice issued
- Expense recorded
- Payment received
- Payment sent
- Adjustment
- Contract activated/completed

**This is the ledger layer. This is truth.**

### Layer 3: Cash (Reality)
Cash represents **how money actually moved**:

- Bank
- Cash
- Mixed

**This answers: did money actually move, and how?**

**Ledger lives between documents and cash.**

## What This Means Architecturally

### Before (Traditional)
```
Faktury Module → Invoice List → Invoice Detail
Wydatki Module → Expense List → Expense Detail
Bank Module → Transaction List
```

Each module is isolated. No single source of truth.

### After (Truth Layer)
```
Ledger (Events) ← PRIMARY REALITY
    ↓
    ├─ Faktury View (filtered to invoice events)
    ├─ Wydatki View (filtered to expense events)
    ├─ Bank View (filtered to cash events)
    └─ Kontrakty View (filtered to contract events)
```

**One truth. Multiple lenses.**

## How Pages Change

### Faktury Page Becomes
- Ledger filtered to "invoice-related events"
- Still looks like "Faktury"
- But internally: same ledger, just filtered

### Wydatki Page Becomes
- Ledger filtered to "expense-related events"
- Same UI patterns
- Same data source

### Bankowość Page Becomes
- Ledger filtered to "cash events"
- Shows actual money movement
- Links back to invoices/expenses

### Kontrakty Page
- Shows contract as neutral anchor event
- Embedded mini-ledger shows all related financial activity
- Answers: "Did this contract make money?"

## Ledger Page Purpose

The Ledger page answers ONE question only:

**"What actually happened with money, in time order, and why?"**

Everything else is secondary.

## Event Types in Ledger

Only these events appear in the ledger:

### Invoice-related
- Invoice issued (expected inflow)
- Invoice paid (actual inflow)

### Expense-related
- Expense recorded (expected outflow)
- Expense paid (actual outflow)

### Contract-related
- Contract signed (neutral, expectation)
- Contract milestone (neutral)
- Contract completed (neutral)

### Cash-related
- Bank inflow
- Bank outflow
- Cash inflow
- Cash outflow

### Adjustments
- Corrections
- Write-offs
- FX differences

## How Contracts Fit

Contracts do not move money, so:

- They appear as **neutral ledger events**
- They are **visually distinct** from money rows
- They act as **anchors** for related invoices

Example in ledger:
```
📄 Umowa podpisana – UMW/12/2025 – Client X
    ├─ FV/2025/01/001 issued +5,000 PLN
    ├─ Expense FK/2025/01/014 −1,200 PLN
    └─ Payment received +5,000 PLN (bank)
```

The ledger does not nest visually, but links are visible:
- "Part of contract UMW/12/2025"

## Ledger Row Anatomy

Each ledger row must answer 5 questions instantly:

### 1. When?
- Date + time
- Subtle, left-aligned

### 2. What happened?
- Verb-based label ("Faktura wystawiona", "Płatność otrzymana")

### 3. What document caused this?
- Document number
- Counterparty
- Clickable → opens document as tab

### 4. Money impact?
- +/− amount
- Color-coded:
  - Green = in
  - Red = out
  - Grey = neutral

### 5. How did money move?
- Bank / Cash badge
- Icon visible (🏦 / 💵)

## Navigation Rules

**Clicking a ledger row never navigates away.**

- It opens the document in a workspace tab
- Ledger stays visible

Mental model:
- **Ledger = map**
- **Documents = rooms**

## The One Rule

**If it does not change money or future money, it does not belong in the ledger.**  
**If it changes money, it MUST appear in the ledger.**

That rule alone will keep the system clean for years.

## Why This Is High ROI

### 1. Zero Duplication of Logic
- One data model
- One query system
- One truth source

### 2. One Mental Model for Users
- Learn ledger once
- Understand all modules
- No cognitive switching

### 3. Natural AI Reasoning
- AI can analyze timeline
- Predict cashflow
- Suggest optimizations

### 4. Massive Differentiation
Most tools:
- Show documents
- Hide reality

You:
- Show reality
- Documents explain why

## Implementation Strategy

### Phase 1: Ledger as Standalone (COMPLETED)
- ✅ Ledger types and components
- ✅ Event-centric timeline
- ✅ 5-question row anatomy
- ✅ Cash channel badges
- ✅ Contract as neutral events

### Phase 2: Refactor Existing Pages (NEXT)
- [ ] Faktury page uses ledger data source
- [ ] Wydatki page uses ledger data source
- [ ] Bank page uses ledger data source
- [ ] Shared filter/query logic

### Phase 3: Backend Integration
- [ ] Single ledger_events table
- [ ] Event generation on document actions
- [ ] Query optimization
- [ ] Real-time updates

### Phase 4: Advanced Features
- [ ] Cash vs accrual toggle
- [ ] Period comparison
- [ ] AI insights
- [ ] Predictive cashflow

## Visual Design Principles

### Dark, Calm, Analytical
- No "Windows XP white cards"
- No oversized buttons
- Typography > decoration

### The ledger must feel:
- Authoritative
- Neutral
- Analytical

Not:
- Flashy
- Playful
- Marketing-driven

## Success Criteria

When a user opens the ledger, they should feel:

1. "I finally see what actually happened"
2. "I don't need to jump between modules"
3. "This system understands accounting logic"
4. "I trust this view"

That's the goal.

## Constraint Enforcement

### What the Ledger IS NOT Allowed to Do

❌ No classic debit/credit table  
❌ No PDF-style layout  
❌ No mixing document lists with events  
❌ No reordering by amount  
❌ No pagination that breaks time continuity  

**If time continuity breaks, the ledger loses meaning.**

## Future Vision

Eventually:
- Ledger becomes the primary navigation
- Document pages become detail views
- All financial analysis starts from ledger
- AI agents reason about ledger events

The ledger is not a feature.  
**The ledger is the foundation.**
