// Enhanced Document Management Types for Spółki

export type FolderType = 
  | 'contracts'
  | 'resolutions'
  | 'board_documents'
  | 'correspondence'
  | 'tax_documents'
  | 'financial_reports'
  | 'licenses'
  | 'custom';

export type TemplateType =
  | 'board_resolution'
  | 'shareholder_resolution'
  | 'employment_contract'
  | 'service_contract'
  | 'board_member_contract'
  | 'nda'
  | 'power_of_attorney'
  | 'board_minutes'
  | 'correspondence'
  | 'invoice'
  | 'other';

export type DocumentStatus = 'draft' | 'final' | 'signed' | 'archived';

export type ContractType =
  | 'general'
  | 'employment'
  | 'service'
  | 'lease'
  | 'purchase'
  | 'board_member'
  | 'management_board'
  | 'supervisory_board'
  | 'nda'
  | 'partnership'
  | 'other';

export interface DocumentFolder {
  id: string;
  business_profile_id: string;
  parent_folder_id?: string | null;
  name: string;
  description?: string | null;
  folder_type?: FolderType | null;
  icon?: string | null;
  color?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Computed
  children?: DocumentFolder[];
  document_count?: number;
}

export interface DocumentTemplate {
  id: string;
  business_profile_id?: string | null;
  name: string;
  description?: string | null;
  template_type: TemplateType;
  content: string;
  variables: TemplateVariable[];
  css_styles?: string | null;
  is_public: boolean;
  is_active: boolean;
  category?: string | null;
  tags?: string[] | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'checkbox';
  required?: boolean;
  default_value?: string;
  options?: string[]; // For select type
  placeholder?: string;
}

export interface GeneratedDocument {
  id: string;
  business_profile_id: string;
  template_id?: string | null;
  folder_id?: string | null;
  title: string;
  document_type: string;
  content_html: string;
  variables_filled?: Record<string, any> | null;
  pdf_file_path?: string | null;
  pdf_generated_at?: string | null;
  document_number?: string | null;
  document_date?: string | null;
  status: DocumentStatus;
  linked_contract_id?: string | null;
  linked_resolution_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  template?: DocumentTemplate;
  folder?: DocumentFolder;
}

export interface EnhancedCompanyDocument {
  id: string;
  business_profile_id: string;
  category: string;
  folder_id?: string | null;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  title: string;
  description?: string | null;
  document_date?: string | null;
  expiry_date?: string | null;
  reference_number?: string | null;
  tags?: string[] | null;
  is_template: boolean;
  template_type?: TemplateType | null;
  version: number;
  parent_document_id?: string | null;
  linked_contract_id?: string | null;
  linked_resolution_id?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  folder?: DocumentFolder;
}

export interface CreateFolderInput {
  business_profile_id: string;
  parent_folder_id?: string | null;
  name: string;
  description?: string;
  folder_type?: FolderType;
  icon?: string;
  color?: string;
}

export interface CreateTemplateInput {
  business_profile_id?: string;
  name: string;
  description?: string;
  template_type: TemplateType;
  content: string;
  variables: TemplateVariable[];
  css_styles?: string;
  category?: string;
  tags?: string[];
}

export interface GenerateDocumentInput {
  business_profile_id: string;
  template_id: string;
  folder_id?: string;
  title: string;
  document_type: string;
  variables_filled: Record<string, any>;
  document_number?: string;
  document_date?: string;
  linked_contract_id?: string;
  linked_resolution_id?: string;
}

export interface FolderTreeNode extends DocumentFolder {
  children: FolderTreeNode[];
  level: number;
  path: string;
}

export const FOLDER_TYPE_LABELS: Record<FolderType, string> = {
  contracts: 'Umowy',
  resolutions: 'Uchwały',
  board_documents: 'Dokumenty Zarządu',
  correspondence: 'Korespondencja',
  tax_documents: 'Dokumenty podatkowe',
  financial_reports: 'Sprawozdania finansowe',
  licenses: 'Licencje',
  custom: 'Inny',
};

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  board_resolution: 'Uchwała Zarządu',
  shareholder_resolution: 'Uchwała Wspólników',
  employment_contract: 'Umowa o pracę',
  service_contract: 'Umowa o świadczenie usług',
  board_member_contract: 'Umowa z członkiem Zarządu',
  nda: 'Umowa o zachowaniu poufności (NDA)',
  power_of_attorney: 'Pełnomocnictwo',
  board_minutes: 'Protokół z posiedzenia Zarządu',
  correspondence: 'Pismo urzędowe',
  invoice: 'Faktura',
  other: 'Inny dokument',
};

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  general: 'Umowa ogólna',
  employment: 'Umowa o pracę',
  service: 'Umowa o świadczenie usług',
  lease: 'Umowa najmu',
  purchase: 'Umowa kupna-sprzedaży',
  board_member: 'Umowa z członkiem Zarządu',
  management_board: 'Umowa Zarządu',
  supervisory_board: 'Umowa Rady Nadzorczej',
  nda: 'NDA',
  partnership: 'Umowa partnerska',
  other: 'Inna',
};

export const FOLDER_ICONS: Record<FolderType, string> = {
  contracts: 'FileText',
  resolutions: 'FileCheck',
  board_documents: 'Briefcase',
  correspondence: 'Mail',
  tax_documents: 'Receipt',
  financial_reports: 'BarChart',
  licenses: 'Award',
  custom: 'Folder',
};
