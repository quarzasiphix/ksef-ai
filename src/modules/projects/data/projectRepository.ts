import { supabase } from "@/integrations/supabase/client";
import type { Department, DepartmentStats, DepartmentStatus, Project, ProjectStats } from "@/shared/types";

const DEPARTMENTS_TABLE = "departments";
const DEPARTMENT_STATS_VIEW = "department_stats";

/**
 * Get all departments for a business profile
 */
export async function getDepartments(businessProfileId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching departments:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single department by ID
 */
export async function getDepartment(departmentId: string): Promise<Department | null> {
  const { data, error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .select("*")
    .eq("id", departmentId)
    .single();

  if (error) {
    console.error("Error fetching department:", error);
    throw error;
  }

  return data;
}

/**
 * Get department statistics
 */
export async function getDepartmentStats(businessProfileId: string): Promise<DepartmentStats[]> {
  const { data, error } = await supabase
    .from(DEPARTMENT_STATS_VIEW)
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .order("department_name", { ascending: true });

  if (error) {
    console.error("Error fetching department stats:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get statistics for a single department
 */
export async function getDepartmentStatById(departmentId: string): Promise<DepartmentStats | null> {
  const { data, error } = await supabase
    .from(DEPARTMENT_STATS_VIEW)
    .select("*")
    .eq("department_id", departmentId)
    .single();

  if (error) {
    console.error("Error fetching department stat:", error);
    return null;
  }

  return data;
}

/**
 * Create a new department
 */
export async function createDepartment(
  department: Omit<Department, "id" | "created_at" | "updated_at">
): Promise<Department> {
  const { data, error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .insert([department])
    .select()
    .single();

  if (error) {
    console.error("Error creating department:", error);
    throw error;
  }

  return data;
}

/**
 * Update an existing department
 */
export async function updateDepartment(
  departmentId: string,
  updates: Partial<Department>
): Promise<Department> {
  const { data, error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .update(updates)
    .eq("id", departmentId)
    .select()
    .single();

  if (error) {
    console.error("Error updating department:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a department
 */
export async function deleteDepartment(departmentId: string): Promise<void> {
  const { error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .delete()
    .eq("id", departmentId);

  if (error) {
    console.error("Error deleting department:", error);
    throw error;
  }
}

/**
 * Freeze a department (prevents new transactions)
 */
export async function freezeDepartment(
  departmentId: string,
  userId: string,
  freezeDecisionId?: string
): Promise<Department> {
  const updates: Partial<Department> = {
    status: "frozen",
    frozen_at: new Date().toISOString(),
    frozen_by: userId,
  };

  if (freezeDecisionId) {
    updates.freeze_decision_id = freezeDecisionId;
  }

  return updateDepartment(departmentId, updates);
}

/**
 * Unfreeze a department (allows new transactions again)
 */
export async function unfreezeDepartment(departmentId: string): Promise<Department> {
  return updateDepartment(departmentId, {
    status: "active",
    frozen_at: undefined,
    frozen_by: undefined,
    freeze_decision_id: undefined,
  });
}

/**
 * Close a department (marks as completed)
 */
export async function closeDepartment(
  departmentId: string,
  userId: string,
  closeDecisionId?: string
): Promise<Department> {
  const updates: Partial<Department> = {
    status: "closed",
    closed_at: new Date().toISOString(),
    closed_by: userId,
  };

  if (closeDecisionId) {
    updates.close_decision_id = closeDecisionId;
  }

  return updateDepartment(departmentId, updates);
}

/**
 * Archive a department (historical record)
 */
export async function archiveDepartment(departmentId: string): Promise<Department> {
  return updateDepartment(departmentId, {
    status: "archived",
  });
}

/**
 * Reopen a closed or archived department
 */
export async function reopenDepartment(departmentId: string): Promise<Department> {
  return updateDepartment(departmentId, {
    status: "active",
    closed_at: undefined,
    closed_by: undefined,
    close_decision_id: undefined,
  });
}

/**
 * Set a department as default for the business profile
 */
export async function setDefaultDepartment(
  departmentId: string,
  businessProfileId: string
): Promise<void> {
  // First, unset any existing default
  await supabase
    .from(DEPARTMENTS_TABLE)
    .update({ is_default: false })
    .eq("business_profile_id", businessProfileId)
    .eq("is_default", true);

  // Then set the new default
  await updateDepartment(departmentId, { is_default: true });
}

/**
 * Get the default department for a business profile
 */
export async function getDefaultDepartment(
  businessProfileId: string
): Promise<Department | null> {
  const { data, error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .eq("is_default", true)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get active departments only
 */
export async function getActiveDepartments(businessProfileId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from(DEPARTMENTS_TABLE)
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching active departments:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update department sort order
 */
export async function updateDepartmentSortOrder(
  departmentId: string,
  sortOrder: number
): Promise<void> {
  await updateDepartment(departmentId, { sort_order: sortOrder });
}

/**
 * Check if a department code is unique within a business profile
 */
export async function isDepartmentCodeUnique(
  businessProfileId: string,
  code: string,
  excludeDepartmentId?: string
): Promise<boolean> {
  let query = supabase
    .from(DEPARTMENTS_TABLE)
    .select("id")
    .eq("business_profile_id", businessProfileId)
    .eq("code", code);

  if (excludeDepartmentId) {
    query = query.neq("id", excludeDepartmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error checking department code uniqueness:", error);
    return false;
  }

  return !data || data.length === 0;
}

// Backward compatibility exports (deprecated)
export const getProjects = getDepartments;
export const getProject = getDepartment;
export const getProjectStats = getDepartmentStats as unknown as (businessProfileId: string) => ProjectStats[];
export const getProjectStatById = getDepartmentStatById as unknown as (projectId: string) => ProjectStats | null;
export const createProject = createDepartment;
export const updateProject = updateDepartment;
export const deleteProject = deleteDepartment;
export const freezeProject = freezeDepartment;
export const unfreezeProject = unfreezeDepartment;
export const closeProject = closeDepartment;
export const archiveProject = archiveDepartment;
export const reopenProject = reopenDepartment;
export const setDefaultProject = setDefaultDepartment;
export const getDefaultProject = getDefaultDepartment;
export const getActiveProjects = getActiveDepartments;
export const updateProjectSortOrder = updateDepartmentSortOrder;
export const isProjectCodeUnique = isDepartmentCodeUnique;
