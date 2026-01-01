/**
 * Operations Module Types
 * 
 * Handles operational execution for departments:
 * - Transport jobs (trips, deliveries)
 * - Vehicles and drivers
 * - Job-scoped documents and contracts
 * - Real-time resource allocation
 */

import type {
  JobLifecycleEvent,
  JobDeliverable,
  JobResourceRequirement,
  JobComplianceItem,
  JobNote,
  JobDependency,
  JobRiskAssessment,
  JobTemplate,
  JobConflict,
} from './jobEnhancements';

export type {
  JobLifecycleEvent,
  JobDeliverable,
  JobResourceRequirement,
  JobComplianceItem,
  JobNote,
  JobDependency,
  JobRiskAssessment,
  JobTemplate,
  JobConflict,
} from './jobEnhancements';

export type {
  DocumentCategory,
  DocumentTemplate,
  DocumentTemplateField,
  DocumentReadinessStatus,
  DocumentReadiness,
  JobDocument,
  DocumentCategoryMeta,
} from './documentCategories';

export {
  TRANSPORT_DOCUMENT_TEMPLATES,
  DOCUMENT_CATEGORIES,
  getTemplatesByCategory,
  getRequiredTemplatesForStatus,
  calculateDocumentReadiness,
} from './documentCategories';

export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';
export type DriverStatus = 'available' | 'busy' | 'off_duty' | 'blocked';
export type JobStatus = 'draft' | 'approved' | 'scheduled' | 'in_progress' | 'blocked' | 'completed' | 'closed' | 'archived' | 'cancelled';
export type JobLifecycleTransition = 'created' | 'approved' | 'scheduled' | 'started' | 'blocked' | 'unblocked' | 'completed' | 'closed' | 'archived' | 'cancelled';
export type JobStage = string; // Department-specific stages (e.g., 'planning', 'preparation', 'ceremony', 'completed' for funeral)

/**
 * JobMilestone - Stage-based checkpoint in job execution
 */
export interface JobMilestone {
  id: string;
  stage: JobStage;
  label: string;
  completed: boolean;
  completed_at?: string;
  required: boolean;
  order: number;
}

/**
 * Vehicle - Asset used for operations
 */
export interface Vehicle {
  id: string;
  department_id: string;
  business_profile_id: string;
  
  // Basic info
  registration_number: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  
  // Operational
  status: VehicleStatus;
  vehicle_type?: string; // 'van', 'truck', 'car', 'specialized'
  capacity?: number;
  allowed_usage?: string[]; // ['animals', 'eu_transport', 'long_distance']
  
  // Legal requirements
  insurance_contract_id?: string;
  insurance_expiry?: string;
  inspection_expiry?: string;
  license_expiry?: string;
  
  // Ownership
  ownership_type?: 'owned' | 'leased' | 'borrowed';
  vehicle_contract_id?: string; // Link to lease/loan contract
  
  // Tracking
  current_job_id?: string;
  last_service_date?: string;
  next_service_date?: string;
  odometer?: number;
  
  // Metadata
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * Driver - Person authorized to execute jobs
 */
export interface Driver {
  id: string;
  department_id: string;
  business_profile_id: string;
  
  // Basic info
  name: string;
  email?: string;
  phone?: string;
  
  // Employment
  status: DriverStatus;
  employment_type?: 'employee' | 'b2b' | 'external';
  driver_contract_id?: string; // Link to employment/B2B contract
  
  // Qualifications
  license_type?: string; // 'Type 2', 'C', 'CE', etc.
  license_number?: string;
  license_expiry?: string;
  certifications?: string[]; // ['animal_transport', 'hazmat', 'first_aid']
  
  // Operational constraints
  max_hours_per_day?: number;
  allowed_regions?: string[];
  allowed_vehicle_types?: string[];
  
  // Tracking
  current_job_id?: string;
  assigned_vehicles?: string[]; // Vehicle IDs driver is authorized for
  
