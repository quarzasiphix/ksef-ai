# Events Module - Comprehensive Design Analysis

## Executive Summary

This document provides a complete architectural analysis of the current event system and the roadmap to transform it into a production-grade Events Module for spółka-level accounting workflows.

---

## Current State Assessment

### 1. Data Foundation ✅

**Database Layer:**
- **Primary table:** `public.events` (unified events system)
- **Migration history:**
  - `20251229_unified_events_system.sql` - Core event table with canonical event types
  - `20260103_accounting_events_triple_entry.sql` - Triple-entry extensions (hashing, attestation, closure)
- **Key fields:**
  - Economic data: `amount`, `currency`, `direction`, `occurred_at`
  - Authorization: `decision_id`, `decision_reference`
  - Accounting: `debit_account`, `credit_account`, `status`, `posted`
  - Triple-entry: `event_hash`, `bank_transaction_id`, `ksef_reference_number`, `verified`
  - Closure: `is_closed`, `period_locked`, `period_month`, `period_year`

**Repository:**
- `modules/accounting/data/unifiedEventsRepository.ts`
- `getEvents(businessProfileId, filters)` - primary query interface
- React Query key: `['unified-events', businessProfileId, filterType, entityType, entityId]`

### 2. Visualization Components

#### A. EventChainViewer (src/components/events/EventChainViewer.tsx)
**Purpose:** Reusable timeline feed for any context  
**Features:**
- Timeline cards (newest → oldest)
- Event type badges with colors
- Decision/entity reference navigation
- Actor info, timestamps
- Change logs (expandable)

**Props:**
```typescript
{
  businessProfileId: string;
  limit?: number;
  showFilters?: boolean;
  entityType?: string;  // Filter to entity class
  entityId?: string;    // Filter to single entity
}
```

**Usage patterns:**
- Global audit view (no entity filters)
- Entity timelines (invoice/contract detail pages)
- Embedded widgets (dashboard, inbox)

#### B. LedgerEventRow (modules/accounting/components/LedgerEventRow.tsx)
**Purpose:** Table row for ledger-specific views  
**Features:**
- 6-layer information architecture:
  1. Time anchor
  2. Event type icon
  3. Document identity (number, counterparty)
  4. Money effect (amount, direction)
  5. Cash channel (bank/cash/mixed)
  6. Contextual links (hover-revealed)
- Click-to-navigate to source document
- Status indicators (completed/pending/cancelled)

**Data contract:**
```typescript
interface LedgerEvent {
  timestamp: string;
  documentType: DocumentType;
  documentId: string;
  documentNumber: string;
  eventLabel: string;
  counterparty: string;
  amount: number;
  currency: string;
  direction: MoneyDirection;
  status?: string;
  cashChannel?: CashChannel;
  linkedDocuments: LinkedDocument[];
}
```

#### C. LedgerEventCard (modules/accounting/components/timeline/LedgerEventCard.tsx)
**Purpose:** Card layout for timeline views  
**Features:**
- Icon + title/subtitle
- Amount with color coding (green/red/amber)
- Status badges
- Decision reference display
- Linked documents section
- Audit hint line (recorded_at, actor, delay/backdate warnings)

**Data contract:**
```typescript
interface TimelineLedgerEvent {
  id: string;
  occurredAt: string;
  title: string;
  subtitle: string;
  amount: { value: number; currency: string };
  direction: 'in' | 'out' | 'neutral';
  source: LedgerSource;
  status: 'posted' | 'pending' | 'cancelled';
  meta?: {
    counterpartyName?: string;
    docNo?: string;
    decisionId?: string;
    decisionReference?: string;
  };
  linkedDocuments: LinkedDocument[];
  documentId: string;
  documentType: string;
}
```

#### D. AuditEventCard (modules/accounting/components/audit/AuditEventCard.tsx)
**Purpose:** Audit trail visualization (who did what when)  
**Features:**
- Timeline node with event type icon
- Event label (created/edited/approved/posted/corrected/cancelled)
- Actor info (avatar, name, role)
- Field-level changes (before → after)
- Decision linkage
- Delay warnings (>7 days)
- Backdating indicators

**Data contract:**
```typescript
interface AuditEvent {
  eventType: string;
  actionTimestamp: string;
  actorName: string;
  actorRole?: string;
  actorAvatar?: string;
  description: string;
  changes?: FieldChange[];
  metadata?: {
    decisionReference?: string;
    backdated?: boolean;
    delayDays?: number;
  };
  linkedLedgerEntryIds?: string[];
}
```

### 3. Existing Screens

#### A. EventLog (modules/accounting/screens/EventLog.tsx)
**Routes:**
- `/accounting/event-log` (Accounting shell)
- `/settings/event-log` (Settings shell)

**Features:**
- Stats cards (total events, invoices, expenses, decisions)
- Filters: search, event type, entity type
- Export: CSV, JSON
- Event cards with navigation
- Decision/entity reference links

**Current limitations:**
- No detail drawer
- No workflow actions (close, verify, link)
- No separation by workflow lens (posting vs reconciliation)
- No period closure controls

#### B. LedgerPage (modules/accounting/screens/LedgerPage.tsx)
**Route:** `/ledger`

**Features:**
- Aggregated ledger from edge function
- Timeline view with date grouping
- Audit panel (resizable, persistent width)
- Event click → open document tab
- Backward compatibility with legacy invoice/expense queries

**Architecture:**
- Fetches from `useAggregatedLedger` hook
- Transforms to `TimelineLedgerEvent[]`
- Renders via `LedgerTimelineList`
- Side panel: `AuditPanel` (shows audit trail for selected event)

**Current limitations:**
- Audit panel shows mock data (TODO: real backend)
- No event detail drawer
- No posting/closing actions
- No verification workflow

### 4. Supporting Infrastructure

**Hooks:**
- `useAggregatedLedger` - fetches ledger events from edge function
- `useOpenTab` - workspace tab navigation
- `useUnifiedEvents` - React Query wrapper for event fetching

**Types:**
- `shared/types/events.ts` - canonical event types, labels, colors, icons
- `modules/accounting/types/ledger.ts` - ledger-specific types
- `modules/accounting/types/timeline.ts` - timeline view types
- `modules/accounting/types/audit.ts` - audit trail types

**Views (database):**
- `ledger_view` (materialized) - posted events
- `inbox_view` (materialized) - pending events needing action
- `audit_log_view` - full audit trail
- `events_requiring_verification` - closed but unverified
- `events_with_attestation` - events with external proof
- `period_closure_status` - period closure stats

---

## What's Missing (Gap Analysis)

### 1. No Event Detail Drawer ❌
**Problem:** Events are view-only. No way to:
- See full context (decision → operation → event → documents)
- Take actions (close, verify, link, attach proof)
- View triple-entry proof (hash, attestation)
- Edit accounting metadata (Wn/Ma, period)

**Impact:** System is descriptive, not operational.

### 2. No Workflow Lenses ❌
**Problem:** Single "event log" view doesn't separate:
- **Timeline** (audit history, cross-domain)
- **Posting** (accounting workflow, month-end readiness)
- **Reconciliation** (verification queue, proof attachment)

**Impact:** Accountants can't efficiently work through month-end tasks.

### 3. No Policy Layer ❌
**Problem:** No enforcement of:
- Required links (invoice → operation/job for transport dept)
- Required proof (bank/KSeF attestation before closing)
- Required decisions (external commitments need mandate)
- Allowed exceptions (overhead categories)

**Impact:** Audit trail is inconsistent; users create fake links or skip governance.

### 4. No Unified Entity Search ❌
**Problem:** Linking events/documents to entities requires:
- Per-module hooks (invoices, contracts, jobs, decisions)
- Different data shapes
- Manual wiring in every UI

**Impact:** "Powiąż z..." feature is incomplete; users can't find entities to link.

### 5. No Period Close Workflow ❌
**Problem:** No structured month-end process:
- No blocker checklist (unverified events, missing links, unsigned decisions)
- No lock controls
- No export pack (CSV + hash manifest + PDFs)

**Impact:** Not "spółka-grade"; accountants can't close books cleanly.

---

## Target Architecture (Events Module)

### Phase 1: Module Structure & Routes

**New top-level nav entry:** "Zdarzenia" (or "Dziennik")

**Routes:**

#### A. Timeline — `/events/timeline`
**Purpose:** Global audit history (cross-domain)  
**Component:** `EventChainViewer` with presets  
**Filters:**
- Default: `domain IN ('accounting', 'operations', 'compliance')`
- Hide system events unless toggled
- Date range, event type, entity type

**Actions:**
- Click event → open Event Detail Drawer
- Export timeline (CSV/JSON)

#### B. Posting — `/events/posting`
**Purpose:** Accounting workflow, month-end readiness  
**View:** Table-oriented (or timeline with "posting" badge)  
**Filters:**
- `domain = 'accounting'`
- Group/sort by period (month/year)
- Status: pending/posted/closed/locked

**Columns:**
- Period, Status, Event type, Amount, Wn/Ma, Entity link, Decision link, Verified

**Actions:**
- Click row → open Event Detail Drawer
- Bulk close events
- Export period pack

#### C. Reconciliation — `/events/reconciliation`
**Purpose:** Verification queue (third entry + evidence)  
**View:** List with action affordances  
**Filters:**
- `is_closed = TRUE AND verified = FALSE`
- Missing required evidence flags

