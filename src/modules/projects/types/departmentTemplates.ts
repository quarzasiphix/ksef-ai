/**
 * Department Template System
 * 
 * Defines how departments adapt contracts, documents, and decisions
 * based on their business context (construction, funeral home, SaaS, etc.)
 */

export type DepartmentTemplateId = 
  | 'general'
  | 'construction'
  | 'property_admin'
  | 'marketing'
  | 'saas'
  | 'sales'
  | 'operations'
  | 'funeral_home'
  | 'transport_operations';

export type DecisionLevel = 'global' | 'department' | 'project';

export interface ContractCategory {
  id: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface DocumentFolder {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface JobDocumentTemplate {
  id: string;
  category: 'contractual' | 'operational' | 'compliance' | 'financial' | 'history';
  name: string;
  name_pl: string;
  description: string;
  required: boolean;
  required_for_status?: string[];
  auto_generate?: boolean;
  editable_until?: 'completion' | 'invoicing' | 'closure';
  expires?: boolean;
  fields?: Array<{
    name: string;
    type: 'text' | 'date' | 'number' | 'select' | 'signature' | 'photo';
    required: boolean;
    options?: string[];
  }>;
}

export interface DecisionTemplate {
  id: string;
  level: DecisionLevel;
  category: string;
  title: string;
  description: string;
  required: boolean;
  autoCreateOnDepartmentCreation?: boolean;
}

export interface ContractMetadataField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean';
  required?: boolean;
  visible?: boolean;
  options?: string[];
  placeholder?: string;
}

export interface DepartmentTemplate {
  id: DepartmentTemplateId;
  name: string;
  subtitle: string;
  description: string;
  icon?: string;
  
  // Feature flags
  supportsProjects: boolean; // Whether this department uses projects/jobs/cases
  projectTerminology?: {
    singular: string; // e.g., "Sprawa", "Budowa", "Kampania"
    plural: string;   // e.g., "Sprawy", "Budowy", "Kampanie"
  };
  
  // Contract configuration
  contractCategories: ContractCategory[];
  contractMetadataFields: ContractMetadataField[];
  
  // Document configuration
  documentFolders: DocumentFolder[];
  
  // Job document templates (per-job documents with semantic categories)
  jobDocumentTemplates?: JobDocumentTemplate[];
  
  // Decision configuration
  decisionTemplates: DecisionTemplate[];
  
  // Default behavior
  defaultInvoiceBehavior?: {
    frequency?: 'one_time' | 'recurring' | 'milestone';
    autoLink?: boolean;
  };
  
