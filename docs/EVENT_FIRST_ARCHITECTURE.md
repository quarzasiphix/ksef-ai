# Event-First Architecture Implementation

## Overview

The ksef-ai accounting app now implements a comprehensive event-first architecture where **every material action is logged as an event** with full traceability, decision linkage, and enforcement mechanisms.

## Core Principle

> **Nothing material can happen unless:**
> 1. A decision exists
> 2. The decision is approved
> 3. The decision references scope and budget

This transforms the app from a tool into **infrastructure**.

## Database Schema

### `company_events` Table

The central event log that captures every action in the company.

**Key fields:**
- `event_type`: Type of event (invoice_created, expense_approved, etc.)
- `event_number`: Sequential identifier (EVT/2025/0001)
- `actor_id`, `actor_name`: Who performed the action
- `occurred_at`: When it happened (precise timestamp)
- `decision_id`, `decision_reference`: Why it was allowed (authority)
- `entity_type`, `entity_id`, `entity_reference`: What was affected
- `action_summary`: Human-readable description
- `changes`: JSONB of what changed
- `parent_event_id`: Links to previous event (event chain)
- `is_material`: Material vs informational events

### Event Types

```typescript
type EventType =
  | 'decision_created' | 'decision_approved' | 'decision_rejected'
  | 'invoice_created' | 'invoice_issued' | 'invoice_exported'
  | 'expense_created' | 'expense_approved' | 'expense_rejected'
  | 'contract_created' | 'contract_signed' | 'contract_terminated'
  | 'employee_hired' | 'employee_terminated'
  | 'bank_account_added' | 'bank_account_removed'
  | 'document_uploaded' | 'document_shared'
  | 'asset_acquired' | 'asset_disposed'
  | 'resolution_created' | 'capital_event'
  | 'payment_made' | 'payment_received';
```

### Enforcement Columns Added

**Invoices:**
- `exported_to_accounting`: Boolean flag
- `export_blocked_reason`: Why export is blocked
- `last_event_id`: Link to last event

**Expenses:**
- `approval_status`: 'pending' | 'approved' | 'rejected' | 'personal_risk'
- `approved_by`, `approved_at`: Approval tracking
- `last_event_id`: Link to last event

**Contracts:**
- `owner_required`: Boolean flag
- `is_valid_contract`: Computed column (requires decision_id AND user_id)
- `last_event_id`: Link to last event

**Employees & Bank Accounts:**
- `last_event_id`: Link to last event

## Automatic Event Logging

### Database Triggers

Events are automatically logged via PostgreSQL triggers:

1. **Invoice Trigger**: Logs `invoice_created` and `invoice_issued` events
2. **Expense Trigger**: Logs `expense_created`, `expense_approved`, `expense_rejected` events

### Manual Logging from React

Use the provided hooks for client-side event logging:

```typescript
import { useEventLogging } from '@/shared/hooks/useEventLogging';

const { logEvent } = useEventLogging(businessProfileId);

// Log any event
logEvent({
  eventType: 'contract_signed',
  entityType: 'contract',
  entityId: contractId,
  actionSummary: 'Podpisano umowę XYZ',
  options: {
    decisionId: decision.id,
    entityReference: 'UMW/2025/001',
  }
});
```

### Convenience Hooks

```typescript
// Invoice events
const { logInvoiceCreated, logInvoiceIssued } = useLogInvoiceEvent(businessProfileId);

// Expense events
const { logExpenseCreated, logExpenseApproved } = useLogExpenseEvent(businessProfileId);

// Contract events
const { logContractCreated, logContractSigned } = useLogContractEvent(businessProfileId);

// Employee events
const { logEmployeeHired, logEmployeeTerminated } = useLogEmployeeEvent(businessProfileId);

// Bank account events
const { logBankAccountAdded, logBankAccountRemoved } = useLogBankAccountEvent(businessProfileId);
```