**Actions:**
- Attach proof (upload)
- Link bank transaction
- Attest with KSeF
- Verify integrity (hash check)
- Mark as verified

### Phase 2: Event Detail Drawer (Critical)

**Universal drawer** opened from:
- Event timeline cards
- Posting table rows
- Reconciliation queue
- Embedded timelines
- Notifications

**Sections (strict order):**

#### 1. Context Block
```
Event Type Badge | Status Badge
Department Badge | Period Badge (2024-01)
Actor: Jan Kowalski | 2024-01-15 14:30
```

**Fields:**
- `event_type` + label
- `status` (pending/posted/closed/locked)
- `department_id` → department name
- `period_month` / `period_year`
- `actor_name` + `occurred_at`
- `is_closed`, `period_locked` flags

#### 2. Reason Chain (Links)
```
Decision → [DEC/01/2024] ✓
Operation → [Missing - Required] ❌
Invoice → [FV/001/2024] ✓
Documents → 3 attached ✓
```

**Fields:**
- `decision_id` → clickable chip
- `entity_links` (via entity_links table) → operation/job
- `entity_id` + `entity_type` → invoice/contract/expense
- Attachments count (via documents table)

**Policy enforcement:**
- Red "Required" badge if policy demands link but missing
- Yellow "Recommended" if optional but missing

#### 3. Accounting Block (only if `domain = 'accounting'`)
```
Wn: 130 - Należności z tytułu dostaw
Ma: 700 - Przychody ze sprzedaży
Amount: 1,230.00 PLN
Description: Faktura sprzedażowa FV/001/2024
```

**Fields:**
- `debit_account` (Wn)
- `credit_account` (Ma)
- `account_description`
- `amount` + `currency`
- `direction` (incoming/outgoing/neutral)

**Actions:**
- Edit accounts (if not closed)
- Post event (mark as posted)
- Close event (lock + generate hash)
- Reopen event (if permissioned)

#### 4. Proof Block (Triple-Entry)
```
Event Hash: a3f2...9d1c [Copy] [Verify Integrity]
Bank Transaction: TX-2024-001-5432 ✓
KSeF Reference: 1234567890-20240115-A1B2C3D4 ✓
Decision PDF Hash: b7e4...2f8a ✓
Verified: Yes | 2024-01-16 10:00 | Jan Kowalski | bank_reconciliation
```

**Fields:**
- `event_hash` + verify button (calls `verify_event_integrity` RPC)
- `bank_transaction_id` + `bank_statement_hash`
- `ksef_reference_number` + `ksef_qr_code`
- `decision_pdf_hash`
- `verified`, `verified_at`, `verified_by`, `verification_method`

**Actions:**
- Copy hash
- Verify integrity (compare current vs stored hash)
- View external proof (bank statement, KSeF portal, decision PDF)

#### 5. Actions Bar
```
[Powiąż z...] [Dodaj dowód] [Zamknij zdarzenie] [Oznacz jako zweryfikowane]
```

**Actions:**
- **Powiąż z...** → Opens unified entity search picker
- **Dodaj dowód** → Opens AttachFileDialog (role: proof, auto-link to event)
- **Zamknij zdarzenie** → Calls `close_accounting_event` RPC (generates hash, locks)
- **Oznacz jako zweryfikowane** → Marks `verified = TRUE` (only if proof exists or manual allowed)
- **Utwórz zadanie naprawcze** (optional) → Creates "needs action" item for missing links/proof

**Validation:**
- Close button disabled if:
  - Required links missing (per policy)
  - Required proof missing (per policy)
  - Period already locked
- Verify button disabled if:
  - No external attestation (bank/KSeF/decision hash)
  - Already verified

### Phase 3: Supporting Infrastructure

#### A. Unified Entity Search RPC

**Function:** `search_linkable_entities`

**Signature:**
```sql
search_linkable_entities(
  business_profile_id UUID,
  department_id UUID,
  entity_type TEXT,  -- 'invoice', 'contract', 'decision', 'operation', 'job', etc.
  query TEXT,
  limit INT DEFAULT 50,
  sort TEXT DEFAULT 'recent'
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  label TEXT,           -- Primary display (e.g., "FV/001/2024")
  subtitle TEXT,        -- Secondary info (e.g., "Acme Corp • 1,230.00 PLN")
  date TIMESTAMPTZ,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  department_id UUID
)
```

**Implementation:**
```sql
-- Union across all linkable entity types
SELECT id, 'invoice' AS entity_type, number AS label, 
       counterparty || ' • ' || total_gross_value || ' ' || currency AS subtitle,
       issue_date AS date, total_gross_value AS amount, currency, status, department_id
FROM invoices
WHERE business_profile_id = $1
  AND ($2 IS NULL OR department_id = $2)
  AND ($3 IS NULL OR $3 = 'invoice')
  AND ($4 IS NULL OR number ILIKE '%' || $4 || '%' OR counterparty ILIKE '%' || $4 || '%')

UNION ALL

SELECT id, 'contract' AS entity_type, contract_number AS label,
       counterparty || ' • ' || contract_type AS subtitle,
       signed_date AS date, NULL AS amount, NULL AS currency, status, department_id
FROM contracts
WHERE business_profile_id = $1
  AND ($2 IS NULL OR department_id = $2)
  AND ($3 IS NULL OR $3 = 'contract')
  AND ($4 IS NULL OR contract_number ILIKE '%' || $4 || '%' OR counterparty ILIKE '%' || $4 || '%')

UNION ALL

SELECT id, 'decision' AS entity_type, decision_number AS label,
       title AS subtitle,
       created_at AS date, NULL AS amount, NULL AS currency, status, department_id
FROM decisions
WHERE business_profile_id = $1
  AND ($2 IS NULL OR department_id = $2)
  AND ($3 IS NULL OR $3 = 'decision')
  AND ($4 IS NULL OR decision_number ILIKE '%' || $4 || '%' OR title ILIKE '%' || $4 || '%')

UNION ALL

SELECT id, 'operation' AS entity_type, job_number AS label,
       job_type || ' • ' || status AS subtitle,
       created_at AS date, estimated_cost AS amount, 'PLN' AS currency, status, department_id
FROM operational_jobs
WHERE business_profile_id = $1
  AND ($2 IS NULL OR department_id = $2)
  AND ($3 IS NULL OR $3 = 'operation')
  AND ($4 IS NULL OR job_number ILIKE '%' || $4 || '%')

ORDER BY date DESC
LIMIT $5;
```

**Usage:**
- Event drawer "Powiąż z..." button
- AttachFileDialog "Link after upload"
- Invoice/contract create "Select operation/job"
- Document repository "Przypisz do..."

#### B. Department Link Policies

**Table:** `department_link_policies`

**Schema:**
```sql
CREATE TABLE department_link_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  department_id UUID REFERENCES departments(id),  -- NULL = global policy
  template_type TEXT,  -- 'transport', 'saas', 'funeral', etc.
  
  -- Link requirements
  require_operation_link_for_invoice BOOLEAN DEFAULT FALSE,
  require_contract_link_for_invoice BOOLEAN DEFAULT FALSE,
  require_decision_for_external_commitment BOOLEAN DEFAULT TRUE,
  require_proof_for_closing BOOLEAN DEFAULT TRUE,
  allowed_proof_methods TEXT[] DEFAULT ARRAY['bank', 'ksef', 'manual', 'audit'],
  
  -- Exceptions
  overhead_categories TEXT[],  -- e.g., ['bank_fees', 'rent', 'tax', 'capital']
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example policies:**
```sql
-- Transport department: require job link for invoices
INSERT INTO department_link_policies (
  business_profile_id, department_id, template_type,
  require_operation_link_for_invoice, require_contract_link_for_invoice,
  overhead_categories
) VALUES (
  'profile-uuid', 'transport-dept-uuid', 'transport',
  TRUE, FALSE,
  ARRAY['fuel', 'tolls', 'vehicle_maintenance']
);

-- SaaS department: no job link required (recurring revenue)
INSERT INTO department_link_policies (
  business_profile_id, department_id, template_type,
  require_operation_link_for_invoice, require_contract_link_for_invoice
) VALUES (
  'profile-uuid', 'saas-dept-uuid', 'saas',
  FALSE, TRUE  -- Require contract instead
);
```

**Enforcement:**
- Invoice create form: check policy → show job picker as required/optional
- Event close action: check policy → block if required links missing
- Event detail drawer: show red "Required" badges based on policy

#### C. Period Close Workflow

**Screen:** `/events/period-close` (or integrate into Posting tab)

**Components:**

1. **Period Selector**
```
Year: [2024 ▼]  Month: [January ▼]  [Load Period]
```

2. **Blocker Checklist**
```
❌ 3 events closed but unverified
❌ 5 events missing required operation link
❌ 2 decisions missing signed PDF
✓ All events have decision linkage
✓ No backdated events in period
```

**Queries:**
```sql
-- Unverified events
SELECT COUNT(*) FROM events
WHERE business_profile_id = $1
  AND period_year = $2 AND period_month = $3
  AND is_closed = TRUE AND verified = FALSE;

-- Missing required links (check policy)
SELECT e.* FROM events e
JOIN department_link_policies p ON p.department_id = e.department_id
WHERE e.business_profile_id = $1
  AND e.period_year = $2 AND e.period_month = $3
  AND p.require_operation_link_for_invoice = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM entity_links el
    WHERE el.source_entity_id = e.entity_id
      AND el.target_entity_type = 'operation'
  );