  // Metadata
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * OperationalJob - Universal execution unit (Job/Case/Project/Initiative)
 * 
 * Adapts to department template:
 * - Transport: Zlecenie (Job) - route-based execution
 * - Funeral: Sprawa (Case) - multi-stage ceremony management
 * - Construction: Projekt (Project) - milestone-based work
 * - SaaS: Inicjatywa (Initiative) - feature/roadmap work
 * 
 * Core principle: Job = Container (not a document)
 * - Links to contracts (not embeds)
 * - Has resources assigned
 * - Tracks costs and timeline
 * - Contains job-scoped documents
 * 
 * Each job MUST have:
 * - Department authorization (decision)
 * - Required contracts (vehicle, driver, client for transport)
 * - Assigned resources
 */
export interface OperationalJob {
  id: string;
  department_id: string;
  business_profile_id: string;
  
  // Job identity
  job_number: string; // e.g., "TR-2025-001", "FH-2025-042", "PROJ-2025-015"
  title: string;
  description?: string;
  job_type?: string; // Department-specific: 'transport', 'funeral_case', 'construction_project', 'saas_initiative'
  
  // Department template context
  template_id?: string; // Links to department template for UI adaptation
  
  // Lifecycle & Status (STATE MACHINE)
  status: JobStatus;
  stage?: JobStage; // Department-specific stage (e.g., 'ceremony' for funeral, 'foundation' for construction)
  lifecycle_history?: JobLifecycleEvent[]; // Audit trail of state transitions
  fields_locked?: string[]; // Fields locked at current state (e.g., ['scheduled_start', 'client_id'])
  
  // Ownership & Responsibility (CRITICAL)
  owner_id?: string; // Ultimate accountability (user ID)
  coordinator_id?: string; // Dispatcher/manager (user ID)
  client_contact_id?: string; // Client-side contact (customer ID or free text)
  escalation_contact?: string; // Who to escalate to if blocked
  
  // Scope & Deliverables (CRITICAL)
  scope_definition?: string; // What "done" means
  deliverables?: JobDeliverable[]; // Explicit outputs
  acceptance_criteria?: string; // How to verify completion
  accepted_by?: string; // Who accepted (user ID or name)
  accepted_at?: string; // When accepted
  
  // Timeline (with actuals)
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  delay_reason?: string; // Why planned ≠ actual
  milestones?: JobMilestone[]; // Stage-based checkpoints
  
  // Dependencies & Blockers
  depends_on_job_ids?: string[]; // Jobs that must complete first
  blocks_job_ids?: string[]; // Jobs waiting on this one
  blocking_issues?: JobBlockingIssue[]; // Current blockers
  
  // Legal foundation (REQUIRED)
  department_decision_id?: string; // Authorization to operate
  job_decision_id?: string; // Specific job approval (optional)
  
  // Resource assignment (REQUIRED for execution)
  assigned_vehicle_id?: string;
  assigned_driver_id?: string;
  resource_requirements?: JobResourceRequirement[]; // What resources are needed
  
  // Contracts (REQUIRED - no job without contracts)
  vehicle_contract_id?: string; // Lease/ownership contract
  driver_contract_id?: string; // Employment/B2B contract
  client_contract_id?: string; // Service agreement
  
  // Client info
  client_id?: string;
  client_name?: string;
  client_contact?: string;
  
  // Template-specific data (stored as flexible JSON)
  // Transport: origin, destination, distance_km, cargo_description
  // Funeral: deceased_name, family_contact, ceremony_date, cemetery
  // Construction: site_address, building_type, permits
  // SaaS: feature_scope, target_release, technical_spec
  template_data?: Record<string, any>;
  
  // Resources (generic, adapts to template)
  resources?: JobResource[];
  
