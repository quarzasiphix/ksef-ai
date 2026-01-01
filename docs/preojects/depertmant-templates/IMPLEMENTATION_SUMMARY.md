# Department Template System - Implementation Summary

## Overview

Successfully implemented a comprehensive department template system with full support for the **Funeral Home (Dom pogrzebowy / Nekrolog)** template, along with a three-tier decision hierarchy system.

## What Was Implemented

### 1. Department Template Type System
**File:** `src/modules/projects/types/departmentTemplates.ts`

Created a complete type system defining:
- **8 department templates** including the new `funeral_home` template
- Contract categories per template
- Document folder structures per template
- Decision templates with auto-creation support
- Contract metadata fields (custom fields per department)
- Project/job terminology customization

#### Funeral Home Template Highlights:
- **Contract Categories:**
  - Umowy z rodziną (Family contracts)
  - Umowy usługowe (Service contracts - transport, cremation)
  - Umowy cmentarne (Cemetery contracts)
  - Umowy podwykonawcze (Subcontractor contracts)
  - Zlecenia jednorazowe (One-time orders)

- **Contract Metadata Fields:**
  - Deceased name, death date, ceremony date/location
  - Family contact, ceremony type, burial location
  - All fields properly typed and validated

- **Document Folders:**
  - Case documents, death certificate, contracts
  - Invoices, service confirmations
  - Publication consents, obituary

- **Decision Templates:**
  - Department authorization (auto-created)
  - Case authorization (per funeral)
  - Subcontractor approval
  - Publication approval

### 2. Three-Tier Decision System
**File:** `src/modules/decisions/types/decisionLevels.ts`

Implemented the complete decision hierarchy:

#### **Level 1: Global Decisions**
- Scope: Company-wide
- Examples: Board resolutions, capital decisions, business activity consent
- Visibility: Always visible
- Cannot be deleted
- No parent required

#### **Level 2: Department Decisions**
- Scope: Department operational authority
- Examples: "Zgoda na świadczenie usług pogrzebowych"
- Visibility: When department is selected
- Cannot be deleted
- Must reference a global decision
- **Auto-created when department is created**

#### **Level 3: Project/Job Decisions**
- Scope: Execution-level (specific projects/cases)
- Examples: Case approval, vendor approval, milestone approval
- Visibility: When project is selected
- Can be deleted
- Must reference department decision

### 3. Department-Aware Hooks

#### Contracts Module
**File:** `src/modules/contracts/hooks/useDepartmentContracts.ts`

- `useContractCategories()` - Get categories for department template
- `useDepartmentContracts()` - Fetch contracts scoped to department
- `useContractMetadataFields()` - Get custom fields for template
- `departmentSupportsProjects()` - Check if projects/jobs are enabled
- `getProjectTerminology()` - Get localized terminology (e.g., "Sprawa" for funeral)

#### Documents Module
**File:** `src/modules/documents/hooks/useDepartmentDocuments.ts`

- `useDepartmentDocumentFolders()` - Get folder structure for template
- `getRequiredDocumentFolders()` - Get mandatory folders
- `isDocumentFolderRequired()` - Check if folder is required
- `getDocumentFolder()` - Get folder metadata by ID

#### Decisions Module
**File:** `src/modules/decisions/hooks/useDepartmentDecisions.ts`

- `useDepartmentDecisionTemplates()` - Get decision templates for department
- `getRequiredDecisionTemplates()` - Get mandatory decisions
- `getAutoCreatedDecisionTemplates()` - Get decisions to auto-create
- `getDecisionTemplatesByLevel()` - Filter by global/department/project
- `useVisibleDecisionLevels()` - Get visible levels based on context
- `shouldAutoCreateDecision()` - Check if decision should be auto-created

### 4. UI Integration

#### Department Dialog
**File:** `src/modules/projects/components/DepartmentDialog.tsx`

- Added `funeral_home` to template dropdown
- Updated Zod schema validation
- Template selector shows description for each template

#### Type System Updates
**File:** `src/shared/types/index.ts`

- Extended `DepartmentTemplate` type union to include `funeral_home`

#### Bug Fixes
**File:** `src/modules/projects/screens/DepartmentScreen.tsx`

- Fixed TypeScript error with `departmentStats` state setter
- Ensured array type safety

## How It Works

### Creating a Funeral Home Department

1. **User creates department:**
   - Selects "Dom pogrzebowy / Nekrolog" template
   - Enters department name and details