```

3. **Actions**
```
[Close Period] [Lock Period] [Export Package]
```

**Close Period:**
- Calls `close_accounting_period(profile_id, year, month, user_id)`
- Closes all open events in period
- Generates hashes for all events
- Returns closure stats

**Lock Period:**
- Sets `period_locked = TRUE` for all events in period
- Prevents new events from being added to that period
- Prevents editing of locked events

**Export Package:**
- CSV of all events (postings)
- Hash manifest (event_id, event_hash, occurred_at, amount)
- PDF list (attachments + decision packets)
- Zip file download

---

## Implementation Roadmap

### Phase 1: Module Foundation (Week 1)
**Goal:** Make events a first-class module with navigation

**Tasks:**
1. Create `src/modules/events/` structure
2. Add "Zdarzenia" nav entry (navConfig.ts)
3. Create routes:
   - `/events/timeline` → reuse EventChainViewer
   - `/events/posting` → new PostingView component
   - `/events/reconciliation` → new ReconciliationView component
4. Create EventsShell layout (sidebar with Timeline/Posting/Reconciliation tabs)

**Deliverable:** Users can navigate to Events module and see three workflow lenses.

### Phase 2: Event Detail Drawer (Week 2)
**Goal:** Add operational surface for event management

**Tasks:**
1. Create `EventDetailDrawer.tsx` component
2. Implement 5 sections (Context, Links, Accounting, Proof, Actions)
3. Wire up to EventChainViewer, LedgerEventRow, LedgerEventCard
4. Implement actions:
   - Close event (call `close_accounting_event` RPC)
   - Verify integrity (call `verify_event_integrity` RPC)
   - Copy hash
5. Add validation (disable buttons based on state/policy)

**Deliverable:** Users can click any event and see full context + take actions.

### Phase 3: Unified Entity Search (Week 3)
**Goal:** Remove friction from linking workflow

**Tasks:**
1. Create `search_linkable_entities` RPC (SQL migration)
2. Create `EntitySearchPicker` component (reusable)
3. Wire up to:
   - Event drawer "Powiąż z..." button
   - AttachFileDialog "Link after upload"
   - Invoice/contract create forms
4. Add keyboard navigation, recent items, favorites

**Deliverable:** Users can search and link entities from any context with one consistent UI.

### Phase 4: Policy Layer (Week 4)
**Goal:** Enforce audit trail consistency

**Tasks:**
1. Create `department_link_policies` table (migration)
2. Seed default policies for common templates
3. Add policy checks to:
   - Invoice create form (show required job picker)
   - Contract create form (show required scope picker)
   - Event close action (block if required links missing)
4. Add policy UI in Event drawer (red "Required" badges)
5. Create policy management screen (Settings → Departments → Link Policies)

**Deliverable:** System enforces required links based on department/template rules.

### Phase 5: Period Close Workflow (Week 5)
**Goal:** Enable month-end accounting

**Tasks:**
1. Create PeriodCloseScreen component
2. Implement blocker checklist (queries for missing links, unverified events, unsigned decisions)
3. Implement close/lock controls (call RPCs)
4. Implement export pack (CSV + hash manifest + PDFs)
5. Add period status indicator to Posting view

**Deliverable:** Accountants can close books cleanly with audit-ready export.

### Phase 6: Reconciliation UX (Week 6)
**Goal:** Streamline verification workflow

**Tasks:**
1. Enhance ReconciliationView with suggested matches
2. Implement bank statement import (CSV parser)
3. Add one-click "Link bank tx → event" action
4. Implement KSeF attestation UI (reference + status check)
5. Add bulk verification actions

**Deliverable:** Users can reconcile events with external proof efficiently.

---

## Technical Considerations

### Data Flow
```
User Action (UI)
  ↓
React Component (Event Drawer)
  ↓
React Query Mutation
  ↓
Supabase RPC (close_accounting_event, verify_event_integrity, etc.)
  ↓
Database (public.events + triggers)
  ↓
React Query Invalidation
  ↓
UI Update (refetch events, show success toast)
```

### State Management
- **React Query** for server state (events, policies, entities)
- **Local state** for drawer open/close, selected event
- **URL state** for filters (date range, event type, status)
- **localStorage** for UI preferences (drawer width, collapsed sections)

### Performance
- **Materialized views** for ledger/inbox (refresh on demand)
- **Indexes** on common filters (period, status, verified, department)
- **Pagination** for large event lists (50-100 per page)
- **Virtual scrolling** for timeline (react-window)

### Security
- **RLS policies** on events table (business profile scoped)
- **Service role** for event creation (via RPCs)
- **Immutability** enforced by triggers (closed events cannot be edited)
- **Audit trail** for all mutations (who, when, what changed)

### Testing
- **Unit tests** for event transformations, policy checks
- **Integration tests** for RPCs (close, verify, search)
- **E2E tests** for critical workflows (create invoice → link to job → close event → verify)

---

## Success Metrics

### Operational
- **Time to close month:** < 2 hours (vs current manual process)
- **Events with external attestation:** > 80%
- **Events with required links:** 100% (enforced by policy)
- **Period close blockers:** 0 (all resolved before lock)

### User Experience
- **Event detail drawer open time:** < 500ms
- **Entity search results:** < 200ms
- **Clicks to link entity:** 2 (open drawer → search → select)
- **Clicks to close event:** 1 (if no blockers)

### Compliance
- **Audit trail completeness:** 100% (every event has actor, timestamp, decision)
- **Hash verification success rate:** 100% (no tampering detected)
- **External attestation coverage:** > 80% (bank/KSeF/decision)
- **Period lock integrity:** 100% (no edits after lock)

---

---

## Critical Implementation Constraints

### 1. Single Source of Truth Rule
**NEVER create a second `accounting_events` table.** All accounting semantics are a domain/type subset of `public.events`. This is non-negotiable for maintaining audit trail integrity.

### 2. Drawer-First Sequencing
**No new workflow page ships without drawer support.** The drawer is what makes Posting/Reconciliation actionable. Shipping those pages without the drawer creates visual-only interfaces that block operational workflows.

### 3. Hard Gating Rules (Event Detail Drawer)

#### Close Event Action
Disabled if:
- Policy-required links missing (operation/job, contract, decision)
- Policy-required proof missing (bank/KSeF/decision hash)
- `period_locked = TRUE`

#### Verify Event Action
Disabled if:
- No `event_hash` (event not closed)
- Already `verified = TRUE`
- No external attestation (unless manual verification explicitly allowed by policy)

#### Edit Accounting Fields
Disabled if:
- `is_closed = TRUE`
- `period_locked = TRUE`

### 4. Policy Enforcement Choke Points
Enforce `department_link_policies` at exactly two points initially:
1. **Event close** (in drawer) - block if required links/proof missing
2. **Invoice create** (highest frequency) - show required job/operation picker

Expand to contracts/operations only after these are stable.

### 5. Exception Reasons (Policy Bypass)
When a required link is bypassed, record `exception_reason` on the event:
- Valid reasons: `bank_fee`, `tax`, `capital`, `admin_overhead`, `rent`
- Invalid: creating fake job links to satisfy policy
- UI: dropdown of allowed exceptions (from policy table)

### 6. Export Pack Requirements (Period Close)
Must include:
1. **Postings CSV** - all events in period with Wn/Ma/amount
2. **Hash manifest** - event_id, event_hash, occurred_at, amount (for integrity verification)
3. **Decision evidence list** - all linked decisions with signed PDF status
4. **Attachment inventory** - per-event attachment list with storage paths
5. **ZIP package** - all of the above bundled for regulator/auditor

### 7. Unified Entity Search Output Shape
RPC must return:
```typescript
{
  id: UUID,
  entity_type: string,
  label: string,           // Primary display
  subtitle: string,        // Secondary info
  date: timestamp,
  amount?: number,
  currency?: string,
  status: string,
  department_id: UUID,
  source_module: string,   // For navigation routing
  route_hint: string       // e.g., '/operations/jobs/{id}'
}
```

This prevents hardcoding navigation maps in every consumer.

### 8. Data Flow Consistency
All event mutations must follow:
```
UI Action → React Query Mutation → Supabase RPC → public.events write → 
Trigger (hash/audit) → React Query Invalidation → UI Refresh
```

Never bypass RPCs to write directly to `public.events` from client code.

---

---

## Accounting Engine Requirements (Strategic Layer)

### Problem Statement
The current system has a strong event foundation (unified `public.events`, audit trail, triple-entry extensions) but lacks the **accounting engine** that transforms events into correct postings. Without deterministic posting rules, the ledger is "records" not "accounting."

### 1. Chart of Accounts (CoA) Module

**Purpose:** Define the accounting structure that maps events to Wn/Ma accounts.

**Schema:**
```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  account_code TEXT NOT NULL,  -- e.g., '130', '700', '401'
  account_name TEXT NOT NULL,  -- e.g., 'Należności z tytułu dostaw'
  account_type TEXT NOT NULL,  -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  parent_account_id UUID REFERENCES chart_of_accounts(id),  -- For analytic accounts
  is_synthetic BOOLEAN DEFAULT TRUE,  -- Synthetic vs analytic
  is_active BOOLEAN DEFAULT TRUE,
  default_vat_behavior TEXT,  -- 'taxable', 'exempt', 'not_applicable'
  allow_manual_posting BOOLEAN DEFAULT TRUE,
  
  -- Reporting dimensions
  balance_sheet_section TEXT,  -- 'current_assets', 'fixed_assets', 'current_liabilities', etc.
  pl_section TEXT,  -- 'operating_revenue', 'operating_costs', 'financial_costs', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_profile_id, account_code)
);

