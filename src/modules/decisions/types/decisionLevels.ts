/**
 * Decision Level System
 * 
 * Three-tier decision hierarchy:
 * 1. Global Decisions - Company-wide authority (board resolutions, capital, properties)
 * 2. Department Decisions - Authority to operate a specific department
 * 3. Project/Job Decisions - Execution-level decisions for specific projects
 */

export type DecisionLevel = 'global' | 'department' | 'project';

export type DecisionScope = 
  | 'company'        // Global decisions affecting entire company
  | 'department'     // Department-level operational authority
  | 'project'        // Project/job/case-specific execution decisions
  | 'contract';      // Contract-specific decisions

export interface DecisionLevelMetadata {
  level: DecisionLevel;
  scope: DecisionScope;
  label: string;
  description: string;
  canBeDeleted: boolean;
  requiresParent: boolean;
  visibleWhen: 'always' | 'department_selected' | 'project_selected';
}

/**
 * Decision level configuration
 */
export const decisionLevels: Record<DecisionLevel, DecisionLevelMetadata> = {
  global: {
    level: 'global',
    scope: 'company',
    label: 'Decyzje globalne / Decyzje spółki',
    description: 'Decyzje zarządu i wspólników obowiązujące całą firmę. Podstawa prawna dla wszystkich działań biznesowych.',
    canBeDeleted: false,
    requiresParent: false,
    visibleWhen: 'always',
  },
  
  department: {
    level: 'department',
    scope: 'department',
    label: 'Decyzje działu',
    description: 'Decyzje autoryzujące istnienie i działalność działu. Każdy dział musi mieć decyzję podstawową.',
    canBeDeleted: false,
    requiresParent: true, // Must reference global decision
    visibleWhen: 'department_selected',
  },
  
  project: {
    level: 'project',
    scope: 'project',
    label: 'Decyzje wykonawcze',
    description: 'Decyzje dotyczące konkretnych projektów, spraw lub kampanii. Opcjonalne, zależne od szablonu działu.',
    canBeDeleted: true,
    requiresParent: true, // Must reference department decision
    visibleWhen: 'project_selected',
  },
};

/**
 * Decision category types by level
 */
export const globalDecisionCategories = [
  'board_resolution',
  'shareholder_resolution',
  'capital_decision',
  'property_decision',
  'business_activity_consent',
  'b2b_contract_consent',
  'operational_cost_consent',
] as const;

export const departmentDecisionCategories = [
  'operational_authority',
  'department_charter',
  'budget_authorization',
  'hiring_authority',
] as const;

export const projectDecisionCategories = [
  'project_approval',
  'case_approval',
  'campaign_approval',
  'vendor_approval',
  'milestone_approval',
  'budget_allocation',
  'publication_approval',
] as const;

export type GlobalDecisionCategory = typeof globalDecisionCategories[number];
export type DepartmentDecisionCategory = typeof departmentDecisionCategories[number];
export type ProjectDecisionCategory = typeof projectDecisionCategories[number];

export type DecisionCategory = 
  | GlobalDecisionCategory 
  | DepartmentDecisionCategory 
  | ProjectDecisionCategory;

/**
 * Get decision level metadata
 */
export function getDecisionLevelMetadata(level: DecisionLevel): DecisionLevelMetadata {
  return decisionLevels[level];
}

/**
 * Check if a decision level is visible in current context
 */
export function isDecisionLevelVisible(
  level: DecisionLevel,
  context: {
    departmentSelected: boolean;
    projectSelected: boolean;
  }
): boolean {
  const metadata = decisionLevels[level];
  
  switch (metadata.visibleWhen) {
    case 'always':
      return true;
    case 'department_selected':
      return context.departmentSelected;
    case 'project_selected':
      return context.projectSelected;
    default:
      return false;
  }
}

/**
 * Get appropriate decision categories for a level
 */
export function getDecisionCategoriesForLevel(level: DecisionLevel): readonly string[] {
  switch (level) {
    case 'global':
      return globalDecisionCategories;
    case 'department':
      return departmentDecisionCategories;
    case 'project':
      return projectDecisionCategories;
    default:
      return [];
  }
}

/**
 * Validate decision hierarchy
 */
export function validateDecisionHierarchy(
  level: DecisionLevel,
  parentDecisionId?: string,
  departmentId?: string,
  projectId?: string
): { valid: boolean; error?: string } {
  const metadata = decisionLevels[level];
  
  // Global decisions don't need parents
  if (level === 'global') {
    if (parentDecisionId) {
      return { valid: false, error: 'Global decisions cannot have parent decisions' };
    }
    return { valid: true };
  }
  
  // Department decisions require parent and department
  if (level === 'department') {
    if (!parentDecisionId) {
      return { valid: false, error: 'Department decisions must reference a global decision' };
    }
    if (!departmentId) {
      return { valid: false, error: 'Department decisions must be linked to a department' };
    }
    return { valid: true };
  }
  
  // Project decisions require parent, department, and project
  if (level === 'project') {
    if (!parentDecisionId) {
      return { valid: false, error: 'Project decisions must reference a department decision' };
    }
    if (!departmentId) {
      return { valid: false, error: 'Project decisions must be linked to a department' };
    }
    if (!projectId) {
      return { valid: false, error: 'Project decisions must be linked to a project' };
    }
    return { valid: true };
  }
  
  return { valid: false, error: 'Invalid decision level' };
}
