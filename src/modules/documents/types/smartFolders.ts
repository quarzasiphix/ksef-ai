/**
 * Smart Folders System
 * 
 * Curated views within sections with descriptions, filters, and helper text
 * Folders are NOT arbitrary tags - they're opinionated, contextual views
 */

import type { DocumentSection } from './sections';
import type { DocumentStatus, EntityType } from './documentSchema';

/**
 * Smart Folder Definition
 */
export interface SmartFolder {
  id: string;
  section: DocumentSection;
  name: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  
  // Helper Content (contextual lead text)
  helper_text: string;
  helper_chips: string[];
  
  // Smart Filters
  filters: {
    doc_types?: string[];
    statuses?: DocumentStatus[];
    tags?: string[];
    requires_decision?: boolean;
    requires_financials?: boolean;
    linked_entity_types?: EntityType[];
    date_range?: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';
  };
  
  // Suggested Actions
  suggested_templates: string[];
  quick_actions: {
    label: string;
    action: string;
    icon?: string;
  }[];
  
  // System vs Custom
  is_system: boolean;
}

/**
 * Default Smart Folders per Section
 */

// CONTRACTS SECTION
export const CONTRACTS_FOLDERS: SmartFolder[] = [
  {
    id: 'contracts_active',
    section: 'contracts',
    name: 'Aktywne umowy',
    description: 'Umowy obecnie obowiązujące',
    icon: 'FileCheck',
    color: '#3b82f6',
    order: 1,
    helper_text: 'Umowy w trakcie realizacji. Sprawdź daty wygaśnięcia i wymagane decyzje.',
    helper_chips: [
      'Wymaga decyzji autoryzującej',
      'Wygasa w ciągu 60 dni',
      'Powiązane z fakturami'
    ],
    filters: {
      statuses: ['active'],
    },
    suggested_templates: ['framework_contract_b2b', 'single_order'],
    quick_actions: [
      { label: 'Nowa umowa ramowa', action: 'create_framework', icon: 'Plus' },
      { label: 'Zlecenie jednorazowe', action: 'create_order', icon: 'FileText' }
    ],
    is_system: true,
  },
  {
    id: 'contracts_pending_signature',
    section: 'contracts',
    name: 'Do podpisu',
    description: 'Umowy oczekujące na podpis',
    icon: 'Edit',
    color: '#f59e0b',
    order: 2,
    helper_text: 'Umowy przygotowane, oczekujące na podpis kontrahenta lub wewnętrzne zatwierdzenie.',
    helper_chips: [
      'Wyślij do kontrahenta',
      'Sprawdź wymagane załączniki',
      'Powiąż z decyzją'
    ],
    filters: {
      statuses: ['awaiting_approval'],
    },
    suggested_templates: [],
    quick_actions: [
      { label: 'Wyślij do podpisu', action: 'send_for_signature', icon: 'Send' }
    ],
    is_system: true,
  },
  {
    id: 'contracts_expiring',
    section: 'contracts',
    name: 'Wygasające',
    description: 'Umowy wymagające odnowienia',
    icon: 'AlertCircle',
    color: '#ef4444',
    order: 3,
    helper_text: 'Umowy wygasające w ciągu 60 dni. Zaplanuj odnowienie lub zakończenie współpracy.',
    helper_chips: [
      'Skontaktuj się z kontrahentem',
      'Przygotuj aneks lub nową umowę',
      'Sprawdź warunki odnowienia'
    ],
    filters: {
      statuses: ['active'],
      // Custom filter: valid_to within 60 days
    },
    suggested_templates: ['framework_contract_b2b'],
    quick_actions: [
      { label: 'Utwórz aneks', action: 'create_amendment', icon: 'FileText' }
    ],
    is_system: true,
  },
];

// FINANCIAL SECTION
export const FINANCIAL_FOLDERS: SmartFolder[] = [
  {
    id: 'financial_to_settle',
    section: 'financial',
    name: 'Do rozliczenia',
    description: 'Dokumenty oczekujące na rozliczenie',
    icon: 'DollarSign',
    color: '#10b981',
    order: 1,
    helper_text: 'Dowody księgowe i rozliczenia wymagające powiązania z fakturami i zamknięcia.',
    helper_chips: [
      'Powiąż z fakturą',
      'Sprawdź kwoty i VAT',
      'Dołącz potwierdzenie płatności'
    ],
    filters: {
      statuses: ['active', 'awaiting_approval'],
      requires_financials: true,
    },
    suggested_templates: ['job_settlement', 'expense_report'],
    quick_actions: [
      { label: 'Nowe rozliczenie', action: 'create_settlement', icon: 'Plus' },
      { label: 'Powiąż z fakturą', action: 'link_invoice', icon: 'Link' }
    ],
    is_system: true,
  },
  {
    id: 'financial_missing_evidence',
    section: 'financial',
    name: 'Brak dowodu',
    description: 'Faktury bez załączonego dowodu księgowego',
    icon: 'AlertTriangle',
    color: '#ef4444',
    order: 2,
    helper_text: 'Faktury wymagające załączenia dowodu księgowego (umowa, zlecenie, protokół).',
    helper_chips: [
      'Dołącz skan faktury',
      'Powiąż z umową lub zleceniem',
      'Sprawdź zgodność kwot'
    ],
    filters: {
      // Custom filter: linked to invoice but missing attachment
    },
    suggested_templates: ['invoice_attachment'],
    quick_actions: [
      { label: 'Dodaj dowód', action: 'add_evidence', icon: 'Upload' }
    ],
    is_system: true,
  },
  {
    id: 'financial_vat',
    section: 'financial',
    name: 'Dokumenty VAT',
    description: 'Dokumenty z VAT do rozliczenia',
    icon: 'Receipt',
    color: '#3b82f6',
    order: 3,
    helper_text: 'Dokumenty zawierające VAT wymagające prawidłowego rozliczenia w deklaracji.',
    helper_chips: [
      'Sprawdź stawkę VAT',
      'Weryfikuj NIP kontrahenta',
      'Okres rozliczeniowy'
    ],
    filters: {
      // Custom filter: has_vat = true
    },
    suggested_templates: [],
    quick_actions: [],
    is_system: true,
  },
];