CREATE INDEX idx_coa_profile ON chart_of_accounts(business_profile_id);
CREATE INDEX idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX idx_coa_active ON chart_of_accounts(is_active) WHERE is_active = TRUE;
```

**Seed data:** Standard Polish CoA (simplified) for sp. z o.o.
- Assets: 01x (fixed), 13x (receivables), 14x (inventory), 24x (cash/bank)
- Liabilities: 20x (equity), 24x (short-term), 30x (long-term)
- Revenue: 70x (sales), 75x (other operating)
- Expenses: 40x-60x (operating costs)

**UI Requirements:**
- Settings → Chart of Accounts (list, add, edit, deactivate)
- Account picker component (searchable, grouped by type)
- "Default accounts" per business profile (AR control, AP control, VAT, bank, cash)

### 2. Posting Templates & Rules Engine

**Purpose:** Automatically assign Wn/Ma based on event characteristics.

**Schema:**
```sql
CREATE TABLE posting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  template_name TEXT NOT NULL,
  
  -- Matching criteria
  event_type TEXT,  -- 'invoice_issued', 'payment_received', etc.
  entity_type TEXT,  -- 'invoice', 'expense', 'payment'
  direction TEXT,  -- 'incoming', 'outgoing', 'neutral'
  department_id UUID REFERENCES departments(id),
  cash_channel TEXT,  -- 'bank', 'cash', 'card'
  
  -- Posting rules
  debit_account_code TEXT NOT NULL,
  credit_account_code TEXT NOT NULL,
  description_template TEXT,  -- e.g., 'Faktura sprzedażowa {document_number}'
  
  -- Behavior
  priority INT DEFAULT 100,  -- Lower = higher priority for matching
  is_active BOOLEAN DEFAULT TRUE,
  allow_override BOOLEAN DEFAULT TRUE,  -- Can user change Wn/Ma before close?
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posting_templates_profile ON posting_templates(business_profile_id);
CREATE INDEX idx_posting_templates_event_type ON posting_templates(event_type);
```

**Example templates:**
```sql
-- Sales invoice issued (AR)
INSERT INTO posting_templates (business_profile_id, template_name, event_type, entity_type, direction, debit_account_code, credit_account_code, description_template)
VALUES ('profile-uuid', 'Faktura sprzedażowa', 'invoice_issued', 'invoice', 'incoming', '130', '700', 'Faktura {document_number} - {counterparty}');

-- Purchase invoice received (AP)
INSERT INTO posting_templates (business_profile_id, template_name, event_type, entity_type, direction, debit_account_code, credit_account_code, description_template)
VALUES ('profile-uuid', 'Faktura zakupowa', 'invoice_received', 'expense', 'outgoing', '400', '201', 'Zakup {document_number} - {counterparty}');

-- Payment received (bank)
INSERT INTO posting_templates (business_profile_id, template_name, event_type, cash_channel, debit_account_code, credit_account_code, description_template)
VALUES ('profile-uuid', 'Wpłata bankowa', 'payment_received', 'bank', '241', '130', 'Wpłata {counterparty}');

