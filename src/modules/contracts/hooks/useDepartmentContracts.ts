/**
 * Department-aware contract hooks
 * 
 * Provides contract data filtered and scoped by department context
 */

import { useQuery } from '@tanstack/react-query';
import { Contract } from '@/shared/types';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import type { DepartmentTemplateId, ContractCategory } from '@/modules/projects/types/departmentTemplates';

interface DepartmentContractFilters {
  departmentId?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
}

/**
 * Get contract categories for a department based on its template
 */
export function useContractCategories(departmentTemplateId?: DepartmentTemplateId): ContractCategory[] {
  if (!departmentTemplateId) {
    return [
      {
        id: 'all',
        label: 'Wszystkie umowy',
        description: 'Wszystkie umowy w systemie',
      },
    ];
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.contractCategories;
}

/**
 * Get contracts scoped to a department
 */
export function useDepartmentContracts(
  businessProfileId: string,
  filters?: DepartmentContractFilters
) {
  return useQuery({
    queryKey: ['department-contracts', businessProfileId, filters],
    queryFn: async () => {
      // TODO: Implement actual API call to fetch department-scoped contracts
      // For now, return empty array as placeholder
      const contracts: Contract[] = [];
      
      // Filter by department if specified
      if (filters?.departmentId) {
        return contracts.filter(c => c.projectId === filters.departmentId);
      }
      
      return contracts;
    },
    enabled: !!businessProfileId,
  });
}

/**
 * Get contract metadata fields for a department template
 */
export function useContractMetadataFields(departmentTemplateId?: DepartmentTemplateId) {
  if (!departmentTemplateId) {
    return [];
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.contractMetadataFields;
}

/**
 * Check if a department template supports projects/jobs
 */
export function departmentSupportsProjects(departmentTemplateId?: DepartmentTemplateId): boolean {
  if (!departmentTemplateId) {
    return false;
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.supportsProjects;
}

/**
 * Get project terminology for a department
 */
export function getProjectTerminology(departmentTemplateId?: DepartmentTemplateId) {
  if (!departmentTemplateId) {
    return {
      singular: 'Projekt',
      plural: 'Projekty',
    };
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.projectTerminology || {
    singular: 'Projekt',
    plural: 'Projekty',
  };
}
