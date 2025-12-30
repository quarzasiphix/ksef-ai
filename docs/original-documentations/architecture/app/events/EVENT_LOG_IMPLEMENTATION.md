# Event Log Implementation - Complete

## Overview

The Event Log accounting page has been successfully implemented, providing a comprehensive view of all company events with filtering, export capabilities, and direct navigation to related entities.

## What Was Created

### 1. EventLog Page (`src/pages/accounting/EventLog.tsx`)

A full-featured accounting page that displays the complete event chain with:

**Features:**
- ✅ Real-time event list with automatic updates
- ✅ Search functionality (searches across action summary, actor name, entity reference)
- ✅ Filter by event type (invoice_created, expense_approved, etc.)
- ✅ Filter by entity type (invoice, expense, contract, decision, employee, bank_account)
- ✅ Statistics cards showing total events and breakdown by category
- ✅ CSV export functionality
- ✅ JSON export functionality
- ✅ Clickable entity references that navigate to the actual document
- ✅ Clickable decision references that navigate to the decision
- ✅ Color-coded event badges
- ✅ Relative timestamps ("2 hours ago")
- ✅ Expandable change details
- ✅ Entity ID display for debugging/reference
- ✅ Spółka-only restriction (only available for sp. z o.o. and S.A.)

**UI Components:**
- Statistics cards (total events, invoices, expenses, decisions)
- Search bar with icon
- Type and entity filters (dropdowns)
- Export buttons (CSV and JSON)
- Event list with timeline-style layout
- Event badges with color coding
- Actor and timestamp information
- Decision reference badges (clickable)
- Entity reference buttons (clickable with navigation)
- Expandable change details

### 2. Navigation Integration

**App.tsx:**
- Added `EventLog` import
- Added route: `/accounting/event-log`
- Integrated into accounting shell routes

**AccountingSidebar.tsx:**
- Added "Dziennik zdarzeń" menu item
- Placed in "FORMALNE" section
- Shield icon for visual consistency
- Description: "Historia wszystkich działań"

### 3. Entity Navigation

The Event Log provides direct navigation to entities:

```typescript
const entityRoutes: Record<string, string> = {
  invoice: '/income',
  expense: '/expenses',
  contract: '/contracts',
  decision: '/decisions',
  employee: '/employees',
  bank_account: '/bank',
  document: '/contracts/documents',
  asset: '/assets',
  resolution: '/spolka/resolutions',
};
```

**How it works:**
1. User clicks on entity reference button (e.g., "FAK/2025/001")
2. System looks up route based on `entity_type`
3. Navigates to `{route}/{entity_id}`
4. User lands on the detail page for that entity

**Example:**
- Event: `invoice_created` with `entity_id: "abc-123"` and `entity_reference: "FAK/2025/001"`
- Click on "FAK/2025/001" button
- Navigate to `/income/abc-123`
- User sees the invoice detail page

### 4. Export Functionality

**CSV Export:**
```csv
Data,Typ zdarzenia,Akcja,Wykonawca,Decyzja,Dokument,ID dokumentu
2025-01-15 14:30:00,Utworzono fakturę,Utworzono fakturę FAK/2025/001,jan@firma.pl,DEC/2025/001,FAK/2025/001,abc-123
```

**JSON Export:**
```json
[
  {
    "id": "event-id",
    "event_type": "invoice_created",
    "action_summary": "Utworzono fakturę FAK/2025/001",
    "actor_name": "jan@firma.pl",
    "decision_reference": "DEC/2025/001",
    "entity_reference": "FAK/2025/001",
    "entity_id": "abc-123",
    "occurred_at": "2025-01-15T14:30:00Z",
    ...
  }
]
```

**Usage:**
- Click "Eksport CSV" or "Eksport JSON" button
- File downloads automatically
- Filename includes current date: `event-log-2025-01-15.csv`

## How to Use

### Accessing the Event Log

1. Navigate to Accounting section (`/accounting`)
2. Click "Dziennik zdarzeń" in the sidebar (FORMALNE section)
3. Or navigate directly to `/accounting/event-log`

**Note:** Only available for Spółki (sp. z o.o. and S.A.)

### Viewing Events

The event log displays:
- Event type badge (color-coded)
- Event number (EVT/2025/0001)
- Action summary (human-readable description)
- Actor name (who performed the action)
- Timestamp (relative and absolute)
- Decision reference (if linked to a decision)
- Entity reference (document number, name, etc.)
- Entity ID (for debugging)
- Change details (expandable)

### Filtering Events