-- Payment sent (bank)
INSERT INTO posting_templates (business_profile_id, template_name, event_type, cash_channel, debit_account_code, credit_account_code, description_template)
VALUES ('profile-uuid', 'Przelew wychodzący', 'payment_sent', 'bank', '201', '241', 'Płatność {counterparty}');
```

**Posting Engine RPC:**
```sql
CREATE OR REPLACE FUNCTION apply_posting_template(
  p_event_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_event events%ROWTYPE;
  v_template posting_templates%ROWTYPE;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  -- Find matching template (highest priority)
  SELECT * INTO v_template
  FROM posting_templates
  WHERE business_profile_id = v_event.business_profile_id
    AND is_active = TRUE
    AND (event_type IS NULL OR event_type = v_event.event_type)
    AND (entity_type IS NULL OR entity_type = v_event.entity_type)
    AND (direction IS NULL OR direction = v_event.direction)
    AND (department_id IS NULL OR department_id = v_event.metadata->>'department_id'::UUID)
    AND (cash_channel IS NULL OR cash_channel = v_event.cash_channel)
  ORDER BY priority ASC
  LIMIT 1;
  
  -- Apply template
  IF v_template.id IS NOT NULL THEN
    UPDATE events
    SET metadata = jsonb_set(
          jsonb_set(metadata, '{debit_account}', to_jsonb(v_template.debit_account_code)),
          '{credit_account}', to_jsonb(v_template.credit_account_code)
        ),
        account_description = v_template.description_template
    WHERE id = p_event_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**UI Integration:**
- Event creation: auto-apply template, show preview, allow override
- Event drawer: "Recalculate posting" button (if not closed)
- Settings → Posting Templates (CRUD interface)

### 3. Corrections Workflow (Reversals & Korekty)

**Purpose:** Handle accounting mistakes without breaking audit trail.

**Schema additions:**
```sql
-- Add to events table
ALTER TABLE events ADD COLUMN reversal_of_event_id UUID REFERENCES events(id);
ALTER TABLE events ADD COLUMN is_reversal BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN correction_reason TEXT;
ALTER TABLE events ADD COLUMN correction_reason_code TEXT;  -- 'error', 'adjustment', 'storno'

CREATE INDEX idx_events_reversal ON events(reversal_of_event_id) WHERE reversal_of_event_id IS NOT NULL;
```

**Reversal RPC:**
```sql
CREATE OR REPLACE FUNCTION create_reversal_event(
  p_original_event_id UUID,
  p_reason TEXT,
  p_reason_code TEXT,
  p_actor_id UUID,
  p_actor_name TEXT
)
RETURNS UUID AS $$
DECLARE
  v_original events%ROWTYPE;
  v_reversal_id UUID;
  v_current_period_year INT;
  v_current_period_month INT;
BEGIN
  -- Get original event
  SELECT * INTO v_original FROM events WHERE id = p_original_event_id;
  
  -- Check if period is locked
  IF v_original.metadata->>'period_locked' = 'true' THEN
    -- Reversal goes into current period
    v_current_period_year := EXTRACT(YEAR FROM NOW());
    v_current_period_month := EXTRACT(MONTH FROM NOW());
  ELSE
    -- Reversal goes into same period
    v_current_period_year := (v_original.metadata->>'period_year')::INT;
    v_current_period_month := (v_original.metadata->>'period_month')::INT;
  END IF;
  
  -- Create reversal event
  INSERT INTO events (
    business_profile_id, event_type, actor_id, actor_name,
    entity_type, entity_id, action_summary, occurred_at,
    amount, currency, direction,
    reversal_of_event_id, is_reversal, correction_reason, correction_reason_code,
    metadata, status, posted
  )
  VALUES (
    v_original.business_profile_id,
    v_original.event_type,
    p_actor_id,
    p_actor_name,
    v_original.entity_type,
    v_original.entity_id,
    'Storno: ' || v_original.action_summary,
    NOW(),
    -v_original.amount,  -- Opposite amount
    v_original.currency,
    CASE v_original.direction
      WHEN 'incoming' THEN 'outgoing'
      WHEN 'outgoing' THEN 'incoming'
      ELSE 'neutral'
    END,
    p_original_event_id,
    TRUE,
    p_reason,
    p_reason_code,
    jsonb_build_object(
      'debit_account', v_original.metadata->>'credit_account',  -- Swap Wn/Ma
      'credit_account', v_original.metadata->>'debit_account',
      'period_year', v_current_period_year,
      'period_month', v_current_period_month
    ),
    'posted',
    TRUE
  )
  RETURNING id INTO v_reversal_id;
  
  -- Mark original as reversed
  UPDATE events
  SET is_reversed = TRUE,
      metadata = jsonb_set(metadata, '{reversed_by_event_id}', to_jsonb(v_reversal_id))
  WHERE id = p_original_event_id;
  
  RETURN v_reversal_id;
END;
$$ LANGUAGE plpgsql;
```

**UI Requirements:**
- Event drawer: "Create reversal" button (with reason dialog)
- Corrections view: list of reversed events with reason
- Period close: warn if reversals exist in locked periods

### 4. Accounting Outputs (Reports)

**Purpose:** Generate standard accounting reports for month-end and year-end.

#### A. Trial Balance (Zestawienie obrotów i sald)

**RPC:**
```sql
CREATE OR REPLACE FUNCTION generate_trial_balance(
  p_business_profile_id UUID,
  p_period_year INT,
  p_period_month INT
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  opening_balance_debit NUMERIC,
  opening_balance_credit NUMERIC,
  period_debit NUMERIC,
  period_credit NUMERIC,
  closing_balance_debit NUMERIC,
  closing_balance_credit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH period_postings AS (
    SELECT
      COALESCE(metadata->>'debit_account', '') AS debit_account,
      COALESCE(metadata->>'credit_account', '') AS credit_account,
      amount
    FROM events
    WHERE business_profile_id = p_business_profile_id
      AND posted = TRUE
      AND is_reversed = FALSE
      AND (metadata->>'period_year')::INT = p_period_year
      AND (metadata->>'period_month')::INT = p_period_month
  ),
  account_movements AS (
    SELECT debit_account AS account, SUM(amount) AS debit_total, 0::NUMERIC AS credit_total
    FROM period_postings
    WHERE debit_account != ''
    GROUP BY debit_account
    
    UNION ALL
    
    SELECT credit_account AS account, 0::NUMERIC AS debit_total, SUM(amount) AS credit_total
    FROM period_postings
    WHERE credit_account != ''
    GROUP BY credit_account
  )
  SELECT
    coa.account_code,
    coa.account_name,
    0::NUMERIC AS opening_balance_debit,  -- TODO: calculate from prior periods
    0::NUMERIC AS opening_balance_credit,
    COALESCE(SUM(am.debit_total), 0) AS period_debit,
    COALESCE(SUM(am.credit_total), 0) AS period_credit,
    0::NUMERIC AS closing_balance_debit,  -- TODO: opening + period
    0::NUMERIC AS closing_balance_credit
  FROM chart_of_accounts coa
  LEFT JOIN account_movements am ON am.account = coa.account_code
  WHERE coa.business_profile_id = p_business_profile_id
    AND coa.is_active = TRUE
  GROUP BY coa.account_code, coa.account_name
  ORDER BY coa.account_code;
END;
$$ LANGUAGE plpgsql;
```

#### B. General Ledger (Księga główna)

**RPC:**
```sql
CREATE OR REPLACE FUNCTION generate_general_ledger(
  p_business_profile_id UUID,
  p_account_code TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  event_id UUID,
  occurred_at TIMESTAMPTZ,
  description TEXT,
  document_reference TEXT,
  debit_amount NUMERIC,
  credit_amount NUMERIC,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.occurred_at,
    e.action_summary,
    e.entity_reference,
    CASE WHEN e.metadata->>'debit_account' = p_account_code THEN e.amount ELSE 0 END AS debit_amount,
    CASE WHEN e.metadata->>'credit_account' = p_account_code THEN e.amount ELSE 0 END AS credit_amount,
    SUM(CASE
      WHEN e.metadata->>'debit_account' = p_account_code THEN e.amount
      WHEN e.metadata->>'credit_account' = p_account_code THEN -e.amount
      ELSE 0
    END) OVER (ORDER BY e.occurred_at) AS balance
  FROM events e
  WHERE e.business_profile_id = p_business_profile_id
    AND e.posted = TRUE
    AND e.is_reversed = FALSE
    AND e.occurred_at BETWEEN p_start_date AND p_end_date
    AND (e.metadata->>'debit_account' = p_account_code OR e.metadata->>'credit_account' = p_account_code)
  ORDER BY e.occurred_at;
END;
$$ LANGUAGE plpgsql;
```

#### C. Subledgers (AR/AP)

**View:**
```sql
CREATE VIEW accounts_receivable AS
SELECT
  e.id AS event_id,
  e.entity_id AS invoice_id,
  e.entity_reference AS invoice_number,
  e.metadata->>'counterparty' AS customer,
  e.occurred_at AS invoice_date,
  e.metadata->>'due_date' AS due_date,
  e.amount AS amount_due,
  COALESCE(
    (SELECT SUM(p.amount)
     FROM events p
     WHERE p.entity_id = e.entity_id
       AND p.event_type = 'payment_received'
       AND p.posted = TRUE
       AND p.is_reversed = FALSE),
    0
  ) AS amount_paid,
  e.amount - COALESCE(
    (SELECT SUM(p.amount)
     FROM events p
     WHERE p.entity_id = e.entity_id
       AND p.event_type = 'payment_received'
       AND p.posted = TRUE
       AND p.is_reversed = FALSE),
    0
  ) AS amount_outstanding
FROM events e
WHERE e.event_type = 'invoice_issued'
  AND e.direction = 'incoming'
  AND e.posted = TRUE
  AND e.is_reversed = FALSE
  AND e.amount > COALESCE(
    (SELECT SUM(p.amount)
     FROM events p
     WHERE p.entity_id = e.entity_id
       AND p.event_type = 'payment_received'
       AND p.posted = TRUE
       AND p.is_reversed = FALSE),
    0
  );
```

**UI Requirements:**
- Reports → Trial Balance (period selector, export CSV/PDF)
- Reports → General Ledger (account picker, date range)
- Reports → AR/AP Aging (grouped by due date)

### 5. Tax Layer (VAT & CIT)

**Schema:**
```sql
CREATE TABLE vat_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  status TEXT NOT NULL,  -- 'exempt', 'registered', 'eu_registered'
  exemption_reason TEXT,  -- 'small_taxpayer', 'specific_activity', etc.
  threshold_limit NUMERIC,  -- e.g., 200000 PLN
  vat_rate_standard NUMERIC DEFAULT 23,
  vat_rate_reduced NUMERIC DEFAULT 8,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cit_advance_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  
  -- Calculation basis
  taxable_revenue NUMERIC DEFAULT 0,
  deductible_costs NUMERIC DEFAULT 0,
  non_deductible_adjustments NUMERIC DEFAULT 0,
  timing_differences NUMERIC DEFAULT 0,
  
  -- Result
  taxable_profit NUMERIC GENERATED ALWAYS AS (taxable_revenue - deductible_costs + non_deductible_adjustments) STORED,
  cit_rate NUMERIC DEFAULT 19,
  cit_amount NUMERIC GENERATED ALWAYS AS ((taxable_revenue - deductible_costs + non_deductible_adjustments) * cit_rate / 100) STORED,
  
  payment_due_date DATE,
  paid BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_profile_id, period_year, period_month)
);
```

**UI Requirements:**
- Settings → VAT Status (history, threshold meter)
- Tax → CIT Advances (monthly calculator, payment tracking)
- Tax → Year-End Checklist (CIT-8 prep, required attachments)

### 6. Fixed Assets Register

**Schema:**
```sql
CREATE TABLE fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  asset_number TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_category TEXT NOT NULL,  -- 'vehicle', 'equipment', 'computer', 'building'
  
  -- Acquisition
  acquisition_date DATE NOT NULL,
  acquisition_value NUMERIC NOT NULL,
  acquisition_event_id UUID REFERENCES events(id),
  
  -- Depreciation
  depreciation_method TEXT NOT NULL,  -- 'straight_line', 'declining_balance'
  depreciation_rate NUMERIC NOT NULL,  -- e.g., 20 for 20%
  useful_life_months INT,
  salvage_value NUMERIC DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'active',  -- 'active', 'disposed', 'fully_depreciated'
  disposal_date DATE,
  disposal_value NUMERIC,
  disposal_event_id UUID REFERENCES events(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(business_profile_id, asset_number)
);

CREATE TABLE depreciation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_asset_id UUID NOT NULL REFERENCES fixed_assets(id),
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  depreciation_amount NUMERIC NOT NULL,
  accumulated_depreciation NUMERIC NOT NULL,
  book_value NUMERIC NOT NULL,
  depreciation_event_id UUID REFERENCES events(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(fixed_asset_id, period_year, period_month)
);
```

**Monthly Depreciation RPC:**
```sql
CREATE OR REPLACE FUNCTION generate_monthly_depreciation(
  p_business_profile_id UUID,
  p_period_year INT,
  p_period_month INT
)
RETURNS INT AS $$
DECLARE
  v_asset fixed_assets%ROWTYPE;
  v_depreciation_amount NUMERIC;
  v_event_id UUID;
  v_count INT := 0;
BEGIN
  FOR v_asset IN
    SELECT * FROM fixed_assets
    WHERE business_profile_id = p_business_profile_id
      AND status = 'active'
      AND acquisition_date < make_date(p_period_year, p_period_month, 1)
  LOOP
    -- Calculate monthly depreciation
    v_depreciation_amount := (v_asset.acquisition_value - v_asset.salvage_value) * v_asset.depreciation_rate / 100 / 12;
    
    -- Create depreciation event
    INSERT INTO events (
      business_profile_id, event_type, entity_type, entity_id,
      action_summary, occurred_at, amount, currency,
      metadata, status, posted
    )
    VALUES (
      p_business_profile_id,
      'depreciation_posted',
      'fixed_asset',
      v_asset.id,
      'Amortyzacja: ' || v_asset.asset_name,
      make_date(p_period_year, p_period_month, 1),
      v_depreciation_amount,
      'PLN',
      jsonb_build_object(
        'debit_account', '401',  -- Depreciation expense
        'credit_account', '071',  -- Accumulated depreciation
        'period_year', p_period_year,
        'period_month', p_period_month,
        'asset_id', v_asset.id
      ),
      'posted',
      TRUE
    )
    RETURNING id INTO v_event_id;
    
    -- Record in depreciation schedule
    INSERT INTO depreciation_schedule (
      fixed_asset_id, period_year, period_month,
      depreciation_amount, accumulated_depreciation, book_value,
      depreciation_event_id
    )
    VALUES (
      v_asset.id, p_period_year, p_period_month,
      v_depreciation_amount,
      -- Calculate accumulated (TODO: sum from prior periods)
      v_depreciation_amount,
      v_asset.acquisition_value - v_depreciation_amount,
      v_event_id
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

**UI Requirements:**
- Assets → Fixed Assets Register (list, add, depreciation schedule)
- Month-end → Generate Depreciation (one-click for all assets)

### 7. Bank Reconciliation Workflow

**Schema:**
```sql
CREATE TABLE bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  import_date TIMESTAMPTZ DEFAULT NOW(),
  statement_period_from DATE,
  statement_period_to DATE,
  statement_hash TEXT,  -- SHA256 of file
  file_name TEXT,
  imported_by UUID REFERENCES auth.users(id),
  
  total_transactions INT,
  matched_transactions INT,
  unmatched_transactions INT
);

