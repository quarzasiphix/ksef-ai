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
