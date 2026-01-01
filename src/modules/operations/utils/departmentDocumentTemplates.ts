/**
 * Department-aware document template utilities
 * 
 * Provides functions to get document templates based on department template
 */

import type { DepartmentTemplate, JobDocumentTemplate } from '@/modules/projects/types/departmentTemplates';
import type { DocumentTemplate } from '../types/documentCategories';
import { TRANSPORT_DOCUMENT_TEMPLATES } from '../types/documentCategories';

/**
 * Get job document templates for a specific department
 * Falls back to generic transport templates if department has no specific templates
 */
export function getJobDocumentTemplatesForDepartment(
  departmentTemplate: DepartmentTemplate | null
): DocumentTemplate[] {
  // If department has specific job document templates, use those
  if (departmentTemplate?.jobDocumentTemplates) {
    return departmentTemplate.jobDocumentTemplates.map(convertToDocumentTemplate);
  }
  
  // Fallback to transport templates for transport_operations
  if (departmentTemplate?.id === 'transport_operations') {
    return TRANSPORT_DOCUMENT_TEMPLATES;
  }
  
  // For other departments, return empty (they can define their own)
  return [];
}

/**
 * Convert JobDocumentTemplate (from department config) to DocumentTemplate (runtime)
 */
function convertToDocumentTemplate(jobTemplate: JobDocumentTemplate): DocumentTemplate {
  return {
    id: jobTemplate.id,
    category: jobTemplate.category,
    name: jobTemplate.name,
    name_pl: jobTemplate.name_pl,
    description: jobTemplate.description,
    required: jobTemplate.required,
    required_for_status: jobTemplate.required_for_status,
    auto_generate: jobTemplate.auto_generate,
    editable_until: jobTemplate.editable_until,
    expires: jobTemplate.expires,
    fields: jobTemplate.fields?.map(f => ({
      name: f.name,
      type: f.type,
      required: f.required,
      options: f.options,
    })),
  };
}

/**
 * Get required templates for a specific job status and department
 */
export function getRequiredTemplatesForStatusAndDepartment(
  status: string,
  departmentTemplate: DepartmentTemplate | null
): DocumentTemplate[] {
  const allTemplates = getJobDocumentTemplatesForDepartment(departmentTemplate);
  return allTemplates.filter(
    t => t.required && t.required_for_status?.includes(status)
  );
}

/**
 * Get templates by category for a specific department
 */
export function getTemplatesByCategoryForDepartment(
  category: string,
  departmentTemplate: DepartmentTemplate | null
): DocumentTemplate[] {
  const allTemplates = getJobDocumentTemplatesForDepartment(departmentTemplate);
  return allTemplates.filter(t => t.category === category);
}

/**
 * Check if a department has document templates configured
 */
export function departmentHasDocumentTemplates(
  departmentTemplate: DepartmentTemplate | null
): boolean {
  if (!departmentTemplate) return false;
  
  return (
    (departmentTemplate.jobDocumentTemplates && departmentTemplate.jobDocumentTemplates.length > 0) ||
    departmentTemplate.id === 'transport_operations'
  );
}
