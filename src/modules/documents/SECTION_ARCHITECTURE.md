# Section-Based Document Architecture

## Overview

The document system now separates **(1) view identity**, **(2) routing**, and **(3) presentation theme** to create distinct workspaces for different document types.

Instead of "one documents page with a left folder list", the system provides **section-specific experiences**:
- **Contracts** - Lifecycle-first (validity, signatures, counterparties)
- **Financial** - KPI-first (amounts, VAT, settlements)
- **Operations** - Job-scoped (execution, protocols, incidents)
- **Audit** - Compliance-first (findings, controls, severity)

---

## Canonical Routes

### Section-Level Routes

Each section has its own canonical route structure:

```
/documents/contracts          → Contracts list page
/documents/contracts/:id      → Contract detail page

/documents/financial          → Financial documents list
/documents/financial/:id      → Financial document detail

/documents/operations         → Operations documents list
/documents/operations/:id     → Operations document detail

/documents/audit              → Audit documents list
/documents/audit/:id          → Audit document detail
```

### Benefits

✅ **Deep-linking** - Share direct links to specific sections  
✅ **Breadcrumbs** - Clear navigation hierarchy  
✅ **Correct "New" context** - Button knows which section you're in  
✅ **Stable URLs** - Support/debugging friendly  
✅ **SEO-friendly** - Each section is indexable  

---

## ViewDefinition System

Each section is configured via a `ViewDefinition` object that defines:

### 1. Identity & Theme

```typescript
{
  section: 'financial',
  route: '/documents/financial',
  title: 'Dokumenty finansowe',
  subtitle: 'Dowody księgowe i rozliczenia',
  description: 'Dowody księgowe i rozliczenia powiązane z fakturami...',
  
  theme: {
    accentColor: '#10b981',
    accentColorLight: '#d1fae5',
    icon: DollarSign,
    iconColor: '#10b981',
    badgeVariant: 'secondary',
  }
}
```

### 2. KPI Metrics

Section-specific metrics displayed as cards:

```typescript
metrics: [
  {
    id: 'to_settle',
    label: 'Do rozliczenia',
    description: 'Dokumenty oczekujące na rozliczenie',
    queryKey: 'financial_to_settle',
    format: 'amount',
    icon: DollarSign,
    color: '#f59e0b',
  },
  // ... more metrics
]
```

**Financial Section KPIs:**
- Do rozliczenia (amount)
- Wygasa w 30 dni (count)
- Brak załącznika do faktury (count)
- Spory/niezgodności (count)

**Contracts Section KPIs:**
- Aktywne umowy (count)
- Do podpisu (count)
- Wygasa w 60 dni (count)
- Brak wymaganej zgody (count)

**Operations Section KPIs:**
- Zlecenia bez protokołu (count)
- Incydenty (count)
- POD brak (count)
- Aktywne zlecenia (count)

### 3. Table Columns

Section-specific columns with priority:

```typescript
tableColumns: [
  { 
    id: 'document', 
    label: 'Dokument', 
    field: 'title', 
    sortable: true, 
    priority: 'primary' 
  },
  { 
    id: 'invoice', 
    label: 'Powiązana faktura', 
    field: 'invoice_number', 
    format: 'link', 
    priority: 'primary' 
  },
  { 
    id: 'amount_net', 
    label: 'Kwota netto', 
    field: 'amount_net', 
    format: 'amount', 
    priority: 'primary' 
  },
  // ... more columns
]
```

**Priority Levels:**
- `primary` - Always visible
- `secondary` - Hidden on mobile
- `tertiary` - Hidden on tablet and below

### 4. Quick Filters

Contextual filters as chips:

```typescript
quickFilters: [
  { id: 'vat', label: 'VAT', field: 'has_vat', value: true },
  { id: 'no_vat', label: 'Bez VAT', field: 'has_vat', value: false },
  { id: 'net', label: 'Netto', field: 'view_mode', value: 'net' },
  { id: 'gross', label: 'Brutto', field: 'view_mode', value: 'gross' },
  { 
    id: 'missing_evidence', 
    label: 'Brak dowodu', 
    field: 'has_evidence', 
    value: false, 
    badge: true 
  },
]
```

### 5. Allowed Blueprints

Section determines which document types can be created:

```typescript
allowedBlueprintIds: [
  'job_settlement',
  'invoice_attachment',
  'expense_report',
  'financial_statement'
]
```

### 6. Primary CTA

Section-specific "New" button:

```typescript
primaryCTA: {
  label: 'Dodaj dowód księgowy',
  description: 'Dodaj nowy dokument finansowy lub rozliczenie',
}
```

### 7. Empty State

Custom empty state per section:

```typescript
emptyState: {
  title: 'Brak dokumentów finansowych',
  description: 'Dodaj pierwszy dowód księgowy lub powiąż dokument z fakturą.',
}
```

---

## Section Themes

Each section has a distinct visual identity without being a "neon casino":

