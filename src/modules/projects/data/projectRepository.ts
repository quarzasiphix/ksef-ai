import { supabase } from "@/integrations/supabase/client";
import type { Project, ProjectStats, ProjectStatus } from "@/shared/types";

/**
 * Get all projects for a business profile
 */
export async function getProjects(businessProfileId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching projects:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("Error fetching project:", error);
    throw error;
  }

  return data;
}

/**
 * Get project statistics
 */
export async function getProjectStats(businessProfileId: string): Promise<ProjectStats[]> {
  const { data, error } = await supabase
    .from("project_stats")
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching project stats:", error);
    throw error;
  }

  return data || [];
}

/**
 * Get statistics for a single project
 */
export async function getProjectStatById(projectId: string): Promise<ProjectStats | null> {
  const { data, error } = await supabase
    .from("project_stats")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("Error fetching project stat:", error);
    return null;
  }

  return data;
}

/**
 * Create a new project
 */
export async function createProject(
  project: Omit<Project, "id" | "created_at" | "updated_at">
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .insert([project])
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    throw error;
  }

  return data;
}

/**
 * Update an existing project
 */
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    console.error("Error updating project:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

/**
 * Freeze a project (prevents new transactions)
 */
export async function freezeProject(
  projectId: string,
  userId: string,
  freezeDecisionId?: string
): Promise<Project> {
  const updates: Partial<Project> = {
    status: "frozen",
    frozen_at: new Date().toISOString(),
    frozen_by: userId,
  };

  if (freezeDecisionId) {
    updates.freeze_decision_id = freezeDecisionId;
  }

  return updateProject(projectId, updates);
}

/**
 * Unfreeze a project (allows new transactions again)
 */
export async function unfreezeProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    status: "active",
    frozen_at: undefined,
    frozen_by: undefined,
    freeze_decision_id: undefined,
  });
}

/**
 * Close a project (marks as completed)
 */
export async function closeProject(
  projectId: string,
  userId: string,
  closeDecisionId?: string
): Promise<Project> {
  const updates: Partial<Project> = {
    status: "closed",
    closed_at: new Date().toISOString(),
    closed_by: userId,
  };

  if (closeDecisionId) {
    updates.close_decision_id = closeDecisionId;
  }

  return updateProject(projectId, updates);
}

/**
 * Archive a project (historical record)
 */
export async function archiveProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    status: "archived",
  });
}

/**
 * Reopen a closed or archived project
 */
export async function reopenProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    status: "active",
    closed_at: undefined,
    closed_by: undefined,
    close_decision_id: undefined,
  });
}

/**
 * Set a project as default for the business profile
 */
export async function setDefaultProject(
  projectId: string,
  businessProfileId: string
): Promise<void> {
  // First, unset any existing default
  await supabase
    .from("projects")
    .update({ is_default: false })
    .eq("business_profile_id", businessProfileId)
    .eq("is_default", true);

  // Then set the new default
  await updateProject(projectId, { is_default: true });
}

/**
 * Get the default project for a business profile
 */
export async function getDefaultProject(
  businessProfileId: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
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
 * Get active projects only
 */
export async function getActiveProjects(businessProfileId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching active projects:", error);
    throw error;
  }

  return data || [];
}

/**
 * Update project sort order
 */
export async function updateProjectSortOrder(
  projectId: string,
  sortOrder: number
): Promise<void> {
  await updateProject(projectId, { sort_order: sortOrder });
}

/**
 * Check if a project code is unique within a business profile
 */
export async function isProjectCodeUnique(
  businessProfileId: string,
  code: string,
  excludeProjectId?: string
): Promise<boolean> {
  let query = supabase
    .from("projects")
    .select("id")
    .eq("business_profile_id", businessProfileId)
    .eq("code", code);

  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error checking project code uniqueness:", error);
    return false;
  }

  return !data || data.length === 0;
}