CREATE TABLE bank_transactions_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES bank_statement_imports(id),
  
  transaction_date DATE NOT NULL,
  posting_date DATE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'PLN',
  counterparty_name TEXT,
  counterparty_account TEXT,
  title TEXT,
  reference_number TEXT,
  
  -- Matching
  matched_event_id UUID REFERENCES events(id),
  match_confidence NUMERIC,  -- 0-100
  match_method TEXT,  -- 'exact', 'fuzzy', 'manual'
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  
  -- If unmatched, create event
  created_event_id UUID REFERENCES events(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Matching RPC:**
```sql
CREATE OR REPLACE FUNCTION match_bank_transactions(
  p_import_id UUID
)
RETURNS TABLE (
  transaction_id UUID,
  suggested_event_id UUID,
  confidence NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bt.id AS transaction_id,
    e.id AS suggested_event_id,
    CASE
      WHEN ABS(bt.amount - e.amount) < 0.01
           AND bt.transaction_date = e.occurred_at::DATE
           AND similarity(bt.counterparty_name, e.metadata->>'counterparty') > 0.7
      THEN 95.0
      WHEN ABS(bt.amount - e.amount) < 0.01
           AND ABS(EXTRACT(EPOCH FROM (bt.transaction_date - e.occurred_at::DATE)) / 86400) <= 3
      THEN 80.0
      WHEN ABS(bt.amount - e.amount) < 0.01
      THEN 60.0
      ELSE 0.0
    END AS confidence
  FROM bank_transactions_staging bt
  CROSS JOIN events e
  WHERE bt.import_id = p_import_id
    AND bt.matched_event_id IS NULL
    AND e.cash_channel = 'bank'
    AND e.metadata->>'bank_transaction_id' IS NULL
    AND ABS(bt.amount - e.amount) < 0.01
  ORDER BY confidence DESC;
END;
$$ LANGUAGE plpgsql;
```

**UI Requirements:**
- Bank → Import Statement (CSV upload, parse, preview)
- Bank → Reconciliation Queue (unmatched transactions, suggested matches)
- One-click: Link tx ↔ event, mark verified
- Create event from unmatched tx (posting template picker)

---

## Revised Implementation Priority

### Phase 1: Accounting Engine Foundation (Weeks 2-4)
1. **Chart of Accounts** - schema, seed data, UI (Settings)
2. **Posting Templates** - schema, rules engine, auto-apply on event creation
3. **Event Detail Drawer** - with Wn/Ma display and override capability
4. **Trial Balance Report** - basic version (period movements only)

### Phase 2: Corrections & Outputs (Weeks 5-6)
5. **Reversals Workflow** - RPC, UI in drawer, corrections view
6. **General Ledger Report** - per-account drill-down
7. **AR/AP Subledgers** - views and aging reports

### Phase 3: Tax & Assets (Weeks 7-8)
8. **VAT Status Tracking** - history, threshold meter
9. **Fixed Assets Register** - CRUD, depreciation schedule
10. **Monthly Depreciation Run** - automated event generation

### Phase 4: Bank Reconciliation (Weeks 9-10)
11. **CSV Import** - parser, staging table
12. **Matching Engine** - fuzzy matching, confidence scores
13. **Reconciliation UI** - queue, suggestions, one-click linking

### Phase 5: Period Close (Week 11)
14. **Blocker Checklist** - unverified events, missing links, unmatched bank txs
15. **Lock Controls** - prevent edits, force current period for corrections
16. **Export Pack** - trial balance, GL, AR/AP, hash manifest, attachments

---

## Strategic Discipline: Event-First Architecture

**Core principle:** Users never "edit accounting" directly. They create events (including corrections).

**Enforcement points:**
1. No direct UPDATE on `events` table from client code (only via RPCs)
2. Closed events cannot be edited (only reversed)
3. Locked periods reject new events (except corrections with explicit reason)
4. All mutations generate audit trail events

**Product advantage:** This discipline makes the system **auditor-friendly by design**, not as an afterthought. For small sp. z o.o., this is a competitive differentiator.

---

## Critical Guardrails (Non-Negotiable)

### Mental Model: Event-Native Accounting Engine

**What This System Is:**
An **event-native accounting engine with deterministic consensus semantics**, not "an accounting app with events."

**Core Abstraction:**

| Layer | What It Is | Immutability |
|-------|-----------|-------------|
| **Events** | Raw facts (append-only) | Immutable after close |
| **Candidates** | Interpretations of facts for a period | Multiple allowed (forks) |
| **Canonical Commit** | Agreed interpretation | Immutable forever |
| **Corrections** | New events in current period | Never rewrite history |

**Key Insight:**
> The ledger is not stored. The ledger is **derived** from the accepted commit.

This separates the system from 99% of SME accounting apps.

### Guardrail 1: Commit-Bound Events

**Rule:** Once a commit is accepted, every included event stores its commit context.

**Implementation:**
```sql
-- Add to events table metadata
ALTER TABLE events ADD COLUMN included_in_commit_id UUID REFERENCES period_commit_candidates(id);
ALTER TABLE events ADD COLUMN included_in_digest TEXT;

CREATE INDEX idx_events_commit ON events(included_in_commit_id) WHERE included_in_commit_id IS NOT NULL;
```

**When to set:**
```sql
-- In accept_period_commit RPC
UPDATE events
SET included_in_commit_id = p_candidate_id,
    included_in_digest = v_candidate.period_digest
WHERE id = ANY(v_candidate.event_ids);
```

**Why:**
- Prevents ambiguity ("which close included this event?")
- Enables event-level inclusion proofs
- Allows "show me everything that changed since last canonical close"
- Turns events into **cryptographically contextualized facts**

### Guardrail 2: Canonical Commit Enforcement

**Rule:** No UI, report, or export may bypass the canonical commit.

**Enforcement Points:**

#### A. Reports Must Reference Commit
```typescript
interface TrialBalanceParams {
  business_profile_id: UUID;
  commit_id: UUID;  // REQUIRED, not optional
}

interface GeneralLedgerParams {
  business_profile_id: UUID;
  account_code: string;
  commit_id: UUID;  // REQUIRED
}
```

#### B. Non-Canonical Data Must Be Watermarked
```typescript
if (!period.canonical_commit_id) {
  return {
    status: 'DRAFT',
    watermark: 'NON-OFFICIAL - No canonical commit',
    data: null,  // Or show with prominent warning
  };
}
```

#### C. Exports Must Embed Commit Digest
```typescript
interface ExportPackMetadata {
  period: { year: number; month: number };
  commit_id: UUID;
  commit_digest: string;  // SHA256 hex
  accepted_at: timestamp;
  accepted_by: string;
  export_generated_at: timestamp;
}

// PDF footer:
// "Official export for January 2026"
// "Commit: a3f2...9d1c | Accepted: 2026-02-05 10:30 | Exported: 2026-02-10 14:22"
```

#### D. UI Must Show Canonical Status
```typescript
// Period header
if (period.status === 'accepted') {
  <Badge variant="success">✓ Canonical</Badge>
} else {
  <Badge variant="warning">⚠ Draft / Not Official</Badge>
}
```

**Why:**
- Prevents accidental reliance on unapproved data
- Makes canonical vs draft distinction impossible to miss
- Provides legal defensibility ("we only exported canonical commits")
- Enables reproducibility ("recompute from commit_id = X")

### Guardrail 3: Drawer-First Discipline

**Rule:** The Event Detail Drawer is the **sole mutation surface**. No shortcuts.

**Prohibited Patterns:**

❌ **Quick close buttons** (inline, bulk)
```typescript
// NEVER do this
<Button onClick={() => closeEvent(eventId)}>Quick Close</Button>
```

❌ **Inline edits** (Wn/Ma, amount, date)
```typescript
// NEVER do this
<Input value={event.amount} onChange={updateAmount} />
```

❌ **Bulk actions without context**
```typescript
// NEVER do this
<Button onClick={() => closeAllEvents(selectedIds)}>Close All</Button>
```

**Correct Pattern:**

✅ **All mutations go through drawer**
```typescript
// Event card/row click
<EventCard onClick={() => openDrawer(event.id)} />

// Drawer provides:
// - Full context (5 sections)
// - Policy enforcement (hard gates)
// - Verification (proof checks)
// - Actions (close, verify, link, attach)
```

**Why:**
- Drawer is the **policy enforcement point**
- Drawer is the **human verification interface**
- Drawer prevents **accidental mutations**
- Shortcuts are where systems rot

**Exception:** RPCs can mutate (but only via drawer-triggered actions).

### Guardrail 4: Fork Retention (Never Delete Candidates)

**Rule:** All candidates are retained forever, regardless of status.

**Prohibited:**
```sql
-- NEVER do this
DELETE FROM period_commit_candidates WHERE status = 'superseded';
DELETE FROM period_commit_candidates WHERE status = 'rejected';
```

**Why:**
- Provides **visible error-correction story**
- Shows **audit trail of attempted closes**
- Proves **diligence** (valuable in disputes)
- Enables **forensic analysis** ("what changed between attempts?")

**Lifecycle:**
```
Draft → Proposed → Accepted (Canonical)
                 ↘ Rejected (kept forever)
                 ↘ Superseded (kept forever)
```

### Guardrail 5: Corrections Never Rewrite History

**Rule:** Locked periods are immutable. Corrections are new events in current period.

**Prohibited:**
```sql
-- NEVER do this
UPDATE events
SET amount = corrected_amount
WHERE id = 'january-event-id' AND period_locked = TRUE;
```

**Correct Pattern:**
```sql
-- March (current period)
INSERT INTO events (
  period_year = 2026,
  period_month = 3,
  is_reversal = TRUE,
  reversal_of_event_id = 'january-event-id',
  correction_reason = 'Amount error discovered in March',
  amount = -original_amount  -- Opposite
);

INSERT INTO events (
  period_year = 2026,
  period_month = 3,
  -- Corrected event with right amount
  amount = corrected_amount
);
```

**Why:**
- Creates **visible causal chain**
- Provides **temporal explanation**
- Eliminates **retroactive manipulation**
- Matches **legal/auditor expectations**

### Guardrail 6: Deterministic Consensus Is Core Primitive

**Rule:** What is being approved is the digest, not "the period is closed."

**Approval Statement:**
```
I, as an accountable actor, attest that:
  SHA256(ordered_events_for_2026_01) = a3f2...9d1c
```

**Everything else is derived material:**
- Trial balance → derived from commit
- General ledger → derived from commit
- PDFs → derived from commit
- Exports → derived from commit

**Why:**
- **Reproducibility:** Recompute anytime from event set
- **Legal defensibility:** "We approved this specific digest"
- **Tamper detection:** Recompute and compare
- **Tool-independence:** Any system with same events gets same digest

**Tax Office Scenario:**
```
Tax Office: "Prove your January 2026 revenue."
You: "Here's our canonical commit: a3f2...9d1c"
Tax Office: *Recomputes from event set*
Tax Office: "Digest matches. Approved."
```

### Guardrail 7: No Bypass Routes

**Rule:** Every accounting mutation must create an event.

**Prohibited:**
```typescript
// NEVER do this
await supabase
  .from('events')
  .update({ amount: newAmount })
  .eq('id', eventId);

// NEVER do this
await supabase
  .from('invoices')
  .update({ total: newTotal })
  .eq('id', invoiceId);
// (without creating corresponding event)
```

**Correct Pattern:**
```typescript
// Create reversal event
await supabase.rpc('create_reversal_event', {
  p_original_event_id: eventId,
  p_reason: 'Amount correction',
  p_reason_code: 'error',
  p_actor_id: userId,
  p_actor_name: userName,
});

// Create corrected event
await supabase.rpc('create_event', {
  // ... corrected data
});
```

**Why:**
- Maintains **complete audit trail**
- Enables **event-first derivation**
- Prevents **silent mutations**
- Enforces **discipline by design**

---

## Implementation Discipline

### Week 2 Non-Negotiable Order

1. **Event Detail Drawer** (keystone)
   - 5 sections (Context, Links, Accounting, Proof, Actions)
   - Hard gating rules (disable buttons based on state/policy)
   - Zero shortcuts (no quick actions, no inline edits)

2. **Wire drawer everywhere**
   - EventChainViewer cards → open drawer
   - LedgerEventRow → open drawer
   - LedgerEventCard → open drawer
   - Posting table rows → open drawer

3. **Implement close + verify RPCs**
   - `close_accounting_event` with hash generation
   - `verify_event_integrity` with recomputation
   - Set `included_in_commit_id` on acceptance

**After Week 2, everything else clicks into place naturally.**

---

---

## Period Commit System (Git-like Accounting)

### Conceptual Model: Git Primitives → Accounting Primitives

**Git Objects → Accounting Objects:**

| Git Concept | Accounting Equivalent | Implementation |
|-------------|----------------------|----------------|
| Commit | Period Commit Candidate | Signed snapshot of all events in (profile, year, month) |
| Commit Hash | Period Digest | Merkle root or canonical hash of event set |
| Branch | Candidate Fork | Multiple candidates for same period (corrections, missing events) |
| Tag/Release | Canonical Commit | Accepted candidate used for official reporting |
| Rebase | Not Allowed | Never rewrite history; create new candidate instead |
| Revert | Reversal Events | Storno/korekta in current period, not editing history |
| Chain | Period Chain | Each commit references previous period's digest |

**Why This Matters:**
- **Deterministic:** Two systems with same events compute same digest
- **Auditable:** Fork retention shows all attempted closes + corrections
- **Immutable:** Accepted commits never change; corrections are new events
- **Consensus:** M-of-N approval workflow with governance integration

### 1. Deterministic Period Hashing (Merkle Tree)

**Problem:** Need reproducible digest where `hash(events_A) == hash(events_B)` if event sets are identical.

**Solution: Merkle Tree**

```
                    Root Hash (Period Digest)
                   /                        \
            Hash(L1, L2)                Hash(L3, L4)
           /            \              /            \
    Leaf1(E1)      Leaf2(E2)    Leaf3(E3)      Leaf4(E4)
```

**Leaf Hash Computation:**
```sql
leaf_hash = SHA256(
  event_hash || '|' ||
  event_id || '|' ||
  occurred_at || '|' ||
  amount || '|' ||
  currency
)
```

**Deterministic Ordering:**
- Events sorted by `(occurred_at, id)` before hashing
- Same event set always produces same leaf order
- Merkle root becomes period digest

**Advantages over Canonical Concatenation:**
- Efficient inclusion proofs ("event X is in period Y")
- Partial verification without full event set
- Standard cryptographic primitive

**Schema:**
```sql
CREATE TABLE period_commit_candidates (
  id UUID PRIMARY KEY,
  business_profile_id UUID,
  period_year INT,
  period_month INT,
  
  -- Digest
  period_digest TEXT NOT NULL,  -- Merkle root (hex)
  merkle_root TEXT,
  digest_method TEXT DEFAULT 'merkle',
  
  -- Event set
  event_count INT,
  event_ids UUID[],  -- Ordered: (occurred_at, id)
  
  -- Financial totals (validation)
  total_debit NUMERIC,
  total_credit NUMERIC,
  currency_totals JSONB,
  
  -- Status
  status TEXT,  -- 'draft', 'proposed', 'accepted', 'rejected', 'superseded'
  
  -- Chain
  previous_commit_id UUID,
  previous_period_digest TEXT,
  
  -- Blockers
  blockers JSONB,  -- { unverified_count, missing_links_count }
  
  created_by UUID,
  created_at TIMESTAMPTZ,
  proposed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);
```

### 2. Approval Workflow (Consensus Without Mining)

**Governance Model:**

```sql
CREATE TABLE period_commit_approvals (
  id UUID PRIMARY KEY,
  candidate_id UUID REFERENCES period_commit_candidates(id),
  
  approver_user_id UUID,
  approver_role TEXT,  -- 'owner', 'accountant', 'board_member'
  decision_id UUID,  -- Link to governance decision
  
  approved BOOLEAN,
  approval_comment TEXT,
  signature_hash TEXT,  -- Optional cryptographic signature
  
  approved_at TIMESTAMPTZ
);
```

**Acceptance Rules (Configurable):**

1. **Single-person spółka:** 1 approval by owner
2. **Spółka with governance:** M-of-N approvals (e.g., accountant + board member)
3. **Policy-driven:** Zero blockers required (unverified events, missing links)

**Blocker Enforcement:**
```typescript
blockers = {
  unverified_count: 3,           // Events closed but not verified
  missing_links_count: 5,        // Required operation/job links missing
  unmatched_bank_txs: 2,         // Bank transactions without event link
  unsigned_decisions: 1          // External commitments without signed decision
}
```

**Accept RPC Logic:**
```sql
CREATE FUNCTION accept_period_commit(
  p_candidate_id UUID,
  p_user_id UUID,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check status
  IF candidate.status != 'proposed' THEN
    RAISE EXCEPTION 'Must be proposed';
  END IF;
  
  -- Check blockers (unless forced)
  IF NOT p_force AND blockers->>'unverified_count' > 0 THEN
    RAISE EXCEPTION 'Unverified events exist';
  END IF;
  
  -- Check approvals
  IF approval_count < required_approvals THEN
    RAISE EXCEPTION 'Insufficient approvals';
  END IF;
  
  -- Supersede other candidates for same period
  UPDATE period_commit_candidates
  SET status = 'superseded'
  WHERE period = same AND id != p_candidate_id;
  
  -- Accept
  UPDATE period_commit_candidates
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = p_candidate_id;
  
  -- Lock period
  UPDATE events
  SET metadata = jsonb_set(metadata, '{period_locked}', 'true')
  WHERE period = same;
  
  -- Add to chain
  INSERT INTO period_commit_chain (...);
  
  RETURN TRUE;
END;
$$;
```

### 3. Fork Retention & Candidate Comparison

**Why Multiple Candidates Per Period:**
- Corrections discovered after first close attempt
- Missing events added (late invoice, forgotten transaction)
- Proof attached (bank statement arrived late)
- Different event ordering (occurred_at ties broken differently)

**Candidate Lifecycle:**
```
Draft → Proposed → Accepted (Canonical)
                 ↘ Rejected
                 ↘ Superseded (by newer candidate)
```

**All candidates retained forever** for audit trail.

**Comparison RPC:**
```sql
CREATE FUNCTION compare_period_candidates(
  p_candidate_a_id UUID,
  p_candidate_b_id UUID
)
RETURNS TABLE (
  event_id UUID,
  status TEXT,  -- 'only_in_a', 'only_in_b', 'in_both'
  event_summary TEXT
) AS $$
  -- Returns diff of event sets
  -- Shows what changed between candidates
$$;
```

**UI Diff View:**
```
Candidate A (Draft)          Candidate B (Canonical)
─────────────────────────────────────────────────────
+ Event E1 (added)           Event E1
  Event E2                   Event E2
- Event E3 (removed)         
  Event E4                   Event E4
                           + Event E5 (added)
─────────────────────────────────────────────────────
Digest: a3f2...             Digest: b7e4...
Total: 1,230.00 PLN         Total: 1,450.00 PLN
```

### 4. Misalignment Detection & Response

**Integrity Mismatches:**

| Condition | Detection | Response |
|-----------|-----------|----------|
| Event hash mismatch | Recompute event hash ≠ stored | Reject candidate, flag event for investigation |
| Period digest mismatch | Recompute digest ≠ stored | Reject candidate, show diff |
| Bank attestation mismatch | Bank tx hash ≠ event content | Block verification, require manual review |
| KSeF reference invalid | KSeF API returns different data | Block verification, update reference |
| Missing required link | Policy demands link but null | Block acceptance, show blocker |
| Missing proof | Policy demands attestation but null | Block acceptance, show blocker |

**Response Policy:**

1. **If candidate not yet accepted:**
   - Status → `rejected` with reason
   - User fixes issues, creates new candidate

2. **If period already accepted and issue found:**
   - **Never rewrite accepted candidate**
   - Create reversal events in **current period**
   - Create corrected events in **current period**
   - Create new candidate for **current period**
   - Optionally create `audit_incident` record

**Example: Late-discovered error in January (now in March)**
```sql
-- January canonical commit: LOCKED, IMMUTABLE
-- March actions:
INSERT INTO events (
  period_year = 2026,
  period_month = 3,
  is_reversal = TRUE,
  reversal_of_event_id = 'jan-event-id',
  correction_reason = 'Amount error discovered in March'
);

INSERT INTO events (
  period_year = 2026,
  period_month = 3,
  -- Corrected event with right amount
);

-- March period now includes correction trail
-- January period digest never changes
```

### 5. UI Implementation (Git-like UX)

**Events → Księgowanie View Enhancement:**

#### Period Header Card
```
┌─────────────────────────────────────────────────────┐
│ Okres: Styczeń 2026                                 │
│                                                     │
│ Status: ✓ Accepted (Canonical)                     │
│ Digest: a3f2...9d1c                    [Copy] [✓]  │
│ Approvals: 2/2 ✓                                    │
│ Blockers: 0                                         │
│ Locked: 2026-02-05 10:30                           │
│                                                     │
│ [View Chain] [Export Pack] [Compare Candidates]    │
└─────────────────────────────────────────────────────┘
```

#### Candidates Table (Forks)
```
┌────────────────────────────────────────────────────────────────┐
│ Candidate  Status      Digest    Events  Approvals  Actions   │
├────────────────────────────────────────────────────────────────┤
│ A (Draft)  Superseded  a1b2...   45      0/2        [Compare] │
│ B (v2)     Superseded  c3d4...   47      1/2        [Compare] │
│ C (Final)  ✓ Accepted  a3f2...   48      2/2        [Export]  │
└────────────────────────────────────────────────────────────────┘

Candidate A: Initial close attempt (missing 3 events)
Candidate B: Added missing invoices (1 approval, blocker: unverified)
Candidate C: All verified, accepted as canonical
```

#### Compare View (Diff)
```
┌─────────────────────────────────────────────────────────────┐
│ Comparing: Candidate B → Candidate C                        │
├─────────────────────────────────────────────────────────────┤
│ + Event E47: Faktura FV/047/2026 (added, verified)         │
│   Event E45: Płatność (unchanged)                           │
│ ~ Event E12: Wydatek (amount corrected: 100 → 120 PLN)     │
│                                                             │
│ Summary:                                                    │
│ - Events added: 1                                           │
│ - Events removed: 0                                         │
│ - Events changed: 1                                         │
│ - Total delta: +20.00 PLN                                   │
└─────────────────────────────────────────────────────────────┘
```

#### Approval Dialog
```
┌─────────────────────────────────────────────────────────────┐
│ Approve Period Commit: Styczeń 2026                         │
├─────────────────────────────────────────────────────────────┤
│ Candidate C (Final)                                         │
│ Digest: a3f2...9d1c                                         │
│                                                             │
│ ✓ All events verified                                       │
│ ✓ All required links present                                │
│ ✓ Bank reconciliation complete                              │
│ ✓ No blockers                                               │
│                                                             │
│ Link to Decision (optional):                                │
│ [Select Decision...] DEC/01/2026 - Month-end close         │
│                                                             │
│ Comment:                                                    │
│ [Reviewed and approved for January 2026 reporting]          │
│                                                             │
│ [Cancel]                              [Approve & Lock] ✓    │
└─────────────────────────────────────────────────────────────┘
```

### 6. Chain Continuity (Optional but Recommended)

**Period Chain Table:**
```sql
CREATE TABLE period_commit_chain (
  id UUID PRIMARY KEY,
  business_profile_id UUID,
  period_year INT,
  period_month INT,
  sequence_number INT,  -- 1, 2, 3... (monotonic)
  
  canonical_commit_id UUID,  -- Points to accepted candidate
  previous_commit_id UUID,   -- Points to previous period's canonical
  chain_hash TEXT,           -- SHA256(previous_chain_hash || period_digest)
  
  locked_at TIMESTAMPTZ,
  locked_by UUID
);
```

**Chain Hash Computation:**
```
chain_hash[Jan] = SHA256(period_digest[Jan])
chain_hash[Feb] = SHA256(chain_hash[Jan] || period_digest[Feb])
chain_hash[Mar] = SHA256(chain_hash[Feb] || period_digest[Mar])
```

**Benefits:**
- Detect if any prior period was tampered with
- Prove continuity from company inception to present
- Export "chain proof" for auditors

**UI: Chain View**
```
2026
├─ Jan ✓ [a3f2...] → Feb
├─ Feb ✓ [b7e4...] → Mar
├─ Mar ⏳ [Draft] (not yet accepted)
└─ Apr ⚪ (not started)

Chain Integrity: ✓ Valid (all hashes verified)
```

### 7. Implementation Sequencing

**Phase 1: Core Infrastructure (After Event Drawer)**
1. Merkle tree computation functions
2. `period_commit_candidates` table
3. `compute_period_digest` RPC
4. `propose_period_commit` RPC

**Phase 2: Approval Workflow (During Period Close)**
5. `period_commit_approvals` table
6. `accept_period_commit` RPC with blocker enforcement
7. Period header card UI
8. Candidates table UI

**Phase 3: Comparison & Verification**
9. `compare_period_candidates` RPC
10. `verify_period_commit` RPC
11. Diff view UI
12. Integrity verification UI

**Phase 4: Chain Continuity (Optional)**
13. `period_commit_chain` table
14. Chain hash computation
15. Chain view UI
16. Export chain proof

### 8. Strategic Advantages

**For Small Spółka:**
- **Auditor-friendly:** Fork retention shows all correction attempts
- **Legally defensible:** Immutable canonical commits with approval trail
- **Error-tolerant:** Corrections don't destroy history
- **Transparent:** Every change has reason + actor + timestamp

**For System:**
- **Deterministic:** Same events → same digest (reproducible)
- **Verifiable:** Recompute digest anytime to check integrity
- **Scalable:** Merkle tree enables efficient proofs
- **Git-like:** Familiar mental model for developers

**Product Differentiator:**
Most SME accounting systems treat period close as "lock and hope." This system treats it as **consensus-driven commit with fork retention**, making it enterprise-grade while remaining simple for single-person spółka.

---

## Conclusion

The current event system has a **solid foundation** (unified events table, triple-entry extensions, reusable components). The gap is **operational surfaces** (detail drawer, workflow lenses, policy enforcement) and **supporting infrastructure** (unified entity search, period close workflow).

By following the phased roadmap, we transform the system from **descriptive** (view-only audit log) to **operational** (workflow-driven accounting module) without re-architecture.

**Critical success factors:**
1. Implement Event Detail Drawer before shipping Posting/Reconciliation pages (drawer is keystone)
2. Implement Period Commit System during Period Close phase (consensus-driven, not just "lock")
3. Enforce event-first discipline (no direct edits, only create events including corrections)

**Next steps:**
1. Week 2: Event Detail Drawer with Wn/Ma display and actions
2. Weeks 2-4: Accounting Engine (CoA + Posting Templates + Trial Balance)
3. Week 5: Period Commit System integrated into Period Close workflow
4. Weeks 6-10: Corrections, Reports, Bank Reconciliation, Fixed Assets
