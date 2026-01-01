/**
 * Documents Module - Core Types
 * 
 * Philosophy: Document ≠ File
 * - Document = structured record with metadata + lifecycle
 * - Attachment = file linked to document
 * - Folders = saved filter presets (not fake directories)
 */

// ============================================================================
// DOCUMENT (Record with metadata)
// ============================================================================

export type DocumentType = 
  | 'contract'
  | 'execution'
  | 'compliance'
  | 'financial'
  | 'correspondence'
  | 'internal'
  | 'other';

export type DocumentStatus = 
  | 'draft'
  | 'ready'
  | 'requires_action'
  | 'completed'
  | 'archived'
  | 'signed'
  | 'expired';

export type DocumentScope = 
  | 'department'
  | 'job'
  | 'contract'
  | 'decision'
  | 'client'
  | 'vehicle'
  | 'driver';

export type DocumentRequiredLevel = 'optional' | 'required' | 'critical';

/**
 * Document - Core record with metadata
 * This is NOT a file. Files are attachments.
 */
export interface Document {
  id: string;
  
  // Identity
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  description?: string;
  
  // Scope & Context
  scope: DocumentScope;
  department_id: string;
  
  // Linkage (what this document relates to)
  job_id?: string;
  contract_id?: string;
  decision_id?: string;
  invoice_id?: string;
  client_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  
  // Metadata
  tags?: string[];
  due_date?: string;
  valid_from?: string;
  valid_to?: string;
  required_level?: DocumentRequiredLevel;
  
  // Lifecycle
  version: number;
  is_locked: boolean;
  locked_reason?: string;
  locked_at?: string;
  locked_by?: string;
  
  // Ownership
  owner_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Computed
  has_attachments?: boolean;
  attachment_count?: number;
  is_expired?: boolean;
  days_until_expiry?: number;
}

// ============================================================================
// ATTACHMENT (File linked to document)
// ============================================================================

/**
 * Attachment - Physical file linked to a document record
 */
export interface DocumentAttachment {
  id: string;
  document_id: string;
  
  // File info
  storage_path: string;
  filename: string;
  original_filename: string;
  size: number;
  mime_type: string;
  
  // Optional integrity
  checksum?: string;
  
  // Metadata
  uploaded_by: string;
  uploaded_at: string;
  
  // Optional preview
  thumbnail_url?: string;
}

// ============================================================================
// DOCUMENT ACTIVITY (Audit trail)
// ============================================================================

export type DocumentActivityType = 
  | 'created'
  | 'status_changed'
  | 'linked'
  | 'unlinked'
  | 'attachment_added'
  | 'attachment_removed'
  | 'locked'
  | 'unlocked'
  | 'metadata_updated'
  | 'expired';

export interface DocumentActivity {
  id: string;
  document_id: string;
  activity_type: DocumentActivityType;
  
  // Change details
  old_value?: string;
  new_value?: string;
  description?: string;
  
  // Actor
  performed_by: string;
  performed_at: string;
}

// ============================================================================
// FOLDER PRESETS (Saved filters, not directories)
// ============================================================================

export interface DocumentFilter {
  scope?: DocumentScope[];
  type?: DocumentType[];
  status?: DocumentStatus[];
  required_level?: DocumentRequiredLevel[];
  has_attachments?: boolean;
  is_expired?: boolean;
  expiring_soon?: boolean; // < 30 days
  missing_required?: boolean;
  
  // Context filters
  job_id?: string;
  contract_id?: string;
  client_id?: string;
  vehicle_id?: string;
  driver_id?: string;
  
  // Date filters
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  valid_to_before?: string;
  
  // Search
  search?: string;
  tags?: string[];
}

export interface FolderPreset {
  id: string;
  name: string;
  name_pl: string;
  description?: string;
  icon?: string;
  color?: string;
  filter: DocumentFilter;
  department_template_id?: string; // If specific to department
  is_system?: boolean; // System-defined vs user-defined
  order?: number;
}

// ============================================================================
// REQUIRED DOCUMENTS RULES (Per department template)
// ============================================================================

export interface RequiredDocumentRule {
  id: string;
  department_template_id: string;
  
  // What document
  document_type: DocumentType;
  title_template: string; // e.g., "Transport Order for {job_number}"
  
  // When required
  scope: DocumentScope;
  stage?: string; // e.g., 'before_start', 'before_close'
  is_required: boolean;
  required_level: DocumentRequiredLevel;
  
  // Validation
  must_have_attachments?: boolean;
  must_be_signed?: boolean;
  must_not_be_expired?: boolean;
  
  // Auto-creation
  auto_create?: boolean;
  template_id?: string;
}

// ============================================================================
// DOCUMENT CONTEXT (What are we viewing documents for?)
// ============================================================================

