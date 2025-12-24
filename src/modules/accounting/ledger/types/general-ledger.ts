/**
 * General Ledger (Księga główna - Wn/Ma)
 * 
 * Answers: "What is the accounting impact (Wn/Ma), when, and in which period?"
 * 
 * This is accounting truth. All posting is here, immutable—corrections are reversals.
 */

/**
 * Journal entry status
 */
export type JournalEntryStatus = 
  | 'draft'      // Not yet posted
  | 'posted'     // Posted to ledger
  | 'reversed';  // Reversed (correction)

/**
 * Source type for journal entries
 */
export type JournalEntrySourceType = 
  | 'invoice'
  | 'payment'
  | 'manual'
  | 'adjustment'
  | 'opening_balance'
  | 'closing';

/**
 * Account type in Chart of Accounts
 */
export type AccountType = 
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense'
  | 'off_balance';

/**
 * Chart of Accounts entry
 */
export interface ChartOfAccount {
  id: string;
  business_profile_id: string;
  
  // Account identification
  account_code: string; // e.g., "100", "701", "221"
  account_name: string;
  account_type: AccountType;
  
  // Hierarchy
  parent_account_code?: string;
  level: number; // 1 = top level, 2 = sub-account, etc.
  
  // Behavior
  is_active: boolean;
  is_system: boolean; // Cannot be deleted
  requires_counterparty: boolean; // e.g., AR/AP accounts
  
  // Polish standards
  pkd_category?: string; // PKD classification if applicable
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Journal entry header
 */
export interface JournalEntry {
  id: string;
  business_profile_id: string;
  
  // Period and date
  period: string; // YYYY-MM
  entry_date: string; // YYYY-MM-DD
  
  // Source
  source_type: JournalEntrySourceType;
  source_id?: string; // invoice_id, payment_transaction_id, etc.
  
  // Description
  description: string;
  reference?: string; // External reference number
  
  // Status
  status: JournalEntryStatus;
  
  // Links (traceability)
  event_id: string; // Required link to audit event
  
  // Reversal
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;
  reverses_entry_id?: string; // If this reverses another entry
  reversed_by_entry_id?: string; // If this was reversed by another
  
  // Metadata
  created_by: string;
  created_at: string;
  posted_at?: string;
  posted_by?: string;
}

/**
 * Journal entry line (Wn/Ma)
 */
export interface JournalEntryLine {
  id: string;
  entry_id: string;
  
  // Account
  account_code: string;
  account_name?: string; // Denormalized for display
  
  // Amounts (Wn/Ma)
  debit: number;  // Wn (Winien)
  credit: number; // Ma (Ma)
  
  // Description
  description?: string;
  
  // Dimensions (optional analytics)
  cost_center?: string;
  project_id?: string;
  contract_id?: string;
  
  // Counterparty (for AR/AP accounts)
  counterparty_type?: 'customer' | 'supplier' | 'employee';
  counterparty_id?: string;
  
  // Line number for ordering
  line_number: number;
  
  // Metadata
  created_at: string;
}

/**
 * Journal entry creation input
 */
export interface CreateJournalEntryInput {
  business_profile_id: string;
  period: string;
  entry_date: string;
  source_type: JournalEntrySourceType;
  source_id?: string;
  description: string;
  reference?: string;
  event_id: string;
  lines: CreateJournalEntryLineInput[];
}

export interface CreateJournalEntryLineInput {
  account_code: string;
  debit: number;
  credit: number;
  description?: string;
  cost_center?: string;
  project_id?: string;
  contract_id?: string;
  counterparty_type?: 'customer' | 'supplier' | 'employee';
  counterparty_id?: string;
}

/**
 * Journal entry validation result
 */
export interface JournalEntryValidation {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
}

/**
 * Accounting period
 */
export interface AccountingPeriod {
  id: string;
  business_profile_id: string;
  
  // Period
  period: string; // YYYY-MM
  year: number;
  month: number;
  
  // Status
  status: 'open' | 'closed' | 'locked';
  
  // Closing
  closed_at?: string;
  closed_by?: string;
  
  // Locking (prevents reopening without special permission)
  locked_at?: string;
  locked_by?: string;
  lock_reason?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Trial balance entry
 */
export interface TrialBalanceEntry {
  account_code: string;
  account_name: string;
  account_type: AccountType;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

/**
 * Posting rule for automatic GL entry generation
 */
export interface PostingRule {
  id: string;
  business_profile_id: string;
  
  // Rule identification
  rule_name: string;
  rule_type: 'invoice_revenue' | 'invoice_expense' | 'payment_received' | 'payment_made' | 'custom';
  
  // Conditions
  conditions: {
    invoice_type?: string;
    payment_method?: string;
    vat_rate?: number;
    customer_id?: string;
    [key: string]: any;
  };
  
  // Posting template
  debit_account: string;
  credit_account: string;
  vat_account?: string;
  
  // Behavior
  is_active: boolean;
  priority: number; // Higher priority rules evaluated first
  
  // Metadata
  created_at: string;
  updated_at: string;
}
