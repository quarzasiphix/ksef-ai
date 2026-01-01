/**
 * Document Categories System - Semantic meaning for operational documents
 * 
 * Philosophy: Documents are not a drive, they are legal-operational memory of execution.
 * Every document must answer: "Why does this document exist in the process?"
 */

/**
 * Document Category - Semantic classification with process meaning
 */
export type DocumentCategory = 'contractual' | 'operational' | 'compliance' | 'financial' | 'history';

/**
 * Document Template - Pre-defined document types per category
 */
export interface DocumentTemplate {
  id: string;
  category: DocumentCategory;
  name: string;
  name_pl: string;
  description: string;
  required: boolean; // If true, missing this blocks job execution
  required_for_status?: string[]; // Job statuses that require this doc (e.g., ['approved', 'scheduled'])
  fields?: DocumentTemplateField[];
  auto_generate?: boolean; // System can auto-create this doc
  editable_until?: 'completion' | 'invoicing' | 'closure'; // When doc becomes read-only
  expires?: boolean; // If true, has expiry date validation
}

export interface DocumentTemplateField {
  name: string;
  type: 'text' | 'date' | 'number' | 'select' | 'signature' | 'photo';
  required: boolean;
  options?: string[]; // For select fields
}

/**
 * Document Readiness Status - Visual indicator per job
 */
export type DocumentReadinessStatus = 'ready' | 'missing_recommended' | 'missing_required';

export interface DocumentReadiness {
  status: DocumentReadinessStatus;
  missing_required: string[]; // Template IDs
  missing_recommended: string[]; // Template IDs
  expired: string[]; // Document IDs with expired dates
  compliance_blocked: boolean; // If true, job cannot proceed
}

/**
 * Job Document - Actual document instance linked to job
 */
export interface JobDocument {
  id: string;
  job_id: string;
  template_id?: string; // Links to DocumentTemplate
  category: DocumentCategory;
  
  // Identity
  title: string;
  description?: string;
  
  // File
  file_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  
  // Linkage (auditable by design)
  linked_contract_id?: string; // Which contract this proves/supports
  linked_decision_id?: string; // Which decision authorized this
  linked_invoice_id?: string; // Which invoice this settles
  
  // Validity
  valid_from?: string;
  valid_to?: string;
  expired?: boolean;
  
  // Lifecycle
  status: 'draft' | 'active' | 'expired' | 'archived';
  locked: boolean; // If true, cannot be edited
  locked_reason?: string; // e.g., "Job completed", "Invoice issued"
  
  // Metadata
  uploaded_by?: string;
  uploaded_at?: string;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  
  // Structured data (for template-based docs)
  template_data?: Record<string, any>;
}

/**
 * Transport-specific document templates (out-of-the-box)
 */
