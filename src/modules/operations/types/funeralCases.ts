// Funeral Case Types for Funeral Home / Nekrolog Operations Module

export type FuneralServiceType = 
  | 'traditional' // Tradycyjny
  | 'cremation' // Kremacja
  | 'formalities_only' // Sama formalność
  | 'body_transport' // Transport zwłok
  | 'zus_service'; // Usługa pod ZUS

export type FuneralCaseStatus = 
  | 'new' // Nowa sprawa
  | 'scheduled' // Zaplanowana (termin ceremonii ustalony)
  | 'in_progress' // W trakcie realizacji
  | 'completed' // Zakończona (ceremonia przeprowadzona)
  | 'settled' // Rozliczona (ZUS + klient)
  | 'archived'; // Zarchiwizowana

export type FuneralStageType =
  | 'body_collection' // Odbiór ciała
  | 'preparation' // Przygotowanie
  | 'ceremony' // Ceremonia
  | 'burial_cremation' // Pochówek/Kremacja
  | 'urn_collection' // Odbiór urny (dla kremacji)
  | 'formalities'; // Formalności urzędowe

export type FuneralStageStatus =
  | 'pending' // Oczekujący
  | 'scheduled' // Zaplanowany
  | 'in_progress' // W trakcie
  | 'completed' // Zakończony
  | 'cancelled'; // Anulowany

export type FuneralDocumentType =
  | 'death_certificate' // Akt zgonu
  | 'death_card' // Karta zgonu
  | 'usc_document' // Dokument USC
  | 'zus_document' // Dokumenty do ZUS
  | 'service_contract' // Umowa o usługę
  | 'power_of_attorney' // Pełnomocnictwo
  | 'family_statement' // Oświadczenie rodziny
  | 'obituary' // Nekrolog
  | 'death_notice' // Klepsydra
  | 'invoice' // Faktura
  | 'payment_confirmation' // Potwierdzenie płatności
  | 'zus_settlement' // Rozliczenie ZUS
  | 'other'; // Inne

export type FuneralDocumentStatus =
  | 'draft' // Roboczy
  | 'signed' // Podpisany
  | 'sent' // Wysłany
  | 'approved' // Zatwierdzony
  | 'final'; // Finalny

export type ZUSSettlementStatus =
  | 'not_applicable' // Nie dotyczy
  | 'pending' // Do złożenia
  | 'submitted' // Złożony
  | 'in_review' // W trakcie rozpatrywania
  | 'paid' // Wypłacony
  | 'rejected'; // Odrzucony

export interface DeceasedPerson {
  first_name: string;
  last_name: string;
  date_of_death: string;
  place_of_death?: string;
  date_of_birth?: string;
  pesel?: string;
  usc_location?: string; // Urząd Stanu Cywilnego
}

export interface FuneralClient {
  name: string;
  relationship?: string; // Stopień pokrewieństwa
  phone?: string;
  email?: string;
  address?: string;
  pesel?: string;
  id_number?: string;
}

export interface FuneralStage {
  id: string;
  funeral_case_id: string;
  stage_type: FuneralStageType;
  status: FuneralStageStatus;
  scheduled_date?: string;
  scheduled_time?: string;
  completed_date?: string;
  location?: string;
  notes?: string;
  assigned_to?: string; // User ID
  created_at: string;
  updated_at: string;
}

export interface FuneralDocument {
  id: string;
  funeral_case_id: string;
  document_id?: string; // FK to documents table
  document_type: FuneralDocumentType;
  status: FuneralDocumentStatus;
  title: string;
  file_path?: string;
  file_name?: string;
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ZUSSettlement {
  application_number?: string;
  amount?: number;
  status: ZUSSettlementStatus;
  submitted_date?: string;
  paid_date?: string;
  payment_reference?: string;
  notes?: string;
}

export interface FuneralPayment {
  advance_amount?: number; // Zaliczka
  advance_paid?: boolean;
  advance_date?: string;
  final_amount?: number; // Kwota końcowa
  final_paid?: boolean;
  final_date?: string;
  total_amount: number;
  payment_method?: 'cash' | 'bank_transfer' | 'card';
  notes?: string;
}

export interface FuneralCase {
  id: string;
  business_profile_id: string;
  department_id?: string;
  case_number: string; // Numer sprawy (auto-generated)
  
