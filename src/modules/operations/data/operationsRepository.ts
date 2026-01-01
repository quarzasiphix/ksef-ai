/**
 * Operations Repository
 * 
 * Data access layer for operational entities
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  Vehicle, 
  Driver, 
  OperationalJob, 
  JobDocument,
  ResourceAvailability,
  OperationsDashboard 
} from '../types';
import type { DocumentCategory } from '../types/documentCategories';

// ============================================================================
// VEHICLES
// ============================================================================

export async function getVehicles(departmentId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('department_id', departmentId)
    .order('registration_number');

  if (error) throw error;
  return data || [];
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createVehicle(vehicle: Partial<Vehicle>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .insert(vehicle)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// DRIVERS
// ============================================================================

export async function getDrivers(departmentId: string): Promise<Driver[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('department_id', departmentId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getDriverById(id: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDriver(driver: Partial<Driver>): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .insert(driver)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// OPERATIONAL JOBS
// ============================================================================

export async function getJobs(departmentId: string, status?: string): Promise<OperationalJob[]> {
  let query = supabase
    .from('operational_jobs')
    .select('*')
    .eq('department_id', departmentId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('scheduled_start', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getJobById(id: string): Promise<OperationalJob | null> {
  const { data, error } = await supabase
    .from('operational_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createJob(job: Partial<OperationalJob>): Promise<OperationalJob> {
  const { data, error } = await supabase
    .from('operational_jobs')
    .insert(job)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateJob(id: string, updates: Partial<OperationalJob>): Promise<OperationalJob> {
  const { data, error } = await supabase
    .from('operational_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase
    .from('operational_jobs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// JOB DOCUMENTS
// ============================================================================

export async function getJobDocuments(jobId: string): Promise<JobDocument[]> {
  const { data, error } = await supabase
    .from('job_documents')
    .select('*')
    .eq('job_id', jobId)
    .order('category')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getJobDocumentById(id: string): Promise<JobDocument | null> {
  const { data, error } = await supabase
    .from('job_documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createJobDocument(document: Partial<JobDocument>): Promise<JobDocument> {
  const { data, error } = await supabase
    .from('job_documents')
    .insert(document)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateJobDocument(id: string, updates: Partial<JobDocument>): Promise<JobDocument> {
  const { data, error } = await supabase
    .from('job_documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJobDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('job_documents')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getJobDocumentsByCategory(
  jobId: string,
  category: DocumentCategory
): Promise<JobDocument[]> {
  const { data, error } = await supabase
    .from('job_documents')
    .select('*')
    .eq('job_id', jobId)
    .eq('category', category)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}


// ============================================================================
// RESOURCE AVAILABILITY
// ============================================================================

export async function getResourceAvailability(departmentId: string): Promise<ResourceAvailability> {
  const [drivers, vehicles] = await Promise.all([
    getDrivers(departmentId),
    getVehicles(departmentId),
  ]);

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    drivers: {
      total: drivers.length,
      available: drivers.filter(d => d.status === 'available').length,
      busy: drivers.filter(d => d.status === 'busy').length,
      blocked: drivers.filter(d => d.status === 'blocked').length,
      expiring_licenses: drivers.filter(d => {
        if (!d.license_expiry) return false;
        const expiry = new Date(d.license_expiry);
        return expiry <= thirtyDaysFromNow;
      }),
    },
    vehicles: {
      total: vehicles.length,
      available: vehicles.filter(v => v.status === 'available').length,
      in_use: vehicles.filter(v => v.status === 'in_use').length,
      out_of_service: vehicles.filter(v => v.status === 'out_of_service' || v.status === 'maintenance').length,
      expiring_insurance: vehicles.filter(v => {
        if (!v.insurance_expiry) return false;
        const expiry = new Date(v.insurance_expiry);
        return expiry <= thirtyDaysFromNow;
      }),
      expiring_inspection: vehicles.filter(v => {
        if (!v.inspection_expiry) return false;
        const expiry = new Date(v.inspection_expiry);
        return expiry <= thirtyDaysFromNow;
      }),
    },
  };
}

// ============================================================================
// OPERATIONS DASHBOARD
// ============================================================================

export async function getOperationsDashboard(departmentId: string): Promise<OperationsDashboard> {
  const [allJobs, resourceAvailability] = await Promise.all([
    getJobs(departmentId),
    getResourceAvailability(departmentId),
  ]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeJobs = allJobs.filter(j => j.status === 'in_progress').length;
  const upcomingJobs = allJobs.filter(j => j.status === 'scheduled' || j.status === 'approved' || j.status === 'draft').length;
  const blockedJobs = allJobs.filter(j => j.status === 'blocked').length;
  const completedToday = allJobs.filter(j => {
    if (j.status !== 'completed' || !j.actual_end) return false;
    const completedDate = new Date(j.actual_end);
    return completedDate >= today;
  }).length;

  // Collect critical alerts from blocked jobs
  const criticalAlerts = allJobs
    .filter(j => j.status === 'blocked' && j.blocking_issues)
    .flatMap(j => j.blocking_issues || [])
    .filter(issue => issue.severity === 'critical' && !issue.resolved);

  return {
    active_jobs: activeJobs,
    upcoming_jobs: upcomingJobs,
    blocked_jobs: blockedJobs,
    completed_today: completedToday,
    resource_availability: resourceAvailability,
    critical_alerts: criticalAlerts,
  };
}

// ============================================================================
// JOB VALIDATION
// ============================================================================

/**
 * Validates if a job is ready to execute
 * Returns blocking issues if any
 */
export async function validateJobReadiness(jobId: string): Promise<{
  ready: boolean;
  issues: Array<{ type: string; message: string; severity: string }>;
}> {
  const job = await getJobById(jobId);
  if (!job) throw new Error('Job not found');

  const issues: Array<{ type: string; message: string; severity: string }> = [];

  // Check department decision
  if (!job.department_decision_id) {
    issues.push({
      type: 'missing_decision',
      message: 'Brak decyzji działu autoryzującej operacje',
      severity: 'critical',
    });
  }

  // Check vehicle assignment and contract
  if (!job.assigned_vehicle_id) {
    issues.push({
      type: 'no_vehicle',
      message: 'Nie przypisano pojazdu',
      severity: 'critical',
    });
  } else if (!job.vehicle_contract_id) {
    issues.push({
      type: 'missing_contract',
      message: 'Brak umowy pojazdu',
      severity: 'critical',
    });
  }

  // Check driver assignment and contract
  if (!job.assigned_driver_id) {
    issues.push({
      type: 'no_driver',
      message: 'Nie przypisano kierowcy',
      severity: 'critical',
    });
  } else if (!job.driver_contract_id) {
    issues.push({
      type: 'missing_contract',
      message: 'Brak umowy z kierowcą',
      severity: 'critical',
    });
  }

  // Check client contract (optional for some job types)
  if (!job.client_contract_id) {
    issues.push({
      type: 'missing_contract',
      message: 'Brak umowy z klientem',
      severity: 'warning',
    });
  }

  return {
    ready: issues.filter(i => i.severity === 'critical').length === 0,
    issues,
  };
}
