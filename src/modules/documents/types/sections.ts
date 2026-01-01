/**
 * Document Section Configuration
 * 
 * Separates (1) view identity, (2) routing, and (3) presentation theme
 * Each section has its own route, config, and visual identity
 */

import { LucideIcon, FileText, DollarSign, Truck, FileSearch, Award } from 'lucide-react';
import type { DocumentBlueprint } from './blueprints';

export type DocumentSection = 'contracts' | 'financial' | 'operations' | 'audit' | 'decisions';

/**
 * Section Theme - Visual identity tokens
 */
export interface SectionTheme {
  accentColor: string;
  accentColorLight: string;
  icon: LucideIcon;
  iconColor: string;
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
  emptyIllustration?: string;
}

/**
 * KPI Metric Definition
 */
export interface MetricCard {
  id: string;
  label: string;
  description?: string;
  queryKey: string;
  format: 'count' | 'amount' | 'percentage' | 'days';
  icon?: LucideIcon;
  color?: string;
  threshold?: {
    warning: number;
    critical: number;
  };
}

/**
 * Table Column Definition
 */
export interface TableColumn {
  id: string;
  label: string;
  field: string;
  width?: string;
  sortable?: boolean;
  format?: 'text' | 'date' | 'amount' | 'status' | 'badge' | 'link';
  priority: 'primary' | 'secondary' | 'tertiary';
}

/**
 * Quick Filter Definition
 */
export interface QuickFilter {
  id: string;
  label: string;
  field: string;
  value: any;
  icon?: LucideIcon;
  badge?: boolean;
}

/**
 * View Definition - Complete section configuration
 */
export interface ViewDefinition {
  section: DocumentSection;
  route: string;
  title: string;
  subtitle: string;
  description: string;
  theme: SectionTheme;
  
  // KPIs to display
  metrics: MetricCard[];
  
  // Table configuration
  tableColumns: TableColumn[];
  defaultSort: { field: string; direction: 'asc' | 'desc' };
  
  // Quick filters
  quickFilters: QuickFilter[];
  
  // Allowed blueprints for this section
  allowedBlueprintIds: string[];
  
  // Primary CTA
  primaryCTA: {
    label: string;
    description?: string;
  };
  
  // Secondary actions
  secondaryActions?: Array<{
    label: string;
    icon?: LucideIcon;
    action: string;
  }>;
  
  // Empty state
  emptyState: {
    title: string;
    description: string;
    illustration?: string;
  };
}

/**
 * Section View Definitions
 */
