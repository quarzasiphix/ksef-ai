# Documents System Implementation Plan

## Overview

This document outlines the complete implementation of the templated, contextual document system based on the principle: **Section (top-level) → Folder (curated view) → Doc Type (template) → Links (domain entities)**.

---

## ✅ Phase 1: Foundation (COMPLETED)

### 1.1 Enhanced Document Schema ✅

**File:** `src/modules/documents/types/documentSchema.ts`

**Key Entities:**

```typescript
Document {
  section: DocumentSection;           // contracts | financial | operations | audit
  folder_id?: string;                 // Smart folder assignment
  doc_type_id: string;                // Type of document
  template_id?: string;               // Template used
  requires_decision: boolean;         // Needs approval
  requires_financials: boolean;       // Has financial implications
  tags: string[];                     // Search tags
}

DocumentFolder {
  section: DocumentSection;
  default_filters: {...};             // Auto-applied filters
  helper_text: string;                // Contextual lead text
  helper_chips: string[];             // Quick info chips
}

DocumentType {
  required_links: EntityLink[];       // Must link to job/invoice/etc
  required_fields: string[];          // Mandatory fields
  required_attachments: {...}[];      // File requirements
}

DocumentTemplate {
  schema_json: {
    blocks: TemplateBlock[];          // Form sections
    required_fields: string[];
  };
  status_flow: {...}[];               // Allowed transitions
}

DocumentLink {
  entity_type: EntityType;            // job | invoice | decision | vehicle | driver
  entity_id: string;
  role: LinkRole;                     // primary | reference | approval | evidence
}
```

**Benefits:**
- Clear separation of concerns
- Polymorphic entity linking
- Template-driven forms
- Compliance tracking built-in

---

### 1.2 Smart Folders System ✅

**File:** `src/modules/documents/types/smartFolders.ts`

**Concept:** Folders are NOT arbitrary tags - they're opinionated, curated views with:
- Contextual descriptions
- Auto-applied filters
- Helper text and chips
- Suggested templates
- Quick actions

**Operations Section Folders (Transport Department):**

1. **Zlecenia** - Job orders
2. **Dokumenty przewozowe** - CMR, waybills, POD
3. **Dokumenty zwierząt** - Passports, vaccinations, microchips
4. **Zgodności / Licencje** - Carrier licenses, TRACES, permits
5. **Pojazdy** - Insurance, inspections, service records
6. **Kierowcy** - Licenses, training, medical exams
7. **Incydenty** - Damage reports, complaints

**Each folder includes:**
```typescript
{
  helper_text: "Dokumenty wymagane do realizacji...",
  helper_chips: [
    "Wymagane do zamknięcia zlecenia: CMR + POD",
    "Powiązania: Zlecenie (wymagane), Kierowca, Pojazd"
  ],
  filters: {
    doc_types: ['cmr', 'waybill', 'pod'],
    linked_entity_types: ['job', 'driver', 'vehicle']
  },
  suggested_templates: ['cmr', 'waybill', 'pod']
}
```

---

### 1.3 DocumentsShell Layout ✅

**File:** `src/modules/documents/layouts/DocumentsShell.tsx`