// OPERATIONS SECTION (Transport Department)
export const OPERATIONS_FOLDERS: SmartFolder[] = [
  {
    id: 'operations_jobs',
    section: 'operations',
    name: 'Zlecenia',
    description: 'Dokumenty zleceń transportowych',
    icon: 'Truck',
    color: '#f59e0b',
    order: 1,
    helper_text: 'Zlecenia transportowe i dokumenty realizacji. Każde zlecenie musi mieć powiązane dokumenty przewozowe.',
    helper_chips: [
      'Powiązane ze zleceniem (wymagane)',
      'Kierowca i pojazd przypisani',
      'Status realizacji'
    ],
    filters: {
      doc_types: ['transport_order'],
      linked_entity_types: ['job'],
    },
    suggested_templates: ['transport_order'],
    quick_actions: [
      { label: 'Nowe zlecenie', action: 'create_job_order', icon: 'Plus' }
    ],
    is_system: true,
  },
  {
    id: 'operations_transport_docs',
    section: 'operations',
    name: 'Dokumenty przewozowe',
    description: 'CMR, listy przewozowe, POD',
    icon: 'FileText',
    color: '#3b82f6',
    order: 2,
    helper_text: 'Dokumenty wymagane do realizacji i zamknięcia zleceń transportowych. Powiąż je ze zleceniem, kierowcą i pojazdem.',
    helper_chips: [
      'Wymagane do zamknięcia zlecenia: CMR + POD',
      'Powiązania: Zlecenie (wymagane), Kierowca, Pojazd',
      'Statusy: Szkic → Wysłane → Podpisane → Zarchiwizowane'
    ],
    filters: {
      doc_types: ['cmr', 'waybill', 'pod'],
      linked_entity_types: ['job', 'driver', 'vehicle'],
    },
    suggested_templates: ['cmr', 'waybill', 'pod'],
    quick_actions: [
      { label: 'CMR / List przewozowy', action: 'create_cmr', icon: 'FileText' },
      { label: 'POD / Potwierdzenie', action: 'create_pod', icon: 'CheckCircle' }
    ],
    is_system: true,
  },
  {
    id: 'operations_animal_docs',
    section: 'operations',
    name: 'Dokumenty zwierząt',
    description: 'Paszporty, szczepienia, mikrochipy',
    icon: 'Heart',
    color: '#ec4899',
    order: 3,
    helper_text: 'Dokumentacja zwierząt przewożonych: paszporty, potwierdzenia szczepień, dowody mikrochipowania.',
    helper_chips: [
      'Wymagane dla transportu zwierząt',
      'Sprawdź ważność szczepień',
      'Powiąż z konkretnym zwierzęciem i zleceniem'
    ],
    filters: {
      doc_types: ['animal_passport', 'vaccination_proof', 'microchip_evidence'],
      linked_entity_types: ['job'],
    },
    suggested_templates: ['animal_documentation_pack'],
    quick_actions: [
      { label: 'Dodaj dokumenty zwierzęcia', action: 'add_animal_docs', icon: 'Plus' }
    ],
    is_system: true,
  },
  {
    id: 'operations_compliance',
    section: 'operations',
    name: 'Zgodności / Licencje',
    description: 'Licencje przewoźnika, pozwolenia, TRACES',
    icon: 'Shield',
    color: '#8b5cf6',
    order: 4,
    helper_text: 'Dokumenty zgodności: licencje przewoźnika, pozwolenia TRACES, certyfikaty, zezwolenia transgraniczne.',
    helper_chips: [
      'Sprawdź daty ważności',
      'Wymagane dla transportu międzynarodowego',
      'Blokuje realizację zlecenia jeśli brak'
    ],
    filters: {
      doc_types: ['carrier_license', 'traces_permit', 'cross_border_permit'],
    },
    suggested_templates: [],
    quick_actions: [],
    is_system: true,
  },
  {
    id: 'operations_vehicles',
    section: 'operations',
    name: 'Pojazdy',
    description: 'Ubezpieczenia, przeglądy, serwis',
    icon: 'Car',
    color: '#6366f1',
    order: 5,
    helper_text: 'Dokumenty pojazdów: ubezpieczenia OC/AC, przeglądy techniczne, dokumentacja serwisowa.',
    helper_chips: [
      'Powiąż z konkretnym pojazdem',
      'Sprawdź daty ważności',
      'Przegląd techniczny co 12 miesięcy'
    ],
    filters: {
      doc_types: ['vehicle_insurance', 'vehicle_inspection', 'service_record'],
      linked_entity_types: ['vehicle'],
    },
    suggested_templates: ['vehicle_inspection'],
    quick_actions: [
      { label: 'Dodaj przegląd', action: 'add_inspection', icon: 'Plus' }
    ],
    is_system: true,
  },
  {
    id: 'operations_drivers',
    section: 'operations',
    name: 'Kierowcy',
    description: 'Prawa jazdy, szkolenia, umowy, badania',
    icon: 'User',
    color: '#14b8a6',
    order: 6,
    helper_text: 'Dokumenty kierowców: prawa jazdy, certyfikaty szkoleń, umowy o pracę, badania lekarskie.',
    helper_chips: [
      'Powiąż z konkretnym kierowcą',
      'Sprawdź ważność prawa jazdy',
      'Badania lekarskie co 12 miesięcy'
    ],
    filters: {
      doc_types: ['driver_license', 'training_certificate', 'medical_exam'],
      linked_entity_types: ['driver'],
    },
    suggested_templates: ['driver_license'],
    quick_actions: [
      { label: 'Dodaj dokument kierowcy', action: 'add_driver_doc', icon: 'Plus' }
    ],
    is_system: true,
  },
  {
    id: 'operations_incidents',
    section: 'operations',
    name: 'Incydenty',
    description: 'Raporty szkód, opóźnień, reklamacji',
    icon: 'AlertTriangle',
    color: '#ef4444',
    order: 7,
    helper_text: 'Raporty incydentów: szkody, opóźnienia, reklamacje klientów, problemy w transporcie.',
    helper_chips: [
      'Powiąż ze zleceniem',
      'Dołącz zdjęcia i dowody',
      'Zgłoś do ubezpieczyciela jeśli szkoda'
    ],
    filters: {
      doc_types: ['incident_report', 'damage_report', 'complaint'],
      linked_entity_types: ['job'],
    },
    suggested_templates: ['incident_report'],
    quick_actions: [
      { label: 'Zgłoś incydent', action: 'report_incident', icon: 'AlertTriangle' }
    ],
    is_system: true,
  },
];

