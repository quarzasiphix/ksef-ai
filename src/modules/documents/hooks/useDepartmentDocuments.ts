/**
 * Department-aware document hooks
 * 
 * Provides document folder structure and scoping based on department templates
 */

import { useMemo } from 'react';
import { getDepartmentTemplate } from '@/modules/projects/types/departmentTemplates';
import type { DepartmentTemplateId, DocumentFolder } from '@/modules/projects/types/departmentTemplates';

/**
 * Get document folders for a department based on its template
 */
export function useDepartmentDocumentFolders(departmentTemplateId?: DepartmentTemplateId): DocumentFolder[] {
  return useMemo(() => {
    if (!departmentTemplateId) {
      return [
        {
          id: 'general',
          label: 'Dokumenty ogólne',
          description: 'Wszystkie dokumenty',
        },
      ];
    }

    const template = getDepartmentTemplate(departmentTemplateId);
    return template.documentFolders;
  }, [departmentTemplateId]);
}

/**
 * Get required document folders for a department
 */
export function getRequiredDocumentFolders(departmentTemplateId?: DepartmentTemplateId): DocumentFolder[] {
  if (!departmentTemplateId) {
    return [];
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.documentFolders.filter(folder => folder.required);
}

/**
 * Check if a document folder is required for a department
 */
export function isDocumentFolderRequired(
  departmentTemplateId: DepartmentTemplateId | undefined,
  folderId: string
): boolean {
  if (!departmentTemplateId) {
    return false;
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  const folder = template.documentFolders.find(f => f.id === folderId);
  return folder?.required ?? false;
}

/**
 * Get document folder by ID
 */
export function getDocumentFolder(
  departmentTemplateId: DepartmentTemplateId | undefined,
  folderId: string
): DocumentFolder | undefined {
  if (!departmentTemplateId) {
    return undefined;
  }

  const template = getDepartmentTemplate(departmentTemplateId);
  return template.documentFolders.find(f => f.id === folderId);
}
