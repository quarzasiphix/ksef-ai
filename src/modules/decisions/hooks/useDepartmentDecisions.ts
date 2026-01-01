/**
 * Department-aware decision hooks
 * 
 * Provides decision templates and scoping based on department context
 */

import { useMemo } from 'react';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import type { DepartmentTemplateId, DecisionTemplate } from '@/modules/projects/types/departmentTemplates';
import { DecisionLevel, getDecisionLevelMetadata, isDecisionLevelVisible } from '../types/decisionLevels';

/**
 * Get decision templates for a department based on its template
 */
export function useDepartmentDecisionTemplates(departmentTemplateId?: DepartmentTemplateId): DecisionTemplate[] {
  return useMemo(() => {
    if (!departmentTemplateId) {
      return [];
    }

    const template = getDepartmentTemplate(departmentTemplateId);
    return template.decisionTemplates;
  }, [departmentTemplateId]);
}

/**
 * Get required decision templates for a department
 */
export function getRequiredDecisionTemplates(departmentTemplateId?: DepartmentTemplateId): DecisionTemplate[] {
  if (!departmentTemplateId) {
    return [];
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.decisionTemplates.filter(dt => dt.required);
}

/**
 * Get auto-created decision templates for a department
 */
export function getAutoCreatedDecisionTemplates(departmentTemplateId?: DepartmentTemplateId): DecisionTemplate[] {
  if (!departmentTemplateId) {
    return [];
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.decisionTemplates.filter(dt => dt.autoCreateOnDepartmentCreation);
}

/**
 * Get decision templates by level
 */
export function getDecisionTemplatesByLevel(
  departmentTemplateId: DepartmentTemplateId | undefined,
  level: DecisionLevel
): DecisionTemplate[] {
  if (!departmentTemplateId) {
    return [];
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.decisionTemplates.filter(dt => dt.level === level);
}

/**
 * Get visible decision levels based on context
 */
export function useVisibleDecisionLevels(context: {
  departmentSelected: boolean;
  projectSelected: boolean;
}): DecisionLevel[] {
  return useMemo(() => {
    const levels: DecisionLevel[] = [];
    
    if (isDecisionLevelVisible('global', context)) {
      levels.push('global');
    }
    if (isDecisionLevelVisible('department', context)) {
      levels.push('department');
    }
    if (isDecisionLevelVisible('project', context)) {
      levels.push('project');
    }
    
    return levels;
  }, [context.departmentSelected, context.projectSelected]);
}

/**
 * Get decision level label and description
 */
export function getDecisionLevelInfo(level: DecisionLevel) {
  return getDecisionLevelMetadata(level);
}

/**
 * Check if a decision template should be auto-created
 */
export function shouldAutoCreateDecision(
  departmentTemplateId: DepartmentTemplateId | undefined,
  decisionTemplateId: string
): boolean {
  if (!departmentTemplateId) {
    return false;
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  const decisionTemplate = template.decisionTemplates.find(dt => dt.id === decisionTemplateId);
  return decisionTemplate?.autoCreateOnDepartmentCreation ?? false;
}
