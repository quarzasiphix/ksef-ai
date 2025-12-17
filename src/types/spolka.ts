// Spółka z o.o. specific types

// PKD Code
export interface PkdCode {
  id: string;
  business_profile_id: string;
  pkd_code: string;
  pkd_description?: string;
  is_main: boolean;
  created_at?: string;
}

// Capital Event Types
export type CapitalEventType = 
  | 'capital_contribution'
  | 'dividend_payout'
  | 'profit_allocation'
  | 'loss_coverage'
  | 'capital_increase'
  | 'capital_decrease';

export interface CapitalEvent {
  id: string;
  business_profile_id: string;
  shareholder_id?: string;
  shareholder_name?: string; // Joined from shareholders
  event_type: CapitalEventType;
  event_date: string;
  amount: number;
  description?: string;
  resolution_id?: string;
  affects_balance_sheet: boolean;
  balance_sheet_line?: string;
  created_at?: string;
  updated_at?: string;
}

// Resolution Types
export type ResolutionType = 
  | 'approve_financial_statements'
  | 'profit_allocation'
  | 'dividend_payout'
  | 'loss_coverage'
  | 'board_appointment'
  | 'other';

export type ResolutionStatus = 'draft' | 'adopted' | 'executed';

export interface Resolution {
  id: string;
  business_profile_id: string;
  resolution_number: string;
  resolution_type: ResolutionType;
  resolution_date: string;
  title: string;
  content?: string;
  fiscal_year?: number;
  amount?: number;
  status: ResolutionStatus;
  adopted_at?: string;
  executed_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Balance Sheet Line (with source tracking)
export interface BalanceSheetLine {
  id: string;
  balance_sheet_id: string;
  line_code: string;
  line_name: string;
  amount: number;
  source_type?: 'invoices' | 'expenses' | 'bank' | 'capital_events' | 'manual';
  source_query?: string;
  created_at?: string;
}

// Expense Batch
export interface ExpenseBatch {
  id: string;
  business_profile_id: string;
  batch_name: string;
  total_amount: number;
  category?: string;
  accounting_category?: string;
  start_date: string;
  end_date?: string;
  spread_months: number;
  description?: string;
  items?: ExpenseBatchItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseBatchItem {
  id: string;
  batch_id: string;
  expense_id?: string;
  invoice_number?: string;
  vendor_name?: string;
  amount: number;
  invoice_date?: string;
  description?: string;
  created_at?: string;
}

// Contract Types
export type ContractStatus = 'draft' | 'active' | 'suspended' | 'terminated' | 'completed';
export type BillingFrequency = 'monthly' | 'quarterly' | 'yearly' | 'one_time';

export interface Contract {
  id: string;
  business_profile_id: string;
  customer_id?: string;
  customer_name?: string; // Joined from customers
  contract_number?: string;
  title: string;
  description?: string;
  contract_type?: string;
  status: ContractStatus;
  start_date?: string;
  end_date?: string;
  expected_total_value?: number;
  expected_monthly_value?: number;
  billing_frequency?: BillingFrequency;
  currency: string;
  payment_terms: number;
  auto_invoice: boolean;
  notes?: string;
  milestones?: ContractMilestone[];
  invoices?: any[]; // Linked invoices
  created_at?: string;
  updated_at?: string;
}

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'invoiced';

export interface ContractMilestone {
  id: string;
  contract_id: string;
  milestone_name: string;
  description?: string;
  due_date?: string;
  amount?: number;
  status: MilestoneStatus;
  invoice_id?: string;
  completed_at?: string;
  created_at?: string;
}

// Tax Obligation Types
export type TaxObligationType = 
  | 'cit_8'
  | 'cit_8_zaliczka'
  | 'vat_7'
  | 'jpk_v7m'
  | 'zus_dra'
  | 'pit_4r'
  | 'pit_11'
  | 'pit_36'
  | 'pit_36l'
  | 'other';

export type TaxObligationStatus = 'upcoming' | 'due' | 'submitted' | 'paid' | 'overdue';
export type TaxPeriodType = 'monthly' | 'quarterly' | 'yearly';

export interface TaxObligation {
  id: string;
  business_profile_id: string;
  obligation_type: TaxObligationType;
  period_type: TaxPeriodType;
  period_year: number;
  period_month?: number;
  period_quarter?: number;
  due_date: string;
  status: TaxObligationStatus;
  amount_due?: number;
  amount_paid?: number;
  submitted_at?: string;
  paid_at?: string;
  confirmation_number?: string;
  notes?: string;
  attachments?: TaxObligationAttachment[];
  created_at?: string;
  updated_at?: string;
}

export interface TaxObligationAttachment {
  id: string;
  tax_obligation_id: string;
  file_name: string;
  file_url: string;
  file_type?: 'upo' | 'confirmation' | 'receipt' | 'other';
  uploaded_at?: string;
}

// Extended Business Profile fields for Spółka z o.o.
export interface SpZooProfileFields {
  regon?: string;
  legal_form?: string;
  correspondence_address?: string;
  correspondence_postal_code?: string;
  correspondence_city?: string;
  business_activity_address?: string;
  business_activity_postal_code?: string;
  business_activity_city?: string;
  vat_status?: 'none' | 'vat' | 'vat_ue';
  accounting_method?: 'ksiegi_rachunkowe' | 'uproszczona';
  cit_rate?: 9 | 19;
  nip_8_filed?: boolean;
  nip_8_filed_date?: string;
  vat_r_filed?: boolean;
  vat_r_filed_date?: string;
  crbr_filed?: boolean;
  crbr_filed_date?: string;
  fiscal_year_end_month?: number;
  registry_data_changed_at?: string;
}

// Helper type for compliance status
export interface ComplianceStatus {
  nip_8: { filed: boolean; date?: string };
  vat_r: { filed: boolean; date?: string };
  crbr: { filed: boolean; date?: string };
  registry_up_to_date: boolean;
}

// Helper functions
export const getResolutionTypeLabel = (type: ResolutionType): string => {
  const labels: Record<ResolutionType, string> = {
    approve_financial_statements: 'Zatwierdzenie sprawozdania finansowego',
    profit_allocation: 'Podział zysku',
    dividend_payout: 'Wypłata dywidendy',
    loss_coverage: 'Pokrycie straty',
    board_appointment: 'Powołanie zarządu',
    other: 'Inna',
  };
  return labels[type] || type;
};

export const getCapitalEventTypeLabel = (type: CapitalEventType): string => {
  const labels: Record<CapitalEventType, string> = {
    capital_contribution: 'Wniesienie kapitału',
    dividend_payout: 'Wypłata dywidendy',
    profit_allocation: 'Podział zysku',
    loss_coverage: 'Pokrycie straty',
    capital_increase: 'Podwyższenie kapitału',
    capital_decrease: 'Obniżenie kapitału',
  };
  return labels[type] || type;
};

export const getContractStatusLabel = (status: ContractStatus): string => {
  const labels: Record<ContractStatus, string> = {
    draft: 'Szkic',
    active: 'Aktywna',
    suspended: 'Zawieszona',
    terminated: 'Rozwiązana',
    completed: 'Zakończona',
  };
  return labels[status] || status;
};

export const getTaxObligationStatusLabel = (status: TaxObligationStatus): string => {
  const labels: Record<TaxObligationStatus, string> = {
    upcoming: 'Nadchodzący',
    due: 'Do złożenia',
    submitted: 'Złożony',
    paid: 'Opłacony',
    overdue: 'Zaległy',
  };
  return labels[status] || status;
};
