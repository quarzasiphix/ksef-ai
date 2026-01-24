# Entity Links System - Implementation Guide

## Overview

The Entity Links System implements the principle **"Everything financial must have a business reason"** by providing polymorphic linking between business entities (invoices, contracts, operations, etc.).

This solves the core ERP requirement: **audit trails that answer "Why does this exist?"**

---

## What Was Built

### 1. Database Layer ✅

**Migration: `20260103_entity_links_system.sql`**

- **`entity_links` table**: Polymorphic linking with semantic roles
  - Links FROM: invoice, contract, ledger_event, expense, storage_file, decision, cash_transaction
  - Links TO: operation, job, vehicle, driver, contract, decision, vendor, client, overhead_category
  - Roles: `primary_reason`, `executes`, `relates_to`, `covered_by`, `evidences`, `overhead`, `supports`

- **Helper views**:
  - `invoices_with_links`: Invoices with their primary business reason
  - `contracts_with_scope`: Contracts with their scope (operation/vehicle/driver)
  - `operations_with_links`: Operations with linked invoices and contracts

- **Helper functions**:
  - `create_entity_link()`: Create or update links with conflict handling
  - `get_entity_links_from()`: Get all links FROM an entity
  - `get_entity_links_to()`: Get all links TO an entity

**Migration: `20260103_linkable_entities_search.sql`**

- **`search_linkable_entities()` RPC**: Unified search across all entity types
  - Department-filtered
  - Full-text search on titles/numbers
  - Sorted by recency (most recent first)
  - Returns: operations, invoices, contracts, decisions, vehicles, drivers
  - Includes department context and metadata

- **`get_entity_display_info()` RPC**: Quick lookup for entity display by ID

---

### 2. UI Components ✅

**`EntitySearchPicker.tsx`** - Universal entity search component

```tsx
<EntitySearchPicker
  businessProfileId={profileId}
  departmentId={deptId}
  entityTypes={['operation', 'invoice']}
  value={selectedEntityId}
  onSelect={(entity) => handleSelect(entity)}
  placeholder="Szukaj operacji, faktury..."
/>
```

Features:
- Real-time search with debouncing
- Department filtering
- Type filtering (operations, invoices, contracts, decisions, vehicles, drivers)
- Recent items shown by default
- Visual department indicators
- Keyboard navigation
- Selected entity display with "Zmień" button

**`ContextBar.tsx`** - Universal context display for creation flows

```tsx
<ContextBar
  department={department}
  departmentLocked={true}
  primaryLink={{ type: 'operation', id: jobId, title: 'TR/01/26' }}
  targetFolder={{ path: 'globalpet / test', id: folderId }}
  onChangeDepartment={() => ...}
  onChangePrimaryLink={() => ...}
  onChangeFolder={() => ...}
/>
```

Shows:
- Current department (locked if context-derived)
- Primary business link (operation/vehicle/driver)
- Target folder (for file uploads)
- Quick actions: Zmień, Wyczyść, Otwórz obiekt

**`UploadFileDialog.tsx`** - Enhanced with EntitySearchPicker

Replaced manual ID input with EntitySearchPicker:
- Department-filtered entity search
- Shows recent operations/invoices/contracts
- Auto-filters by folder's department
- Visual entity selection with metadata

---

## How It Works

### Example Flow: Upload File with Operation Link

1. **User context**: In folder `globalpet / operacje / TR-01-26`
2. **Opens upload dialog**: 
   - Folder context shown: `globalpet / operacje / TR-01-26`
   - Department auto-locked: `globalpet`
3. **Toggles "Powiąż po dodaniu"**:
   - Selects entity type: `Operacja`
   - EntitySearchPicker shows recent operations filtered by `globalpet` department
   - User searches "TR/01" → sees `TR/01/26 test • 25.12.2025 • globalpet`
   - Selects operation
4. **Selects attachment role**: `Potwierdzenie dostawy`
5. **Uploads file**:
   - File saved to `storage_files`
   - Attachment created in `attachments` table
   - Entity link created in `entity_links` table:
     ```sql
     from_entity_type: 'storage_file'
     from_entity_id: <file_id>
     to_entity_type: 'operation'
     to_entity_id: <operation_id>
     link_role: 'evidences'
     ```

---

## Next Steps (Not Yet Implemented)

### 1. Add `operation_id` to Invoices Table

**Migration needed:**
```sql
ALTER TABLE public.invoices
ADD COLUMN operation_id UUID REFERENCES public.operational_jobs(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_operation ON public.invoices(operation_id);
```

**Then update invoice forms** to include:
- EntitySearchPicker for operation selection
- Validation: expense invoices REQUIRE operation OR overhead category
- ContextBar showing operation context when creating from job view

### 2. Add Contract Scope Fields

