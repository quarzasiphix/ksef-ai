/**
 * Unified Event System
 * 
 * Single source of truth for all financial and operational events.
 * Everything else (ledger, inbox, invoices, expenses) is a filtered view.
 */

export type EventType =
  // Financial Events
  | 'invoice_issued'
  | 'invoice_received'
  | 'invoice_paid'
  | 'expense_captured'
  | 'expense_classified'
  | 'expense_approved'
  | 'expense_posted'
  | 'payment_received'
  | 'payment_sent'
  | 'bank_transaction_imported'
  | 'bank_transaction_matched'
  
  // Authority Events
  | 'decision_created'
  | 'decision_approved'
  | 'decision_rejected'
  
  // Contract Events
  | 'contract_created'
  | 'contract_signed'
  | 'contract_terminated'
  
  // Capital Events
  | 'capital_contribution'
  | 'capital_withdrawal'
  | 'dividend_declared'
  
  // Operational Events
  | 'employee_hired'
  | 'employee_terminated'
  | 'asset_acquired'
  | 'asset_disposed'
  | 'document_uploaded';

export type EventStatus = 
  | 'captured'      // Initial state, just entered system
  | 'classified'    // Categorized, but not approved
  | 'approved'      // Approved, ready to post
  | 'posted'        // Posted to ledger
  | 'settled';      // Fully settled (payment matched)

export type EventSource = 
  | 'inbox'         // Uploaded to inbox
  | 'manual'        // Manually created
  | 'bank'          // Bank import
  | 'contract'      // Generated from contract
  | 'ocr'           // OCR extraction
  | 'api';          // External API

export type DocumentType = 
  | 'invoice'
  | 'expense'
  | 'contract'
  | 'payment'
  | 'bank_transaction'
  | 'decision'
  | 'adjustment'
  | 'capital_event';

export type MoneyDirection = 'incoming' | 'outgoing' | 'neutral';

export type CashChannel = 'bank' | 'cash' | 'mixed' | 'none';

/**
 * Unified Event Model
 * 
 * Core principle: One event table, multiple views
 */
export interface UnifiedEvent {
  // Identity
  id: string;
  business_profile_id: string;
  event_type: EventType;
  event_number?: string;
  
  // DUAL TEMPORAL TRACKING (CRITICAL)
  occurred_at: string;    // Economic date (invoice date, expense date) - for LEDGER
  recorded_at: string;    // System/audit date (upload, OCR, creation) - for AUDIT
  
  // Financial Properties
  amount?: number;
  currency?: string;
  direction?: MoneyDirection;
  cash_channel?: CashChannel;
  
  // LEDGER CONTROL (determines which view shows this event)
  posted: boolean;        // If true, appears in LEDGER
  needs_action: boolean;  // If true, appears in INBOX
  
  // Status Progression
  status: EventStatus;
  
  // Authority & Compliance
  decision_id?: string;           // Required decision for this event
  decision_reference?: string;
  blocked_by?: string;            // Why event cannot progress
  blocked_reason?: string;        // Human-readable explanation
  
  // Source & Classification
  source: EventSource;
  classification?: string;
  category?: string;
  vat_rate?: number;
  
  // Actor & Entity
  actor_id: string;
  actor_name: string;
  actor_role?: string;
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  
  // Document Identity
  document_type: DocumentType;
  document_id: string;
  document_number: string;
  counterparty?: string;
  
  // Contextual Links
  linked_documents?: Array<{
    type: DocumentType;
    id: string;
    number: string;
    relationship: string;
  }>;
  
  // Audit Trail
  action_summary: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  parent_event_id?: string;
  is_material: boolean;
  
  // System
  created_at: string;
  updated_at: string;
}

/**
 * Enforcement Check Result
 */
export interface EnforcementCheck {
  is_allowed: boolean;
  blocked_by?: string;
  error_message?: string;
  required_decision?: string;
}

/**
 * Decision Model (Authority Gates)
 */
export interface Decision {
  id: string;
  business_profile_id: string;
  decision_type: DecisionType;
  decision_number: string;
  
  // Authority
  authority_level: 'shareholders' | 'board' | 'manager';
  approved_by: string[];
  approved_at: string;
  
  // Scope (what this decision allows)
  allows_actions: EventType[];
  expense_limit?: number;
  contract_types?: string[];
  time_period?: { start: string; end: string };
  
  // Enforcement
  is_active: boolean;
  blocks_without: string;
  