  // UI customization
  primaryColor?: string;
  accentColor?: string;
}

/**
 * Transport Operations Department Template
 * 
 * Specialized for logistics and transport operations with:
 * - Job-based execution (trips, deliveries)
 * - Vehicle and driver management
 * - Contract-driven operations (vehicle leases, driver contracts)
 * - Regulatory compliance tracking
 */
export const transportOperationsDepartmentTemplate: DepartmentTemplate = {
  id: 'transport_operations',
  name: 'Transport zwierząt (operacje)',
  subtitle: 'Zarządzanie zleceniami transportowymi, pojazdami i kierowcami',
  description: 'Operacje logistyczne z pełną kontrolą nad zleceniami, zasobami i dokumentacją prawną.',
  icon: 'truck',
  
  supportsProjects: true,
  projectTerminology: {
    singular: 'Zlecenie',
    plural: 'Zlecenia',
  },
  
  // Contract categories for transport operations
  contractCategories: [
    {
      id: 'vehicle_contracts',
      label: 'Umowy pojazdów',
      description: 'Umowy użyczenia, najmu, leasingu pojazdów',
    },
    {
      id: 'driver_contracts',
      label: 'Umowy z kierowcami',
      description: 'Umowy B2B, zlecenia, zakresy odpowiedzialności',
    },
    {
      id: 'subcontractor_contracts',
      label: 'Umowy podwykonawcze',
      description: 'Transport zastępczy, firmy zewnętrzne',
    },
    {
      id: 'insurance_contracts',
      label: 'Umowy ubezpieczeniowe',
      description: 'OC przewoźnika, ubezpieczenie zwierząt',
    },
    {
      id: 'client_contracts',
      label: 'Umowy z klientami',
      description: 'Umowy ramowe i jednorazowe na transport',
    },
  ],
  
  // Contract metadata fields
  contractMetadataFields: [
    {
      id: 'vehicle_registration',
      label: 'Numer rejestracyjny pojazdu',
      type: 'text',
      visible: true,
    },
    {
      id: 'driver_license_type',
      label: 'Typ uprawnień kierowcy',
      type: 'select',
      options: ['Type 2', 'C', 'CE', 'D'],
      visible: true,
    },
    {
      id: 'allowed_usage',
      label: 'Dozwolone zastosowanie',
      type: 'multiselect',
      options: ['Transport zwierząt', 'Transport UE', 'Długie trasy'],
      visible: true,
    },
    {
      id: 'insurance_expiry',
      label: 'Data wygaśnięcia ubezpieczenia',
      type: 'date',
      required: true,
      visible: true,
    },
    {
      id: 'cost_model',
      label: 'Model kosztowy',
      type: 'select',
      options: ['Za km', 'Ryczałt', 'Procent'],
      visible: true,
    },
  ],
  
  // Document folders for transport operations
  documentFolders: [
    // Operational contracts section
    {
      id: 'vehicle_contracts_folder',
      label: 'Umowy pojazdów',
      description: 'Umowy użyczenia, najmu, leasingu pojazdów',
      required: true,
    },
    {
      id: 'driver_contracts_folder',
      label: 'Umowy z kierowcami',
      description: 'Umowy B2B, zlecenia, uprawnienia',
      required: true,
    },
    {
      id: 'subcontractor_contracts_folder',
      label: 'Umowy podwykonawcze',
      description: 'Transport zastępczy, firmy zewnętrzne',
    },
    {
      id: 'insurance_folder',
      label: 'Umowy ubezpieczeniowe',
      description: 'OC przewoźnika, ubezpieczenie zwierząt',
      required: true,
    },
    
    // Regulatory documents
    {
      id: 'transport_licenses',
      label: 'Licencje transportowe',
      description: 'Zezwolenia na przewóz zwierząt',
      required: true,
    },
    {
      id: 'veterinary_permits',
      label: 'Zezwolenia weterynaryjne',
      description: 'Wymagane certyfikaty i pozwolenia',
      required: true,
    },
    {
      id: 'procedures_sop',
      label: 'Procedury (SOP)',
      description: 'Standardowe procedury operacyjne',
    },
    {
      id: 'inspections',
      label: 'Kontrole / inspekcje',
      description: 'Dokumentacja z kontroli i audytów',
    },
    
    // Financial documents
    {
      id: 'operational_costs',
      label: 'Faktury kosztowe',
      description: 'Paliwo, autostrady, serwis',
    },
    {
      id: 'driver_payments',
      label: 'Wynagrodzenia kierowców',
      description: 'Rozliczenia z kierowcami',
    },
    {
      id: 'route_settlements',
      label: 'Rozliczenia tras',
      description: 'Rozliczenia poszczególnych zleceń',
    },
    {
      id: 'client_invoices',
      label: 'Refaktury dla klientów',
      description: 'Faktury wystawione klientom',
    },
  ],
  
  // Decision templates
  decisionTemplates: [
    {
      id: 'transport_department_authorization',
      level: 'department',
      category: 'operations',
      title: 'Zgoda na świadczenie usług transportu zwierząt',
      description: 'Podstawowa decyzja autoryzująca dział do prowadzenia operacji transportowych',
      required: true,
      autoCreateOnDepartmentCreation: true,
    },
    {
      id: 'vehicle_acquisition',
      level: 'department',
      category: 'assets',
      title: 'Zgoda na nabycie/leasing pojazdu',
      description: 'Decyzja dotycząca zakupu lub leasingu pojazdu operacyjnego',
      required: false,
    },
    {
      id: 'driver_employment',
      level: 'department',
      category: 'hr',
      title: 'Zgoda na zatrudnienie kierowcy',
      description: 'Decyzja dotycząca zatrudnienia lub współpracy B2B z kierowcą',
      required: false,
    },
    {
      id: 'job_execution',
      level: 'project',
      category: 'operations',
      title: 'Zgoda na wykonanie zlecenia transportowego',
      description: 'Decyzja wykonawcza dla konkretnego zlecenia (opcjonalna)',
      required: false,
    },
  ],
  
  // Job document templates for transport operations
  jobDocumentTemplates: [
    // A. CONTRACTUAL
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
    // B. OPERATIONAL
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
      required: false,
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
    // C. COMPLIANCE
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
      description: 'Authorization for animal transport',
      required: false,
      expires: true,
    },
    // D. FINANCIAL
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
      id: 'proof_of_delivery',
      category: 'financial',
      name: 'Proof of Delivery (POD)',
      name_pl: 'Potwierdzenie dostawy',
      description: 'Proof of delivery for accounting',
      required: true,
      editable_until: 'invoicing',
    },
  ],
  
  defaultInvoiceBehavior: {
    frequency: 'one_time',
    autoLink: true,
  },
  
  primaryColor: '#3b82f6',
  accentColor: '#10b981',
};

