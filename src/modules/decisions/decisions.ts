// Decision / Mandate Types
// Core concept: Every operational document traces back to an authorizing decision

export type DecisionType = 
  | 'strategic_shareholders'  // Uchwała wspólników
  | 'operational_board'       // Uchwała zarządu
  | 'supervisory_board';      // Uchwała rady nadzorczej

export type DecisionCategory =
  | 'operational_activity'    // Zgoda na prowadzenie działalności operacyjnej
  | 'company_financing'       // Zgoda na finansowanie spółki
  | 'compensation'            // Zgoda na wynagrodzenie
  | 'sales_services'          // Zgoda na sprzedaż produktów/usług
  | 'operational_costs'       // Zgoda na ponoszenie kosztów operacyjnych
  | 'b2b_contracts'           // Zgoda na zawieranie umów B2B
  | 'cash_management'         // Zgoda na zarządzanie kasą
  | 'project_governance'      // Zgoda na utworzenie projektu (charter)
  | 'custom_projects'         // Zgoda na projekty niestandardowe
  | 'other';                  // Inne

// Business domains for decision grouping
export type BusinessDomain = 
  | 'capital'      // Kapitał i własność
  | 'contracts'    // Umowy i relacje
  | 'costs'        // Koszty i operacje
  | 'revenue';     // Sprzedaż i przychody

// Map categories to domains
export const CATEGORY_TO_DOMAIN: Record<DecisionCategory, BusinessDomain> = {
  company_financing: 'capital',
  operational_activity: 'costs',
  compensation: 'costs',
  sales_services: 'revenue',
  operational_costs: 'costs',
  b2b_contracts: 'contracts',
  cash_management: 'costs',
  project_governance: 'contracts',
  custom_projects: 'contracts',
  other: 'costs',
};

export interface DomainCoverage {
  domain: BusinessDomain;
  label: string;
  icon: string;
  hasDecisions: boolean;
  activeDecisions: number;
  totalUsage: number;
  status: 'covered' | 'partial' | 'missing';
}

export type DecisionStatus =
  | 'active'           // Currently valid
  | 'expired'          // Past valid_to date
  | 'revoked'          // Manually revoked (after approval)
  | 'superseded'       // Replaced by newer decision
  | 'revoke_requested' // Revocation requested, awaiting approval
  | 'revoke_rejected'; // Revocation request was rejected

export interface DecisionCounterparty {
  name: string;
  nip?: string;
}

export interface Decision {
  id: string;
  business_profile_id: string;
  resolution_id?: string | null;
  decision_number?: string | null;
  parent_decision_id?: string | null;
  template_id?: string | null;
  
  // Metadata
  title: string;
  description?: string;
  decision_type: DecisionType;
  category: DecisionCategory;
  
  // Scope and limits
  scope_description?: string;
  amount_limit?: number;
  currency?: string;
  
  // Time limits
  valid_from?: string;
  valid_to?: string;
  
  // Counterparty restrictions
  allowed_counterparties?: DecisionCounterparty[];
  
  // Status
  status: DecisionStatus;
  
  // Usage tracking
  total_contracts?: number;
  total_invoices?: number;
  total_expenses?: number;
  total_amount_used?: number;
  