| Section | Accent Color | Icon | Badge Style |
|---------|-------------|------|-------------|
| Contracts | `#3b82f6` (blue) | FileText | default |
| Financial | `#10b981` (green) | DollarSign | secondary |
| Operations | `#f59e0b` (amber) | Truck | outline |
| Audit | `#6366f1` (indigo) | FileSearch | outline |
| Decisions | `#8b5cf6` (purple) | Award | secondary |

**Theme Tokens:**
- `accentColor` - Primary color for buttons, badges, highlights
- `accentColorLight` - Light background for cards
- `icon` - Lucide icon component
- `iconColor` - Icon color (usually matches accent)
- `badgeVariant` - Badge style variant

---

## Contextual "New" Button

The "New" button adapts based on current section:

```typescript
// On /documents/financial
<Button onClick={() => openModal('financial')}>
  <Plus /> Dodaj dowód księgowy
</Button>

// On /documents/contracts
<Button onClick={() => openModal('contracts')}>
  <Plus /> Nowa umowa
</Button>

// On /documents/operations
<Button onClick={() => openModal('operations')}>
  <Plus /> Nowy dokument zlecenia
</Button>
```

**Modal Behavior:**
1. Route determines `activeSection`
2. `activeSection` determines allowed blueprints
3. Blueprint picker shows only valid blueprints for section
4. Default placement is computed from blueprint + section
5. User can override placement only within `allowed_views`

---

## Document Model

Documents have a `primary_section` field for deterministic routing:

```typescript
interface Document {
  id: string;
  title: string;
  primary_section: DocumentSection; // 'contracts' | 'financial' | 'operations' | 'audit'
  status: string;
  // ... other fields
}
```

**Routing Logic:**

```typescript
// If document has primary_section = 'financial'
// → Route is /documents/financial/:id

// If user navigates to /documents/contracts/:id
// but document.primary_section = 'financial'
// → Auto-redirect to /documents/financial/:id
```

This ensures **canonical URLs** - each document has exactly one correct route.

---

## Section-Specific Layouts

### Financial Section

**KPI-first layout:**

```
┌─────────────────────────────────────────────────────┐
│ Dokumenty finansowe                                 │
│ Dowody księgowe i rozliczenia                       │
└─────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Do       │ │ Wygasa   │ │ Brak     │ │ Spory/   │
│ rozlicz. │ │ w 30 dni │ │ załączn. │ │ niezgodn.│
│ 45,230 zł│ │ 12       │ │ 8        │ │ 3        │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

[VAT] [Bez VAT] [Netto] [Brutto] [Przychody] [Wydatki]

┌─────────────────────────────────────────────────────┐
│ Dokument | Faktura | Netto | Brutto | VAT | Status │
├─────────────────────────────────────────────────────┤
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

### Contracts Section

**Lifecycle-first layout:**

```
┌─────────────────────────────────────────────────────┐
│ Umowy i kontrakty                                   │
│ Zarządzanie umowami, kontraktami i zobowiązaniami   │
└─────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Aktywne  │ │ Do       │ │ Wygasa   │ │ Brak     │
│ umowy    │ │ podpisu  │ │ w 60 dni │ │ zgody    │
│ 23       │ │ 5        │ │ 8        │ │ 2        │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

[Aktywne] [Projekty] [Wygasłe] [Wymaga decyzji]

┌─────────────────────────────────────────────────────┐
│ Umowa | Kontrahent | Od | Do | Status | Decyzja    │
├─────────────────────────────────────────────────────┤
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

### Operations Section

**Job-scoped layout:**

```
┌─────────────────────────────────────────────────────┐
│ Dokumenty operacyjne                                │
│ Dokumenty związane z realizacją zleceń              │
└─────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Zlecenia │ │ Incydenty│ │ POD brak │ │ Aktywne  │
│ bez prot.│ │          │ │          │ │ zlecenia │
│ 7        │ │ 3        │ │ 12       │ │ 45       │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

[Zlecenia] [Protokoły] [Incydenty] [Brak protokołu]

┌─────────────────────────────────────────────────────┐
│ Nr zlec. | Typ dok. | Kierowca | Pojazd | Status   │
├─────────────────────────────────────────────────────┤
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Files

### Core Types
- `src/modules/documents/types/sections.ts` - ViewDefinition, SectionTheme, MetricCard, TableColumn, QuickFilter

### Components
- `src/modules/documents/screens/SectionDocumentsPage.tsx` - Main section list page
- `src/modules/documents/screens/DocumentDetailPage.tsx` - Section-aware detail page
- `src/modules/contracts/components/ContractNewModal.tsx` - Section-contextual modal

### Routes
- `src/shared/config/routes.tsx` - Section-based route definitions

---

## Migration Path

### Phase 1: Routes & Views ✅
- ✅ Add `/documents/:section` routes
- ✅ Create `ViewDefinition` config per section
- ✅ Build `SectionDocumentsPage` component
- ✅ Build `DocumentDetailPage` with auto-redirect

### Phase 2: Data Model
- ⏳ Add `primary_section` to documents table
- ⏳ Migrate existing documents to correct sections
- ⏳ Add validation: prevent cross-section placement

### Phase 3: KPI Queries
- ⏳ Implement section-specific KPI queries
- ⏳ Add real-time metric updates
- ⏳ Add threshold warnings (yellow/red)

### Phase 4: Table Implementation
- ⏳ Build dynamic table with section columns
- ⏳ Add sorting, filtering, pagination
- ⏳ Implement responsive column hiding

### Phase 5: Legacy Cleanup
- ⏳ Redirect `/contracts` → `/documents/contracts`
- ⏳ Remove old `DocumentsHub` component
- ⏳ Update all internal links

---

## Key Rules

### 1. Section Route Controls Placement

**Non-negotiable:** The user should not be able to create a "financial" doc from Contracts section unless it's an explicit cross-link workflow.

```typescript
// ✅ Correct
// User on /documents/financial
// → Modal shows: job_settlement, invoice_attachment, expense_report