/**
 * Funeral Home Department Template
 * 
 * Specialized for funeral services with case-based workflow,
 * respectful terminology, and ceremony management.
 */
export const funeralHomeDepartmentTemplate: DepartmentTemplate = {
  id: 'funeral_home',
  name: 'Dom pogrzebowy / Nekrolog',
  subtitle: 'Obsługa ceremonii, dokumentów i ogłoszeń pośmiertnych',
  description: 'Zarządzanie sprawami pogrzebowymi, ceremoniami i publikacjami nekrologów z pełną dokumentacją i rozliczeniami.',
  icon: 'flower',
  
  supportsProjects: true,
  projectTerminology: {
    singular: 'Sprawa',
    plural: 'Sprawy',
  },
  
  contractCategories: [
    {
      id: 'family_contracts',
      label: 'Umowy z rodziną',
      description: 'Główne umowy na świadczenie usług pogrzebowych',
    },
    {
      id: 'service_contracts',
      label: 'Umowy usługowe',
      description: 'Transport, kremacja, przygotowanie ciała',
    },
    {
      id: 'cemetery_contracts',
      label: 'Umowy cmentarne',
      description: 'Rezerwacje miejsc, opłaty cmentarne',
    },
    {
      id: 'subcontractor_contracts',
      label: 'Umowy podwykonawcze',
      description: 'Kwiaty, catering, muzyka, fotografia',
    },
    {
      id: 'one_time_orders',
      label: 'Zlecenia jednorazowe',
      description: 'Pojedyncze usługi bez formalnej umowy',
    },
  ],
  
  contractMetadataFields: [
    {
      id: 'deceased_name',
      label: 'Imię i nazwisko zmarłego',
      type: 'text',
      required: true,
      visible: true,
    },
    {
      id: 'death_date',
      label: 'Data śmierci',
      type: 'date',
      required: true,
      visible: true,
    },
    {
      id: 'ceremony_date',
      label: 'Data ceremonii',
      type: 'date',
      required: false,
      visible: true,
    },
    {
      id: 'ceremony_location',
      label: 'Miejsce ceremonii',
      type: 'text',
      required: false,
      visible: true,
    },
    {
      id: 'family_contact',
      label: 'Kontakt do rodziny',
      type: 'text',
      required: true,
      visible: true,
    },
    {
      id: 'ceremony_type',
      label: 'Rodzaj ceremonii',
      type: 'select',
      options: ['Pogrzeb tradycyjny', 'Kremacja', 'Ceremonia ekumeniczna', 'Ceremonia świecka'],
      required: false,
      visible: true,
    },
    {
      id: 'burial_location',
      label: 'Miejsce pochówku',
      type: 'text',
      required: false,
      visible: true,
    },
  ],
  
  documentFolders: [
    {
      id: 'case_documents',
      label: 'Dokumenty sprawy',
      description: 'Główne dokumenty związane ze sprawą pogrzebową',
      required: true,
    },
    {
      id: 'death_certificate',
      label: 'Zgłoszenie zgonu',
      description: 'Akt zgonu i dokumenty urzędowe',
      required: true,
    },
    {
      id: 'contracts',
      label: 'Umowy',
      description: 'Umowy z rodziną i podwykonawcami',
      required: true,
    },
    {
      id: 'invoices',
      label: 'Faktury',
      description: 'Faktury za usługi pogrzebowe',
      required: false,
    },
    {
      id: 'service_confirmations',
      label: 'Potwierdzenia usług',
      description: 'Potwierdzenia wykonania usług przez podwykonawców',
      required: false,
    },
    {
      id: 'publication_consents',
      label: 'Zgody na publikację',
      description: 'Zgody rodziny na publikację nekrologu',
      required: false,
    },
    {
      id: 'obituary',
      label: 'Nekrolog',
      description: 'Treść nekrologu i warianty publikacji',
      required: false,
    },
  ],
  
  // Job document templates for funeral home
  jobDocumentTemplates: [
    // A. CONTRACTUAL
    {
      id: 'family_service_agreement',
      category: 'contractual',
      name: 'Family Service Agreement',
      name_pl: 'Umowa z rodziną',
      description: 'Main contract for funeral services',
      required: true,
      required_for_status: ['approved'],
      fields: [
        { name: 'family_representative', type: 'text', required: true },
        { name: 'deceased_name', type: 'text', required: true },
        { name: 'service_package', type: 'select', required: true, options: ['Basic', 'Standard', 'Premium'] },
        { name: 'total_price', type: 'number', required: true },
        { name: 'signature', type: 'signature', required: true },
      ],
    },
    // B. OPERATIONAL
    {
      id: 'death_certificate',
      category: 'operational',
      name: 'Death Certificate',
      name_pl: 'Akt zgonu',
      description: 'Official death certificate',
      required: true,
      required_for_status: ['approved'],
    },
    {
      id: 'ceremony_checklist',
      category: 'operational',
      name: 'Ceremony Checklist',
      name_pl: 'Lista kontrolna ceremonii',
      description: 'Checklist for ceremony preparation',
      required: true,
      auto_generate: true,
      editable_until: 'completion',
      fields: [
        { name: 'ceremony_date', type: 'date', required: true },
        { name: 'ceremony_location', type: 'text', required: true },
        { name: 'flowers_ordered', type: 'select', required: true, options: ['Yes', 'No'] },
        { name: 'music_arranged', type: 'select', required: true, options: ['Yes', 'No'] },
        { name: 'catering_confirmed', type: 'select', required: true, options: ['Yes', 'No'] },
      ],
    },
    {
      id: 'service_completion_protocol',
      category: 'operational',
      name: 'Service Completion Protocol',
      name_pl: 'Protokół zakończenia usługi',
      description: 'Confirmation of service completion',
      required: true,
      editable_until: 'completion',
      fields: [
        { name: 'completion_date', type: 'date', required: true },
        { name: 'family_satisfaction', type: 'select', required: true, options: ['Satisfied', 'Neutral', 'Unsatisfied'] },
        { name: 'family_signature', type: 'signature', required: true },
        { name: 'notes', type: 'text', required: false },
      ],
    },
    // C. COMPLIANCE
    {
      id: 'burial_permit',
      category: 'compliance',
      name: 'Burial Permit',
      name_pl: 'Zezwolenie na pochówek',
      description: 'Official burial or cremation permit',
      required: true,
      required_for_status: ['approved', 'scheduled'],
    },
    {
      id: 'cemetery_reservation',
      category: 'compliance',
      name: 'Cemetery Reservation',
      name_pl: 'Rezerwacja miejsca na cmentarzu',
      description: 'Cemetery plot reservation confirmation',
      required: true,
      required_for_status: ['scheduled'],
    },
    // D. FINANCIAL
    {
      id: 'service_invoice',
      category: 'financial',
      name: 'Service Invoice',
      name_pl: 'Faktura za usługi',
      description: 'Invoice for funeral services',
      required: true,
      editable_until: 'invoicing',
    },
    {
      id: 'subcontractor_costs',
      category: 'financial',
      name: 'Subcontractor Costs',
      name_pl: 'Koszty podwykonawców',
      description: 'Costs from subcontractors (flowers, catering, etc.)',
      required: true,
      auto_generate: true,
      editable_until: 'invoicing',
      fields: [
        { name: 'flowers_cost', type: 'number', required: false },
        { name: 'catering_cost', type: 'number', required: false },
        { name: 'music_cost', type: 'number', required: false },
        { name: 'transport_cost', type: 'number', required: false },
        { name: 'other_costs', type: 'number', required: false },
        { name: 'total_cost', type: 'number', required: true },
      ],
    },
  ],
  
  decisionTemplates: [
    {
      id: 'department_authorization',
      level: 'department',
      category: 'operational_authority',
      title: 'Zgoda na świadczenie usług pogrzebowych',
      description: 'Podstawa prawna do prowadzenia działalności w zakresie usług pogrzebowych. Decyzja ta autoryzuje dział do zawierania umów, świadczenia usług i rozliczania ceremonii.',
      required: true,
      autoCreateOnDepartmentCreation: true,
    },
    {
      id: 'case_authorization',
      level: 'project',
      category: 'case_approval',
      title: 'Autoryzacja wykonania usługi pogrzebowej',
      description: 'Zgoda na przyjęcie i realizację konkretnej sprawy pogrzebowej. Zawiera akceptację rodziny i warunków świadczenia usług.',
      required: true,
    },
    {
      id: 'subcontractor_approval',
      level: 'project',
      category: 'vendor_approval',
      title: 'Zgoda na zaangażowanie podwykonawcy',
      description: 'Autoryzacja do zaangażowania zewnętrznych usługodawców (kwiaty, transport, catering, muzyka).',
      required: false,
    },
    {
      id: 'publication_approval',
      level: 'project',
      category: 'publication_approval',
      title: 'Zgoda na publikację nekrologu',
      description: 'Autoryzacja publikacji nekrologu w mediach (gazeta, online) zgodnie z wolą rodziny.',
      required: false,
    },
  ],
  
  defaultInvoiceBehavior: {
    frequency: 'one_time',
    autoLink: true,
  },
  
  primaryColor: '#4A5568',
  accentColor: '#718096',
};

