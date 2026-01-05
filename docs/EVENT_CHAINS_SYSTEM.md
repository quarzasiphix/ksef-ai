# Event Chains System ("Łańcuch zdarzeń")

## Overview

The Event Chains system implements **chains** as the primary unit of verification and workflow management. A chain represents one complete business object lifecycle (invoice, payment, reconciliation, etc.), containing multiple events that form an audit trail.

**Key Principle:** Events are audit trail items. Chains are workflow units. Verification happens on workflow states, not on individual audit items.

## Core Concepts

### 1. Chain = "One Business Story"

A chain is a timeline that represents the lifecycle of a business case:

- **Invoice chain**: draft → edits → issue → payments → posting → close
- **Cash payment chain**: recorded → approved → posted → reconciled
- **Bank transaction chain**: imported → matched → posted → reconciled

### 2. Two Important Relationships

#### Relationship 1: Object → Chain (Traceability)
Every object has a single "home chain" via `primary_chain_id`. This allows you to:
- Open invoice → see full chain timeline
- Open cash entry → see full chain timeline

#### Relationship 2: Chain ↔ Objects (Grouping)
A chain can include multiple objects via the `chain_objects` table:
- Invoice chain includes: invoice + cash payments + bank transfers + documents
- This enables reconciliation and settlement tracking

### 3. State Machine on Chains

Instead of verifying individual events, you verify the chain's current state:

**Invoice Chain States:**
- `draft` → `issued` → `paid` → `posted` → `closed`

**Cash Payment Chain States:**
- `draft` → `posted` → `closed`

The UI verifies states, not logs. Users verify:
- "Is this invoice issued correctly?"
- "Is this cash payment approved correctly?"

## Database Schema

### Tables

#### `chains`
Primary table for event chains.

```sql
- id: UUID (primary key)
- business_profile_id: UUID
- chain_type: TEXT ('invoice', 'cash_payment', 'bank_transaction', etc.)
- chain_number: TEXT (human-readable ID)
- primary_object_type: TEXT
- primary_object_id: UUID
- state: TEXT (state machine position)
- requires_verification: BOOLEAN
- required_actions: JSONB (array of action codes)
- blockers: JSONB (array of blocker codes)
- total_amount, paid_amount, remaining_amount: DECIMAL
- title: TEXT
- metadata: JSONB
```

#### `chain_objects`
Links multiple objects to a chain (many-to-many).

```sql
- id: UUID
- chain_id: UUID
- object_type: TEXT
- object_id: UUID
- role: TEXT ('primary', 'settlement', 'evidence', 'related')
- link_type: TEXT ('settles', 'corrects', 'supports')
```

#### `chain_links`
Links chains to each other (chain-to-chain relationships).

```sql
- id: UUID
- from_chain_id: UUID
- to_chain_id: UUID
- link_type: TEXT ('settles', 'corrects', 'references', 'depends_on')
- amount: DECIMAL (for settlement links)
```

#### `invoice_versions`
Version history for invoices (edit tracking).

```sql
- id: UUID
- invoice_id: UUID
- version_no: INTEGER
- snapshot_json: JSONB (full invoice state)
- changed_fields: TEXT[]
- change_summary: TEXT
```

#### `events` (updated)
Existing events table with new chain-related columns:

```sql
-- NEW COLUMNS:
- chain_id: UUID (every event belongs to one chain)
- object_type: TEXT (what object this event is about)
- object_id: UUID (which object)
- object_version_id: UUID (for versioned objects)
- causation_event_id: UUID (parent event that caused this)
```

## Key Functions

### Chain Management

```typescript
// Create a new chain
createChain({
  business_profile_id: '...',
  chain_type: 'invoice',
  primary_object_type: 'invoice',
  primary_object_id: invoiceId,
  title: 'Faktura F/004',
})

// Get or create chain for an object
getOrCreateChainForObject(
  businessProfileId,
  'invoice',
  invoiceId,
  'Faktura F/004'
)

// Update chain state
updateChainState({
  chain_id: chainId,
  new_state: 'issued',
})

// Get chain with full timeline
getChainDetail(chainId)
```

### Object Linking

```typescript
// Add payment to invoice chain
addObjectToChain({
  chain_id: invoiceChainId,
  object_type: 'cash_entry',
  object_id: cashEntryId,
  role: 'settlement',
  link_type: 'settles',
})

// Link two chains (e.g., payment settles invoice)
linkChains({
  from_chain_id: paymentChainId,
  to_chain_id: invoiceChainId,
  link_type: 'settles',
  amount: 1000.00,
  currency: 'PLN',
})
```

