/**
 * Enhanced Job Types - Lifecycle, Ownership, Compliance, Dependencies
 */

/**
 * JobLifecycleEvent - Audit trail of state transitions
 */
export interface JobLifecycleEvent {
  id: string;
  job_id: string;
  transition: 'created' | 'approved' | 'scheduled' | 'started' | 'blocked' | 'unblocked' | 'completed' | 'closed' | 'archived' | 'cancelled';
  from_status: string;
  to_status: string;
  triggered_by: string; // User ID
  triggered_at: string;
  reason?: string;
  decision_id?: string; // If transition required approval
  notes?: string;
}

/**
 * JobDeliverable - Explicit outputs that define "done"
 */
export interface JobDeliverable {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
  verification_method?: string; // 'photo', 'signature', 'document', 'checklist'
  evidence_url?: string; // Link to proof
}

/**
 * JobResourceRequirement - What resources are needed (before assignment)
 */
export interface JobResourceRequirement {
  id: string;
  resource_type: 'driver' | 'vehicle' | 'equipment' | 'personnel';
  role: string; // 'primary_driver', 'backup_driver', 'transport_vehicle', 'forklift'
  quantity: number;
  qualifications_required?: string[]; // ['animal_transport_cert', 'category_C_license']
  min_capacity?: number; // For vehicles
  availability_window_start?: string;
  availability_window_end?: string;
  fulfilled: boolean;
  assigned_resource_id?: string;
}

/**
 * JobComplianceItem - Required validations before execution
 */
export interface JobComplianceItem {
  id: string;
  requirement: string; // 'driver_license_valid', 'vehicle_insured', 'decision_attached'
  category: 'legal' | 'safety' | 'financial' | 'operational';
  required: boolean;
  status: 'pending' | 'compliant' | 'non_compliant' | 'waived';
  checked_at?: string;
  checked_by?: string;
  evidence_url?: string;
  waiver_reason?: string;
  waiver_approved_by?: string;
}

/**
 * JobNote - Communication log entry
 */
export interface JobNote {
  id: string;
  job_id: string;
  type: 'internal' | 'external'; // Internal = team only, External = client-visible
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
  attachments?: string[]; // URLs to files
  mentioned_user_ids?: string[]; // For @mentions
}

/**
 * JobDependency - Link between jobs
 */
export interface JobDependency {
  id: string;
  job_id: string; // This job
  depends_on_job_id: string; // Must complete before this job can start
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
  lag_days?: number; // Optional delay after dependency completes
  status: 'pending' | 'satisfied' | 'violated';
}

/**
 * JobRiskAssessment - Risk flags and mitigation
 */
export interface JobRiskAssessment {
  id: string;
  job_id: string;
  risk_category: 'safety' | 'legal' | 'financial' | 'operational' | 'reputational';
  risk_description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation_plan?: string;
  mitigation_status?: 'pending' | 'in_progress' | 'completed';
  owner_id?: string;
}

/**
 * JobTemplate - Reusable job configuration
 */
export interface JobTemplate {
  id: string;
  department_id: string;
  template_name: string;
  description?: string;
  job_type: string;
  
  // Default values
  default_scope?: string;
  default_deliverables?: Omit<JobDeliverable, 'id' | 'completed' | 'completed_at' | 'completed_by'>[];
  default_resource_requirements?: Omit<JobResourceRequirement, 'id' | 'fulfilled' | 'assigned_resource_id'>[];
  default_compliance_checklist?: Omit<JobComplianceItem, 'id' | 'status' | 'checked_at' | 'checked_by'>[];
  default_risk_flags?: string[];
  default_duration_days?: number;
  
  // Template metadata
  usage_count?: number;
  last_used_at?: string;
  created_by?: string;
  created_at?: string;
}

/**
 * JobConflict - Resource scheduling conflict
 */
export interface JobConflict {
  id: string;
  job_id: string;
  conflicting_job_id: string;
  conflict_type: 'driver_overlap' | 'vehicle_overlap' | 'resource_overallocation';
  resource_id: string;
  resource_type: string;
  overlap_start: string;
  overlap_end: string;
  severity: 'warning' | 'critical';
  resolution?: string;
  resolved_at?: string;
}
