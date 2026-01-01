/**
 * Document Blueprints - Template metadata system
 * 
 * Blueprint = How a document behaves in the system (not just content)
 * This enables context-aware, section-specific document creation
 */

import type { DocumentType, DocumentStatus, DocumentScope } from './index';

// ============================================================================
// DOCUMENT BLUEPRINT (Template metadata)
// ============================================================================

export type DocumentSection = 'operations' | 'contracts' | 'decisions' | 'financial' | 'audit';

/**
 * View ID - Specific list/filter view within a section
 * Format: {section}_{view_name}
 */
export type ViewId = string; // e.g., 'contracts_main', 'contracts_annexes', 'operations_jobs'

export type BlueprintCategory = 
  | 'execution'
  | 'contractual'
  | 'compliance'
  | 'financial'
  | 'audit'
  | 'correspondence';

/**
 * Document Blueprint - Defines how a document type behaves
 */
export interface DocumentBlueprint {
  id: string;
  name: string;
  name_pl: string;
  description: string;
  description_pl: string;
  
  // Classification
  document_type: DocumentType;
  category: BlueprintCategory;
  
  // Section & Placement (where can this be created and where does it appear?)
  primary_section: DocumentSection; // Main section this belongs to
  allowed_views: ViewId[]; // Which views within section can show this
  default_view_id: ViewId; // Default view where it appears
  
  // Scope & linking requirements
  default_scope: DocumentScope;
  required_links: {
    job?: boolean;
    client?: boolean;
    invoice?: boolean;
    decision?: boolean;
    contract?: boolean;
    vehicle?: boolean;
    driver?: boolean;
  };
  
  // Required fields
  required_fields: {
    valid_from?: boolean;
    valid_to?: boolean;
    amount?: boolean;
    currency?: boolean;
    description?: boolean;
    tags?: boolean;
  };
  
  // Gating rules
  requires_decision?: {
    required: boolean;
    decision_types?: string[]; // e.g., ['operational_authority', 'financial_approval']
    blocks_activation?: boolean; // Block status change to 'ready' until decision linked
  };
  
  financial_impact?: {
    has_impact: boolean;
    requires_amount?: boolean;
    requires_vat?: boolean;
    requires_cost_center?: boolean;
    auto_create_accounting_entry?: boolean;
  };
  
  audit_flags?: {
    is_internal_only?: boolean;
    requires_evidence?: boolean;
    risk_level?: 'low' | 'medium' | 'high' | 'critical';
    compliance_checklist?: string[];
  };
  
  // Lifecycle
  status_flow: DocumentStatus[];
  default_status: DocumentStatus;
  expires?: boolean;
  requires_signature?: boolean;
  auto_lock_on_complete?: boolean;
  
  // Permissions
  permissions?: {
    can_create?: string[]; // Role IDs
    can_edit?: string[];
    can_approve?: string[];
    can_view?: string[];
  };
  
  // Auto-generation
  generator?: {
    template_key?: string; // For docx/pdf generation
    auto_number?: boolean;
    number_prefix?: string; // e.g., 'TR-', 'INV-'
  };
  
  // UI hints
  icon?: string;
  color?: string;
  badges?: Array<'requires_decision' | 'financial' | 'audit_only' | 'expires' | 'requires_job'>;
  order?: number;
  
  // Auto-generation patterns
  title_pattern?: string; // e.g., "Umowa o świadczenie usług – {client_name}"
  number_pattern?: string; // e.g., "UM/{year}/{sequence}"
}

// ============================================================================
// DOCUMENT CREATION CONTEXT
// ============================================================================

/**
 * Context passed to document creation flow
 * Automatically inherited from the section user is in
 */
export interface DocumentCreationContext {
  // Section context
  section: DocumentSection;
  department_template_id: string;
  business_profile_id: string;
  
  // Optional pre-filled links
  job_id?: string;
  client_id?: string;
  invoice_id?: string;
  contract_id?: string;
  decision_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  
  // User context
  user_id: string;
  user_roles?: string[];
}

// ============================================================================
// TRANSPORT OPERATIONS BLUEPRINTS (globalpet)
// ============================================================================

