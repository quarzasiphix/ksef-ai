// Types for Spółka z o.o. accounting system

export interface ChartOfAccount {
  id: string;
  business_profile_id: string;
  account_number: string;
  account_name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  account_class: number; // 0-9 in Polish accounting
  parent_account_id?: string | null;
  is_active: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntry {
  id: string;
  business_profile_id: string;
  user_id: string;
  entry_date: string;
  document_number?: string;
  description: string;
  is_posted: boolean;
  lines?: JournalEntryLine[];
  created_at?: string;
  updated_at?: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account?: ChartOfAccount;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  created_at?: string;
}

export interface BalanceSheet {
  id: string;
  business_profile_id: string;
  period_start: string;
  period_end: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_finalized: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EquityTransaction {
  id: string;
  business_profile_id: string;
  transaction_date: string;
  transaction_type: 'capital_contribution' | 'capital_withdrawal' | 'retained_earnings' | 'dividend' | 'other';
  amount: number;
  shareholder_name?: string;
  description?: string;
  journal_entry_id?: string | null;
  payment_method?: 'bank' | 'cash' | null;
  cash_account_id?: string | null;
  bank_account_id?: string | null;
  signed_document_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FixedAsset {
  id: string;
  business_profile_id: string;
  asset_name: string;
  asset_category: string;
  purchase_date: string;
  purchase_value: number;
  useful_life_years: number;
  depreciation_method: 'straight_line' | 'declining_balance';
  accumulated_depreciation: number;
  net_book_value: number;
  disposal_date?: string | null;
  disposal_value?: number | null;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DepreciationEntry {
  id: string;
  fixed_asset_id: string;
  period_date: string;
  depreciation_amount: number;
  journal_entry_id?: string | null;
  created_at?: string;
}

export interface Shareholder {
  id: string;
  business_profile_id: string;
  name: string;
  tax_id?: string;
  address?: string;
  email?: string;
  phone?: string;
  share_percentage: number;
  initial_capital_contribution: number;
  is_active: boolean;
  joined_date?: string | null;
  left_date?: string | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Balance Sheet Structure
export interface BalanceSheetData {
  assets: {
    current: {
      cash: number;
      accounts_receivable: number;
      inventory: number;
      other: number;
      total: number;
    };
    fixed: {
      property: number;
      equipment: number;
      accumulated_depreciation: number;
      net: number;
      total: number;
    };
    total: number;
  };
  liabilities: {
    current: {
      accounts_payable: number;
      short_term_debt: number;
      other: number;
      total: number;
    };
    long_term: {
      long_term_debt: number;
      other: number;
      total: number;
    };
    total: number;
  };
  equity: {
    share_capital: number;
    retained_earnings: number;
    current_year_profit: number;
    total: number;
  };
}

// Year-end closing and fiscal periods
export interface AccountingPeriod {
  id: string;
  business_profile_id: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  status: 'open' | 'closing' | 'closed';
  closed_at?: string | null;
  closed_by?: string | null;
  retained_earnings_brought_forward: number;
  unpaid_cit_brought_forward: number;
  net_profit_loss?: number | null;
  total_revenue?: number | null;
  total_expenses?: number | null;
  cit_liability?: number | null;
  cit_rate?: number | null;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

// Shareholder loans (pożyczka wspólnika)
export interface ShareholderLoan {
  id: string;
  business_profile_id: string;
  shareholder_id: string;
  shareholder?: Shareholder;
  loan_type: 'to_company' | 'from_company';
  amount: number;
  currency: string;
  loan_date: string;
  repayment_date?: string | null;
  interest_rate?: number | null;
  purpose?: string | null;
  status: 'active' | 'repaid' | 'written_off';
  repaid_at?: string | null;
  disbursement_movement_id?: string | null;
  repayment_movement_id?: string | null;
  created_at?: string;
  created_by: string;
  updated_at?: string | null;
  updated_by?: string | null;
  version: number;
  locked: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
  notes?: string | null;
}

// Shareholder expense reimbursements (zwroty kosztów)
export interface ShareholderReimbursement {
  id: string;
  business_profile_id: string;
  shareholder_id: string;
  shareholder?: Shareholder;
  expense_date: string;
  amount: number;
  currency: string;
  description: string;
  category?: string | null;
  receipt_document_id?: string | null;
  status: 'pending' | 'approved' | 'reimbursed' | 'rejected';
  approved_at?: string | null;
  approved_by?: string | null;
  reimbursed_at?: string | null;
  reimbursement_movement_id?: string | null;
  created_at?: string;
  created_by: string;
  updated_at?: string | null;
  updated_by?: string | null;
  version: number;
  notes?: string | null;
}

// Compliance deadlines
export type ComplianceDeadlineType = 
  | 'nip8'
  | 'vatr'
  | 'crbr'
  | 'cit8'
  | 'financial_statements'
  | 'zgz'
  | 'nzgz'
  | 'krs_update'
  | 'custom';

export interface ComplianceDeadline {
  id: string;
  business_profile_id: string;
  deadline_type: ComplianceDeadlineType;
  fiscal_year: number;
  due_date: string;
  reminder_date?: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'not_applicable';
  completed_at?: string | null;
  completed_by?: string | null;
  document_id?: string | null;
  filing_number?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

// Audit log for evidence integrity
export interface AuditLogEntry {
  id: string;
  business_profile_id: string;
  table_name: string;
  record_id: string;
  action: 'create' | 'update' | 'delete';
  user_id: string;
  timestamp: string;
  old_values?: Record<string, any> | null;
  new_values: Record<string, any>;
  ip_address?: string | null;
  user_agent?: string | null;
  description?: string | null;
}
