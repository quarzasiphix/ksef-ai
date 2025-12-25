# Decisions & Documents Integration - Redesign

## Current Problem

The current setup is confusing because:
1. **Decisions** and **Documents** are separate modules but conceptually linked
2. Users don't understand the relationship between "Decisions" (legal mandates) and "Documents" (files/attachments)
3. Navigation is unclear - should documents be under decisions or separate?
4. The governance concept (decisions authorize operations) is hidden

## Core Concept

**Every operational document traces back to an authorizing decision.**

Think of it like this:
- **Decision** = Legal permission/mandate (e.g., "We can sell services")
- **Contract** = Specific agreement based on that decision
- **Invoice** = Transaction under that contract
- **Document** = Supporting file (PDF, scan, etc.)

## Proposed Solution: Unified "Governance" Module

### Structure

```
📋 Governance (Ład korporacyjny)
├── 🎯 Decisions (Zgody organizacyjne)
│   ├── Active mandates
│   ├── Usage tracking
│   └── Linked contracts/invoices
│
├── 📄 Documents (Dokumenty)
│   ├── Resolutions (Uchwały)
│   ├── Contracts (Umowy)
│   ├── Attachments (Załączniki)
│   └── Scans (Skany)
│
└── 📊 Audit Trail (Ścieżka audytu)
    ├── Decision history
    ├── Document versions
    └── Compliance reports
```

### Key Changes

#### 1. Rename "Decisions" → "Zgody organizacyjne" (Organizational Permissions)
More user-friendly than "Uchwały" (Resolutions)

#### 2. Documents Become Supporting Evidence
Documents are always **attached to** something:
- Attached to a Decision (resolution PDF)
- Attached to a Contract (signed agreement)
- Attached to an Invoice (delivery note, receipt)

#### 3. Clear Visual Hierarchy

```
┌─────────────────────────────────────┐
│ 🎯 Decision: "Zgoda na sprzedaż"   │
│ ├── 📄 Resolution PDF               │
│ ├── 📝 3 Contracts                  │
│ │   ├── Contract #1                 │
│ │   │   ├── 📄 Signed PDF           │
│ │   │   └── 💰 5 Invoices           │
│ │   └── Contract #2                 │
│ └── 💰 15 Total Invoices            │
└─────────────────────────────────────┘
```

## UI/UX Improvements

### 1. Decision Card (List View)

```tsx
┌──────────────────────────────────────────┐
│ 🎯 Zgoda na sprzedaż produktów/usług    │
│ Aktywna • Zarząd • 2024-01-15           │
│                                          │
│ 📊 Wykorzystanie:                        │
│ ├── 12 umów                              │
│ ├── 45 faktur                            │
│ └── 234,500 PLN / 500,000 PLN (47%)     │
│                                          │
│ 📄 3 dokumenty                           │
│ ⚠️ Wygasa: 2025-12-31                   │
└──────────────────────────────────────────┘
```

### 2. Decision Detail (Tab View)

**Tabs:**
- **Overview** - Status, limits, description
- **Contracts** - Linked contracts (clickable → opens in tab)
- **Invoices** - All invoices under this decision
- **Documents** - Attached files (resolutions, scans)
- **History** - Audit trail

### 3. Simplified Navigation

**Sidebar:**
```
📋 Governance
  ├── 🎯 Permissions (Zgody)
  ├── 📝 Contracts (Umowy)
  └── 📊 Audit (Audyt)
```

**Remove:**
- ❌ Separate "Documents" menu item
- ❌ Separate "Decisions" menu item

**Documents** become a sub-view within Governance, accessible via:
1. Decision details → Documents tab
2. Contract details → Attachments
3. Invoice details → Attachments

## Implementation Plan

### Phase 1: Restructure Navigation
- [ ] Rename "Decisions" → "Governance" in sidebar
- [ ] Add sub-menu: Permissions, Contracts, Audit
- [ ] Remove standalone "Documents" menu item

### Phase 2: Update Decision Views
- [ ] Add "Documents" tab to DecisionDetails
- [ ] Show linked contracts in "Contracts" tab
- [ ] Show linked invoices in "Invoices" tab
- [ ] Add usage metrics to decision cards

### Phase 3: Document Attachment System
- [ ] Documents always attached to parent entity
- [ ] Upload documents from Decision/Contract/Invoice views
- [ ] Show document count badges on cards
- [ ] Quick preview in modal

### Phase 4: Visual Polish
- [ ] Status badges (🟢 Active, 🟡 Expiring, 🔴 Expired)
- [ ] Usage progress bars
- [ ] Clear hierarchy indicators
- [ ] Consistent iconography

## User Stories

### Story 1: New User Setup
**Before:** "What are decisions? Where do I put my contracts?"
**After:** "Governance → Permissions → Create permission for sales → Attach resolution PDF → Done"

### Story 2: Creating Invoice
**Before:** "Which decision should I link? Where's the contract?"
**After:** Invoice form shows: "Contract: XYZ (under Permission: Sales)" - clear hierarchy

### Story 3: Audit Preparation
**Before:** "Where are all the documents? Which decision covers this?"
**After:** Governance → Audit → Export all with linked documents

## Technical Changes

### Database Schema (No changes needed)
Current schema already supports this:
- `decisions` table
- `documents` table with `decision_id`, `contract_id`, `invoice_id` foreign keys
- Relationships are correct

### Code Changes

1. **Rename Module**
```
src/modules/decisions → src/modules/governance
```

2. **Update Routes**
```tsx
/decisions → /governance/permissions
/documents → /governance/documents (or remove standalone route)
```

3. **Component Structure**
```
src/modules/governance/
├── permissions/
│   ├── PermissionList.tsx
│   ├── PermissionDetail.tsx
│   └── PermissionCard.tsx
├── documents/
│   ├── DocumentUpload.tsx
│   ├── DocumentPreview.tsx
│   └── DocumentList.tsx
└── audit/
    └── AuditTrail.tsx
```

## Microcopy Changes

**Before → After:**
- "Decisions" → "Zgody organizacyjne" (Organizational Permissions)
- "Create Decision" → "Dodaj zgodę" (Add Permission)
- "Link Decision" → "Wybierz zgodę" (Select Permission)
- "Decision Type" → "Typ zgody" (Permission Type)
- "Documents" → "Dokumenty pomocnicze" (Supporting Documents)

## Benefits

1. **Clearer Mental Model** - Users understand the hierarchy
2. **Less Navigation** - Everything related in one place
3. **Better Compliance** - Clear audit trail
4. **Reduced Confusion** - No more "where do I put this?"
5. **Professional** - Matches how real companies think about governance

## Migration Path

1. Update navigation labels (no data changes)
2. Add document tabs to existing views
3. Gradually deprecate standalone documents view
4. Add onboarding tooltips explaining the new structure

## Success Metrics

- ✅ Users can explain the relationship between permissions, contracts, and invoices
- ✅ Reduced support questions about "where to put documents"
- ✅ Faster audit preparation (all docs linked properly)
- ✅ Higher completion rate for governance setup
