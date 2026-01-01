# Document Blueprint System

## Philosophy: Document ≠ File

**Core Principle**: Stop treating documents as "one universal form". Treat them as **Document Blueprints** + **Context-aware Create flow**.

A Blueprint defines **how a document behaves in the system** (not just content).

---

## Architecture

### 1. Document Blueprint (Template Metadata)

Blueprint fields define behavior:

```typescript
interface DocumentBlueprint {
  // Identity
  id: string;
  name: string;
  name_pl: string;
  description: string;
  
  // Classification
  document_type: DocumentType;
  category: BlueprintCategory;
  
  // Section compatibility (where can this be created?)
  sections: DocumentSection[];
  primary_section: DocumentSection;
  
  // Scope & linking requirements
  default_scope: DocumentScope;
  required_links: {
    job?: boolean;
    client?: boolean;
    invoice?: boolean;
    decision?: boolean;
    vehicle?: boolean;
    driver?: boolean;
  };
  
  // Required fields
  required_fields: {
    valid_from?: boolean;
    valid_to?: boolean;
    amount?: boolean;
    currency?: boolean;
  };
  
  // Gating rules
  requires_decision?: {
    required: boolean;
    decision_types?: string[];
    blocks_activation?: boolean;
  };
  
  financial_impact?: {
    has_impact: boolean;
    requires_amount?: boolean;
    auto_create_accounting_entry?: boolean;
  };
  
  audit_flags?: {
    is_internal_only?: boolean;
    requires_evidence?: boolean;
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // Lifecycle
  status_flow: DocumentStatus[];
  expires?: boolean;
  requires_signature?: boolean;
  auto_lock_on_complete?: boolean;
  
  // Auto-generation
  generator?: {
    auto_number?: boolean;
    number_prefix?: string; // e.g., 'TR-', 'INV-'
  };
}
```

---

## 2. Context-Aware Creation

When user clicks "New Document" inside a section, context is automatically inherited:

```typescript
interface DocumentCreationContext {
  section: DocumentSection; // operations | contracts | decisions | financial | audit
  department_template_id: string;
  business_profile_id: string;
  
  // Optional pre-filled links
  job_id?: string;
  client_id?: string;
  invoice_id?: string;
  contract_id?: string;
  vehicle_id?: string;
  driver_id?: string;
}
```

**Result**:
- Blueprint picker shows only templates valid for that section
- Form defaults and required links are prefilled
- Document appears in currently opened list/filter automatically

---

## 3. Two-Stage Creation Flow

### Stage A: "What are you creating?"

Grid of recommended blueprints with badges:
- 🔴 Requires decision
- 💰 Financial impact
- 🔒 Audit-only
- ⏰ Expires
- 📋 Requires job link

### Stage B: "Minimal required fields"

Dynamic form based on blueprint schema:
- Shows only relevant inputs
- Prefills what's known from context
- Hides irrelevant fields

---

## 4. Gating Panels (Modular)

### A. Decision Gate Panel
Only shown if `blueprint.requires_decision.required === true`

- Shows required decision type(s)
- Auto-selects default decision if allowed
- Blocks "Activate" until satisfied
- Logs decision link in history

### B. Financial Panel
Only shown if `blueprint.financial_impact.has_impact === true`

- Amount, currency, VAT mode
- Link to invoice/expense entry
- Option: "Create accounting entry on publish"

### C. Audit Panel
Always available but optional

- "Internal only" flag
- Risk flags
- Compliance checklist
- Attach evidence files

---

## 5. Transport Operations Blueprints (13 total)

### Operations Execution (4)
1. **Transport Order** (`transport_order`)
   - Requires: job, client
   - Financial impact: amount required
   - Auto-number: TR-YYYY-XXXX
   - Signature required

2. **Handover Protocol** (`handover_protocol`)
   - Requires: job
   - Signature required
   - Auto-locks on complete

3. **Execution Card** (`execution_card`)
   - Requires: job, driver, vehicle
   - Auto-locks on complete

4. **Incident Report** (`incident_report`)
   - Optional job link
   - Audit flags: requires evidence, medium risk

### Contracts (2)
5. **Framework B2B Contract** (`framework_contract_b2b`)
   - Requires: client, decision
   - Financial impact: amount + VAT
   - Decision gate: blocks activation
   - Expires: yes

6. **Single Order** (`single_order`)
   - Requires: client, job
   - Financial impact: amount

### Compliance (3)
7. **Carrier Insurance** (`carrier_insurance`)
   - Scope: department
   - Expires: yes

8. **Driver License** (`driver_license`)
   - Requires: driver
   - Expires: yes