/**
 * All available department templates
 */
export const departmentTemplates: Record<DepartmentTemplateId, DepartmentTemplate> = {
  general: {
    id: 'general',
    name: 'Ogólny',
    subtitle: 'Uniwersalny szablon dla różnych rodzajów działalności',
    description: 'Podstawowy szablon bez specjalizacji. Odpowiedni dla działalności, która nie wymaga dedykowanego przepływu pracy.',
    supportsProjects: false,
    contractCategories: [
      {
        id: 'general_contracts',
        label: 'Umowy ogólne',
      },
    ],
    contractMetadataFields: [],
    documentFolders: [
      {
        id: 'documents',
        label: 'Dokumenty',
      },
    ],
    decisionTemplates: [
      {
        id: 'department_authorization',
        level: 'department',
        category: 'operational_authority',
        title: 'Zgoda na prowadzenie działalności',
        description: 'Podstawa prawna do prowadzenia działalności w ramach tego działu.',
        required: true,
        autoCreateOnDepartmentCreation: true,
      },
    ],
  },
  
  construction: {
    id: 'construction',
    name: 'Budownictwo',
    subtitle: 'Zarządzanie projektami budowlanymi i remontowymi',
    description: 'Dedykowany szablon dla firm budowlanych z obsługą inwestycji, kosztorysów i protokołów odbioru.',
    supportsProjects: true,
    projectTerminology: {
      singular: 'Budowa',
      plural: 'Budowy',
    },
    contractCategories: [
      {
        id: 'client_contracts',
        label: 'Umowy z klientami',
      },
      {
        id: 'subcontractor_contracts',
        label: 'Umowy z podwykonawcami',
      },
      {
        id: 'material_contracts',
        label: 'Umowy materiałowe',
      },
      {
        id: 'annexes',
        label: 'Aneksy',
      },
    ],
    contractMetadataFields: [
      {
        id: 'investment_address',
        label: 'Adres inwestycji',
        type: 'text',
        visible: true,
      },
      {
        id: 'linked_estimate',
        label: 'Kosztorys powiązany',
        type: 'text',
        visible: true,
      },
      {
        id: 'completion_stage',
        label: 'Etap realizacji',
        type: 'select',
        options: ['Przygotowanie', 'W realizacji', 'Odbiór', 'Zakończony'],
        visible: true,
      },
    ],
    documentFolders: [
      {
        id: 'project_docs',
        label: 'Dokumentacja projektowa',
      },
      {
        id: 'permits',
        label: 'Pozwolenia',
      },
      {
        id: 'estimates',
        label: 'Kosztorysy',
      },
      {
        id: 'acceptance_protocols',
        label: 'Protokoły odbioru',
      },
    ],
    decisionTemplates: [
      {
        id: 'department_authorization',
        level: 'department',
        category: 'operational_authority',
        title: 'Zgoda na prowadzenie działalności budowlanej',
        description: 'Podstawa prawna do prowadzenia działalności budowlanej.',
        required: true,
        autoCreateOnDepartmentCreation: true,
      },
      {
        id: 'project_approval',
        level: 'project',
        category: 'project_approval',
        title: 'Zgoda na realizację projektu',
        description: 'Autoryzacja rozpoczęcia konkretnej inwestycji budowlanej.',
        required: true,
      },
    ],
  },
  
  property_admin: {
    id: 'property_admin',
    name: 'Administracja nieruchomości',
    subtitle: 'Zarządzanie wspólnotami i nieruchomościami',
    description: 'Szablon dla zarządców nieruchomości i wspólnot mieszkaniowych.',
    supportsProjects: false,
    contractCategories: [
      {
        id: 'management_contracts',
        label: 'Umowy zarządcze',
      },
      {
        id: 'service_contracts',
        label: 'Umowy serwisowe',
      },
      {
        id: 'cleaning_security',
        label: 'Umowy sprzątania / ochrony',
      },
      {
        id: 'technical_contracts',
        label: 'Umowy techniczne',
      },
    ],
    contractMetadataFields: [
      {
        id: 'property_address',
        label: 'Wspólnota / budynek',
        type: 'text',
        visible: true,
      },
      {
        id: 'contract_period',
        label: 'Okres obowiązywania',
        type: 'text',
        visible: true,
      },
      {
        id: 'monthly_rate',
        label: 'Stawka miesięczna',
        type: 'number',
        visible: true,
      },
      {
        id: 'unit_count',
        label: 'Liczba lokali',
        type: 'number',
        visible: true,
      },
    ],
    documentFolders: [
      {
        id: 'resolutions',
        label: 'Uchwały wspólnoty',
      },
      {
        id: 'service_logs',
        label: 'Dzienniki serwisowe',
      },
      {
        id: 'inspection_reports',
        label: 'Protokoły przeglądów',
      },
    ],
    decisionTemplates: [
      {
        id: 'department_authorization',
        level: 'department',
        category: 'operational_authority',
        title: 'Zgoda na świadczenie usług administracji nieruchomości',
        description: 'Podstawa prawna do prowadzenia działalności w zakresie zarządzania nieruchomościami.',
        required: true,
        autoCreateOnDepartmentCreation: true,
      },
    ],
  },
  
  marketing: {
    id: 'marketing',
    name: 'Marketing',
    subtitle: 'Kampanie marketingowe i promocyjne',
    description: 'Zarządzanie kampaniami marketingowymi, budżetami reklamowymi i współpracą z agencjami.',
    supportsProjects: true,
    projectTerminology: {
      singular: 'Kampania',
      plural: 'Kampanie',
    },
    contractCategories: [
      {
        id: 'agency_contracts',
        label: 'Umowy z agencjami',
      },
      {
        id: 'media_contracts',
        label: 'Umowy mediowe',
      },
      {
        id: 'influencer_contracts',
        label: 'Umowy z influencerami',
      },
    ],
    contractMetadataFields: [],
    documentFolders: [
      {
        id: 'campaign_briefs',
        label: 'Briefy kampanii',
      },
      {
        id: 'creative_assets',
        label: 'Materiały kreatywne',
      },
      {
        id: 'performance_reports',
        label: 'Raporty efektywności',
      },
    ],
    decisionTemplates: [
      {
        id: 'department_authorization',
        level: 'department',
        category: 'operational_authority',
        title: 'Zgoda na prowadzenie działań marketingowych',
        description: 'Podstawa prawna do prowadzenia działalności marketingowej.',
        required: true,
        autoCreateOnDepartmentCreation: true,
      },
      {
        id: 'campaign_approval',
        level: 'project',
        category: 'campaign_approval',
        title: 'Zgoda na kampanię marketingową',
        description: 'Autoryzacja budżetu i realizacji kampanii marketingowej.',
        required: true,
      },
    ],
  },
  
  saas: {
    id: 'saas',
    name: 'SaaS / Produkt',
    subtitle: 'Rozwój i sprzedaż produktu SaaS',
    description: 'Szablon dla firm SaaS z obsługą subskrypcji, regulaminów i umów partnerskich.',
    supportsProjects: false,
    contractCategories: [
      {
        id: 'b2b_contracts',
        label: 'Umowy B2B',
      },
      {
        id: 'terms_of_service',
        label: 'Regulaminy',
      },
      {
        id: 'subscription_contracts',
        label: 'Umowy subskrypcyjne',
      },
      {
        id: 'partnership_contracts',
        label: 'Umowy partnerskie',
      },
      {
        id: 'nda',
        label: 'NDA',
      },
    ],
    contractMetadataFields: [
      {
        id: 'plan',
        label: 'Plan',
        type: 'select',
        options: ['Starter', 'Professional', 'Enterprise'],
        visible: true,
      },
      {
        id: 'billing_cycle',
        label: 'Cykl rozliczeniowy',
        type: 'select',
        options: ['Miesięczny', 'Roczny'],
        visible: true,
      },
      {
        id: 'sla',
        label: 'SLA',
        type: 'text',
        visible: true,
      },
      {
        id: 'auto_renew',
        label: 'Automatyczne odnowienie',
        type: 'boolean',
        visible: true,
      },
    ],
    documentFolders: [
      {
        id: 'product_docs',
        label: 'Dokumentacja produktu',
      },
      {
        id: 'legal_docs',
        label: 'Dokumenty prawne',
      },
      {
        id: 'customer_agreements',
        label: 'Umowy z klientami',
      },
    ],
    decisionTemplates: [
      {
        id: 'department_authorization',
        level: 'department',
        category: 'operational_authority',
        title: 'Zgoda na rozwój i sprzedaż produktu SaaS',
        description: 'Podstawa prawna do prowadzenia działalności w zakresie rozwoju i sprzedaży oprogramowania.',
        required: true,
        autoCreateOnDepartmentCreation: true,
      },
    ],
  },
  
  sales: {
    id: 'sales',
    name: 'Sprzedaż',
    subtitle: 'Zarządzanie procesem sprzedaży',
    description: 'Ogólny szablon dla działów sprzedaży.',
    supportsProjects: false,
    contractCategories: [
      {
        id: 'sales_contracts',
        label: 'Umowy sprzedażowe',
      },
    ],
    contractMetadataFields: [],
    documentFolders: [
      {
        id: 'sales_docs',
        label: 'Dokumenty sprzedażowe',
      },
    ],
    decisionTemplates: [
      {
        id: 'department_authorization',
        level: 'department',
        category: 'operational_authority',
        title: 'Zgoda na prowadzenie działalności sprzedażowej',
        description: 'Podstawa prawna do prowadzenia działalności sprzedażowej.',
        required: true,
        autoCreateOnDepartmentCreation: true,
      },
    ],
  },
  
  operations: {
    id: 'operations',
    name: 'Operacje',
    subtitle: 'Zarządzanie operacjami biznesowymi',
    description: 'Ogólny szablon dla działów operacyjnych.',
    supportsProjects: false,
    contractCategories: [
      {
        id: 'operational_contracts',
        label: 'Umowy operacyjne',
      },
    ],
    contractMetadataFields: [],
    documentFolders: [
      {
        id: 'operational_docs',
        label: 'Dokumenty operacyjne',
      },
    ],
    decisionTemplates: [
      {
        id: 'department_authorization',
        level: 'department',
        category: 'operational_authority',
        title: 'Zgoda na prowadzenie działalności operacyjnej',
        description: 'Podstawa prawna do prowadzenia działalności operacyjnej.',
        required: true,
        autoCreateOnDepartmentCreation: true,
      },
    ],
  },
  
  funeral_home: funeralHomeDepartmentTemplate,
  
  transport_operations: transportOperationsDepartmentTemplate,
};

/**
 * Get department template by ID
 */
export function getDepartmentTemplate(templateId: DepartmentTemplateId): DepartmentTemplate {
  return departmentTemplates[templateId] || departmentTemplates.general;
}

/**
 * Get all available department templates as array
 */
export function getAllDepartmentTemplates(): DepartmentTemplate[] {
  return Object.values(departmentTemplates);
}