  // Audit
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DecisionWithUsage extends Decision {
  // Related entities for display
  contracts?: Array<{
    id: string;
    number: string;
    subject?: string;
    issueDate: string;
  }>;
  invoices?: Array<{
    id: string;
    number: string;
    totalGrossValue: number;
    issueDate: string;
  }>;
  expenses?: Array<{
    id: string;
    description?: string;
    amount: number;
    date: string;
  }>;
  documents?: Array<{
    id: string;
    title: string;
    file_name: string;
    created_at?: string;
  }>;
  capitalEvents?: Array<{
    id: string;
    event_type: string;
    amount: number;
    event_date: string;
  }>;
}

// Decision authority reference (embedded in other entities)
export interface DecisionReference {
  decision_id: string;
  decision_title: string;
  decision_number?: string;
  decision_status: DecisionStatus;
  is_valid: boolean;
  validation_message?: string;
}

export interface CreateDecisionInput {
  business_profile_id: string;
  resolution_id?: string;
  parent_decision_id?: string | null;
  template_id?: string | null;
  title: string;
  description?: string;
  decision_type: DecisionType;
  category: DecisionCategory;
  scope_description?: string;
  amount_limit?: number;
  currency?: string;
  valid_from?: string;
  valid_to?: string;
  allowed_counterparties?: DecisionCounterparty[];
  status?: DecisionStatus;
}

export interface UpdateDecisionInput {
  title?: string;
  description?: string;
  decision_type?: DecisionType;
  category?: DecisionCategory;
  parent_decision_id?: string | null;
  template_id?: string | null;
  scope_description?: string;
  amount_limit?: number | null;
  currency?: string;
  valid_from?: string | null;
  valid_to?: string | null;
  allowed_counterparties?: DecisionCounterparty[];
  status?: DecisionStatus;
}

// Labels for UI
export const DECISION_TYPE_LABELS: Record<DecisionType, string> = {
  strategic_shareholders: 'Uchwała wspólników',
  operational_board: 'Uchwała zarządu',
  supervisory_board: 'Uchwała rady nadzorczej',
};

export const DECISION_CATEGORY_LABELS: Record<DecisionCategory, string> = {
  operational_activity: 'Działalność operacyjna',
  company_financing: 'Finansowanie spółki',
  compensation: 'Wynagrodzenia',
  sales_services: 'Sprzedaż produktów/usług',
  operational_costs: 'Koszty operacyjne',
  b2b_contracts: 'Umowy B2B',
  cash_management: 'Zarządzanie kasą',
  project_governance: 'Utworzenie projektu',
  custom_projects: 'Projekty niestandardowe',
  other: 'Inne',
};

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  active: 'Aktywna',
  expired: 'Wygasła',
  revoked: 'Odwołana',
  superseded: 'Zastąpiona',
  revoke_requested: 'Oczekuje na unieważnienie',
  revoke_rejected: 'Unieważnienie odrzucone',
};

// Foundational decisions that should exist for every business profile
export const FOUNDATIONAL_DECISIONS: Array<Omit<CreateDecisionInput, 'business_profile_id'>> = [
  // Strategic (shareholders)
  {
    title: 'Zgoda na prowadzenie działalności operacyjnej',
    description: 'Uchwała wspólników zezwalająca na prowadzenie bieżącej działalności gospodarczej spółki',
    decision_type: 'strategic_shareholders',
    category: 'operational_activity',
    scope_description: 'Zarząd jest upoważniony do prowadzenia bieżącej działalności operacyjnej spółki zgodnie z przedmiotem działalności',
    status: 'active',
  },
  {
    title: 'Zgoda na finansowanie spółki',
    description: 'Uchwała wspólników dotycząca kapitału zakładowego i możliwości zaciągania pożyczek',
    decision_type: 'strategic_shareholders',
    category: 'company_financing',
    scope_description: 'Zarząd może zaciągać zobowiązania finansowe w ramach prowadzonej działalności',
    status: 'active',
  },
  {
    title: 'Zgoda na wynagrodzenie zarządu',
    description: 'Uchwała wspólników określająca zasady wynagradzania członków zarządu',
    decision_type: 'strategic_shareholders',
    category: 'compensation',
    scope_description: 'Członkowie zarządu otrzymują wynagrodzenie zgodnie z umowami o zarządzanie',
    status: 'active',
  },
  // Operational (board)
  {
    title: 'Zgoda na sprzedaż produktów i usług',
    description: 'Uchwała zarządu zezwalająca na prowadzenie sprzedaży w ramach działalności',
    decision_type: 'operational_board',
    category: 'sales_services',
    scope_description: 'Spółka może zawierać umowy sprzedaży produktów i świadczenia usług zgodnie z przedmiotem działalności',
    status: 'active',
  },
  {
    title: 'Zgoda na ponoszenie kosztów operacyjnych',
    description: 'Uchwała zarządu dotycząca wydatków operacyjnych',
    decision_type: 'operational_board',
    category: 'operational_costs',
    scope_description: 'Zarząd może ponosić koszty niezbędne do prowadzenia działalności: wynagrodzenia, usługi, materiały, infrastruktura',
    status: 'active',
  },
  {
    title: 'Zgoda na zawieranie umów B2B',
    description: 'Uchwała zarządu zezwalająca na zawieranie umów z kontrahentami',
    decision_type: 'operational_board',
    category: 'b2b_contracts',
    scope_description: 'Spółka może zawierać umowy z dostawcami, usługodawcami i innymi kontrahentami',
    status: 'active',
  },
  {
    title: 'Zgoda na zarządzanie kasą',
    description: 'Uchwała zarządu dotycząca prowadzenia kasy fiskalnej i zarządzania gotówką',
    decision_type: 'operational_board',
    category: 'cash_management',
    scope_description: 'Zarząd może prowadzić kasę fiskalną, dokonywać wpłat i wypłat gotówkowych w ramach działalności spółki',
    status: 'active',
  },
];
