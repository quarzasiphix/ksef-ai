# Department System Refactoring Status

## Overview
Refactoring the existing "Project" system into a "Department" management system with nested "Jobs/Projects" following the hierarchy: **Company → Department → Job/Project**

## Conceptual Model

### Level 1: Department (formerly Project)
- **Purpose**: Long-lived organizational unit (line of business)
- **Examples**: Marketing, Construction, Property Administration, SaaS, Sales
- **Owns**: Budget, team, policies, invoice numbering, decision framework
- **Lifecycle**: Long-term, strategic

### Level 2: Job/Project (new entity)
- **Purpose**: Time-bound execution unit inside a department
- **Examples**: "Roof Repair - Building A", "Summer Campaign 2025", "Trade Fair Berlin"
- **Owns**: Job budget, timeline, documents, profitability, job-specific decisions
- **Lifecycle**: Starts and ends

### Key Principles
1. **Departments define responsibility and strategy**
2. **Jobs define execution and outcomes**
3. **Backward compatibility**: Existing "projects" become "departments"
4. **Progressive disclosure**: System adapts based on company size

## Completed Work

### ✅ Phase 1: Database Schema Migration
**File**: `supabase/migrations/20251230_refactor_projects_to_departments.sql`

**Changes**:
- Renamed `projects` table → `departments`
- Created new `jobs` table for nested projects
- Added `template` field to departments (general, construction, property_admin, marketing, saas, sales, operations)
- Added `job_id` as optional foreign key to: invoices, expenses, contracts, decisions, events
- Updated all RLS policies for departments and jobs
- Created `department_stats` and `job_stats` views
- Maintained backward compatibility with `projects` view alias
- Updated all indexes, triggers, and constraints

**Key Features**:
- `project_id` columns now reference `departments.id` (semantic change, no breaking change)
- Optional `job_id` columns allow linking documents to specific jobs within departments
- Department templates control which features are enabled per department type

### ✅ Phase 2: TypeScript Types
**File**: `src/shared/types/index.ts`

**New Types**:
```typescript
// Department (Level 1)
export interface Department {
  id: string;
  business_profile_id: string;
  name: string;
  code?: string;
  color?: string;
  status: DepartmentStatus;
  template: DepartmentTemplate; // NEW: defines department type
  charter_decision_id?: string;
  budget_limit?: number;
  actual_cost?: number;
  actual_revenue?: number;
  // ... lifecycle fields
}

// Job (Level 2)
export interface Job {
  id: string;
  department_id: string; // Parent department
  business_profile_id: string;
  name: string;
  code?: string;
  status: JobStatus;
  start_date?: string;
  end_date?: string;
  budget_amount?: number;
  actual_cost?: number;
  actual_revenue?: number;
  charter_decision_id?: string;
  // ... metadata
}

// Stats views
export interface DepartmentStats { ... }
export interface JobStats { ... }
```

**Backward Compatibility**:
- `Project` interface maintained as alias for `Department`
- `ProjectStats` interface maintained
- All existing code using `Project` will continue to work

## Pending Work

### 🔄 Phase 3: Context & State Management
**Files to update**:
- `src/shared/context/ProjectContext.tsx` → Rename to `DepartmentContext.tsx`
- Keep `ProjectContext` as re-export for backward compatibility
- Add `JobContext` for managing jobs within a department

**Changes needed**:
```typescript
// DepartmentContext.tsx
export interface DepartmentContextValue {
  departments: Department[];
  selectedDepartmentId: string | null;
  selectedDepartment: Department | null;
  selectDepartment: (id: string | null) => void;
  // ... existing functions
}

// JobContext.tsx (new)
export interface JobContextValue {
  jobs: Job[];
  selectedJobId: string | null;
  selectedJob: Job | null;
  selectJob: (id: string | null) => void;
  // ... job management functions
}
```

### 🔄 Phase 4: UI Components Refactoring

#### A. Rename ProjectSwitcher → DepartmentSwitcher
**File**: `src/components/workspace/ProjectSwitcher.tsx`

**Changes**:
- Rename component to `DepartmentSwitcher`
- Update labels: "Projekty" → "Działy"
- Update "Pełen widok firmy" to mean "All departments"
- Keep backward compatibility export

#### B. Update Sidebar Navigation
**File**: `src/components/layout/sidebar/navConfig.ts`

**Changes**:
- Rename "Projekty" → "Działy" in navigation
- Update icon from `FolderKanban` to something more appropriate for departments
- Update route from `/settings/projects` → `/settings/departments`

#### C. Refactor Projects Module → Departments Module
**Directory**: `src/modules/projects/` → `src/modules/departments/`

**Files to rename/update**:
1. `ProjectsScreen.tsx` → `DepartmentsScreen.tsx`
2. `ProjectCard.tsx` → `DepartmentCard.tsx`
3. `ProjectDialog.tsx` → `DepartmentDialog.tsx`
4. `ProjectSelector.tsx` → `DepartmentSelector.tsx`
5. `projectRepository.ts` → `departmentRepository.ts`

**New files to create**:
1. `src/modules/jobs/screens/JobsScreen.tsx` - List jobs within a department
2. `src/modules/jobs/components/JobCard.tsx`
3. `src/modules/jobs/components/JobDialog.tsx`
4. `src/modules/jobs/data/jobRepository.ts`