### Versioning

```typescript
// Create invoice version on edit
createInvoiceVersion({
  invoice_id: invoiceId,
  snapshot_json: currentInvoiceState,
  changed_fields: ['amount', 'customer_id'],
  change_summary: 'Changed amount from 1000 to 1200',
})

// Get all versions
getInvoiceVersions(invoiceId)
```

## Event Logging with Chains

When creating events, the system automatically creates or links to chains:

```typescript
await logEvent(
  businessProfileId,
  'invoice_created',
  'invoice',
  invoiceId,
  'Utworzono fakturę F/004',
  {
    occurredAt: new Date().toISOString(), // ALWAYS use full timestamp
    objectType: 'invoice',
    objectId: invoiceId,
    chainId: chainId, // Optional - auto-created if not provided
    autoCreateChain: true, // Default: true
  }
)
```

**Important:** Always use `new Date().toISOString()` for `occurredAt` to capture the exact Polish local time, not just date strings.

## UI Implementation

### List View: Show Chains, Not Events

The main "Łańcuch zdarzeń" page should display **one row per chain**:

```typescript
// Row displays:
- Title: "F/004 – Invoice lifecycle"
- Status chips: Draft → Issued → Paid
- Amounts: gross / paid / remaining
- Last activity timestamp
- Attention flags ("missing proof", "unposted")
```

Click row → opens chain drawer with timeline.

### Chain Drawer: Timeline View

The drawer has two tabs:

**Tab 1: Details**
- Current state
- Required actions
- Blockers
- Financial summary
- Verification controls

**Tab 2: Timeline**
- All events in chronological order
- Each event shows:
  - Timestamp
  - Actor
  - What changed
  - Status badge
  - Link to related objects
- Expandable "View diff" for edits

### Verification UI

Verification appears at the chain level, not per event:

```
┌─────────────────────────────────────┐
│ Next step required                  │
│                                     │
│ Approve cash payment (KP/2026/0004) │
│                                     │
│ [Approve] [Reject] [Request proof]  │
└─────────────────────────────────────┘
```

When approved, chain state updates; events remain for audit.

## Practical Workflows

### A) Invoice Lifecycle

**Events:**
1. `Utworzono fakturę` (Draft created)
2. `Zmieniono fakturę` (Edited - creates version)
3. `Wystawiono fakturę` (Issued)
4. `Zarejestrowano płatność` (Payment recorded)

**Chain state:** `draft` → `issued` → `paid` → `posted` → `closed`

**Verification:** Verify chain at "issued" state, not each edit.

### B) Cash Payment Lifecycle

**Events:**
1. `Zarejestrowano płatność gotówką` (Recorded)
2. `Zatwierdzono KP` (Approved)
3. `Zaksięgowano` (Posted)

**Chain state:** `draft` → `posted` → `closed`

**Verification:** Verify the chain step "Approve cash" once.

### C) Link Invoice ↔ Cash

```typescript
// Cash chain "settles" invoice chain
linkChains({
  from_chain_id: cashChainId,
  to_chain_id: invoiceChainId,
  link_type: 'settles',
  amount: paymentAmount,
})

// Invoice chain now shows:
- Related payments
- Remaining balance
```

## Invoice Edits: Versioning

**Rule:** You verify the latest effective version, not each edit.

**Mechanism:**
1. Each edit creates a new `invoice_version` record
2. Chain state "Issued" references the version that was issued
3. Post-issue edits either:
   - Create a correction invoice chain, OR
   - Require "re-issue" workflow

**Draft edits:** Fine, no versioning needed until issued.

**Post-issue edits:** Create correction document or re-issue.

## Required Actions & Blockers

### Required Actions (codes)
```typescript
REQUIRED_ACTIONS = {
  APPROVE_PAYMENT: 'approve_payment',
  ATTACH_PROOF: 'attach_proof',
  SET_ACCOUNTS: 'set_accounts',
  ADD_KSEF_REF: 'add_ksef_ref',
  VERIFY_AMOUNT: 'verify_amount',
  MATCH_TRANSACTION: 'match_transaction',
}
```