  // Financial (CRITICAL - job = financial unit)
  estimated_cost?: number;
  actual_cost?: number;
  budget_margin?: number; // Expected profit
  cost_cap?: number; // Hard limit (requires approval to exceed)
  client_price?: number;
  currency?: string;
  invoice_ids?: string[]; // Linked invoices
  settlement_status?: 'pending' | 'partial' | 'settled'; // Financial closure
  
  // Risk & Compliance
  risk_flags?: string[]; // ['insurance_required', 'cross_border', 'hazmat']
  compliance_checklist?: JobComplianceItem[]; // Required validations
  compliance_status?: 'pending' | 'compliant' | 'non_compliant';
  
  // Communication log
  internal_notes?: JobNote[]; // Team-only
  external_notes?: JobNote[]; // Client-visible
  
  // Closure & Post-mortem
  outcome_rating?: 'success' | 'partial' | 'failed';
  actual_margin?: number; // Actual profit
  lessons_learned?: string; // What to improve
  
  // Metadata
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * Issues that prevent job execution
 */
export interface JobBlockingIssue {
  id: string;
  type: 'missing_contract' | 'missing_decision' | 'expired_license' | 'expired_insurance' | 'no_driver' | 'no_vehicle' | 'other';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  resolution_action?: string;
  resolved?: boolean;
}

/**
 * Legacy JobDocument - Deprecated, use JobDocument from documentCategories.ts
 * @deprecated Use JobDocument from './documentCategories' instead
 */
export interface LegacyJobDocument {
  id: string;
  job_id: string;
  document_type: string; // Template-specific: 'delivery_confirmation', 'death_certificate', 'building_permit', etc.
  title: string;
  file_url?: string;
  uploaded_at?: string;
  uploaded_by?: string;
}

/**
 * JobCost - Cost/revenue item linked to job
 */
export interface JobCost {
  id: string;
  job_id: string;
  type: 'cost' | 'revenue';
  category: string; // 'fuel', 'driver_payment', 'coffin', 'flowers', 'materials', etc.
  description: string;
  amount: number;
  currency: string;
  invoice_id?: string; // Link to invoice if applicable
  contract_id?: string; // Link to contract if applicable
  date: string;
}

/**
 * JobResource - Generic resource assignment to job
 */
export interface JobResource {
  id: string;
  job_id: string;
  resource_type: 'driver' | 'vehicle' | 'employee' | 'equipment' | 'vendor';
  resource_id: string;
  resource_name: string;
  role?: string; // 'primary_driver', 'ceremony_director', 'site_manager', etc.
  assigned_at: string;
  released_at?: string;
}

/**
 * Resource Availability Summary
 */
export interface ResourceAvailability {
  drivers: {
    total: number;
    available: number;
    busy: number;
    blocked: number;
    expiring_licenses: Driver[];
  };
  vehicles: {
    total: number;
    available: number;
    in_use: number;
    out_of_service: number;
    expiring_insurance: Vehicle[];
    expiring_inspection: Vehicle[];
  };
}

/**
 * Operations Dashboard Stats
 */
export interface OperationsDashboard {
  active_jobs: number;
  upcoming_jobs: number;
  blocked_jobs: number;
  completed_today: number;
  resource_availability: ResourceAvailability;
  critical_alerts: JobBlockingIssue[];
}

/**
 * Department-specific job terminology
 */
export const JOB_TERMINOLOGY: Record<string, { singular: string; plural: string }> = {
  transport_operations: { singular: 'Zlecenie', plural: 'Zlecenia' },
  funeral_home: { singular: 'Sprawa', plural: 'Sprawy' },
  construction: { singular: 'Projekt', plural: 'Projekty' },
  saas: { singular: 'Inicjatywa', plural: 'Inicjatywy' },
  general: { singular: 'Zadanie', plural: 'Zadania' },
};

/**
 * Get job terminology for department template
 */
export function getJobTerminology(templateId: string): { singular: string; plural: string } {
  return JOB_TERMINOLOGY[templateId] || JOB_TERMINOLOGY.general;
}
