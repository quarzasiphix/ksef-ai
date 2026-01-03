/**
 * Attachment system types
 * Universal file linking for decisions, ledger, contracts, operations, etc.
 */

export type AttachmentRole =
  // Decision evidence roles
  | 'DECISION_DRAFT_PDF'
  | 'DECISION_SIGNED_PDF'
  | 'DECISION_SCAN'
  | 'DECISION_SUPPORTING_DOC'
  // Ledger/accounting roles
  | 'PRIMARY'
  | 'SUPPORTING'
  | 'SCAN'
  | 'SIGNED'
  | 'COST_ESTIMATE'
  | 'CORRESPONDENCE'
  // Contract roles
  | 'CONTRACT_DRAFT'
  | 'CONTRACT_SIGNED'
  | 'CONTRACT_AMENDMENT'
  | 'CONTRACT_ANNEX'
  // Operation roles
  | 'ROUTE_SHEET'
  | 'DELIVERY_PROOF'
  | 'PHOTO'
  | 'CUSTOMER_CORRESPONDENCE'
  // Capital roles
  | 'SHAREHOLDER_DECLARATION'
  | 'TRANSFER_CONFIRMATION'
  | 'NOTARY_DEED'
  // Generic
  | 'OTHER';

export type AttachmentEntityType =
  | 'decision'
  | 'ledger_event'
  | 'contract'
  | 'operation'
  | 'capital_transaction'
  | 'invoice'
  | 'case'
  | 'document';

export interface Attachment {
  id: string;
  business_profile_id: string;
  department_id: string | null;
  storage_file_id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  role: AttachmentRole;
  note: string | null;
  display_order: number;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface AttachmentWithFile extends Attachment {
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  file_extension: string;
  uploaded_at: string;
  department_name: string | null;
  department_color: string | null;
}

export interface CreateAttachmentInput {
  business_profile_id: string;
  department_id?: string;
  storage_file_id: string;
  entity_type: AttachmentEntityType;
  entity_id: string;
  role: AttachmentRole;
  note?: string;
  display_order?: number;
}

export interface UpdateAttachmentInput {
  role?: AttachmentRole;
  note?: string;
  display_order?: number;
}

// Helper type for decision-specific attachments
export type DecisionAttachmentRole = Extract<
  AttachmentRole,
  'DECISION_DRAFT_PDF' | 'DECISION_SIGNED_PDF' | 'DECISION_SCAN' | 'DECISION_SUPPORTING_DOC'
>;

// Role display names (Polish)
export const ATTACHMENT_ROLE_LABELS: Record<AttachmentRole, string> = {
  DECISION_DRAFT_PDF: 'Projekt decyzji (PDF)',
  DECISION_SIGNED_PDF: 'Podpisana decyzja (PDF)',
  DECISION_SCAN: 'Skan decyzji',
  DECISION_SUPPORTING_DOC: 'Dokument wspierający',
  PRIMARY: 'Główny dokument',
  SUPPORTING: 'Dokument wspierający',
  SCAN: 'Skan',
  SIGNED: 'Podpisany dokument',
  COST_ESTIMATE: 'Kosztorys',
  CORRESPONDENCE: 'Korespondencja',
  CONTRACT_DRAFT: 'Projekt umowy',
  CONTRACT_SIGNED: 'Podpisana umowa',
  CONTRACT_AMENDMENT: 'Aneks do umowy',
  CONTRACT_ANNEX: 'Załącznik do umowy',
  ROUTE_SHEET: 'Karta drogowa',
  DELIVERY_PROOF: 'Potwierdzenie dostawy',
  PHOTO: 'Zdjęcie',
  CUSTOMER_CORRESPONDENCE: 'Korespondencja z klientem',
  SHAREHOLDER_DECLARATION: 'Oświadczenie wspólnika',
  TRANSFER_CONFIRMATION: 'Potwierdzenie przelewu',
  NOTARY_DEED: 'Akt notarialny',
  OTHER: 'Inne',
};

// Entity type display names (Polish)
export const ENTITY_TYPE_LABELS: Record<AttachmentEntityType, string> = {
  decision: 'Decyzja',
  ledger_event: 'Księga główna',
  contract: 'Umowa',
  operation: 'Operacja',
  capital_transaction: 'Kapitał',
  invoice: 'Faktura',
  case: 'Sprawa',
  document: 'Dokument',
};