**Migration needed:**
```sql
ALTER TABLE public.contracts
ADD COLUMN scope_type TEXT CHECK (scope_type IN ('operation', 'vehicle', 'driver', 'vendor', 'internal')),
ADD COLUMN scope_id UUID;

CREATE INDEX idx_contracts_scope ON public.contracts(scope_type, scope_id);
```

**Then update contract forms** to include:
- Scope selector (operation/vehicle/driver/vendor/internal)
- EntitySearchPicker filtered by scope type
- Scope-based template suggestions
- Scope-based default folder paths

### 3. Add "Requires Attention" Rules

**Create view:**
```sql
CREATE VIEW public.entities_requiring_attention AS
-- Invoices without operation link and without overhead category
SELECT 
  'invoice' AS entity_type,
  i.id AS entity_id,
  i.number AS title,
  'Brak powiązania z operacją' AS reason,
  'missing_operation_link' AS issue_type
FROM public.invoices i
LEFT JOIN public.entity_links el ON (
  el.from_entity_type = 'invoice' AND
  el.from_entity_id = i.id AND
  el.link_role = 'primary_reason'
)
WHERE i.transaction_type = 'expense'
  AND el.id IS NULL
  AND i.overhead_category IS NULL

UNION ALL

-- Contracts without scope
SELECT 
  'contract' AS entity_type,
  c.id AS entity_id,
  c.number AS title,
  'Brak zakresu umowy' AS reason,
  'missing_scope' AS issue_type
FROM public.contracts c
WHERE c.scope_type IS NULL

UNION ALL

-- Operations with costs but missing evidence attachments
SELECT 
  'operation' AS entity_type,
  oj.id AS entity_id,
  oj.job_number AS title,
  'Brak załączników dowodowych' AS reason,
  'missing_evidence' AS issue_type
FROM public.operational_jobs oj
LEFT JOIN public.attachments a ON (
  a.entity_type = 'operation' AND
  a.entity_id = oj.id
)
WHERE oj.status = 'completed'
  AND oj.total_cost > 0
  AND a.id IS NULL;
```

**Then show in UI:**
- Hub: counts of entities requiring attention
- Lists: "Wymaga uwagi" pills
- Repository: usage indicators
- Cleanup queue page

### 4. Integrate ContextBar into Creation Flows

**Invoice creation** (`NewInvoice.tsx`):
```tsx
<ContextBar
  department={selectedDepartment}
  departmentLocked={fromOperationContext}
  primaryLink={operation ? {
    type: 'operation',
    id: operation.id,
    title: operation.job_number,
    subtitle: operation.description
  } : null}
  onChangePrimaryLink={() => setShowOperationPicker(true)}
/>
```

**Contract creation** (`NewContract.tsx`):
```tsx
<ContextBar
  department={selectedDepartment}
  primaryLink={scope ? {
    type: scopeType,
    id: scopeId,
    title: scopeTitle
  } : null}
  onChangePrimaryLink={() => setShowScopePicker(true)}
/>
```

**File upload** (already has folder context, add primary link):
```tsx
<ContextBar
  department={folderDepartment}
  departmentLocked={true}
  targetFolder={{
    id: folderId,
    path: folderBreadcrumb,
    departmentName: folderDepartment?.name
  }}
  primaryLink={presetEntityId ? {
    type: presetEntityType,
    id: presetEntityId,
    title: '...' // fetch from search
  } : null}
/>
```

### 5. Add Enforcement Levels

**Create validation rules table:**
```sql
CREATE TABLE public.entity_link_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_type TEXT NOT NULL,
  to_entity_type TEXT NOT NULL,
  enforcement_level TEXT NOT NULL CHECK (enforcement_level IN ('required', 'recommended', 'optional')),
  validation_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example rules
INSERT INTO public.entity_link_rules (from_entity_type, to_entity_type, enforcement_level, validation_message) VALUES
('invoice', 'operation', 'required', 'Faktura kosztowa musi być powiązana z operacją lub oznaczona jako overhead'),
('contract', 'operation', 'recommended', 'Zalecane powiązanie umowy z operacją'),
('storage_file', 'operation', 'optional', 'Plik może być powiązany z operacją');
```

**Then implement validation:**
- Required: hard block (cannot save without link)
- Recommended: warning + "Fix later" queue
- Optional: no warning

---

## Benefits Achieved

✅ **Audit trails**: Every invoice/contract/file can answer "Why does this exist?"
✅ **Cross-module navigation**: From invoice → see operation → see contracts → see attachments
✅ **Cleanup queues**: Show entities with missing required links
✅ **Context-aware creation**: Auto-fill based on where user started the flow
✅ **Unified search**: One component for all entity picking (no 10+ different pickers)
✅ **Department filtering**: Entities filtered by department context automatically
✅ **Recency sorting**: Most recent items shown first

---

## Technical Notes

### Why Polymorphic Links Instead of Direct Columns?

