// Kasa (Cash Register) Types for Polish Spółka

export type CashTransactionType = 'KP' | 'KW';
export type CashAccountStatus = 'active' | 'closed';
export type TransferType = 'bank_to_cash' | 'cash_to_bank';
export type ReconciliationResult = 'match' | 'surplus' | 'shortage';

export interface CashAccount {
  id: string;
  business_profile_id: string;
  name: string;
  currency: string;
  opening_balance: number;
  current_balance: number;
  responsible_person: string | null;
  status: CashAccountStatus;
  created_at: string;
  updated_at: string;
}

export interface CashTransaction {
  id: string;
  business_profile_id: string;
  cash_account_id: string;
  document_number: string;
  type: CashTransactionType;
  amount: number;
  date: string;
  description: string;
  counterparty_name: string | null;
  counterparty_tax_id: string | null;
  category: CashCategory;
  linked_document_type: LinkedDocumentType | null;
  linked_document_id: string | null;
  attachment_url: string | null;
  is_tax_deductible: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  cash_account_name?: string;
  balance_after?: number;
}

export interface CashTransfer {
  id: string;
  business_profile_id: string;
  cash_account_id: string;
  bank_account_id: string | null;
  transfer_type: TransferType;
  amount: number;
  date: string;
  description: string | null;
  reference_number: string | null;
  created_by: string;
  created_at: string;
}

export interface CashReconciliation {
  id: string;
  business_profile_id: string;
  cash_account_id: string;
  reconciliation_date: string;
  system_balance: number;
  counted_balance: number;
  difference: number;
  result: ReconciliationResult;
  explanation: string | null;
  counted_by: string;
  created_at: string;
  // Joined fields
  cash_account_name?: string;
}

export interface CashSettings {
  id: string;
  business_profile_id: string;
  high_expense_warning_threshold: number;
  cash_share_warning_percentage: number;
  require_approval_above: number | null;
  created_at: string;
  updated_at: string;
}

export type CashCategory =
  | 'fuel'
  | 'parking'
  | 'tolls'
  | 'supplies'
  | 'postage'
  | 'transport'
  | 'meals'
  | 'office'
  | 'other_expense'
  | 'sales_income'
  | 'refund'
  | 'withdrawal'
  | 'deposit'
  | 'capital_contribution'
  | 'other_income';

export type LinkedDocumentType =
  | 'invoice'
  | 'receipt'
  | 'contract'
  | 'other';

export const CASH_CATEGORY_LABELS: Record<CashCategory, string> = {
  fuel: 'Paliwo',
  parking: 'Parking',
  tolls: 'Opłaty drogowe',
  supplies: 'Materiały',
  postage: 'Przesyłki',
  transport: 'Transport',
  meals: 'Wyżywienie',
  office: 'Biuro',
  other_expense: 'Inne wydatki',
  sales_income: 'Sprzedaż',
  refund: 'Zwrot',
  withdrawal: 'Pobranie z banku',
  deposit: 'Wpłata do banku',
  capital_contribution: 'Wpłata kapitału',
  other_income: 'Inne przychody',
};

export const LINKED_DOCUMENT_TYPE_LABELS: Record<LinkedDocumentType, string> = {
  invoice: 'Faktura',
  receipt: 'Paragon',
  contract: 'Umowa',
  other: 'Inny dokument',
};

export const KP_CATEGORIES: CashCategory[] = [
  'capital_contribution',
  'sales_income',
  'refund',
  'withdrawal',
  'other_income',
];

export const KW_CATEGORIES: CashCategory[] = [
  'fuel',
  'parking',
  'tolls',
  'supplies',
  'postage',
  'transport',
  'meals',
  'office',
  'deposit',
  'other_expense',
];

export interface CreateCashAccountInput {
  business_profile_id: string;
  name: string;
  currency?: string;
  opening_balance?: number;
  responsible_person?: string | null;
}

export interface CreateCashTransactionInput {
  business_profile_id: string;
  cash_account_id: string;
  type: CashTransactionType;
  amount: number;
  date: string;
  description: string;
  counterparty_name?: string | null;
  counterparty_tax_id?: string | null;
  category: CashCategory;
  linked_document_type?: LinkedDocumentType | null;
  linked_document_id?: string | null;
  attachment_url?: string | null;
  is_tax_deductible?: boolean;
}

export interface CreateCashTransferInput {
  business_profile_id: string;
  cash_account_id: string;
  bank_account_id?: string | null;
  transfer_type: TransferType;
  amount: number;
  date: string;
  description?: string | null;
  reference_number?: string | null;
}

export interface CreateCashReconciliationInput {
  business_profile_id: string;
  cash_account_id: string;
  counted_balance: number;
  explanation?: string | null;
}

export interface CashRegisterSummary {
  totalKP: number;
  totalKW: number;
  netChange: number;
  currentBalance: number;
  transactionCount: number;
  pendingApproval: number;
  lastReconciliation: CashReconciliation | null;
}
