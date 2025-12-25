# Financial Ledger Implementation Guide

## Overview
The Financial Ledger is a human-readable, document-aware timeline that answers: **"What actually happened with money in this company — in what order, and why?"**

This is not a replacement for invoices or expenses pages. It's the **truth layer** that connects all financial events with causality.

## Mental Model

### What the Ledger IS
- A chronological stream of financial events
- A unified view of income, expenses, payments, adjustments
- A bridge between accounting logic and document UX
- Activity feed + accounting brain

### What the Ledger IS NOT
- A PDF list
- A raw debit/credit table
- A classic accountant-only ledger with cryptic columns

### Core Principle
Every entry represents: **Financial Event = (Document + Money Direction + Context)**

## Five-Layer Structure

Each ledger row contains five layers of meaning:

### Layer 1: Time
- Exact date and time
- Primary sort key (chronological order)
- Format: "20 Gru" + "14:30"

### Layer 2: Event Type
Visual, instantly recognizable:
- 📄 Invoice issued (incoming)
- 💸 Expense added (outgoing)
- ✅ Payment received (incoming)
- 📤 Payment sent (outgoing)
- 📋 Contract signed (neutral)
- ⚙️ Adjustment (neutral)

Color-coded icons:
- Green: Incoming money
- Red: Outgoing money
- Blue: Neutral events

### Layer 3: Document Identity
Always shows:
- Document type (Invoice / Expense / Contract)
- Document number or name
- Counterparty (who / what)

Example: "FV/2024/12/001 • ABC Sp. z o.o."

### Layer 4: Money Effect
- `+12,000 PLN` (income, green)
- `−2,400 PLN` (expense, red)
- Neutral (no amount shown)

Alignment and color matter:
- Incoming = right-aligned, green, positive
- Outgoing = left-aligned, red, negative

### Layer 5: Contextual Links
Shows relationships:
- "Linked to invoice FV/2025/12/003"
- "Part of contract Umowa 12/2025"
- "Settles expense X"

Answers: **"Why does this exist?"**

## Components Created

### 1. Type Definitions
**Location**: `src/modules/accounting/types/ledger.ts`

**Key Types**:
```typescript
LedgerEvent {
  timestamp, date
  eventType, eventLabel
  documentType, documentId, documentNumber
  counterparty
  amount, currency, direction
  linkedDocuments[]
  status, notes
}

LedgerFilters {
  startDate, endDate
  documentTypes[], eventTypes[]
  counterparty, contractId
  status, minAmount, maxAmount
}
```

### 2. LedgerEventRow Component
**Location**: `src/modules/accounting/components/LedgerEventRow.tsx`

**Features**:
- Clickable row opens document as workspace tab
- 5-layer visual structure
- Color-coded by money direction
- Hover reveals linked documents
- Status indicators (completed/pending/cancelled)

**Visual Style**:
- `hover:bg-white/[0.02]` - Subtle hover state
- Icon in colored container (10x10 rounded)
- Tabular numbers for amounts
- Truncated text with ellipsis

### 3. FinancialLedger Component
**Location**: `src/modules/accounting/components/FinancialLedger.tsx`

**Features**:
- Full ledger view with summary cards
- Search by document number, counterparty, event type
- Filters: document type, status, date range
- Summary: total incoming, outgoing, net position
- Export functionality (placeholder)

**Layout**:
- Header with title and export button
- 3 summary cards (incoming, outgoing, net)
- Filter bar with search and dropdowns
- Event count
- Scrollable timeline

### 4. MiniLedger Component
**Location**: `src/modules/accounting/components/MiniLedger.tsx`

**Purpose**: Embedded timeline for document pages

**Features**:
- Shows events related to specific document
- "Open in ledger" link to full view
- Compact, focused display
- Auto-hides if no events

**Integration Points**:
- Invoice detail pages
- Expense detail pages
- Contract detail pages

### 5. LedgerPage
**Location**: `src/modules/accounting/screens/LedgerPage.tsx`

**Features**:
- Full-page ledger view
- Back button navigation
- Filter state management
- Uses mock data (TODO: backend integration)

## Navigation Behavior

**Ledger is NOT modal. Ledger is NOT a dead list.**