export const TRANSPORT_DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  // A. CONTRACTUAL (before execution)
  {
    id: 'framework_transport_agreement',
    category: 'contractual',
    name: 'Framework Transport Agreement',
    name_pl: 'Ramowa umowa transportowa',
    description: 'Master agreement for recurring transport services',
    required: true,
    required_for_status: ['approved'],
    expires: true,
  },
  {
    id: 'single_transport_order',
    category: 'contractual',
    name: 'Single Transport Order',
    name_pl: 'Zlecenie transportowe',
    description: 'Individual transport job order',
    required: true,
    required_for_status: ['approved'],
    auto_generate: true,
    fields: [
      { name: 'client_name', type: 'text', required: true },
      { name: 'route_from', type: 'text', required: true },
      { name: 'route_to', type: 'text', required: true },
      { name: 'cargo_description', type: 'text', required: true },
      { name: 'planned_date', type: 'date', required: true },
      { name: 'price_agreed', type: 'number', required: true },
      { name: 'client_signature', type: 'signature', required: true },
    ],
  },
  {
    id: 'transport_terms_conditions',
    category: 'contractual',
    name: 'Terms & Conditions',
    name_pl: 'Ogólne Warunki Transportu',
    description: 'Standard transport terms and conditions',
    required: false,
  },
  {
    id: 'nda',
    category: 'contractual',
    name: 'Non-Disclosure Agreement',
    name_pl: 'Umowa o zachowaniu poufności',
    description: 'Confidentiality agreement (enterprise-grade)',
    required: false,
  },

  // B. OPERATIONAL (during execution)
  {
    id: 'transport_order_sheet',
    category: 'operational',
    name: 'Transport Order Sheet',
    name_pl: 'Karta zlecenia transportowego',
    description: 'Internal execution tracking sheet',
    required: true,
    auto_generate: true,
    editable_until: 'completion',
    fields: [
      { name: 'driver_name', type: 'text', required: true },
      { name: 'vehicle_registration', type: 'text', required: true },
      { name: 'actual_route', type: 'text', required: false },
      { name: 'fuel_cost', type: 'number', required: false },
      { name: 'toll_cost', type: 'number', required: false },
      { name: 'delays', type: 'text', required: false },
    ],
  },
  {
    id: 'driver_assignment_sheet',
    category: 'operational',
    name: 'Driver Assignment Sheet',
    name_pl: 'Karta przydziału kierowcy',
    description: 'Driver assignment and responsibility document',
    required: true,
    auto_generate: true,
  },
  {
    id: 'route_plan',
    category: 'operational',
    name: 'Route Plan / Itinerary',
    name_pl: 'Plan trasy',
    description: 'Planned route with stops and timing',
    required: false,
    auto_generate: true,
  },
  {
    id: 'pickup_protocol',
    category: 'operational',
    name: 'Pickup Protocol',
    name_pl: 'Protokół odbioru',
    description: 'Pickup confirmation with condition notes',
    required: true,
    editable_until: 'completion',
    fields: [
      { name: 'pickup_date', type: 'date', required: true },
      { name: 'pickup_time', type: 'text', required: true },
      { name: 'condition_notes', type: 'text', required: true },
      { name: 'sender_signature', type: 'signature', required: true },
      { name: 'driver_signature', type: 'signature', required: true },
      { name: 'photo', type: 'photo', required: false },
    ],
  },
  {
    id: 'delivery_protocol',
    category: 'operational',
    name: 'Delivery Protocol',
    name_pl: 'Protokół dostawy',
    description: 'Delivery confirmation with condition notes',
    required: true,
    editable_until: 'completion',
    fields: [
      { name: 'delivery_date', type: 'date', required: true },
      { name: 'delivery_time', type: 'text', required: true },
      { name: 'condition_notes', type: 'text', required: true },
      { name: 'receiver_signature', type: 'signature', required: true },
      { name: 'driver_signature', type: 'signature', required: true },
      { name: 'photo', type: 'photo', required: false },
    ],
  },
  {
    id: 'incident_report',
    category: 'operational',
    name: 'Incident / Delay Report',
    name_pl: 'Raport incydentu',
    description: 'Incident or delay documentation',
    required: false, // Triggered on-demand
    editable_until: 'completion',
    fields: [
      { name: 'incident_type', type: 'select', required: true, options: ['delay', 'damage', 'accident', 'complaint', 'other'] },
      { name: 'incident_date', type: 'date', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'impact', type: 'text', required: false },
      { name: 'resolution', type: 'text', required: false },
      { name: 'photo', type: 'photo', required: false },
    ],
  },

  // C. COMPLIANCE (blocking category)
  {
    id: 'driver_license',
    category: 'compliance',
    name: 'Driver License Record',
    name_pl: 'Kopia prawa jazdy',
    description: 'Valid driver license',
    required: true,
    required_for_status: ['approved', 'scheduled'],
    expires: true,
  },
  {
    id: 'vehicle_registration',
    category: 'compliance',
    name: 'Vehicle Registration',
    name_pl: 'Dowód rejestracyjny pojazdu',
    description: 'Vehicle registration certificate',
    required: true,
    required_for_status: ['approved', 'scheduled'],
    expires: true,
  },
  {
    id: 'insurance_certificate',
    category: 'compliance',
    name: 'Insurance Certificate',
    name_pl: 'Polisa ubezpieczeniowa',
    description: 'Valid vehicle insurance',
    required: true,
    required_for_status: ['approved', 'scheduled'],
    expires: true,
  },
  {
    id: 'animal_transport_authorization',
    category: 'compliance',
    name: 'Animal Transport Authorization',
    name_pl: 'Zezwolenie na transport zwierząt',
    description: 'Authorization for animal transport (if applicable)',
    required: false, // Required only if cargo is animals
    expires: true,
  },
  {
    id: 'cross_border_permit',
    category: 'compliance',
    name: 'Cross-border Permit',
    name_pl: 'Zezwolenie na transport międzynarodowy',
    description: 'EU/non-EU cross-border transport permit',
    required: false, // Required only for international transport
    expires: true,
  },

  // D. FINANCIAL (post-execution)
  {
    id: 'cost_breakdown',
    category: 'financial',
    name: 'Cost Breakdown Sheet',
    name_pl: 'Zestawienie kosztów',
    description: 'Detailed cost breakdown for job',
    required: true,
    auto_generate: true,
    editable_until: 'invoicing',
    fields: [
      { name: 'fuel_cost', type: 'number', required: true },
      { name: 'toll_cost', type: 'number', required: true },
      { name: 'driver_payment', type: 'number', required: true },
      { name: 'other_costs', type: 'number', required: false },
      { name: 'total_cost', type: 'number', required: true },
    ],
  },
  {
    id: 'client_settlement',
    category: 'financial',
    name: 'Client Settlement Summary',
    name_pl: 'Rozliczenie z klientem',
    description: 'Settlement summary for client',
    required: true,
    editable_until: 'invoicing',
  },
  {
    id: 'invoice_attachment',
    category: 'financial',
    name: 'Invoice Attachment',
    name_pl: 'Załącznik faktury',
    description: 'Invoice for transport service',
    required: true,
    editable_until: 'closure',
  },
  {
    id: 'proof_of_delivery',
    category: 'financial',
    name: 'Proof of Delivery (POD)',
    name_pl: 'Potwierdzenie dostawy',
    description: 'Proof of delivery for accounting',
    required: true,
    editable_until: 'invoicing',
  },
];

