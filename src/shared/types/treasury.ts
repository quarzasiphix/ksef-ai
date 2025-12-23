// Treasury Engine Types for Polish Spółka z o.o.
// Core principle: Documents ≠ money movement. Payments create movements. Balances are derived.

// =============================================================================
// ENUMS
// =============================================================================

export type PaymentDirection = 'IN' | 'OUT';

export type MovementSourceType = 
  | 'DOCUMENT_PAYMENT'  // Payment for invoice/expense
  | 'TRANSFER'          // Bank↔Cash or Bank↔Bank transfer
  | 'ADJUSTMENT'        // Manual correction with reason
  | 'REVERSAL'          // Auto-generated opposite movement
  | 'OPENING_BALANCE';  // Initial balance when account created

export type DocumentType = 
  | 'sales_invoice'     // Faktura sprzedaży
  | 'purchase_invoice'  // Faktura zakupu / koszt
  | 'KP'                // Kasa Przyjmie (cash in)
  | 'KW';               // Kasa Wyda (cash out)

export type PaymentAccountType = 'BANK' | 'CASH';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';

// =============================================================================
// PAYMENT ACCOUNTS (Unified Bank + Cash)
// =============================================================================

export interface PaymentAccount {
  id: string;
  business_profile_id: string;
  account_type: PaymentAccountType;
  name: string;
  currency: string;
  opening_balance: number;
  // Bank-specific fields
  bank_name?: string | null;
  account_number?: string | null;
  // Cash-specific fields
  responsible_person?: string | null;
  // Status
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed (never stored)
  computed_balance?: number;
}

// =============================================================================
// DOCUMENT PAYMENTS
// =============================================================================

export interface DocumentPayment {
  id: string;
  business_profile_id: string;
  document_type: DocumentType;
  document_id: string;
  payment_account_id: string;
  direction: PaymentDirection;
  amount: number;
  currency: string;
  payment_date: string;
  notes?: string | null;
  // Audit
  created_by: string;
  created_at: string;
  // Linked movement
  movement_id?: string;
  // Joined fields
  payment_account_name?: string;
  document_number?: string;
}

// =============================================================================
// ACCOUNT MOVEMENTS (Source of Truth for Balances)
// =============================================================================

export interface AccountMovement {
  id: string;
  business_profile_id: string;
  payment_account_id: string;
  direction: PaymentDirection;
  amount: number;
  currency: string;
  source_type: MovementSourceType;
  source_id: string | null;
  description: string;
  // For reversals
  reversed_movement_id?: string | null;
  reversal_reason?: string | null;
  is_reversed: boolean;
  // Audit
  created_by: string;
  created_at: string;
  // Joined fields
  payment_account_name?: string;
}

// =============================================================================
// TRANSFERS (Bank↔Cash, Bank↔Bank)
// =============================================================================

export interface AccountTransfer {
  id: string;
  business_profile_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  currency: string;
  transfer_date: string;
  description?: string | null;
  reference_number?: string | null;
  // Linked movements
  out_movement_id: string;
  in_movement_id: string;
  // Audit
  created_by: string;
  created_at: string;
  // Joined
  from_account_name?: string;
  to_account_name?: string;
}

// =============================================================================
// INPUT TYPES
// =============================================================================

export interface CreatePaymentAccountInput {
  business_profile_id: string;
  account_type: PaymentAccountType;
  name: string;
  currency?: string;
  opening_balance?: number;
  bank_name?: string | null;
  account_number?: string | null;
  responsible_person?: string | null;
}

export interface CreateDocumentPaymentInput {
  business_profile_id: string;
  document_type: DocumentType;
  document_id: string;
  payment_account_id: string;
  amount: number;
  currency?: string;
  payment_date: string;
  notes?: string | null;
}

export interface CreateTransferInput {
  business_profile_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  currency?: string;
  transfer_date: string;
  description?: string | null;
  reference_number?: string | null;
}

export interface CreateAdjustmentInput {
  business_profile_id: string;
  payment_account_id: string;
  direction: PaymentDirection;
  amount: number;
  currency?: string;
  reason: string;
}

export interface CreateReversalInput {
  business_profile_id: string;
  movement_id: string;
  reason: string;
}

// =============================================================================
// BALANCE & SUMMARY TYPES
// =============================================================================

export interface AccountBalance {
  payment_account_id: string;
  account_name: string;
  account_type: PaymentAccountType;
  currency: string;
  opening_balance: number;
  total_in: number;
  total_out: number;
  current_balance: number;
  movement_count: number;
  last_movement_date: string | null;
}

export interface DocumentPaymentStatus {
  document_type: DocumentType;
  document_id: string;
  document_total: number;
  currency: string;
  total_paid: number;
  remaining: number;
  status: PaymentStatus;
  payments: DocumentPayment[];
}

export interface TreasurySummary {
  business_profile_id: string;
  total_bank_balance: number;
  total_cash_balance: number;
  total_balance: number;
  currency: string;
  accounts: AccountBalance[];
  // For future: receivables, NKUP tracking
  pending_receivables?: number;
  nkup_expenses?: number;
}

// =============================================================================
// FUTURE COMPATIBILITY TYPES (Design now, implement later)
// =============================================================================

export type ExpenseClassification = 'KUP' | 'NKUP' | 'MIXED';

export interface DocumentFinancialMeta {
  document_id: string;
  document_type: DocumentType;
  classification: ExpenseClassification;
  kup_amount: number;
  nkup_amount: number;
  // Personal expense tracking
  is_personal_receivable: boolean;
  receivable_person_id?: string | null;
  receivable_settled: boolean;
}

// For balance sheet lite
export interface BalanceSheetLite {
  as_of_date: string;
  assets: {
    bank_accounts: number;
    cash_accounts: number;
    receivables_trade: number;
    receivables_personal: number;
    total: number;
  };
  liabilities: {
    payables_trade: number;
    tax_liabilities: number;
    total: number;
  };
  equity: number;
}