  // Document
  title: string;
  description: string;
  document_url?: string;
  
  // Audit
  created_at: string;
  updated_at: string;
}

export type DecisionType =
  | 'budget_approval'
  | 'contract_authority'
  | 'hiring_authority'
  | 'capital_event'
  | 'operational_policy';

/**
 * View Filters
 */

// Ledger View: posted events sorted by occurred_at
export interface LedgerViewFilter {
  posted: true;
  start_date?: string;
  end_date?: string;
  event_types?: EventType[];
  document_types?: DocumentType[];
  counterparty?: string;
}

// Inbox View: unposted events needing action, sorted by recorded_at
export interface InboxViewFilter {
  posted: false;
  needs_action: true;
  source?: EventSource;
  blocked_by?: string;
}

// Audit View: all events sorted by recorded_at
export interface AuditViewFilter {
  start_date?: string;
  end_date?: string;
  actor_id?: string;
  event_types?: EventType[];
}

// Invoice View: ledger filtered to invoice events
export interface InvoiceViewFilter extends Omit<LedgerViewFilter, 'event_types'> {
  event_types?: EventType[];
}

// Expense View: ledger filtered to expense events
export interface ExpenseViewFilter extends Omit<LedgerViewFilter, 'event_types'> {
  event_types?: EventType[];
}

/**
 * Helper Functions
 */

export function getEventLabel(eventType: EventType): string {
  const labels: Record<EventType, string> = {
    invoice_issued: 'Faktura wystawiona',
    invoice_received: 'Faktura otrzymana',
    invoice_paid: 'Faktura opłacona',
    expense_captured: 'Wydatek przechwycony',
    expense_classified: 'Wydatek sklasyfikowany',
    expense_approved: 'Wydatek zatwierdzony',
    expense_posted: 'Wydatek zaksięgowany',
    payment_received: 'Płatność otrzymana',
    payment_sent: 'Płatność wysłana',
    bank_transaction_imported: 'Transakcja zaimportowana',
    bank_transaction_matched: 'Transakcja dopasowana',
    decision_created: 'Decyzja utworzona',
    decision_approved: 'Decyzja zatwierdzona',
    decision_rejected: 'Decyzja odrzucona',
    contract_created: 'Umowa utworzona',
    contract_signed: 'Umowa podpisana',
    contract_terminated: 'Umowa rozwiązana',
    capital_contribution: 'Wkład kapitałowy',
    capital_withdrawal: 'Wypłata kapitału',
    dividend_declared: 'Dywidenda ogłoszona',
    employee_hired: 'Pracownik zatrudniony',
    employee_terminated: 'Pracownik zwolniony',
    asset_acquired: 'Środek trwały nabyty',
    asset_disposed: 'Środek trwały zbyty',
    document_uploaded: 'Dokument przesłany',
  };
  return labels[eventType] || eventType;
}

export function getStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    captured: 'Przechwycony',
    classified: 'Sklasyfikowany',
    approved: 'Zatwierdzony',
    posted: 'Zaksięgowany',
    settled: 'Rozliczony',
  };
  return labels[status] || status;
}

export function getMoneyDirection(eventType: EventType): MoneyDirection {
  const incoming: EventType[] = ['invoice_issued', 'payment_received', 'capital_contribution'];
  const outgoing: EventType[] = ['expense_posted', 'payment_sent', 'capital_withdrawal', 'dividend_declared'];
  
  if (incoming.includes(eventType)) return 'incoming';
  if (outgoing.includes(eventType)) return 'outgoing';
  return 'neutral';
}

export function canProgressToStatus(event: UnifiedEvent, targetStatus: EventStatus): EnforcementCheck {
  // Status progression rules
  const progressionMap: Record<EventStatus, EventStatus[]> = {
    captured: ['classified'],
    classified: ['approved'],
    approved: ['posted'],
    posted: ['settled'],
    settled: [],
  };
  
  const allowedNext = progressionMap[event.status];
  if (!allowedNext.includes(targetStatus)) {
    return {
      is_allowed: false,
      error_message: `Nie można przejść ze statusu ${event.status} do ${targetStatus}`,
    };
  }
  
  // Check if event is blocked
  if (event.blocked_by) {
    return {
      is_allowed: false,
      blocked_by: event.blocked_by,
      error_message: event.blocked_reason || 'Zdarzenie zablokowane',
    };
  }
  
  return { is_allowed: true };
}