export const TRANSPORT_BLUEPRINTS: DocumentBlueprint[] = [
  // ========== OPERATIONS EXECUTION ==========
  {
    id: 'transport_order',
    name: 'Transport Order',
    name_pl: 'Zlecenie transportowe',
    description: 'Individual transport job order document',
    description_pl: 'Dokument zlecenia transportowego dla pojedynczego zadania',
    document_type: 'execution',
    category: 'execution',
    primary_section: 'operations',
    allowed_views: ['operations_jobs', 'operations_execution'],
    default_view_id: 'operations_jobs',
    default_scope: 'job',
    required_links: {
      job: true,
      client: true,
    },
    required_fields: {
      valid_from: true,
      description: true,
    },
    requires_decision: {
      required: false,
      blocks_activation: false,
    },
    financial_impact: {
      has_impact: true,
      requires_amount: true,
      requires_vat: false,
    },
    status_flow: ['draft', 'ready', 'requires_action', 'completed', 'archived'],
    default_status: 'draft',
    expires: false,
    requires_signature: true,
    auto_lock_on_complete: true,
    generator: {
      auto_number: true,
      number_prefix: 'TR-',
    },
    title_pattern: 'Zlecenie transportowe {job_number}',
    number_pattern: 'TR/{year}/{sequence}',
    icon: 'Truck',
    color: '#3b82f6',
    badges: ['requires_job', 'financial'],
    order: 1,
  },
  {
    id: 'handover_protocol',
    name: 'Handover Protocol',
    name_pl: 'Protokół przekazania',
    description: 'Pickup/delivery confirmation protocol',
    description_pl: 'Protokół potwierdzenia odbioru lub dostawy',
    document_type: 'execution',
    category: 'execution',
    primary_section: 'operations',
    allowed_views: ['operations_jobs', 'operations_execution'],
    default_view_id: 'operations_jobs',
    default_scope: 'job',
    required_links: {
      job: true,
    },
    required_fields: {
      description: true,
    },
    status_flow: ['draft', 'ready', 'completed'],
    default_status: 'draft',
    expires: false,
    requires_signature: true,
    auto_lock_on_complete: true,
    icon: 'ClipboardCheck',
    color: '#10b981',
    badges: ['requires_job'],
    order: 2,
  },
  {
    id: 'execution_card',
    name: 'Execution Card',
    name_pl: 'Karta realizacji',
    description: 'Job execution tracking card',
    description_pl: 'Karta śledzenia realizacji zlecenia',
    document_type: 'execution',
    category: 'execution',
    primary_section: 'operations',
    allowed_views: ['operations_jobs', 'operations_execution'],
    default_view_id: 'operations_jobs',
    default_scope: 'job',
    required_links: {
      job: true,
      driver: true,
      vehicle: true,
    },
    required_fields: {
      description: true,
    },
    status_flow: ['draft', 'ready', 'completed'],
    default_status: 'draft',
    expires: false,
    auto_lock_on_complete: true,
    icon: 'FileText',
    color: '#8b5cf6',
    badges: ['requires_job'],
    order: 3,
  },
  {
    id: 'incident_report',
    name: 'Incident Report',
    name_pl: 'Raport incydentu',
    description: 'Incident or delay documentation',
    description_pl: 'Dokumentacja incydentu lub opóźnienia',
    document_type: 'execution',
    category: 'execution',
    primary_section: 'operations',
    allowed_views: ['operations_jobs', 'operations_incidents', 'audit_reports'],
    default_view_id: 'operations_incidents',
    default_scope: 'job',
    required_links: {
      job: false, // Optional but recommended
    },
    required_fields: {
      description: true,
    },
    audit_flags: {
      requires_evidence: true,
      risk_level: 'medium',
    },
    status_flow: ['draft', 'ready', 'completed', 'archived'],
    default_status: 'draft',
    expires: false,
    icon: 'AlertTriangle',
    color: '#f59e0b',
    order: 4,
  },
  
  // ========== CONTRACTS ==========
  {
    id: 'framework_contract_b2b',
    name: 'Framework B2B Contract',
    name_pl: 'Umowa ramowa B2B',
    description: 'Long-term B2B framework agreement',
    description_pl: 'Długoterminowa umowa ramowa B2B',
    document_type: 'contract',
    category: 'contractual',
    primary_section: 'contracts',
    allowed_views: ['contracts_main', 'contracts_framework'],
    default_view_id: 'contracts_main',
    default_scope: 'contract',
    required_links: {
      client: true,
      decision: true,
    },
    required_fields: {
      valid_from: true,
      valid_to: true,
      amount: true,
      currency: true,
    },
    requires_decision: {
      required: true,
      decision_types: ['contract_authority'],
      blocks_activation: true,
    },
    financial_impact: {
      has_impact: true,
      requires_amount: true,
      requires_vat: true,
    },
    status_flow: ['draft', 'requires_action', 'signed', 'completed', 'archived'],
    default_status: 'draft',
    expires: true,
    requires_signature: true,
    auto_lock_on_complete: true,
    icon: 'FileSignature',
    color: '#3b82f6',
    badges: ['requires_decision', 'financial', 'expires'],
    order: 10,
  },
  {
    id: 'single_order',
    name: 'Single Order',
    name_pl: 'Zlecenie jednorazowe',
    description: 'One-time service order',
    description_pl: 'Jednorazowe zlecenie usługi',
    document_type: 'contract',
    category: 'contractual',
    primary_section: 'contracts',
    allowed_views: ['contracts_main', 'contracts_single_orders'],
    default_view_id: 'contracts_single_orders',
    default_scope: 'job',
    required_links: {
      client: true,
      job: true,
    },
    required_fields: {
      amount: true,
      currency: true,
    },
    financial_impact: {
      has_impact: true,
      requires_amount: true,
    },
    status_flow: ['draft', 'ready', 'completed'],
    default_status: 'draft',
    expires: false,
    icon: 'FileText',
    color: '#10b981',
    badges: ['requires_job', 'financial'],
    order: 11,
  },
  
  // ========== COMPLIANCE ==========
  {
    id: 'carrier_insurance',
    name: 'Carrier Insurance Policy',
    name_pl: 'Polisa OC przewoźnika',
    description: 'Carrier liability insurance certificate',
    description_pl: 'Polisa ubezpieczenia OC przewoźnika',
    document_type: 'compliance',
    category: 'compliance',
    primary_section: 'operations',
    allowed_views: ['operations_compliance', 'audit_compliance'],
    default_view_id: 'operations_compliance',
    default_scope: 'department',
    required_links: {},
    required_fields: {
      valid_from: true,
      valid_to: true,
    },
    status_flow: ['draft', 'ready', 'expired'],
    default_status: 'draft',
    expires: true,
    icon: 'Shield',
    color: '#f59e0b',
    badges: ['expires'],
    order: 20,
  },
  {
    id: 'driver_license',
    name: 'Driver License',
    name_pl: 'Uprawnienia kierowcy',
    description: 'Driver license and qualifications',
    description_pl: 'Prawo jazdy i uprawnienia kierowcy',
    document_type: 'compliance',
    category: 'compliance',
    primary_section: 'operations',
    allowed_views: ['operations_compliance', 'operations_drivers'],
    default_view_id: 'operations_drivers',
    default_scope: 'driver',
    required_links: {
      driver: true,
    },
    required_fields: {
      valid_to: true,
    },
    status_flow: ['draft', 'ready', 'expired'],
    default_status: 'draft',
    expires: true,
    icon: 'IdCard',
    color: '#f59e0b',
    badges: ['expires'],
    order: 21,
  },
  {
    id: 'vehicle_documents',
    name: 'Vehicle Documents',
    name_pl: 'Dokumenty pojazdu',
    description: 'Vehicle registration and inspection',
    description_pl: 'Dowód rejestracyjny i przegląd pojazdu',
    document_type: 'compliance',
    category: 'compliance',
    primary_section: 'operations',
    allowed_views: ['operations_compliance', 'operations_vehicles'],
    default_view_id: 'operations_vehicles',
    default_scope: 'vehicle',
    required_links: {
      vehicle: true,
    },
    required_fields: {
      valid_to: true,
    },
    status_flow: ['draft', 'ready', 'expired'],
    default_status: 'draft',
    expires: true,
    icon: 'FileCheck',
    color: '#f59e0b',
    badges: ['expires'],
    order: 22,
  },
  
  // ========== FINANCIAL ==========
  {
    id: 'job_settlement',
    name: 'Job Settlement',
    name_pl: 'Rozliczenie zlecenia',
    description: 'Job cost and revenue settlement',
    description_pl: 'Rozliczenie kosztów i przychodów zlecenia',
    document_type: 'financial',
    category: 'financial',
    primary_section: 'financial',
    allowed_views: ['financial_settlements', 'operations_financial'],
    default_view_id: 'financial_settlements',
    default_scope: 'job',
    required_links: {
      job: true,
    },
    required_fields: {
      amount: true,
      currency: true,
    },
    financial_impact: {
      has_impact: true,
      requires_amount: true,
      requires_vat: true,
      requires_cost_center: true,
      auto_create_accounting_entry: true,
    },
    status_flow: ['draft', 'ready', 'completed', 'archived'],
    default_status: 'draft',
    expires: false,
    auto_lock_on_complete: true,
    icon: 'DollarSign',
    color: '#8b5cf6',
    badges: ['requires_job', 'financial'],
    order: 30,
  },
  {
    id: 'invoice_attachment',
    name: 'Invoice Attachment / POD',
    name_pl: 'Załącznik do faktury / POD',
    description: 'Proof of delivery or invoice attachment',
    description_pl: 'Potwierdzenie dostawy lub załącznik do faktury',
    document_type: 'financial',
    category: 'financial',
    primary_section: 'financial',
    allowed_views: ['financial_attachments', 'financial_pod'],
    default_view_id: 'financial_attachments',
    default_scope: 'job',
    required_links: {
      invoice: false, // Optional
      job: false,
    },
    required_fields: {},
    status_flow: ['draft', 'ready', 'completed'],
    default_status: 'draft',
    expires: false,
    icon: 'Receipt',
    color: '#10b981',
    order: 31,
  },
  
  // ========== AUDIT ==========
  {
    id: 'audit_note',
    name: 'Audit Note',
    name_pl: 'Notatka audytowa',
    description: 'Internal audit observation or note',
    description_pl: 'Wewnętrzna notatka lub obserwacja audytowa',
    document_type: 'internal',
    category: 'audit',
    primary_section: 'audit',
    allowed_views: ['audit_notes', 'audit_internal'],
    default_view_id: 'audit_notes',
    default_scope: 'department',
    required_links: {},
    required_fields: {
      description: true,
    },
    audit_flags: {
      is_internal_only: true,
      requires_evidence: true,
      risk_level: 'low',
    },
    status_flow: ['draft', 'ready', 'completed', 'archived'],
    default_status: 'draft',
    expires: false,
    icon: 'FileSearch',
    color: '#6366f1',
    badges: ['audit_only'],
    order: 40,
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get blueprints available for a specific section
 */
export function getBlueprintsForSection(section: DocumentSection): DocumentBlueprint[] {
  return TRANSPORT_BLUEPRINTS.filter(bp => bp.primary_section === section);
}

/**
 * Get blueprints filtered by context
 */
export function getBlueprintsForContext(context: DocumentCreationContext): DocumentBlueprint[] {
  let blueprints = getBlueprintsForSection(context.section);
  
  // Filter by required links availability
  blueprints = blueprints.filter(bp => {
    if (bp.required_links.job && !context.job_id) return false;
    if (bp.required_links.client && !context.client_id) return false;
    if (bp.required_links.invoice && !context.invoice_id) return false;
    if (bp.required_links.vehicle && !context.vehicle_id) return false;
    if (bp.required_links.driver && !context.driver_id) return false;
    return true;
  });
  
  return blueprints.sort((a, b) => (a.order || 999) - (b.order || 999));
}

/**
 * Get blueprint by ID
 */
export function getBlueprintById(id: string): DocumentBlueprint | undefined {
  return TRANSPORT_BLUEPRINTS.find(bp => bp.id === id);
}

/**
 * Check if blueprint requires decision gate
 */
export function requiresDecisionGate(blueprint: DocumentBlueprint): boolean {
  return blueprint.requires_decision?.required || false;
}

/**
 * Check if blueprint has financial impact
 */
export function hasFinancialImpact(blueprint: DocumentBlueprint): boolean {
  return blueprint.financial_impact?.has_impact || false;
}

/**
 * Check if blueprint is audit-only
 */
export function isAuditOnly(blueprint: DocumentBlueprint): boolean {
  return blueprint.audit_flags?.is_internal_only || false;
}

/**
 * Generate document number based on blueprint
 */
export function generateDocumentNumber(blueprint: DocumentBlueprint, sequence: number): string {
  if (!blueprint.generator?.auto_number) return '';
  
  const prefix = blueprint.generator.number_prefix || 'DOC-';
  const year = new Date().getFullYear();
  const paddedSequence = sequence.toString().padStart(4, '0');
  
  return `${prefix}${year}-${paddedSequence}`;
}