#### D. Update Invoice/Expense List Pages
**Files**: 
- `src/modules/invoices/screens/invoices/InvoiceList.tsx`
- `src/modules/invoices/screens/income/IncomeList.tsx`
- `src/modules/invoices/screens/expense/ExpenseList.tsx`

**Changes**:
- Update "Widok projektowy" → "Widok działu"
- Add optional job filter when department is selected
- Show both department and job in scope indicator

### 🔄 Phase 5: Routes & Navigation
**File**: `src/shared/config/routes.tsx`

**Changes**:
- Add route: `/settings/departments` (replaces `/settings/projects`)
- Add route: `/departments/:departmentId/jobs` - List jobs in department
- Add route: `/departments/:departmentId/jobs/new` - Create new job
- Add route: `/departments/:departmentId/jobs/:jobId` - Job details
- Keep `/settings/projects` as redirect for backward compatibility

### 🔄 Phase 6: Repository Layer
**New file**: `src/modules/departments/data/departmentRepository.ts`

**Functions** (adapted from projectRepository):
```typescript
export async function getDepartments(businessProfileId: string): Promise<Department[]>
export async function getDepartmentById(id: string): Promise<Department | null>
export async function createDepartment(input: CreateDepartmentInput): Promise<Department>
export async function updateDepartment(id: string, updates: Partial<Department>): Promise<Department>
export async function deleteDepartment(id: string): Promise<void>
export async function freezeDepartment(id: string, decisionId?: string): Promise<void>
export async function closeDepartment(id: string, decisionId?: string): Promise<void>
```

**New file**: `src/modules/jobs/data/jobRepository.ts`

**Functions**:
```typescript
export async function getJobs(departmentId: string): Promise<Job[]>
export async function getJobById(id: string): Promise<Job | null>
export async function createJob(input: CreateJobInput): Promise<Job>
export async function updateJob(id: string, updates: Partial<Job>): Promise<Job>
export async function deleteJob(id: string): Promise<void>
export async function completeJob(id: string): Promise<void>
export async function cancelJob(id: string, reason?: string): Promise<void>
```

### 🔄 Phase 7: Decision Categories Update
**File**: `src/modules/decisions/decisions.ts`

**Changes**:
- Rename `project_governance` → `department_governance`
- Add new category: `job_governance` for job charter decisions
- Update labels and descriptions

### 🔄 Phase 8: Department Templates Implementation
**New file**: `src/modules/departments/templates/departmentTemplates.ts`

**Purpose**: Define what features are enabled for each department type

```typescript
export interface DepartmentTemplateConfig {
  id: DepartmentTemplate;
  name: string;
  description: string;
  enabledFeatures: {
    jobs: boolean;
    kosztorys: boolean; // Cost estimates
    dailyLogs: boolean;
    materials: boolean;
    protocols: boolean;
    campaigns: boolean;
    // ... other features
  };
  defaultWorkflows: string[];
  defaultRoles: string[];
}

export const DEPARTMENT_TEMPLATES: Record<DepartmentTemplate, DepartmentTemplateConfig> = {
  construction: { ... },
  property_admin: { ... },
  marketing: { ... },
  saas: { ... },
  // ...
}
```

## Migration Strategy

### For Existing Users
1. **Automatic migration**: Run SQL migration to rename tables
2. **Data preservation**: All existing "projects" become "departments"
3. **No UI disruption**: Users see "Działy" instead of "Projekty"
4. **No data loss**: All relationships and data preserved
5. **Gradual adoption**: Jobs are optional, departments work standalone

### For New Users
1. Start with implicit single department (company-wide view)
2. Create departments when needed
3. Add jobs within departments as needed
4. Progressive disclosure of complexity

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] All foreign keys work correctly
- [ ] RLS policies enforce correct access
- [ ] Views return correct data
- [ ] Triggers fire correctly

### Backend/Repository
- [ ] Department CRUD operations work
- [ ] Job CRUD operations work
- [ ] Stats views return correct aggregations
- [ ] Filtering by department works
- [ ] Filtering by job works

### Frontend/UI
- [ ] Department selector works
- [ ] Department list displays correctly
- [ ] Job list displays within department
- [ ] Invoice/expense filtering by department works
- [ ] Invoice/expense filtering by job works
- [ ] Visual indicators show correct department/job
- [ ] Backward compatibility maintained

### Integration
- [ ] Decisions link to departments correctly
- [ ] Decisions link to jobs correctly
- [ ] Documents link to departments correctly
- [ ] Documents link to jobs correctly
- [ ] Analytics show department-level data
- [ ] Analytics show job-level data

## Rollback Plan

If issues arise:
1. **Database**: Revert migration using down migration
2. **Code**: Revert commits to before refactoring
3. **Data**: No data loss - migration is reversible

## Next Steps

1. **Run database migration** on development environment
2. **Create DepartmentContext** and test
3. **Refactor ProjectSwitcher** → DepartmentSwitcher
4. **Update one screen at a time** (start with DepartmentsScreen)
5. **Add Jobs module** incrementally
6. **Test thoroughly** at each step
7. **Deploy to production** when stable

## Notes

- This refactoring maintains **100% backward compatibility**
- Existing code using `Project` continues to work
- New code should use `Department` and `Job`
- Migration path is gradual and safe
- Users can adopt new features at their own pace
