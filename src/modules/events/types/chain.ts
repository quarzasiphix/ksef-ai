/**
 * Event Chains System Types
 * 
 * Implements "Łańcuch zdarzeń" (Event Chains) as the primary unit of verification.
 * A chain represents one business object lifecycle (invoice, payment, reconciliation, etc.)
 */

export type ChainType = 
  | 'invoice' 
  | 'cash_payment' 
  | 'bank_transaction' 
  | 'reconciliation' 
  | 'contract' 
  | 'decision';

export type ChainState = 
  | 'draft' 
  | 'issued' 
  | 'paid' 
  | 'posted' 
  | 'closed' 
  | 'cancelled';

export type ObjectRole = 
  | 'primary' 
  | 'settlement' 
  | 'evidence' 
  | 'related' 
  | 'correction';

export type LinkType = 
  | 'settles' 
  | 'corrects' 
  | 'references' 
  | 'depends_on' 
  | 'supports';

export interface Chain {
  id: string;
  business_profile_id: string;
  
  // Chain identification
  chain_type: ChainType;
  chain_number: string;
  
  // Primary object reference
  primary_object_type: string;
  primary_object_id: string;
  primary_object_version_id?: string;
  
  // Chain state machine
  state: ChainState;
  state_updated_at: string;
  
  // Verification & workflow
  requires_verification: boolean;
  verified_at?: string;
  verified_by?: string;
  
  // Required actions (derived from business rules)
  required_actions: string[];
  blockers: string[];
  
  // Financial summary
  total_amount?: number;
  currency: string;
  paid_amount?: number;
  remaining_amount?: number;
  
  // Metadata
  title: string;
  description?: string;
  metadata: Record<string, any>;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export interface ChainObject {
  id: string;
  chain_id: string;
  
  // Object reference
  object_type: string;
  object_id: string;
  object_version_id?: string;
  
  // Relationship metadata
  role: ObjectRole;
  link_type?: LinkType;
  
  // Timestamps
  created_at: string;
  created_by?: string;
}

export interface ChainLink {
  id: string;
  from_chain_id: string;
  to_chain_id: string;
  
  // Link semantics
  link_type: LinkType;
  
  // Optional amount for settlement links
  amount?: number;
  currency?: string;
  
  // Metadata
  metadata: Record<string, any>;
  created_at: string;
}

export interface InvoiceVersion {
  id: string;
  invoice_id: string;
  version_no: number;
  
  // Snapshot of invoice state
  snapshot_json: Record<string, any>;
  
  // Change tracking
  changed_fields: string[];
  change_reason?: string;
  change_summary?: string;
  
  // Metadata
  created_at: string;
  created_by?: string;
}

export interface ChainSummary extends Chain {
  // Computed fields
  event_count: number;
  last_activity_at?: string;
  related_object_count: number;
  needs_attention: boolean;
}

export interface ChainDetail {
  chain: Chain;
  events: any[]; // Event type from existing system
  objects: ChainObject[];
  links: ChainLink[];
}

export interface ChainEvent {
  id: string;
  chain_id: string;
  event_type: string;
  action_summary: string;
  occurred_at: string;
  actor_name: string;
  
  // Object reference
  object_type: string;
  object_id: string;
  object_version_id?: string;
  
  // Causation (parent/child relationship)
  causation_event_id?: string;
  
  // Event data
  amount?: number;
  currency?: string;
  direction?: string;
  metadata: Record<string, any>;
  changes?: Record<string, any>;
}

export interface CreateChainInput {
  business_profile_id: string;
  chain_type: ChainType;
  primary_object_type: string;
  primary_object_id: string;
  title: string;
  initial_state?: ChainState;
  metadata?: Record<string, any>;
}

export interface UpdateChainStateInput {
  chain_id: string;
  new_state: ChainState;
  metadata?: Record<string, any>;
}

export interface AddObjectToChainInput {
  chain_id: string;
  object_type: string;
  object_id: string;
  role: ObjectRole;
  link_type?: LinkType;
}

export interface LinkChainsInput {
  from_chain_id: string;
  to_chain_id: string;
  link_type: LinkType;
  amount?: number;
  currency?: string;
}

export interface CreateInvoiceVersionInput {
  invoice_id: string;
  snapshot_json: Record<string, any>;
  changed_fields: string[];
  change_reason?: string;
  change_summary?: string;
}

// State machine definitions for different chain types
export const CHAIN_STATE_MACHINES: Record<ChainType, ChainState[]> = {
  invoice: ['draft', 'issued', 'paid', 'posted', 'closed'],
  cash_payment: ['draft', 'posted', 'closed'],
  bank_transaction: ['draft', 'posted', 'closed'],
  reconciliation: ['draft', 'posted', 'closed'],
  contract: ['draft', 'issued', 'closed', 'cancelled'],
  decision: ['draft', 'issued', 'closed', 'cancelled'],
};

// Action codes for required_actions
export const REQUIRED_ACTIONS = {
  APPROVE_PAYMENT: 'approve_payment',
  ATTACH_PROOF: 'attach_proof',
  SET_ACCOUNTS: 'set_accounts',
  ADD_KSEF_REF: 'add_ksef_ref',
  VERIFY_AMOUNT: 'verify_amount',
  MATCH_TRANSACTION: 'match_transaction',
} as const;

// Blocker codes
export const BLOCKERS = {
  MISSING_KSEF_REF: 'missing_ksef_ref',
  MISSING_DEBIT_ACCOUNT: 'missing_debit_account',
  MISSING_CREDIT_ACCOUNT: 'missing_credit_account',
  MISSING_PROOF: 'missing_proof',
  INSUFFICIENT_BALANCE: 'insufficient_balance',
  UNMATCHED_TRANSACTION: 'unmatched_transaction',
} as const;