9. **Vehicle Documents** (`vehicle_documents`)
   - Requires: vehicle
   - Expires: yes

### Financial (2)
10. **Job Settlement** (`job_settlement`)
    - Requires: job
    - Financial impact: amount + VAT + cost center
    - Auto-creates accounting entry

11. **Invoice Attachment / POD** (`invoice_attachment`)
    - Optional: invoice, job

### Audit (1)
12. **Audit Note** (`audit_note`)
    - Audit flags: internal only, requires evidence

---

## 6. Section Compatibility

Each blueprint defines which sections it can be created in:

| Blueprint | Operations | Contracts | Decisions | Financial | Audit |
|-----------|-----------|-----------|-----------|-----------|-------|
| Transport Order | ✅ | ✅ | ❌ | ❌ | ❌ |
| Framework Contract | ❌ | ✅ | ❌ | ❌ | ❌ |
| Incident Report | ✅ | ❌ | ❌ | ❌ | ✅ |
| Job Settlement | ✅ | ❌ | ❌ | ✅ | ❌ |
| Audit Note | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 7. Deterministic Document Placement

When creating, system computes:
- **primary_section**: Where it should appear
- **primary_view**: Which list filter
- **secondary_tags**: Also appear under job/client

Example:
Creating "Protokół przekazania" inside Job → appears in:
- Operations > Job > Dokumenty (primary)
- Umowy > Dokumenty operacyjne (secondary, optional)

Implementation: store `primary_scope` plus `linked_entities`.

---

## 8. Smart Defaults (Personalization Rules)

Without AI, system drives smart defaults:

```typescript
if (section === 'contracts') {
  defaultBlueprintGroup = 'contractual';
}

if (insideJob) {
  defaultLink = job_id;
  autoNumbering = `TR-${year}-${sequence}`;
}

if (blueprintType === 'financial') {
  showCurrencyVAT = true;
  hideLegalBlock = true;
}

if (requiresDecision) {
  lockActiveToggle = true; // Until decision linked
}

if (auditorial) {
  markAsInternal = true;
  restrictVisibilityByRole = true;
}
```

---

## 9. Files Created

1. **`types/blueprints.ts`** - Blueprint type system + 13 transport blueprints
2. **`components/BlueprintPicker.tsx`** - Stage A: Choose blueprint
3. **`components/DocumentFormFields.tsx`** - Stage B: Dynamic form with gating panels
4. **`components/ContextAwareDocumentDialog.tsx`** - Two-stage creation flow
5. **`screens/DocumentsHub.tsx`** - Integrated with context-aware dialog

---

## 10. Usage Example

### In Operations Section (inside a job)

```typescript
<ContextAwareDocumentDialog
  open={open}
  onOpenChange={setOpen}
  context={{
    section: 'operations',
    department_template_id: 'transport_operations',
    business_profile_id: profileId,
    job_id: 'job-123', // Pre-filled
    user_id: userId,
  }}
/>
```

**Result**:
- Shows only operations-compatible blueprints
- Blueprints requiring job link are enabled
- Blueprints requiring client/invoice are disabled (not in context)
- Created document auto-links to job-123
- Appears in Operations > Job > Documents

### In Contracts Section (no job context)

```typescript
context={{
  section: 'contracts',
  department_template_id: 'transport_operations',
  business_profile_id: profileId,
  // No job_id
}}
```

**Result**:
- Shows contract-compatible blueprints
- "Transport Order" disabled (requires job)
- "Framework B2B Contract" enabled
- Decision gate shown (required for contracts)

---

## 11. Benefits

1. **No code duplication**: One blueprint = many instances
2. **Context-aware**: Right templates for right section
3. **Smart defaults**: Auto-fill from context
4. **Gating enforcement**: Decision/financial/audit rules enforced
5. **Deterministic placement**: Documents always land in correct section
6. **Scalable**: Add new blueprint = instant new document type
7. **Type-safe**: Full TypeScript support

---

## 12. Next Steps

**Phase 1 (Immediate)**:
- ✅ Blueprint system created
- ✅ Two-stage creation flow
- ✅ Context-aware dialog
- ⏳ Apply database migration
- ⏳ Add to routes

**Phase 2 (High Value)**:
- Decision gate enforcement (block activation)
- Financial panel with accounting entry creation
- Audit panel with evidence attachments
- Document detail drawer

**Phase 3 (Enterprise)**:
- Blueprint versioning
- Custom blueprints per department
- Workflow automation
- Template generation (docx/pdf)

---

## Mental Model Shift

**Before**: "One universal form for all documents"
**After**: "Blueprint defines behavior, context fills the blanks"

This is how modern systems work (Notion, Airtable, etc.) - templates with smart defaults, not generic forms.