export type DocumentContext = 
  | { type: 'department'; department_id: string }
  | { type: 'job'; job_id: string }
  | { type: 'contract'; contract_id: string }
  | { type: 'client'; client_id: string }
  | { type: 'vehicle'; vehicle_id: string }
  | { type: 'driver'; driver_id: string };

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export interface DocumentStats {
  total_documents: number;
  missing_required: number;
  expiring_soon: number; // < 30 days
  awaiting_signature: number;
  requires_action: number;
  
  by_type: Record<DocumentType, number>;
  by_status: Record<DocumentStatus, number>;
  by_scope: Record<DocumentScope, number>;
}

// ============================================================================
// SYSTEM FOLDER PRESETS (Hardcoded per department)
// ============================================================================

export const TRANSPORT_FOLDER_PRESETS: FolderPreset[] = [
  {
    id: 'required',
    name: 'Required',
    name_pl: 'Wymagane',
    description: 'Required documents that are missing or expired',
    icon: 'AlertCircle',
    color: '#ef4444',
    filter: {
      required_level: ['required', 'critical'],
      status: ['draft', 'requires_action'],
    },
    is_system: true,
    order: 1,
  },
  {
    id: 'contracts',
    name: 'Contracts',
    name_pl: 'Umowy',
    description: 'All contract documents',
    icon: 'FileText',
    color: '#3b82f6',
    filter: {
      type: ['contract'],
    },
    is_system: true,
    order: 2,
  },
  {
    id: 'execution',
    name: 'Execution',
    name_pl: 'Realizacja',
    description: 'Execution and operational documents',
    icon: 'ClipboardList',
    color: '#10b981',
    filter: {
      type: ['execution'],
    },
    is_system: true,
    order: 3,
  },
  {
    id: 'compliance',
    name: 'Compliance',
    name_pl: 'Zgodność',
    description: 'Compliance and regulatory documents',
    icon: 'Shield',
    color: '#f59e0b',
    filter: {
      type: ['compliance'],
    },
    is_system: true,
    order: 4,
  },
  {
    id: 'financial',
    name: 'Financial',
    name_pl: 'Koszty',
    description: 'Financial documents and invoices',
    icon: 'DollarSign',
    color: '#8b5cf6',
    filter: {
      type: ['financial'],
    },
    is_system: true,
    order: 5,
  },
  {
    id: 'pending_signature',
    name: 'Pending Signature',
    name_pl: 'Do podpisu',
    description: 'Documents awaiting signature',
    icon: 'PenTool',
    color: '#f97316',
    filter: {
      status: ['requires_action'],
    },
    is_system: true,
    order: 6,
  },
  {
    id: 'expiring_soon',
    name: 'Expiring Soon',
    name_pl: 'Wygasa w 30 dni',
    description: 'Documents expiring within 30 days',
    icon: 'Clock',
    color: '#eab308',
    filter: {
      expiring_soon: true,
    },
    is_system: true,
    order: 7,
  },
];

export const FUNERAL_FOLDER_PRESETS: FolderPreset[] = [
  {
    id: 'required',
    name: 'Required',
    name_pl: 'Wymagane',
    description: 'Required documents for case',
    icon: 'AlertCircle',
    color: '#ef4444',
    filter: {
      required_level: ['required', 'critical'],
      status: ['draft', 'requires_action'],
    },
    is_system: true,
    order: 1,
  },
  {
    id: 'family_contracts',
    name: 'Family Contracts',
    name_pl: 'Umowy z rodziną',
    description: 'Contracts with family',
    icon: 'FileText',
    color: '#3b82f6',
    filter: {
      type: ['contract'],
      scope: ['job'],
    },
    is_system: true,
    order: 2,
  },
  {
    id: 'official_documents',
    name: 'Official Documents',
    name_pl: 'Dokumenty urzędowe',
    description: 'Death certificates, permits',
    icon: 'Shield',
    color: '#f59e0b',
    filter: {
      type: ['compliance'],
    },
    is_system: true,
    order: 3,
  },
  {
    id: 'ceremony',
    name: 'Ceremony',
    name_pl: 'Ceremonia',
    description: 'Ceremony planning and execution',
    icon: 'ClipboardList',
    color: '#10b981',
    filter: {
      type: ['execution'],
    },
    is_system: true,
    order: 4,
  },
  {
    id: 'financial',
    name: 'Financial',
    name_pl: 'Rozliczenia',
    description: 'Invoices and settlements',
    icon: 'DollarSign',
    color: '#8b5cf6',
    filter: {
      type: ['financial'],
    },
    is_system: true,
    order: 5,
  },
];

/**
 * Get folder presets for department template
 */
export function getFolderPresetsForDepartment(departmentTemplateId: string): FolderPreset[] {
  switch (departmentTemplateId) {
    case 'transport_operations':
      return TRANSPORT_FOLDER_PRESETS;
    case 'funeral_home':
      return FUNERAL_FOLDER_PRESETS;
    default:
      return TRANSPORT_FOLDER_PRESETS; // Default fallback
  }
}