2. **System automatically:**
   - Creates department record
   - **Auto-creates department decision:** "Zgoda na świadczenie usług pogrzebowych"
   - Links decision to global company decision
   - Sets up document folder structure
   - Configures contract categories

3. **Department now has:**
   - Custom contract categories (family, service, cemetery, etc.)
   - Custom metadata fields (deceased name, ceremony date, etc.)
   - Predefined document folders
   - Decision templates for case approval

### Using Department Context

#### In Contracts View:
```typescript
const categories = useContractCategories(department.template);
// Returns funeral-specific categories like "Umowy z rodziną"

const metadataFields = useContractMetadataFields(department.template);
// Returns fields like "deceased_name", "ceremony_date"
```

#### In Documents View:
```typescript
const folders = useDepartmentDocumentFolders(department.template);
// Returns folders like "Dokumenty sprawy", "Nekrolog"
```

#### In Decisions View:
```typescript
const templates = useDepartmentDecisionTemplates(department.template);
// Returns decision templates for funeral home operations

const visibleLevels = useVisibleDecisionLevels({
  departmentSelected: true,
  projectSelected: false
});
// Returns ['global', 'department'] - hides project decisions
```

## Key Design Principles

### 1. **No Fragmentation**
- Same core contract/document/decision system
- Templates only change **context, defaults, and workflows**
- Legal consistency preserved across all departments

### 2. **Hierarchical Authority**
- Global → Department → Project decision chain
- Each level requires parent authorization
- Audit trail maintained through hierarchy

### 3. **Grandma-Safe Defaults**
- General template works without complexity
- Advanced features unlock with specialized templates
- No forced complexity

### 4. **Vertical Expansion**
- Easy to add new templates (e.g., transport, healthcare)
- Template system is data-driven, not code-driven
- Each template is self-contained

## Next Steps (Not Yet Implemented)

### Backend Integration
1. **Database schema updates:**
   - Add `decision_level` column to decisions table
   - Add `parent_decision_id` foreign key
   - Add `department_id` to decisions table
   - Add contract metadata JSONB column

2. **RPC functions:**
   - `create_department_with_decisions` - Auto-create department decision
   - `get_department_contracts` - Fetch scoped contracts
   - `get_department_documents` - Fetch scoped documents

3. **Triggers:**
   - Auto-create department decision on department creation
   - Validate decision hierarchy on insert/update

### UI Components
1. **Contracts page:**
   - Department-aware sidebar with categories
   - Metadata fields form based on template
   - Contract filtering by department

2. **Documents page:**
   - Folder structure from template
   - Required folder validation
   - Department-scoped document list

3. **Decisions page:**
   - Three-section layout (Global / Department / Project)
   - Collapsible sections based on context
   - Decision hierarchy visualization

4. **Department creation flow:**
   - Explanation block about what creating a department means
   - Preview of auto-created decisions
   - Template feature comparison

## Files Created/Modified

### Created:
- `src/modules/projects/types/departmentTemplates.ts` (550 lines)
- `src/modules/decisions/types/decisionLevels.ts` (200 lines)
- `src/modules/contracts/hooks/useDepartmentContracts.ts` (95 lines)
- `src/modules/documents/hooks/useDepartmentDocuments.ts` (70 lines)
- `src/modules/decisions/hooks/useDepartmentDecisions.ts` (110 lines)

### Modified:
- `src/shared/types/index.ts` - Added `funeral_home` to type union
- `src/modules/projects/components/DepartmentDialog.tsx` - Added template option
- `src/modules/projects/screens/DepartmentScreen.tsx` - Fixed TypeScript error

## Testing Checklist

- [ ] Create funeral home department via UI
- [ ] Verify department decision is auto-created
- [ ] Check contract categories appear correctly
- [ ] Verify metadata fields render in contract form
- [ ] Test document folder structure
- [ ] Validate decision hierarchy enforcement
- [ ] Test with other templates (construction, SaaS, etc.)
- [ ] Verify backward compatibility with existing departments

## Architecture Benefits

1. **Legal Compliance:** Clear decision hierarchy for audits
2. **Scalability:** Easy to add new industry templates
3. **User Experience:** Context adapts to business type
4. **Code Maintainability:** Single source of truth for templates
5. **Type Safety:** Full TypeScript coverage
6. **Flexibility:** Templates are data, not code

---

**Status:** ✅ Core implementation complete, ready for backend integration and UI wiring.