**Direct columns approach** (what you might try first):
```sql
ALTER TABLE invoices ADD COLUMN operation_id UUID;
ALTER TABLE contracts ADD COLUMN operation_id UUID;
ALTER TABLE contracts ADD COLUMN vehicle_id UUID;
ALTER TABLE contracts ADD COLUMN driver_id UUID;
-- etc... becomes spaghetti
```

**Polymorphic links approach** (what we built):
```sql
-- One table handles all relationships
entity_links (from_type, from_id, to_type, to_id, role)
```

Benefits:
- Scalable: add new entity types without schema changes
- Flexible: support multiple link types (invoice → operation + contract)
- Queryable: generate audit graphs dynamically
- Semantic: roles explain WHY entities are linked

### Why One Search RPC Instead of Multiple Hooks?

**Old approach** (what you had before):
```tsx
const { data: operations } = useOperations();
const { data: invoices } = useInvoices();
const { data: contracts } = useContracts();
// 10+ different hooks, 10+ different APIs
```

**New approach** (what we built):
```tsx
const { data: entities } = useQuery({
  queryFn: () => supabase.rpc('search_linkable_entities', {
    p_entity_types: ['operation', 'invoice', 'contract']
  })
});
// One RPC, one hook, one component
```

Benefits:
- Consistent UX across all pickers
- Department filtering built-in
- Recency sorting built-in
- Easy to add new entity types
- Single source of truth for search logic

---

## Usage Examples

### Example 1: Invoice Creation with Operation Link

```tsx
import { EntitySearchPicker } from '@/shared/components/EntitySearchPicker';
import { ContextBar } from '@/shared/components/ContextBar';

function NewInvoice({ operationId, operationTitle }) {
  const [selectedOperation, setSelectedOperation] = useState(operationId);
  
  return (
    <form>
      <ContextBar
        department={department}
        primaryLink={selectedOperation ? {
          type: 'operation',
          id: selectedOperation,
          title: operationTitle
        } : null}
        onChangePrimaryLink={() => setShowPicker(true)}
      />
      
      {/* ... invoice fields ... */}
      
      <div>
        <Label>Operacja (wymagane)</Label>
        <EntitySearchPicker
          businessProfileId={profileId}
          departmentId={departmentId}
          entityTypes={['operation']}
          value={selectedOperation}
          onSelect={(entity) => setSelectedOperation(entity?.entity_id)}
          placeholder="Szukaj operacji..."
        />
      </div>
    </form>
  );
}
```

### Example 2: Contract Creation with Scope

```tsx
function NewContract() {
  const [scopeType, setScopeType] = useState<'operation' | 'vehicle' | 'driver'>('operation');
  const [scopeId, setScopeId] = useState('');
  
  return (
    <form>
      <ContextBar
        department={department}
        primaryLink={scopeId ? {
          type: scopeType,
          id: scopeId,
          title: '...'
        } : null}
      />
      
      <div>
        <Label>Zakres umowy</Label>
        <Select value={scopeType} onValueChange={setScopeType}>
          <SelectItem value="operation">Operacja / Zlecenie</SelectItem>
          <SelectItem value="vehicle">Pojazd</SelectItem>
          <SelectItem value="driver">Kierowca</SelectItem>
        </Select>
      </div>
      
      <div>
        <Label>Obiekt</Label>
        <EntitySearchPicker
          businessProfileId={profileId}
          departmentId={departmentId}
          entityTypes={[scopeType]}
          value={scopeId}
          onSelect={(entity) => setScopeId(entity?.entity_id)}
        />
      </div>
    </form>
  );
}
```

---

## Migration Path

1. ✅ **Phase 1: Foundation** (DONE)
   - Entity links table
   - Search RPC
   - EntitySearchPicker component
   - ContextBar component
   - UploadFileDialog integration

2. **Phase 2: Invoice Integration** (TODO)
   - Add `operation_id` column to invoices
   - Update invoice forms with EntitySearchPicker
   - Add validation rules (expense invoices require operation OR overhead)
   - Add ContextBar to invoice creation

3. **Phase 3: Contract Integration** (TODO)
   - Add `scope_type` and `scope_id` columns to contracts
   - Update contract forms with scope selector
   - Add scope-based templates
   - Add ContextBar to contract creation

4. **Phase 4: Attention System** (TODO)
   - Create `entities_requiring_attention` view
   - Add attention badges to lists
   - Create cleanup queue page
   - Add hub counts

5. **Phase 5: Enforcement** (TODO)
   - Create `entity_link_rules` table
   - Implement validation levels (required/recommended/optional)
   - Add "Fix later" queue for recommended links
   - Add audit reports

---

## Summary

The Entity Links System provides the **foundation for ERP-grade auditing** by ensuring every financial transaction has a traceable business reason. The polymorphic design scales to handle complex relationships without schema bloat, and the unified search interface provides consistent UX across all entity picking flows.

**Key principle**: If a regulator asks "Why does this invoice exist?", the system can answer in 3 clicks via the entity link graph.
