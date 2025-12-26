// Capital Events - Triple Accounting Link Types

export type CapitalEventType = 
  | 'capital_contribution'
  | 'capital_withdrawal'
  | 'dividend'
  | 'capital_increase'
  | 'supplementary_payment'
  | 'retained_earnings'
  | 'other';

export type CapitalEventStatus = 'draft' | 'pending' | 'completed' | 'cancelled';

export interface CapitalEventLink {
  // Decision/Authority link
  decision_id?: string;
  decision_reference?: string;
  decision_type?: 'shareholder_resolution' | 'company_agreement' | 'share_subscription' | 'board_decision';
  decision_date?: string;
  decision_attachment_url?: string;
  
  // Payment/Money movement link
  payment_id?: string;
  payment_type?: 'bank_transaction' | 'cash_document';
  payment_reference?: string;
  payment_date?: string;
  bank_account_id?: string;
  cash_account_id?: string;
  
  // Ledger/Accounting posting link
  ledger_entry_id?: string;
  ledger_posting_date?: string;
  ledger_accounts?: {
    debit_account: string;
    credit_account: string;
  };
}

export interface CapitalEvent {
  id: string;
  business_profile_id: string;
  event_type: CapitalEventType;
  event_date: string;
  amount: number;
  currency: string;
  
  // Shareholder info
  shareholder_id?: string;
  shareholder_name: string;
  
  // Triple accounting links
  links: CapitalEventLink;
  
  // Status tracking
  status: CapitalEventStatus;
  has_decision: boolean;
  has_payment: boolean;
  has_ledger_entry: boolean;
  
  // Decision authority (imported from decisions module)
  decision_reference?: {
    decision_id: string;
    decision_title: string;
    decision_number?: string;
    decision_status: string;
    is_valid: boolean;
    validation_message?: string;
  };
  
  // Metadata
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface ShareholderObligation {
  shareholder_id: string;
  shareholder_name: string;
  share_percentage: number;
  
  // Financial tracking
  declared_contribution: number;
  paid_amount: number;
  outstanding_amount: number;
  
  // Timeline
  last_payment_date?: string;
  last_payment_amount?: number;
  
  // Related events
  capital_events: CapitalEvent[];
}

export interface CapitalEventWizardData {
  // Step 1: Type
  event_type: CapitalEventType;
  
  // Step 2: Shareholder(s) + amounts
  shareholders: Array<{
    shareholder_id?: string;
    shareholder_name: string;
    amount: number;
  }>;
  event_date: string;
  
  // Step 3: Legal basis
  decision_option: 'existing' | 'new' | 'none';
  decision_id?: string;
  new_decision?: {
    type: 'shareholder_resolution' | 'company_agreement' | 'share_subscription' | 'board_decision';
    reference: string;
    date: string;
    attachment?: File;
  };
  
  // Step 4: Money source
  payment_option: 'link_existing' | 'to_be_paid';
  payment_type?: 'bank_transaction' | 'cash_document';
  payment_id?: string;
  bank_account_id?: string;
  cash_account_id?: string;
  
  // Step 5: Posting settings
  posting_option: 'generate_now' | 'awaiting_accounting';
  posting_date?: string;
  posting_period?: string;
  debit_account?: string;
  credit_account?: string;
}