**By Search:**
- Type in the search box
- Searches: action summary, actor name, entity reference
- Real-time filtering

**By Event Type:**
- Select from dropdown
- Options: All types, invoice_created, invoice_issued, expense_created, etc.

**By Entity Type:**
- Select from dropdown
- Options: All documents, invoices, expenses, contracts, decisions, employees, bank accounts

### Navigating to Entities

**To view the document/entity:**
1. Find the event in the list
2. Click the entity reference button (e.g., "FAK/2025/001")
3. System navigates to the entity detail page

**To view the decision:**
1. Find the event in the list
2. Click the decision reference badge (e.g., "DEC/2025/001")
3. System navigates to the decision detail page

### Exporting Data

**For CSV (Excel-compatible):**
1. Apply filters if needed
2. Click "Eksport CSV"
3. File downloads automatically
4. Open in Excel or Google Sheets

**For JSON (programmatic use):**
1. Apply filters if needed
2. Click "Eksport JSON"
3. File downloads automatically
4. Use for data analysis, backups, or integration

## Statistics Displayed

The page shows 4 key metrics:
1. **Total Events** - All events in the system
2. **Invoices** - Sum of invoice_created + invoice_issued
3. **Expenses** - Sum of expense_created + expense_approved
4. **Decisions** - Sum of decision_created + decision_approved

## Event Color Coding

Events are color-coded for quick visual identification:

- **Blue** - Decisions, bank accounts, documents
- **Green** - Approvals, hiring, payments received, assets acquired
- **Red** - Rejections, terminations, payments made, disposals
- **Purple** - Invoices, resolutions
- **Orange** - Expenses, asset disposals
- **Yellow** - Capital events
- **Indigo** - Invoice issued
- **Teal** - Contracts
- **Cyan** - Invoice exported

## Integration with Existing System

The Event Log integrates seamlessly with:

1. **Automatic Event Logging** (via database triggers)
   - Invoices: Logged on create and issue
   - Expenses: Logged on create, approve, reject

2. **Manual Event Logging** (via React hooks)
   - Use `useEventLogging` hook in components
   - Events are automatically added to the log

3. **Decision System**
   - Events show which decision authorized the action
   - Click decision reference to view decision details

4. **Entity Navigation**
   - Click entity reference to view the document
   - Supports all entity types

## Files Modified

1. **Created:**
   - `src/pages/accounting/EventLog.tsx` - Main event log page

2. **Modified:**
   - `src/App.tsx` - Added EventLog import and route
   - `src/components/accounting/AccountingSidebar.tsx` - Added navigation item

## Technical Details

**Query:**
```typescript
const { data: events } = useQuery({
  queryKey: ['company-events', businessProfileId, filterType],
  queryFn: () => getCompanyEvents(businessProfileId!, {
    limit: 500,
    eventType: filterType === 'all' ? undefined : filterType,
  }),
  enabled: !!selectedProfileId && isSpoolka,
});
```

**Statistics:**
```typescript
const { data: stats } = useQuery({
  queryKey: ['event-stats', businessProfileId],
  queryFn: () => getEventStats(businessProfileId!),
  enabled: !!selectedProfileId && isSpoolka,
});
```

**Navigation:**
```typescript
const handleEntityClick = (event: CompanyEvent) => {
  const route = entityRoutes[event.entity_type];
  if (route && event.entity_id) {
    navigate(`${route}/${event.entity_id}`);
  }
};
```

## Next Steps

The Event Log is now fully functional. To complete the event-first architecture:

1. **Add manual event logging to remaining UI flows:**
   - Contracts (when created/signed)
   - Employees (when hired/terminated)
   - Bank accounts (when added/removed)
   - Documents (when uploaded/shared)

2. **Enhance filtering:**
   - Date range filter
   - Actor filter
   - Decision filter

3. **Add event details modal:**
   - Full event information
   - Complete change history
   - Event chain visualization

4. **Create enforcement dashboard:**
   - View enforcement rules
   - See blocked actions
   - Override management

## Summary

✅ Event Log page created with full functionality
✅ Navigation integrated (sidebar + routes)
✅ Filtering by type and entity
✅ Search functionality
✅ CSV and JSON export
✅ Entity navigation (click to view document)
✅ Decision navigation (click to view decision)
✅ Statistics dashboard
✅ Color-coded events
✅ Spółka-only restriction
✅ Responsive design
✅ Real-time updates

The Event Log provides complete visibility into all company actions, making it easy for accountants and auditors to track every decision, document, and transaction with full traceability.