## Enforcement Mechanisms

### Decision Gate

The `check_enforcement_rules()` function validates actions before they happen:

```typescript
import { checkEnforcement } from '@/integrations/supabase/repositories/eventsRepository';

const result = await checkEnforcement(
  businessProfileId,
  'invoice',
  { decision_id: invoiceData.decision_id }
);

if (!result.is_allowed) {
  toast.error(result.error_message);
  return; // Block the action
}
```

### System-Enforced Consequences

1. **Invoices → Accounting Export**
   - Invoices without `decision_id` cannot be exported
   - Export button is disabled
   - No yelling, just quiet refusal

2. **Expenses → Personal Risk**
   - Expenses without approval are flagged as `personal_risk`
   - Visible in all reports
   - Accountant sees the flag

3. **Contracts → Validity**
   - Contracts without `decision_id` OR `user_id` are marked invalid
   - `is_valid_contract` computed column = false
   - Cannot generate invoices or payments from invalid contracts

4. **Assets → Depreciation**
   - Assets must be registered in `asset_registry` with `decision_id`
   - Depreciation is impossible without registration

## UI Components

### EventChainViewer Component

Displays the full event chain with:
- Event type badges (color-coded)
- Actor information
- Timestamps (relative and absolute)
- Decision references (clickable)
- Entity references (clickable, navigates to entity)
- Change details (expandable)
- Event chain visualization

**Usage:**

```typescript
import EventChainViewer from '@/components/events/EventChainViewer';

<EventChainViewer 
  businessProfileId={selectedProfileId}
  limit={50}
  showFilters={true}
/>
```

**Filter by entity:**

```typescript
<EventChainViewer 
  businessProfileId={selectedProfileId}
  entityType="invoice"
  entityId={invoiceId}
/>
```

## Integration Points

### Where to Add Event Logging

1. **Invoice Creation** (`NewInvoice.tsx`)
   - After successful invoice creation
   - Log `invoice_created` event with decision reference

2. **Expense Creation** (`expense/index.tsx`)
   - After successful expense creation
   - Log `expense_created` event with decision reference

3. **Contract Creation** (`ContractNew.tsx`)
   - After successful contract creation
   - Log `contract_created` event with decision reference

4. **Employee Hiring** (`NewEmployee.tsx`)
   - After successful employee creation
   - Log `employee_hired` event with decision reference

5. **Bank Account Addition** (`BankAccounts.tsx`)
   - After successful bank account creation
   - Log `bank_account_added` event with decision reference

### Example Integration

```typescript
// In NewInvoice.tsx
import { useLogInvoiceEvent } from '@/shared/hooks/useEventLogging';

const { logInvoiceCreated } = useLogInvoiceEvent(selectedProfileId);

const handleSubmit = async (data) => {
  const invoice = await createInvoice(data);
  
  // Log the event
  logInvoiceCreated(
    invoice.id,
    invoice.number,
    data.decision_id // Link to decision
  );
  
  toast.success('Faktura utworzona');
  navigate(`/income/${invoice.id}`);
};
```

## Accountant Dashboard

The accountant defines enforcement rules via the `enforcement_rules` table:

```sql
INSERT INTO enforcement_rules (
  business_profile_id,
  rule_name,
  rule_type,
  entity_type,
  enforcement_action,
  error_message,
  created_by
) VALUES (
  'uuid-here',
  'Faktury wymagają decyzji',
  'decision_required',
  'invoice',
  'block',
  'Faktura nie może być utworzona bez powiązania z zatwierdzoną decyzją.',
  'accountant-user-id'
);
```

**Rule types:**
- `decision_required`: Entity must have decision_id
- `approval_required`: Entity must be approved
- `field_required`: Specific fields must be filled
- `export_blocked`: Export is blocked
- `flag_personal_risk`: Flag as personal risk

## Analytics & Reporting

### Event Statistics