### Blockers (codes)
```typescript
BLOCKERS = {
  MISSING_KSEF_REF: 'missing_ksef_ref',
  MISSING_DEBIT_ACCOUNT: 'missing_debit_account',
  MISSING_CREDIT_ACCOUNT: 'missing_credit_account',
  MISSING_PROOF: 'missing_proof',
  INSUFFICIENT_BALANCE: 'insufficient_balance',
  UNMATCHED_TRANSACTION: 'unmatched_transaction',
}
```

These are stored in the chain's `required_actions` and `blockers` JSONB arrays.

## Migration Strategy

The migration automatically backfills existing data:

1. Creates chains for all existing invoices
2. Links existing events to their chains
3. Updates `primary_chain_id` on invoice records

New invoices automatically get chains created via the `create_event` RPC with `auto_create_chain: true`.

## API Reference

### Repository Functions

```typescript
// Chain CRUD
createChain(input: CreateChainInput): Promise<Chain>
getChain(chainId: string): Promise<Chain | null>
getChainByObject(objectType: string, objectId: string): Promise<Chain | null>
getChains(businessProfileId: string, filters?): Promise<ChainSummary[]>
updateChain(chainId: string, updates: Partial<Chain>): Promise<Chain>

// Chain details
getChainDetail(chainId: string): Promise<ChainDetail>
getChainTimeline(chainId: string): Promise<ChainEvent[]>

// State management
updateChainState(input: UpdateChainStateInput): Promise<void>
closeChain(chainId: string): Promise<void>
verifyChain(chainId: string, userId: string): Promise<void>

// Object linking
addObjectToChain(input: AddObjectToChainInput): Promise<string>
getChainObjects(chainId: string): Promise<ChainObject[]>

// Chain linking
linkChains(input: LinkChainsInput): Promise<string>
getChainLinks(chainId: string): Promise<ChainLink[]>

// Versioning
createInvoiceVersion(input: CreateInvoiceVersionInput): Promise<string>
getInvoiceVersions(invoiceId: string): Promise<InvoiceVersion[]>
getLatestInvoiceVersion(invoiceId: string): Promise<InvoiceVersion | null>

// Helper
getOrCreateChainForObject(...): Promise<Chain>
```

## Best Practices

1. **Always use chains for new workflows** - Don't create standalone events
2. **Use full timestamps** - `new Date().toISOString()`, not date-only strings
3. **Version on edit** - Create invoice versions for post-issue edits
4. **Link related objects** - Use `chain_objects` to group payments with invoices
5. **Update state explicitly** - Don't rely on event types to infer state
6. **Set required_actions** - Let the system guide users through workflows
7. **Use causation_event_id** - Build parent-child event hierarchies for timeline clarity

## Example: Complete Invoice Flow

```typescript
// 1. Create invoice
const invoice = await saveInvoice(invoiceData);

// 2. Create chain (auto-created by logEvent)
await logEvent(
  businessProfileId,
  'invoice_created',
  'invoice',
  invoice.id,
  `Utworzono fakturę ${invoice.number}`,
  {
    occurredAt: new Date().toISOString(),
    objectType: 'invoice',
    objectId: invoice.id,
    autoCreateChain: true,
  }
);

// 3. Get the chain
const chain = await getChainByObject('invoice', invoice.id);

// 4. Update state when issued
await updateChainState({
  chain_id: chain.id,
  new_state: 'issued',
});

// 5. Record payment
const cashEntry = await createCashTransaction({...});
await addObjectToChain({
  chain_id: chain.id,
  object_type: 'cash_entry',
  object_id: cashEntry.id,
  role: 'settlement',
  link_type: 'settles',
});

// 6. Update state when paid
await updateChainState({
  chain_id: chain.id,
  new_state: 'paid',
});

// 7. Close chain
await closeChain(chain.id);
```

## Summary

The Event Chains system provides:

✅ **Traceability** - Every object has a chain, every event belongs to a chain  
✅ **Grouping** - Multiple objects (invoice + payments) in one chain  
✅ **Versioning** - Full edit history with diffs  
✅ **State Management** - Clear workflow states instead of event interpretation  
✅ **Verification** - Verify chains, not individual events  
✅ **Timeline View** - Complete story in one place  
✅ **Reconciliation** - Link chains to track settlements  

**The one-line instruction:** Make events an audit trail, and chains the user-facing workflow timeline. Every object must have a `primary_chain_id`, and every event must include `chain_id` + `object_ref` so we can always reconstruct the full story in the drawer.