### Click Behavior
1. User clicks ledger row
2. Document opens in workspace tab
3. Ledger remains visible (navigation spine)
4. User can return to ledger or continue exploring

**Think**: Ledger = map, Documents = rooms

## Integration with Document Pages

### Invoice Page Integration
Shows:
- "View in ledger" action (button/link)
- Mini embedded ledger filtered to this invoice
- All expenses + payments related to it
- In correct chronological order

**Reinforces causality**: User sees the full story

### Expense Page Integration
Shows:
- Parent invoice (mandatory link)
- Ledger snippet showing:
  - When invoice was created
  - When this expense was added
  - When it was paid

**Expense never feels orphaned**

### Contract Page Integration
Shows:
- All invoices linked to contract
- All expenses under contract
- Payment timeline
- Contract value vs actual spend

## Filtering System

**Non-destructive filtering** - never breaks chronological order, only hides rows.

### Available Filters
1. **Period**: Start date, end date
2. **Document type**: Invoice, Expense, Contract, Payment
3. **Event type**: Issued, Paid, Added, Sent, etc.
4. **Counterparty**: Search by name
5. **Status**: Paid, Unpaid, All
6. **Amount range**: Min, max

### Filter Behavior
- Filters combine with AND logic
- Search uses OR across fields
- Results always chronological
- Count updates in real-time

## Data Model

### Current (Mock Data)
```typescript
generateMockLedgerEvents() → LedgerEvent[]
getMockLedgerEventsForInvoice(id) → LedgerEvent[]
getMockLedgerEventsForExpense(id) → LedgerEvent[]
```

### Future (Backend)
```sql
-- Ledger events table
CREATE TABLE ledger_events (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  document_type TEXT NOT NULL,
  document_id UUID NOT NULL,
  document_number TEXT NOT NULL,
  counterparty TEXT NOT NULL,
  amount DECIMAL(15,2),
  currency TEXT,
  direction TEXT,
  linked_documents JSONB,
  status TEXT,
  notes TEXT,
  business_profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ledger_timestamp ON ledger_events(timestamp DESC);
CREATE INDEX idx_ledger_document ON ledger_events(document_type, document_id);
CREATE INDEX idx_ledger_business ON ledger_events(business_profile_id);
CREATE INDEX idx_ledger_links ON ledger_events USING gin(linked_documents);
```

### Event Generation Strategy
Events are generated from:
1. **Invoice created** → `invoice_issued` event
2. **Invoice paid** → `invoice_paid` + `payment_received` events
3. **Expense added** → `expense_added` event
4. **Expense paid** → `expense_paid` + `payment_sent` events
5. **Contract signed** → `contract_signed` event
6. **Adjustment made** → `adjustment` event

**Important**: Events are immutable. Corrections create new adjustment events.

## Why This Solves "Invoices Feel Plain"

### Before
- Invoices = static objects
- Expenses = separate module
- User mentally connects dots
- No visible causality

### After
- Invoice = node in a story
- Expenses feel inevitable, not optional
- Profit/loss becomes obvious
- Causality is visual

**Massively increases perceived intelligence of the system**

## High ROI Benefits

### 1. Better UX with Fewer Screens
- One view shows everything
- No jumping between modules
- Context always visible

### 2. Stronger AI Reasoning
- AI can analyze timeline
- Suggest optimizations
- Predict cashflow

### 3. Easier Audit Explanations
- "Show me what happened in Q4"
- One timeline, complete story
- Export for accountant

### 4. Natural KSeF Alignment
- KSeF events map to ledger events
- Sync status visible
- Compliance tracking

### 5. Future Accounting Exports
- Generate JPK from ledger
- Cash vs accrual views
- Period closing

### 6. Competitive Differentiation
- Most tools don't do this well
- Human-readable accounting timeline
- That's rare

## Implementation Roadmap

### Phase 1: Foundation (COMPLETED)
- ✅ Type definitions
- ✅ LedgerEventRow component
- ✅ FinancialLedger component
- ✅ MiniLedger component
- ✅ Mock data generator
- ✅ LedgerPage
- ✅ Integration into invoice detail