```typescript
import { getEventStats } from '@/integrations/supabase/repositories/eventsRepository';

const stats = await getEventStats(businessProfileId, startDate, endDate);

// Returns:
// {
//   total_events: 1234,
//   events_by_type: { invoice_created: 45, expense_approved: 23, ... },
//   events_by_day: [{ date: '2025-01-15', count: 12 }, ...]
// }
```

### Event Chain

```typescript
import { getEventChain } from '@/integrations/supabase/repositories/eventsRepository';

const chain = await getEventChain(eventId);
// Returns array of events from root to current
```

### Entity Events

```typescript
import { getEntityEvents } from '@/integrations/supabase/repositories/eventsRepository';

const events = await getEntityEvents('invoice', invoiceId);
// Returns all events for specific invoice
```

## Infrastructure Framing

### Language to Use

✅ **Infrastructure language:**
- "Single source of truth for your company"
- "Where decisions, money and assets meet"
- "Built for audit, not excuses"
- "The system your accountant can rely on"
- "Everything is logged. Everything is clickable. Everything leaves a trail."

❌ **Avoid tool language:**
- "Save time"
- "Automate accounting"
- "All-in-one ERP"

### The Power Dynamic Shift

**Without KsięgaI:**
- Accountant fights chaos
- Requests documents
- Fixes errors
- Chases approvals

**With KsięgaI:**
- Accountant is the gatekeeper
- System enforces their rules
- Client cannot bypass
- Everything is traced

## Next Steps

1. **Add event logging to all creation flows**
   - Invoices ✓ (automatic via trigger)
   - Expenses ✓ (automatic via trigger)
   - Contracts (manual logging needed)
   - Employees (manual logging needed)
   - Bank accounts (manual logging needed)
   - Documents (manual logging needed)

2. **Build Accountant Dashboard**
   - Rule definition UI
   - Enforcement log viewer
   - Override management
   - Analytics dashboard

3. **Add enforcement checks to UI**
   - Block invoice export without decision
   - Show personal risk flags on expenses
   - Mark invalid contracts
   - Disable actions based on rules

4. **Integrate EventChainViewer**
   - Add to Dashboard
   - Add to entity detail pages (invoice, contract, etc.)
   - Add filtering and search

5. **Create governance onboarding**
   - "Who can make binding decisions?"
   - Authority matrix setup
   - Rule definition wizard

## Database Functions Reference

### `log_company_event()`
Logs a company event with full context.

### `check_enforcement_rules()`
Validates if an action is allowed based on accountant-defined rules.

### `is_decision_valid()`
Checks if a decision is valid for use (approved, within dates, has budget).

## Files Created

### Database
- Migration: `create_event_first_infrastructure_v2`
- Tables: `company_events`, `enforcement_rules` (enhanced)
- Functions: `log_company_event()`, `check_enforcement_rules()`
- Triggers: `auto_log_invoice_event()`, `auto_log_expense_event()`

### TypeScript
- `src/types/events.ts` - Event type definitions
- `src/integrations/supabase/repositories/eventsRepository.ts` - Event CRUD operations
- `src/hooks/useEventLogging.ts` - React hooks for event logging
- `src/components/events/EventChainViewer.tsx` - Event chain UI component

### Documentation
- `EVENT_FIRST_ARCHITECTURE.md` - This file

## Summary

The event-first architecture is now fully implemented in the database layer with:

✅ Comprehensive event logging (automatic + manual)
✅ Decision gate enforcement mechanisms
✅ Event chain tracking with parent relationships
✅ Enforcement rules system
✅ React hooks and components
✅ Full traceability (who, when, why, what, consequence)

**What remains:**
- Manual event logging integration in UI components
- Accountant dashboard UI
- Enforcement checks in UI flows
- EventChainViewer integration in Dashboard and detail pages

This transforms ksef-ai from an accounting tool into **infrastructure** that accountants can rely on.