  // Deceased person data
  deceased: DeceasedPerson;
  
  // Client/Family data
  client: FuneralClient;
  
  // Service details
  service_type: FuneralServiceType;
  status: FuneralCaseStatus;
  
  // Ceremony details
  ceremony_date?: string;
  ceremony_time?: string;
  ceremony_location?: string;
  burial_location?: string; // Miejsce pochówku
  
  // Financial
  payment: FuneralPayment;
  zus_settlement?: ZUSSettlement;
  
  // Metadata
  description?: string;
  internal_notes?: string;
  created_by: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  settled_at?: string;
}

export interface FuneralCaseWithRelations extends FuneralCase {
  stages?: FuneralStage[];
  documents?: FuneralDocument[];
  events_count?: number;
  invoices_count?: number;
}

export interface FuneralCaseStats {
  total_cases: number;
  active_cases: number;
  scheduled_cases: number;
  in_progress_cases: number;
  completed_cases: number;
  settled_cases: number;
  total_revenue: number;
  pending_zus_amount: number;
}

export interface CreateFuneralCaseInput {
  business_profile_id: string;
  department_id?: string;
  deceased: DeceasedPerson;
  client: FuneralClient;
  service_type: FuneralServiceType;
  ceremony_date?: string;
  ceremony_time?: string;
  ceremony_location?: string;
  burial_location?: string;
  total_amount: number;
  description?: string;
  created_by: string;
}

export interface UpdateFuneralCaseInput {
  deceased?: Partial<DeceasedPerson>;
  client?: Partial<FuneralClient>;
  service_type?: FuneralServiceType;
  status?: FuneralCaseStatus;
  ceremony_date?: string;
  ceremony_time?: string;
  ceremony_location?: string;
  burial_location?: string;
  payment?: Partial<FuneralPayment>;
  zus_settlement?: Partial<ZUSSettlement>;
  description?: string;
  internal_notes?: string;
  assigned_to?: string;
}

// Helper functions
export const FUNERAL_SERVICE_TYPE_LABELS: Record<FuneralServiceType, string> = {
  traditional: 'Tradycyjny',
  cremation: 'Kremacja',
  formalities_only: 'Sama formalność',
  body_transport: 'Transport zwłok',
  zus_service: 'Usługa pod ZUS',
};

export const FUNERAL_CASE_STATUS_LABELS: Record<FuneralCaseStatus, string> = {
  new: 'Nowa',
  scheduled: 'Zaplanowana',
  in_progress: 'W trakcie',
  completed: 'Zakończona',
  settled: 'Rozliczona',
  archived: 'Zarchiwizowana',
};

export const FUNERAL_STAGE_TYPE_LABELS: Record<FuneralStageType, string> = {
  body_collection: 'Odbiór ciała',
  preparation: 'Przygotowanie',
  ceremony: 'Ceremonia',
  burial_cremation: 'Pochówek/Kremacja',
  urn_collection: 'Odbiór urny',
  formalities: 'Formalności urzędowe',
};

export const FUNERAL_DOCUMENT_TYPE_LABELS: Record<FuneralDocumentType, string> = {
  death_certificate: 'Akt zgonu',
  death_card: 'Karta zgonu',
  usc_document: 'Dokument USC',
  zus_document: 'Dokumenty do ZUS',
  service_contract: 'Umowa o usługę',
  power_of_attorney: 'Pełnomocnictwo',
  family_statement: 'Oświadczenie rodziny',
  obituary: 'Nekrolog',
  death_notice: 'Klepsydra',
  invoice: 'Faktura',
  payment_confirmation: 'Potwierdzenie płatności',
  zus_settlement: 'Rozliczenie ZUS',
  other: 'Inne',
};

export const ZUS_SETTLEMENT_STATUS_LABELS: Record<ZUSSettlementStatus, string> = {
  not_applicable: 'Nie dotyczy',
  pending: 'Do złożenia',
  submitted: 'Złożony',
  in_review: 'W trakcie',
  paid: 'Wypłacony',
  rejected: 'Odrzucony',
};