// ❌ Wrong
// User on /documents/financial
// → Modal shows: framework_contract (belongs to contracts section)
```

### 2. Document Has One Canonical Route

```typescript
// Document with primary_section = 'financial'
// ✅ Correct route: /documents/financial/abc-123
// ❌ Wrong route: /documents/contracts/abc-123 (auto-redirects)
```

### 3. Folders Are Filters, Not Sections

Legacy "folders" become **filters within sections**, not separate workspaces:

```typescript
// ✅ Correct
/documents/financial?folder=invoices

// ❌ Wrong
/documents/invoices (no section context)
```

---

## Benefits Achieved

✅ **Clear mental model** - "I'm in Financial, I see financial things"  
✅ **No cross-contamination** - Contracts don't appear in Financial  
✅ **Contextual actions** - "New" button knows where you are  
✅ **Scalable** - Easy to add new sections (e.g., HR documents)  
✅ **SEO-friendly** - Each section is a distinct page  
✅ **Deep-linkable** - Share direct links to sections/documents  
✅ **Consistent UI** - Same layout, different content emphasis  
✅ **Performance** - Load only relevant data per section  

---

## Example: Adding a New Section

To add a new section (e.g., "HR Documents"):

1. **Add to `sections.ts`:**

```typescript
export type DocumentSection = 'contracts' | 'financial' | 'operations' | 'audit' | 'hr';

export const SECTION_VIEWS: Record<DocumentSection, ViewDefinition> = {
  // ... existing sections
  hr: {
    section: 'hr',
    route: '/documents/hr',
    title: 'Dokumenty HR',
    subtitle: 'Dokumenty kadrowe i pracownicze',
    theme: {
      accentColor: '#ec4899',
      accentColorLight: '#fce7f3',
      icon: Users,
      iconColor: '#ec4899',
      badgeVariant: 'outline',
    },
    metrics: [
      { id: 'contracts_expiring', label: 'Umowy wygasające', ... },
      { id: 'missing_documents', label: 'Brak dokumentów', ... },
    ],
    tableColumns: [
      { id: 'employee', label: 'Pracownik', field: 'employee_name', ... },
      { id: 'document_type', label: 'Typ', field: 'document_type', ... },
    ],
    quickFilters: [
      { id: 'employment', label: 'Umowy o pracę', ... },
      { id: 'certificates', label: 'Zaświadczenia', ... },
    ],
    allowedBlueprintIds: ['employment_contract', 'certificate', 'leave_request'],
    primaryCTA: { label: 'Nowy dokument HR' },
    emptyState: { title: 'Brak dokumentów HR', ... },
  },
};
```

2. **Add routes in `routes.tsx`:**

```typescript
{
  path: '/documents/hr',
  element: <SectionDocumentsPage />,
  guard: 'protected',
  title: 'Dokumenty HR',
  icon: 'Users',
  section: 'documents',
},
{
  path: '/documents/hr/:id',
  element: <DocumentDetailPage />,
  guard: 'protected',
  hideInNav: true,
},
```

3. **Add blueprints in `blueprints.ts`:**

```typescript
{
  id: 'employment_contract',
  name_pl: 'Umowa o pracę',
  primary_section: 'hr',
  allowed_views: ['hr_contracts', 'hr_active'],
  default_view_id: 'hr_contracts',
  // ... rest of blueprint
}
```

4. **Done!** The system automatically:
- Shows HR section in nav
- Filters blueprints correctly
- Applies HR theme
- Routes documents correctly

---

## Summary

The section-based architecture transforms the document system from "one page with folders" into **distinct workspaces** with their own:
- Visual identity (colors, icons, badges)
- KPIs (metrics that matter for that section)
- Table columns (fields relevant to that context)
- Quick filters (common queries for that section)
- Allowed document types (blueprints valid for that section)

This makes the system **scalable**, **maintainable**, and **user-friendly** while enforcing **deterministic placement** and **canonical routing**.
