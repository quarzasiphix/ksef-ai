/**
 * Enhanced Document Schema
 * 
 * Separates Section (top-level) from Folder (curated view) from Doc Type (template)
 * Adds polymorphic links to domain entities (job, invoice, decision, etc.)
 */

import type { DocumentSection } from './sections';

/**
 * Document Status Flow
 */
export type DocumentStatus = 
  | 'draft'           // Being created
  | 'awaiting_approval' // Needs decision/approval
  | 'active'          // In force
  | 'completed'       // Fulfilled/closed
  | 'archived'        // Historical record
  | 'cancelled';      // Voided

/**
 * Entity Types for Polymorphic Links
 */
export type EntityType = 
  | 'job'
  | 'invoice'
  | 'decision'
  | 'vehicle'
  | 'driver'
  | 'case'
  | 'shipment'
  | 'contract'
  | 'customer';

/**
 * Link Role - describes relationship
 */
export type LinkRole = 
  | 'primary'         // Main entity this doc belongs to
  | 'reference'       // Referenced entity
  | 'approval'        // Approving entity
  | 'attachment'      // Attached to entity
  | 'evidence';       // Proves something about entity

/**
 * Document - Core entity
 */
export interface Document {
  id: string;
  title: string;
  description?: string;
  status: DocumentStatus;
  
  // Section & Organization
  section: DocumentSection;
  folder_id?: string;
  doc_type_id: string;
  template_id?: string;
  
  // Business Context
  business_profile_id: string;
  department_id?: string;
  counterparty_id?: string;
  
  // Dates
  valid_from?: string;
  valid_to?: string;
  issued_at?: string;
  
  // Requirements & Flags
  requires_decision: boolean;
  decision_id?: string;
  requires_financials: boolean;
  
  // Search & Tags
  tags: string[];
  search_text?: string;
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Computed
  is_expired?: boolean;
  is_expiring_soon?: boolean;
  compliance_status?: 'compliant' | 'missing_items' | 'expired';
}

/**
 * Document Folder - Smart folder with filters
 */
export interface DocumentFolder {
  id: string;
  section: DocumentSection;
  name: string;
  description: string;
  icon?: string;
  
  // Visual
  color?: string;
  order: number;
  
  // Smart Filters (applied automatically)
  default_filters: {
    doc_types?: string[];
    statuses?: DocumentStatus[];
    tags?: string[];
    requires_decision?: boolean;
    linked_entity_types?: EntityType[];
  };
  
  // Helper Content
  helper_text?: string;
  helper_chips?: string[];
  
  // Metadata
  business_profile_id: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Document Type - Defines what kind of document
 */
export interface DocumentType {
  id: string;
  section: DocumentSection;
  name: string;
  description: string;
  icon?: string;
  
  // Defaults
  default_folder_id?: string;
  default_status: DocumentStatus;
  
  // Requirements
  required_links: {
    entity_type: EntityType;
    role: LinkRole;
    required: boolean;
  }[];
  
  required_fields: string[];
  required_attachments: {
    name: string;
    description: string;
    file_types: string[];
  }[];
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Document Template - Schema for creating documents
 */
export interface DocumentTemplate {
  id: string;
  document_type_id: string;
  name: string;
  description: string;
  
  // Schema Definition
  schema_json: {
    blocks: TemplateBlock[];
    required_fields: string[];
    conditional_fields?: ConditionalField[];
  };
  
  // Requirements
  required_blocks: string[];
  required_links: {
    entity_type: EntityType;
    role: LinkRole;
    required: boolean;
  }[];
  
  // Output Modes
  output_modes: ('file' | 'pdf' | 'editor')[];
  
  // Status Flow
  status_flow: {
    from: DocumentStatus;
    to: DocumentStatus;
    conditions?: string[];
  }[];
  
  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Template Block - Form section
 */
export interface TemplateBlock {
  id: string;
  name: string;
  description?: string;
  order: number;
  
  fields: TemplateField[];
  
  // Conditional rendering
  show_if?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than';
    value: any;
  };
}

/**
 * Template Field - Form input
 */
export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'file' | 'entity_link';
  
  placeholder?: string;
  help_text?: string;
  
  // Validation
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  
  // Options (for select/multiselect)
  options?: { value: string; label: string }[];
  
  // Entity linking (for entity_link type)
  entity_type?: EntityType;
  
  // Default value
  default_value?: any;
}

/**
 * Conditional Field - Shows based on other field values
 */
export interface ConditionalField {
  field_id: string;
  show_if: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
}

/**
 * Document Link - Polymorphic relationship to domain entities
 */
export interface DocumentLink {
  id: string;
  document_id: string;
  
  // Polymorphic target
  entity_type: EntityType;
  entity_id: string;
  
  // Relationship
  role: LinkRole;
  
  // Metadata
  created_at: string;
  created_by: string;
}

/**
 * Document Attachment - File storage
 */
export interface DocumentAttachment {
  id: string;
  document_id: string;
  
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  
  // Versioning
  version: number;
  is_latest: boolean;
  
  // Classification
  attachment_type: 'draft' | 'signed' | 'evidence' | 'supporting';
  
  // Metadata
  uploaded_by: string;
  uploaded_at: string;
}

/**
 * Document History - Audit trail
 */
export interface DocumentHistory {
  id: string;
  document_id: string;
  
  action: 'created' | 'updated' | 'status_changed' | 'linked' | 'unlinked' | 'approved' | 'rejected';
  
  // Changes
  field_name?: string;
  old_value?: any;
  new_value?: any;
  
  // Context
  user_id: string;
  timestamp: string;
  notes?: string;
}

/**
 * Compliance Check Result
 */
export interface ComplianceCheck {
  document_id: string;
  
  checks: {
    name: string;
    description: string;
    status: 'pass' | 'fail' | 'warning';
    details?: string;
  }[];
  
  overall_status: 'compliant' | 'missing_items' | 'expired';
  checked_at: string;
}