**Purpose:** Persistent sidebar that never disappears when navigating within /documents/*

**Features:**
- Hub link (Centrum dokumentów)
- Section navigation with icons and colors
- Folder list (when section selected)
- Mobile responsive with Sheet
- Active state highlighting

**Layout Structure:**
```
┌─────────────────────────────────────┐
│ [Sidebar]  │  [Content Area]        │
│            │                        │
│ Hub        │  <Outlet />            │
│ ─────      │                        │
│ Sections   │  (Hub / Section /      │
│ • Contracts│   Folder / Detail)     │
│ • Financial│                        │
│ • Ops      │                        │
│            │                        │
│ Folders    │                        │
│ • Zlecenia │                        │
│ • CMR/POD  │                        │
└─────────────────────────────────────┘
```

---

### 1.4 Updated Routes ✅

**File:** `src/shared/config/routes.tsx`

**Structure:**
```typescript
{
  path: '/documents',
  element: <DocumentsShell />,      // Wrapper with sidebar
  children: [
    { path: '', element: <DocumentsHubRedesigned /> },
    { path: 'contracts', element: <SectionDocumentsPage /> },
    { path: 'contracts/:id', element: <DocumentDetailPage /> },
    { path: 'financial', element: <SectionDocumentsPage /> },
    // ... etc
  ]
}
```

**Benefits:**
- Sidebar persists across all /documents/* routes
- Clean nested routing
- No layout shift when navigating

---

## 🔄 Phase 2: Section Pages (IN PROGRESS)

### 2.1 Enhanced SectionDocumentsPage

**Current:** Basic section page with KPI cards
**Needed:** Hero strip + contextual KPIs + folder integration

**Hero Strip (Section-Specific):**

```typescript
// Contracts Section
Hero {
  title: "Umowy i kontrakty",
  subtitle: "Zarządzanie umowami, kontraktami i zobowiązaniami",
  description: "Pełna kontrola nad cyklem życia umów: od projektu przez podpis, realizację, do archiwizacji.",
  emphasis: "obligations, signatures, renewals"
}

// Financial Section
Hero {
  title: "Dokumenty finansowe",
  subtitle: "Dowody księgowe i rozliczenia",
  description: "Dowody księgowe i rozliczenia powiązane z fakturami i kosztami. Kontrola VAT, rozliczenia, i zgodność z księgowością.",
  emphasis: "amounts, VAT, settlement, due dates"
}

// Operations Section
Hero {
  title: "Dokumenty operacyjne",
  subtitle: "Dokumenty zleceń i realizacji",
  description: "Dokumenty związane z realizacją zleceń: zlecenia transportowe, protokoły, karty realizacji, incydenty.",
  emphasis: "jobs, documents per job, manifests, checklists"
}
```

**Section-Specific KPIs:**

Already defined in `sections.ts`, now need to:
1. Implement real queries
2. Add threshold warnings (yellow/red)
3. Make clickable to filter

---

### 2.2 Folder View Page

**Route:** `/documents/:section/folders/:folderId`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ [Folder Icon] Dokumenty przewozowe                  │
│ CMR, listy przewozowe, POD                          │
├─────────────────────────────────────────────────────┤
│ ℹ️ Dokumenty wymagane do realizacji i zamknięcia   │
│    zleceń transportowych. Powiąż je ze zleceniem,  │
│    kierowcą i pojazdem.                            │
│                                                     │
│ 📌 Wymagane do zamknięcia zlecenia: CMR + POD      │
│ 📌 Powiązania: Zlecenie (wymagane), Kierowca, Poj. │
│ 📌 Statusy: Szkic → Wysłane → Podpisane → Arch.    │
├─────────────────────────────────────────────────────┤
│ [+ CMR / List przewozowy] [+ POD / Potwierdzenie]  │
├─────────────────────────────────────────────────────┤
│ [Search] [Filters: Status, Date, Linked Job]       │
├─────────────────────────────────────────────────────┤
│ Document List (filtered by folder.filters)         │
└─────────────────────────────────────────────────────┘
```

**Key Features:**
- Display folder description (lead text)
- Show helper chips
- Auto-apply folder filters
- Quick create buttons for suggested templates
- Filtered document list

---

## 🚀 Phase 3: Document Creation (NEXT)

### 3.1 Template-Based Creation Modal

**Trigger:** Click "New" button in section/folder

**Flow:**

**Step 1: Context Display (Non-editable)**
```
Creating in: Operations → Dokumenty przewozowe
Auto-set: section, folder, department, business profile
```

**Step 2: Template Selection (Cards)**
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📄 CMR /     │ │ ✅ POD /     │ │ 🚨 Incident  │
│ List przew.  │ │ Potwierdzenie│ │ Report       │
│              │ │              │ │              │
│ Wymagane:    │ │ Wymagane:    │ │ Wymagane:    │
│ • Zlecenie   │ │ • Zlecenie   │ │ • Zlecenie   │
│ • Kierowca   │ │ • POD scan   │ │ • Opis       │
└──────────────┘ └──────────────┘ └──────────────┘
```

**Step 3: Dynamic Form (Based on Template Schema)**

```typescript
template.schema_json.blocks.map(block => (
  <TemplateBlock key={block.id}>
    <h3>{block.name}</h3>
    <p>{block.description}</p>
    {block.fields.map(field => (
      <DynamicField field={field} />
    ))}
  </TemplateBlock>
))
```

**Step 4: Required Links Enforcement**

```
⚠️ Wymagane powiązania:
• Zlecenie (wymagane) - [Select Job]
• Kierowca (opcjonalne) - [Select Driver]
• Pojazd (opcjonalne) - [Select Vehicle]
```

**Step 5: Validation Gate**

```
Cannot mark as Active / Completed without:
✅ Decision X (if requires_decision)
✅ File attachment Y (if required_attachments)
✅ All required_fields filled
✅ All required_links set
```

**Step 6: Save & Navigate**

```
Save → navigate to /documents/operations/:id (detail page)
```

---

### 3.2 Template Schema Implementation

**Example: CMR Template**

```typescript
{
  id: 'cmr_template',
  document_type_id: 'cmr',
  name: 'CMR / List przewozowy',
  schema_json: {
    blocks: [
      {
        id: 'parties',
        name: 'Strony',
        fields: [
          { id: 'sender', label: 'Nadawca', type: 'text', required: true },
          { id: 'consignee', label: 'Odbiorca', type: 'text', required: true },
          { id: 'carrier', label: 'Przewoźnik', type: 'text', required: true }
        ]
      },
      {
        id: 'route',
        name: 'Trasa',
        fields: [
          { id: 'pickup_address', label: 'Adres załadunku', type: 'textarea', required: true },
          { id: 'delivery_address', label: 'Adres dostawy', type: 'textarea', required: true },
          { id: 'pickup_date', label: 'Data załadunku', type: 'date', required: true },
          { id: 'delivery_date', label: 'Data dostawy', type: 'date', required: false }
        ]
      },
      {
        id: 'cargo',
        name: 'Ładunek',
        fields: [
          { id: 'description', label: 'Opis ładunku', type: 'textarea', required: true },
          { id: 'weight', label: 'Waga (kg)', type: 'number', required: true },
          { id: 'packages', label: 'Liczba sztuk', type: 'number', required: false }
        ]
      }
    ]
  },
  required_links: [
    { entity_type: 'job', role: 'primary', required: true },
    { entity_type: 'driver', role: 'reference', required: false },
    { entity_type: 'vehicle', role: 'reference', required: false }
  ],
  required_attachments: [
    { name: 'Signed CMR', description: 'Podpisany CMR', file_types: ['pdf', 'jpg', 'png'] }
  ],
  status_flow: [
    { from: 'draft', to: 'active' },
    { from: 'active', to: 'completed', conditions: ['has_attachment:Signed CMR'] },
    { from: 'completed', to: 'archived' }
  ]
}
```

---

## 📄 Phase 4: Document Detail Hub (NEXT)

### 4.1 Document Detail Page Redesign

**Current:** Basic detail page with title and dates
**Needed:** Hub with links, attachments, compliance, audit trail

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ [← Back] CMR / List przewozowy #12345               │
│ [Active] [Operations] [Dokumenty przewozowe]        │
├─────────────────────────────────────────────────────┤
│ Key Dates: Issued: 2024-12-20 | Valid: 2024-12-25  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🔗 Powiązania                                       │
├─────────────────────────────────────────────────────┤
│ 🚚 Zlecenie: TR/12/2024 (primary)                  │
│ 👤 Kierowca: Jan Kowalski (reference)              │
│ 🚗 Pojazd: WX 12345 (reference)                    │
│ 💵 Faktura: FV/2024/456 (reference)                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📎 Załączniki                                       │
├─────────────────────────────────────────────────────┤
│ ✅ Signed CMR (v2) - 2024-12-25 [Download]         │
│ 📄 Draft CMR (v1) - 2024-12-20 [Download]          │
│ [+ Upload New Version]                              │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ✓ Zgodność                                          │
├─────────────────────────────────────────────────────┤
│ ✅ Powiązane ze zleceniem                           │
│ ✅ Podpisany CMR załączony                          │
│ ✅ Wszystkie wymagane pola wypełnione               │
│ ⚠️ Brak potwierdzenia dostawy (POD)                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📜 Historia                                         │
├─────────────────────────────────────────────────────┤
│ 2024-12-25 14:30 - Status changed: draft → active  │
│ 2024-12-25 14:25 - Attachment added: Signed CMR    │
│ 2024-12-20 10:15 - Document created                │
└─────────────────────────────────────────────────────┘
```

**Key Sections:**

1. **Header** - Title, status, section badge, folder, dates
2. **Links Panel** - All entity relationships with roles
3. **Attachments** - Versioned files with upload
4. **Compliance Checks** - Missing items checklist
5. **Audit Trail** - Who changed what when

---

## 🗄️ Phase 5: Database Migration

### 5.1 New Tables

**documents** (enhanced)
```sql
ALTER TABLE documents ADD COLUMN section text;
ALTER TABLE documents ADD COLUMN folder_id uuid REFERENCES document_folders(id);
ALTER TABLE documents ADD COLUMN doc_type_id uuid REFERENCES document_types(id);
ALTER TABLE documents ADD COLUMN template_id uuid REFERENCES document_templates(id);
ALTER TABLE documents ADD COLUMN requires_decision boolean DEFAULT false;
ALTER TABLE documents ADD COLUMN requires_financials boolean DEFAULT false;
ALTER TABLE documents ADD COLUMN tags text[] DEFAULT '{}';
ALTER TABLE documents ADD COLUMN search_text text;
```

**document_folders** (new)
```sql
CREATE TABLE document_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id uuid REFERENCES business_profiles(id),
  section text NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  order_index integer,
  default_filters jsonb,
  helper_text text,
  helper_chips text[],
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**document_types** (new)
```sql
CREATE TABLE document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  default_folder_id uuid REFERENCES document_folders(id),
  default_status text,
  required_links jsonb,
  required_fields text[],
  required_attachments jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**document_templates** (new)
```sql
CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id uuid REFERENCES document_types(id),
  name text NOT NULL,
  description text,
  schema_json jsonb NOT NULL,
  required_blocks text[],
  required_links jsonb,
  output_modes text[],
  status_flow jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**document_links** (new - polymorphic)
```sql
CREATE TABLE document_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  role text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_document_links_document ON document_links(document_id);
CREATE INDEX idx_document_links_entity ON document_links(entity_type, entity_id);
```

**document_attachments** (enhanced)
```sql
CREATE TABLE document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  version integer DEFAULT 1,
  is_latest boolean DEFAULT true,
  attachment_type text,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz DEFAULT now()
);
```

**document_history** (new)
```sql
CREATE TABLE document_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  action text NOT NULL,
  field_name text,
  old_value jsonb,
  new_value jsonb,
  user_id uuid REFERENCES auth.users(id),
  timestamp timestamptz DEFAULT now(),
  notes text
);
```

---

### 5.2 Seed Data - Transport Department Templates

**Folders:**
```sql
INSERT INTO document_folders (section, name, description, icon, color, order_index, helper_text, helper_chips, is_system) VALUES
('operations', 'Zlecenia', 'Dokumenty zleceń transportowych', 'Truck', '#f59e0b', 1, 'Zlecenia transportowe i dokumenty realizacji...', ARRAY['Powiązane ze zleceniem (wymagane)'], true),
('operations', 'Dokumenty przewozowe', 'CMR, listy przewozowe, POD', 'FileText', '#3b82f6', 2, 'Dokumenty wymagane do realizacji...', ARRAY['Wymagane do zamknięcia: CMR + POD'], true),
-- ... etc
```

**Document Types:**
```sql
INSERT INTO document_types (section, name, description, default_status, required_links) VALUES
('operations', 'CMR / List przewozowy', 'Międzynarodowy list przewozowy', 'draft', '[{"entity_type":"job","role":"primary","required":true}]'),
('operations', 'POD / Potwierdzenie dostawy', 'Proof of Delivery', 'draft', '[{"entity_type":"job","role":"primary","required":true}]'),
-- ... etc
```

**Templates:**
```sql
INSERT INTO document_templates (document_type_id, name, schema_json, required_blocks, output_modes) VALUES
((SELECT id FROM document_types WHERE name = 'CMR / List przewozowy'), 
 'CMR Standard', 
 '{"blocks":[{"id":"parties","name":"Strony","fields":[...]}]}',
 ARRAY['parties', 'route', 'cargo'],
 ARRAY['pdf', 'editor']);
```

---

## 📊 Phase 6: Data Queries & KPIs

### 6.1 Section KPI Queries

**Contracts:**
```typescript
// Active contracts
SELECT COUNT(*) FROM documents 
WHERE section = 'contracts' AND status = 'active';

// Pending signature
SELECT COUNT(*) FROM documents 
WHERE section = 'contracts' AND status = 'awaiting_approval';

// Expiring in 60 days
SELECT COUNT(*) FROM documents 
WHERE section = 'contracts' 
  AND status = 'active'
  AND valid_to BETWEEN NOW() AND NOW() + INTERVAL '60 days';

// Missing decision
SELECT COUNT(*) FROM documents 
WHERE section = 'contracts' 
  AND requires_decision = true 
  AND decision_id IS NULL;
```

**Financial:**
```typescript
// To settle (amount)
SELECT SUM(amount_gross) FROM documents 
WHERE section = 'financial' 
  AND status IN ('active', 'awaiting_approval')
  AND requires_financials = true;

// Missing evidence
SELECT COUNT(*) FROM documents d
LEFT JOIN document_attachments a ON d.id = a.document_id
WHERE d.section = 'financial' 
  AND a.id IS NULL;
```

**Operations:**
```typescript
// Jobs without protocol
SELECT COUNT(DISTINCT j.id) FROM operational_jobs j
LEFT JOIN document_links dl ON dl.entity_id = j.id AND dl.entity_type = 'job'
LEFT JOIN documents d ON d.id = dl.document_id AND d.doc_type_id IN (SELECT id FROM document_types WHERE name LIKE '%protokół%')
WHERE d.id IS NULL;

// Incidents
SELECT COUNT(*) FROM documents 
WHERE section = 'operations' 
  AND doc_type_id IN (SELECT id FROM document_types WHERE name LIKE '%incident%');
```

---

## 🎨 Phase 7: UI Polish

### 7.1 Section Hero Strips

Each section gets a distinct hero with:
- Large icon with section color
- Title and subtitle
- Description emphasizing section purpose
- Quick stats summary
- Primary CTA

### 7.2 Folder Helper Content

Display at top of folder view:
- Icon + folder name
- Description paragraph
- Helper chips (3-5 key points)
- Quick create buttons

### 7.3 Compliance Indicators

Visual badges:
- 🟢 Compliant - All requirements met
- 🟡 Missing recommended - Some optional items missing
- 🔴 Missing required - Blocks completion

### 7.4 Link Badges

Show entity links as colored badges:
- 🚚 Job (primary) - Blue
- 💵 Invoice (reference) - Green
- 🏆 Decision (approval) - Purple
- 👤 Driver (reference) - Teal
- 🚗 Vehicle (reference) - Indigo

---

## 🚀 Implementation Priority

### Immediate (This Session)
✅ Document schema types
✅ Smart folders definitions
✅ DocumentsShell layout
✅ Route restructuring

### Next Session
1. Enhance SectionDocumentsPage with hero strips
2. Create FolderViewPage component
3. Build TemplateCreationModal
4. Implement DynamicFormField component

### Following Session
1. Redesign DocumentDetailPage as hub
2. Add LinksPanel component
3. Add ComplianceChecklist component
4. Add AttachmentsPanel with versioning

### Database Work
1. Create migration files
2. Add new tables
3. Seed transport department templates
4. Migrate existing documents

### Final Polish
1. Implement KPI queries
2. Add real-time stats
3. Polish UI with hero strips
4. Add compliance indicators
5. Test full flow end-to-end

---

## 🎯 Success Criteria

1. **Sidebar never disappears** when navigating /documents/*
2. **Each section feels different** (hero, KPIs, emphasis)
3. **Folders have contextual meaning** (descriptions, filters, suggestions)
4. **Document creation is templated** (cards → form → validation → save)
5. **Documents are hubs** (links, attachments, compliance, history)
6. **Everything is linked** (job → documents → invoices → decisions)
7. **Compliance is visible** (missing items, expiry warnings, blockers)
8. **Routes are canonical** (/documents/:section/:id)

---

## 📝 Key Principles

1. **Section ≠ Folder ≠ Type** - Clear separation
2. **Folders are smart views** - Not arbitrary tags
3. **Templates drive forms** - No generic "add document"
4. **Links are first-class** - Polymorphic relationships
5. **Compliance is enforced** - Required links/fields/attachments
6. **Context is preserved** - Never lose section context
7. **Helper text everywhere** - Lead explanations, chips, suggestions

This system transforms documents from "files in folders" to "controlled objects with meaning, relationships, and compliance requirements".