// AUDIT SECTION
export const AUDIT_FOLDERS: SmartFolder[] = [
  {
    id: 'audit_open_findings',
    section: 'audit',
    name: 'Otwarte ustalenia',
    description: 'Ustalenia audytowe do zamknięcia',
    icon: 'FileSearch',
    color: '#6366f1',
    order: 1,
    helper_text: 'Ustalenia z audytów wymagające działań naprawczych i zamknięcia.',
    helper_chips: [
      'Przypisz odpowiedzialnego',
      'Określ termin zamknięcia',
      'Dołącz dowody naprawy'
    ],
    filters: {
      statuses: ['active', 'awaiting_approval'],
    },
    suggested_templates: ['audit_note'],
    quick_actions: [
      { label: 'Nowa notatka audytowa', action: 'create_audit_note', icon: 'Plus' }
    ],
    is_system: true,
  },
  {
    id: 'audit_critical',
    section: 'audit',
    name: 'Krytyczne',
    description: 'Problemy wymagające natychmiastowej uwagi',
    icon: 'AlertCircle',
    color: '#ef4444',
    order: 2,
    helper_text: 'Krytyczne problemy compliance wymagające natychmiastowego działania.',
    helper_chips: [
      'Priorytet: Wysoki',
      'Wymaga eskalacji',
      'Raportuj do zarządu'
    ],
    filters: {
      // Custom filter: severity = 'critical'
    },
    suggested_templates: [],
    quick_actions: [],
    is_system: true,
  },
];

/**
 * Get folders for a section
 */
export function getFoldersForSection(section: DocumentSection): SmartFolder[] {
  switch (section) {
    case 'contracts':
      return CONTRACTS_FOLDERS;
    case 'financial':
      return FINANCIAL_FOLDERS;
    case 'operations':
      return OPERATIONS_FOLDERS;
    case 'audit':
      return AUDIT_FOLDERS;
    case 'decisions':
      return []; // Decisions don't use folders
    default:
      return [];
  }
}

/**
 * Get folder by ID
 */
export function getFolderById(folderId: string): SmartFolder | undefined {
  const allFolders = [
    ...CONTRACTS_FOLDERS,
    ...FINANCIAL_FOLDERS,
    ...OPERATIONS_FOLDERS,
    ...AUDIT_FOLDERS,
  ];
  
  return allFolders.find(f => f.id === folderId);
}