export const SECTION_VIEWS: Record<DocumentSection, ViewDefinition> = {
  contracts: {
    section: 'contracts',
    route: '/documents/contracts',
    title: 'Umowy i kontrakty',
    subtitle: 'Zarządzanie umowami, kontraktami i zobowiązaniami',
    description: 'Pełna kontrola nad cyklem życia umów: od projektu przez podpis, realizację, do archiwizacji.',
    
    theme: {
      accentColor: '#3b82f6',
      accentColorLight: '#dbeafe',
      icon: FileText,
      iconColor: '#3b82f6',
      badgeVariant: 'default',
    },
    
    metrics: [
      {
        id: 'active_contracts',
        label: 'Aktywne umowy',
        description: 'Umowy w trakcie realizacji',
        queryKey: 'contracts_active',
        format: 'count',
        icon: FileText,
        color: '#3b82f6',
      },
      {
        id: 'pending_signature',
        label: 'Do podpisu',
        description: 'Umowy oczekujące na podpis',
        queryKey: 'contracts_pending_signature',
        format: 'count',
        icon: FileText,
        color: '#f59e0b',
        threshold: { warning: 3, critical: 5 },
      },
      {
        id: 'expiring_soon',
        label: 'Wygasa w 60 dni',
        description: 'Umowy wymagające odnowienia',
        queryKey: 'contracts_expiring',
        format: 'count',
        icon: FileText,
        color: '#ef4444',
        threshold: { warning: 5, critical: 10 },
      },
      {
        id: 'missing_decision',
        label: 'Brak wymaganej zgody',
        description: 'Umowy bez decyzji autoryzującej',
        queryKey: 'contracts_missing_decision',
        format: 'count',
        icon: Award,
        color: '#ef4444',
      },
    ],
    
    tableColumns: [
      { id: 'title', label: 'Umowa', field: 'title', sortable: true, priority: 'primary' },
      { id: 'counterparty', label: 'Kontrahent', field: 'customer_name', sortable: true, priority: 'primary' },
      { id: 'valid_from', label: 'Obowiązuje od', field: 'valid_from', format: 'date', sortable: true, priority: 'secondary' },
      { id: 'valid_to', label: 'Obowiązuje do', field: 'valid_to', format: 'date', sortable: true, priority: 'primary' },
      { id: 'status', label: 'Status', field: 'status', format: 'status', sortable: true, priority: 'primary' },
      { id: 'decision', label: 'Decyzja', field: 'decision_reference', format: 'badge', priority: 'secondary' },
      { id: 'attachments', label: 'Załączniki', field: 'attachment_count', format: 'badge', priority: 'tertiary' },
    ],
    
    defaultSort: { field: 'valid_to', direction: 'desc' },
    
    quickFilters: [
      { id: 'status_active', label: 'Aktywne', field: 'status', value: 'active' },
      { id: 'status_draft', label: 'Projekty', field: 'status', value: 'draft' },
      { id: 'status_expired', label: 'Wygasłe', field: 'status', value: 'expired' },
      { id: 'requires_decision', label: 'Wymaga decyzji', field: 'requires_decision', value: true, badge: true },
      { id: 'expiring', label: 'Wygasające', field: 'expiring_soon', value: true, badge: true },
    ],
    
    allowedBlueprintIds: ['framework_contract_b2b', 'single_order', 'service_agreement', 'lease_agreement'],
    
    primaryCTA: {
      label: 'Nowa umowa',
      description: 'Utwórz nową umowę lub kontrakt',
    },
    
    secondaryActions: [
      { label: 'Import z pliku', action: 'import' },
      { label: 'Szablony umów', action: 'templates' },
    ],
    
    emptyState: {
      title: 'Brak umów',
      description: 'Zacznij od utworzenia pierwszej umowy lub zaimportuj istniejące dokumenty.',
    },
  },
  
  financial: {
    section: 'financial',
    route: '/documents/financial',
    title: 'Dokumenty finansowe',
    subtitle: 'Dowody księgowe i rozliczenia',
    description: 'Dowody księgowe i rozliczenia powiązane z fakturami i kosztami. Kontrola VAT, rozliczenia, i zgodność z księgowością.',
    
    theme: {
      accentColor: '#10b981',
      accentColorLight: '#d1fae5',
      icon: DollarSign,
      iconColor: '#10b981',
      badgeVariant: 'secondary',
    },
    
    metrics: [
      {
        id: 'to_settle',
        label: 'Do rozliczenia',
        description: 'Dokumenty oczekujące na rozliczenie',
        queryKey: 'financial_to_settle',
        format: 'amount',
        icon: DollarSign,
        color: '#f59e0b',
      },
      {
        id: 'expiring_30',
        label: 'Wygasa w 30 dni',
        description: 'Dokumenty tracące ważność',
        queryKey: 'financial_expiring',
        format: 'count',
        icon: FileText,
        color: '#ef4444',
        threshold: { warning: 5, critical: 10 },
      },
      {
        id: 'missing_evidence',
        label: 'Brak załącznika do faktury',
        description: 'Faktury bez dowodu księgowego',
        queryKey: 'financial_missing_evidence',
        format: 'count',
        icon: FileText,
        color: '#ef4444',
      },
      {
        id: 'disputes',
        label: 'Spory/niezgodności',
        description: 'Dokumenty z niezgodnościami',
        queryKey: 'financial_disputes',
        format: 'count',
        icon: FileText,
        color: '#ef4444',
      },
    ],
    
    tableColumns: [
      { id: 'document', label: 'Dokument', field: 'title', sortable: true, priority: 'primary' },
      { id: 'invoice', label: 'Powiązana faktura', field: 'invoice_number', format: 'link', sortable: true, priority: 'primary' },
      { id: 'amount_net', label: 'Kwota netto', field: 'amount_net', format: 'amount', sortable: true, priority: 'primary' },
      { id: 'amount_gross', label: 'Kwota brutto', field: 'amount_gross', format: 'amount', sortable: true, priority: 'secondary' },
      { id: 'vat_rate', label: 'Stawka VAT', field: 'vat_rate', format: 'badge', sortable: true, priority: 'secondary' },
      { id: 'period', label: 'Okres', field: 'accounting_period', format: 'date', sortable: true, priority: 'secondary' },
      { id: 'status', label: 'Status', field: 'status', format: 'status', sortable: true, priority: 'primary' },
      { id: 'evidence', label: 'Dowód', field: 'has_evidence', format: 'badge', priority: 'primary' },
    ],
    
    defaultSort: { field: 'accounting_period', direction: 'desc' },
    
    quickFilters: [
      { id: 'vat', label: 'VAT', field: 'has_vat', value: true },
      { id: 'no_vat', label: 'Bez VAT', field: 'has_vat', value: false },
      { id: 'net', label: 'Netto', field: 'view_mode', value: 'net' },
      { id: 'gross', label: 'Brutto', field: 'view_mode', value: 'gross' },
      { id: 'incoming', label: 'Przychody', field: 'direction', value: 'incoming' },
      { id: 'outgoing', label: 'Wydatki', field: 'direction', value: 'outgoing' },
      { id: 'missing_evidence', label: 'Brak dowodu', field: 'has_evidence', value: false, badge: true },
      { id: 'expiring', label: 'Wygasające', field: 'expiring_soon', value: true, badge: true },
    ],
    
    allowedBlueprintIds: ['job_settlement', 'invoice_attachment', 'expense_report', 'financial_statement'],
    
    primaryCTA: {
      label: 'Dodaj dowód księgowy',
      description: 'Dodaj nowy dokument finansowy lub rozliczenie',
    },
    
    secondaryActions: [
      { label: 'Powiąż z fakturą', action: 'link_invoice' },
      { label: 'Export do księgowości', action: 'export_accounting' },
    ],
    
    emptyState: {
      title: 'Brak dokumentów finansowych',
      description: 'Dodaj pierwszy dowód księgowy lub powiąż dokument z fakturą.',
    },
  },
  
  operations: {
    section: 'operations',
    route: '/documents/operations',
    title: 'Dokumenty operacyjne',
    subtitle: 'Dokumenty zleceń i realizacji',
    description: 'Dokumenty związane z realizacją zleceń: zlecenia transportowe, protokoły, karty realizacji, incydenty.',
    
    theme: {
      accentColor: '#f59e0b',
      accentColorLight: '#fef3c7',
      icon: Truck,
      iconColor: '#f59e0b',
      badgeVariant: 'outline',
    },
    
    metrics: [
      {
        id: 'jobs_no_protocol',
        label: 'Zlecenia bez protokołu',
        description: 'Zlecenia bez protokołu przekazania',
        queryKey: 'operations_no_protocol',
        format: 'count',
        icon: Truck,
        color: '#ef4444',
        threshold: { warning: 5, critical: 10 },
      },
      {
        id: 'incidents',
        label: 'Incydenty',
        description: 'Zgłoszone incydenty i problemy',
        queryKey: 'operations_incidents',
        format: 'count',
        icon: FileText,
        color: '#ef4444',
      },
      {
        id: 'missing_pod',
        label: 'POD brak',
        description: 'Zlecenia bez potwierdzenia dostawy',
        queryKey: 'operations_missing_pod',
        format: 'count',
        icon: FileText,
        color: '#f59e0b',
      },
      {
        id: 'active_jobs',
        label: 'Aktywne zlecenia',
        description: 'Zlecenia w trakcie realizacji',
        queryKey: 'operations_active_jobs',
        format: 'count',
        icon: Truck,
        color: '#3b82f6',
      },
    ],
    
    tableColumns: [
      { id: 'job_number', label: 'Nr zlecenia', field: 'job_number', format: 'link', sortable: true, priority: 'primary' },
      { id: 'document_type', label: 'Typ dokumentu', field: 'document_type', format: 'badge', sortable: true, priority: 'primary' },
      { id: 'driver', label: 'Kierowca', field: 'driver_name', sortable: true, priority: 'secondary' },
      { id: 'vehicle', label: 'Pojazd', field: 'vehicle_registration', sortable: true, priority: 'secondary' },
      { id: 'date', label: 'Data', field: 'document_date', format: 'date', sortable: true, priority: 'primary' },
      { id: 'status', label: 'Status', field: 'status', format: 'status', sortable: true, priority: 'primary' },
    ],
    
    defaultSort: { field: 'document_date', direction: 'desc' },
    
    quickFilters: [
      { id: 'transport_orders', label: 'Zlecenia', field: 'document_type', value: 'transport_order' },
      { id: 'protocols', label: 'Protokoły', field: 'document_type', value: 'handover_protocol' },
      { id: 'incidents', label: 'Incydenty', field: 'document_type', value: 'incident_report' },
      { id: 'missing_protocol', label: 'Brak protokołu', field: 'has_protocol', value: false, badge: true },
    ],
    
    allowedBlueprintIds: ['transport_order', 'handover_protocol', 'execution_card', 'incident_report', 'vehicle_inspection'],
    
    primaryCTA: {
      label: 'Nowy dokument zlecenia',
      description: 'Dodaj dokument związany ze zleceniem',
    },
    
    secondaryActions: [
      { label: 'Wybierz zlecenie', action: 'select_job' },
      { label: 'Raport incydentów', action: 'incident_report' },
    ],
    
    emptyState: {
      title: 'Brak dokumentów operacyjnych',
      description: 'Dokumenty operacyjne są powiązane ze zleceniami. Wybierz zlecenie, aby dodać dokumenty.',
    },
  },
  
  audit: {
    section: 'audit',
    route: '/documents/audit',
    title: 'Dokumenty audytowe',
    subtitle: 'Audyt i kontrola wewnętrzna',
    description: 'Notatki audytowe, raporty kontroli, i dokumentacja zgodności.',
    
    theme: {
      accentColor: '#6366f1',
      accentColorLight: '#e0e7ff',
      icon: FileSearch,
      iconColor: '#6366f1',
      badgeVariant: 'outline',
    },
    
    metrics: [
      {
        id: 'open_findings',
        label: 'Otwarte ustalenia',
        description: 'Ustalenia audytowe do zamknięcia',
        queryKey: 'audit_open_findings',
        format: 'count',
        icon: FileSearch,
        color: '#f59e0b',
      },
      {
        id: 'critical_issues',
        label: 'Krytyczne problemy',
        description: 'Problemy wymagające natychmiastowej uwagi',
        queryKey: 'audit_critical',
        format: 'count',
        icon: FileSearch,
        color: '#ef4444',
        threshold: { warning: 1, critical: 3 },
      },
      {
        id: 'compliance_checks',
        label: 'Kontrole zgodności',
        description: 'Zaplanowane kontrole',
        queryKey: 'audit_compliance_checks',
        format: 'count',
        icon: FileSearch,
        color: '#3b82f6',
      },
      {
        id: 'completed_audits',
        label: 'Zamknięte audyty',
        description: 'Audyty zakończone w tym okresie',
        queryKey: 'audit_completed',
        format: 'count',
        icon: FileSearch,
        color: '#10b981',
      },
    ],
    
    tableColumns: [
      { id: 'title', label: 'Tytuł', field: 'title', sortable: true, priority: 'primary' },
      { id: 'audit_type', label: 'Typ audytu', field: 'audit_type', format: 'badge', sortable: true, priority: 'primary' },
      { id: 'auditor', label: 'Audytor', field: 'auditor_name', sortable: true, priority: 'secondary' },
      { id: 'date', label: 'Data', field: 'audit_date', format: 'date', sortable: true, priority: 'primary' },
      { id: 'severity', label: 'Priorytet', field: 'severity', format: 'badge', sortable: true, priority: 'primary' },
      { id: 'status', label: 'Status', field: 'status', format: 'status', sortable: true, priority: 'primary' },
    ],
    
    defaultSort: { field: 'audit_date', direction: 'desc' },
    
    quickFilters: [
      { id: 'open', label: 'Otwarte', field: 'status', value: 'open' },
      { id: 'in_progress', label: 'W trakcie', field: 'status', value: 'in_progress' },
      { id: 'closed', label: 'Zamknięte', field: 'status', value: 'closed' },
      { id: 'critical', label: 'Krytyczne', field: 'severity', value: 'critical', badge: true },
    ],
    
    allowedBlueprintIds: ['audit_note', 'compliance_check', 'internal_audit'],
    
    primaryCTA: {
      label: 'Nowa notatka audytowa',
      description: 'Dodaj notatkę lub raport z audytu',
    },
    
    emptyState: {
      title: 'Brak dokumentów audytowych',
      description: 'Zacznij od utworzenia pierwszej notatki audytowej lub raportu kontroli.',
    },
  },
  
  decisions: {
    section: 'decisions',
    route: '/documents/decisions',
    title: 'Decyzje i uchwały',
    subtitle: 'Mandaty i decyzje autoryzujące',
    description: 'Decyzje wspólników, uchwały zarządu, i mandaty autoryzujące działania spółki.',
    
    theme: {
      accentColor: '#8b5cf6',
      accentColorLight: '#ede9fe',
      icon: Award,
      iconColor: '#8b5cf6',
      badgeVariant: 'secondary',
    },
    
    metrics: [
      {
        id: 'active_mandates',
        label: 'Aktywne mandaty',
        description: 'Decyzje w mocy',
        queryKey: 'decisions_active',
        format: 'count',
        icon: Award,
        color: '#8b5cf6',
      },
      {
        id: 'pending_approval',
        label: 'Oczekujące',
        description: 'Decyzje do zatwierdzenia',
        queryKey: 'decisions_pending',
        format: 'count',
        icon: Award,
        color: '#f59e0b',
      },
      {
        id: 'expiring_soon',
        label: 'Wygasające',
        description: 'Mandaty tracące ważność',
        queryKey: 'decisions_expiring',
        format: 'count',
        icon: Award,
        color: '#ef4444',
      },
      {
        id: 'total_amount',
        label: 'Łączny limit',
        description: 'Suma limitów w aktywnych mandatach',
        queryKey: 'decisions_total_limit',
        format: 'amount',
        icon: DollarSign,
        color: '#10b981',
      },
    ],
    
    tableColumns: [
      { id: 'decision_number', label: 'Nr decyzji', field: 'decision_number', format: 'badge', sortable: true, priority: 'primary' },
      { id: 'title', label: 'Tytuł', field: 'title', sortable: true, priority: 'primary' },
      { id: 'category', label: 'Kategoria', field: 'category', format: 'badge', sortable: true, priority: 'secondary' },
      { id: 'valid_from', label: 'Obowiązuje od', field: 'valid_from', format: 'date', sortable: true, priority: 'secondary' },
      { id: 'valid_to', label: 'Obowiązuje do', field: 'valid_to', format: 'date', sortable: true, priority: 'primary' },
      { id: 'amount_limit', label: 'Limit', field: 'amount_limit', format: 'amount', sortable: true, priority: 'primary' },
      { id: 'status', label: 'Status', field: 'status', format: 'status', sortable: true, priority: 'primary' },
    ],
    
    defaultSort: { field: 'valid_from', direction: 'desc' },
    
    quickFilters: [
      { id: 'active', label: 'Aktywne', field: 'status', value: 'active' },
      { id: 'pending', label: 'Oczekujące', field: 'status', value: 'pending' },
      { id: 'expired', label: 'Wygasłe', field: 'status', value: 'expired' },
      { id: 'b2b_contracts', label: 'Umowy B2B', field: 'category', value: 'b2b_contracts' },
    ],
    
    allowedBlueprintIds: [],
    
    primaryCTA: {
      label: 'Nowa decyzja',
      description: 'Utwórz nową decyzję lub mandat',
    },
    
    emptyState: {
      title: 'Brak decyzji',
      description: 'Zacznij od utworzenia pierwszej decyzji autoryzującej.',
    },
  },
};

/**
 * Get view definition for a section
 */
export function getViewDefinition(section: DocumentSection): ViewDefinition {
  return SECTION_VIEWS[section];
}

/**
 * Get section from route
 */
export function getSectionFromRoute(route: string): DocumentSection | null {
  const match = route.match(/^\/documents\/([^\/]+)/);
  if (!match) return null;
  
  const section = match[1] as DocumentSection;
  return SECTION_VIEWS[section] ? section : null;
}

/**
 * Validate if section is valid
 */
export function isValidSection(section: string): section is DocumentSection {
  return section in SECTION_VIEWS;
}

/**
 * Get canonical route for document based on its section
 */
export function getDocumentRoute(documentId: string, section: DocumentSection): string {
  return `${SECTION_VIEWS[section].route}/${documentId}`;
}
