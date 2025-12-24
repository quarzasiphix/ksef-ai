/**
 * Payment Transactions (Payments Subledger)
 * 
 * Answers: "What money moved, between which accounts, and what did it settle?"
 * 
 * This is operational finance - what founders and accountants reconcile.
 */

/**
 * Payment transaction direction
 */
export type PaymentDirection = 'in' | 'out' | 'transfer';

/**
 * Payment transaction status
 */
export type PaymentTransactionStatus = 
  | 'pending'      // Awaiting confirmation
  | 'confirmed'    // Confirmed but not reconciled
  | 'reconciled'   // Matched with bank statement
  | 'reversed';    // Reversed (correction)

/**
 * Payment transaction record
 * 
 * Every money movement lives here once.
 */
export interface PaymentTransaction {
  id: string;
  business_profile_id: string;
  
  // When
  occurred_at: string; // ISO datetime
  
  // Direction and accounts
  direction: PaymentDirection;
  account_from_id?: string; // cash_account_id or bank_account_id
  account_to_id?: string;   // cash_account_id or bank_account_id
  
  // Amount
  amount: number;
  currency: string;
  exchange_rate?: number;
  amount_base_currency?: number; // Calculated: amount * exchange_rate
  
  // Counterparty
  counterparty_type?: 'customer' | 'supplier' | 'employee' | 'other';
  counterparty_id?: string; // customer_id, supplier_id, etc.
  counterparty_name?: string;
  
  // Reference
  reference?: string; // Bank transfer title, cash receipt number, etc.
  description?: string;
  
  // Status
  status: PaymentTransactionStatus;
  
  // Links (traceability)
  invoice_id?: string;
  contract_id?: string;
  event_id: string; // Required link to audit event
  gl_entry_id?: string; // Link to GL posting (if posted)
  
  // Reconciliation
  reconciled_at?: string;
  reconciled_by?: string;
  bank_statement_line_id?: string;
  
  // Reversal
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;
  reverses_transaction_id?: string; // If this reverses another transaction
  reversed_by_transaction_id?: string; // If this was reversed by another
  
  // Metadata
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Payment transaction creation input
 */
export interface CreatePaymentTransactionInput {
  business_profile_id: string;
  occurred_at: string;
  direction: PaymentDirection;
  account_from_id?: string;
  account_to_id?: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  counterparty_type?: 'customer' | 'supplier' | 'employee' | 'other';
  counterparty_id?: string;
  counterparty_name?: string;
  reference?: string;
  description?: string;
  status?: PaymentTransactionStatus;
  invoice_id?: string;
  contract_id?: string;
  event_id: string;
}

/**
 * Payment transaction filters
 */
export interface PaymentTransactionFilters {
  business_profile_id: string;
  date_from?: string;
  date_to?: string;
  direction?: PaymentDirection[];
  status?: PaymentTransactionStatus[];
  account_ids?: string[];
  counterparty_ids?: string[];
  invoice_id?: string;
  contract_id?: string;
  reconciled?: boolean;
}

/**
 * Payment transaction summary
 */
export interface PaymentTransactionSummary {
  total_in: number;
  total_out: number;
  net_flow: number;
  pending_count: number;
  unreconciled_count: number;
  by_account: {
    account_id: string;
    account_name: string;
    balance: number;
    in: number;
    out: number;
  }[];
}

/**
 * Reconciliation match
 */
export interface ReconciliationMatch {
  payment_transaction_id: string;
  bank_statement_line_id: string;
  match_confidence: number; // 0-1
  match_reason: string;
}