/**
 * Document Category Metadata
 */
export interface DocumentCategoryMeta {
  id: DocumentCategory;
  name: string;
  name_pl: string;
  description: string;
  icon: string;
  color: string;
  blocks_execution: boolean; // If missing required docs, block job
  auto_folder: boolean; // Auto-create folder per job
}

export const DOCUMENT_CATEGORIES: Record<DocumentCategory, DocumentCategoryMeta> = {
  contractual: {
    id: 'contractual',
    name: 'Contractual',
    name_pl: 'Umowy',
    description: 'Documents required before job execution (contracts, agreements, terms)',
    icon: 'FileText',
    color: '#3b82f6',
    blocks_execution: true,
    auto_folder: true,
  },
  operational: {
    id: 'operational',
    name: 'Operational',
    name_pl: 'Wykonawcze',
    description: 'Documents created during job execution (protocols, reports, logs)',
    icon: 'ClipboardList',
    color: '#10b981',
    blocks_execution: false,
    auto_folder: true,
  },
  compliance: {
    id: 'compliance',
    name: 'Compliance',
    name_pl: 'Zgodność',
    description: 'Legal and regulatory documents (licenses, permits, certificates)',
    icon: 'Shield',
    color: '#f59e0b',
    blocks_execution: true,
    auto_folder: true,
  },
  financial: {
    id: 'financial',
    name: 'Financial',
    name_pl: 'Finansowe',
    description: 'Post-execution financial documents (invoices, settlements, costs)',
    icon: 'DollarSign',
    color: '#8b5cf6',
    blocks_execution: false,
    auto_folder: true,
  },
  history: {
    id: 'history',
    name: 'History',
    name_pl: 'Historia',
    description: 'Read-only archived documents (audit trail, old versions)',
    icon: 'Archive',
    color: '#6b7280',
    blocks_execution: false,
    auto_folder: true,
  },
};

/**
 * Helper: Get templates for a specific category
 */
export function getTemplatesByCategory(category: DocumentCategory): DocumentTemplate[] {
  return TRANSPORT_DOCUMENT_TEMPLATES.filter(t => t.category === category);
}

/**
 * Helper: Get required templates for job status
 */
export function getRequiredTemplatesForStatus(status: string): DocumentTemplate[] {
  return TRANSPORT_DOCUMENT_TEMPLATES.filter(
    t => t.required && t.required_for_status?.includes(status)
  );
}

/**
 * Helper: Check document readiness for job
 * @param jobStatus Current job status
 * @param jobDocuments Existing job documents
 * @param availableTemplates Templates to check against (department-specific)
 */
export function calculateDocumentReadiness(
  jobStatus: string,
  jobDocuments: JobDocument[],
  availableTemplates?: DocumentTemplate[]
): DocumentReadiness {
  const templates = availableTemplates || TRANSPORT_DOCUMENT_TEMPLATES;
  const requiredTemplates = templates.filter(
    t => t.required && t.required_for_status?.includes(jobStatus)
  );
  const recommendedTemplates = templates.filter(t => !t.required);
  
  const existingTemplateIds = new Set(
    jobDocuments.map(d => d.template_id).filter(Boolean)
  );
  
  const missing_required = requiredTemplates
    .filter(t => !existingTemplateIds.has(t.id))
    .map(t => t.id);
  
  const missing_recommended = recommendedTemplates
    .filter(t => !existingTemplateIds.has(t.id))
    .map(t => t.id);
  
  const expired = jobDocuments
    .filter(d => d.expired || (d.valid_to && new Date(d.valid_to) < new Date()))
    .map(d => d.id);
  
  const compliance_blocked = jobDocuments.some(
    d => d.category === 'compliance' && (d.expired || d.status === 'expired')
  ) || missing_required.some(
    tid => TRANSPORT_DOCUMENT_TEMPLATES.find(t => t.id === tid)?.category === 'compliance'
  );
  
  let status: DocumentReadinessStatus = 'ready';
  if (missing_required.length > 0 || compliance_blocked) {
    status = 'missing_required';
  } else if (missing_recommended.length > 0 || expired.length > 0) {
    status = 'missing_recommended';
  }
  
  return {
    status,
    missing_required,
    missing_recommended,
    expired,
    compliance_blocked,
  };
}