### Phase 2: Backend Integration (2-3 days)
- [ ] Create ledger_events table
- [ ] Event generation triggers
- [ ] Query functions for filtering
- [ ] Real-time event creation
- [ ] Link resolution logic

### Phase 3: Full Integration (2 days)
- [ ] Add to expense detail pages
- [ ] Add to contract detail pages
- [ ] Add to sidebar navigation
- [ ] Keyboard shortcuts (⌘L for ledger)
- [ ] Deep linking to specific events

### Phase 4: Advanced Features (1 week)
- [ ] Cash vs accrual toggle
- [ ] Period comparison
- [ ] Export to Excel/PDF
- [ ] AI insights panel
- [ ] Predictive cashflow

### Phase 5: Polish (3 days)
- [ ] Performance optimization
- [ ] Infinite scroll for large datasets
- [ ] Advanced filters modal
- [ ] Saved filter presets
- [ ] User preferences

## Usage Examples

### Example 1: Income Invoice with Related Expenses
```
Timeline:
1. 15 Gru 10:30 - Faktura wystawiona → FV/2024/12/001 • ABC Sp. z o.o. → +12,000 PLN
2. 14 Gru 14:15 - Koszt dodany → FK/2024/12/045 • Google Ads → −2,400 PLN
   └─ Linked to: FV/2024/12/001
3. 12 Gru 09:45 - Płatność otrzymana → PAY-001 • ABC Sp. z o.o. → +12,000 PLN
   └─ Settles: FV/2024/12/001
```

**User sees**:
- Invoice issued for 12k
- Related marketing cost of 2.4k
- Payment received
- **Net profit visible**: ~9.6k PLN

### Example 2: Contract with Multiple Invoices
```
Timeline:
1. 01 Lis 11:00 - Umowa podpisana → UMW/2024/11 • Tech Solutions
2. 15 Lis 10:30 - Faktura wystawiona → FV/2024/11/001 → +5,000 PLN
   └─ Part of: UMW/2024/11
3. 15 Gru 10:30 - Faktura wystawiona → FV/2024/12/001 → +5,000 PLN
   └─ Part of: UMW/2024/11
4. 20 Gru 09:45 - Płatność otrzymana → +10,000 PLN
   └─ Settles: FV/2024/11/001, FV/2024/12/001
```

**User sees**:
- Contract signed
- Two invoices issued under contract
- Payment received for both
- **Contract value vs actual**: 10k/10k

## Technical Notes

### Performance Considerations
- Paginate events (50 per page)
- Virtual scrolling for large datasets
- Index on timestamp for fast sorting
- Cache filter results
- Debounce search input

### Accessibility
- Keyboard navigation (↑↓ arrows)
- Screen reader labels for icons
- Focus management on navigation
- ARIA labels for status indicators
- High contrast mode support

### Responsive Design
- Desktop: Full 5-layer display
- Tablet: Compact 3-layer (time, event, amount)
- Mobile: Stacked cards, swipe for details

### Print Support
- Hide filters and search
- Show all events (no pagination)
- Black and white friendly
- Page breaks between months

## Success Metrics

Track these to measure impact:

1. **Adoption**: % of users who visit ledger page
2. **Engagement**: Average time on ledger page
3. **Navigation**: % of document opens from ledger
4. **Satisfaction**: User feedback on "understanding money flow"
5. **Efficiency**: Time to answer "what happened in Q4?"

**Target**: 60% of active users visit ledger within first month

## Future Enhancements

### AI-Powered Insights
- "You spent 30% more on marketing this month"
- "Invoice FV/001 is overdue by 15 days"
- "Contract UMW/05 is 80% complete"

### Predictive Cashflow
- "Based on history, expect +15k next week"
- "Warning: 3 invoices due next month"
- "Suggested payment schedule"

### Collaboration
- Comments on events
- @mentions for team members
- Approval workflows
- Audit trail

### Integrations
- Bank sync → auto-create payment events
- KSeF sync → auto-create invoice events
- Accounting software export
- Tax filing automation

## Conclusion

The Financial Ledger transforms the app from a collection of isolated documents into a **connected financial narrative**. It's the truth layer that makes causality visible and decision-making faster.

This is a rare feature in accounting software. Most tools treat documents as static objects. We're treating them as **events in a story**.

That's the competitive advantage.
