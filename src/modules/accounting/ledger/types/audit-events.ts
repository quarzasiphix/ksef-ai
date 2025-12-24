/**
 * Audit Events (Dziennik zdarzeń)
 * 
 * Answers: "What happened, who did it, and what changed?"
 * 
 * This is the "black box recorder" - immutable and linkable.
 */

/**
 * Event type taxonomy
 */
export type EventType =
  // Invoice events
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_payment_assigned'
  | 'invoice_payment_removed'
  | 'invoice_booked'
  | 'invoice_deleted'
  | 'invoice_corrected'
  
  // Payment events
  | 'payment_received'
  | 'payment_made'
  | 'payment_reconciled'
  | 'payment_reversed'
  
  // Contract events
  | 'contract_created'
  | 'contract_signed'
  | 'contract_terminated'
  
  // GL events
  | 'gl_entry_posted'
  | 'gl_entry_reversed'
  | 'period_closed'
  | 'period_reopened'
  
  // Other
  | 'manual_adjustment'
  | 'system_action';

/**
 * Entity type
 */
export type EntityType = 
  | 'invoice'
  | 'payment_transaction'
  | 'contract'
  | 'journal_entry'
  | 'accounting_period'
  | 'customer'
  | 'supplier';

/**
 * Audit event record
 */
export interface AuditEvent {
  id: string;
  business_profile_id: string;
  
  // Event classification
  event_type: EventType;
  
  // Actor
  actor_user_id: string;
  actor_name?: string; // Denormalized for display
  
  // When
  occurred_at: string; // ISO datetime
  
  // What entity
  entity_type: EntityType;
  entity_id: string;
  entity_display_name?: string; // e.g., invoice number, payment reference
  
  // What changed
  diff_json?: any; // Before/after or patch
  summary?: string; // Human-readable summary
  
  // Grouping (for multi-step actions)
  correlation_id?: string; // Groups related events
  
  // Context
  ip_address?: string;
  user_agent?: string;
  
  // Links (for traceability)
  related_invoice_id?: string;
  related_payment_id?: string;
  related_gl_entry_id?: string;
  
  // Metadata
  created_at: string;
}

/**
 * Event creation input
 */
export interface CreateAuditEventInput {
  business_profile_id: string;
  event_type: EventType;
  actor_user_id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_display_name?: string;
  diff_json?: any;
  summary?: string;
  correlation_id?: string;
  related_invoice_id?: string;
  related_payment_id?: string;
  related_gl_entry_id?: string;
}

/**
 * Event filters
 */
export interface AuditEventFilters {
  business_profile_id: string;
  date_from?: string;
  date_to?: string;
  event_types?: EventType[];
  entity_type?: EntityType;
  entity_id?: string;
  actor_user_id?: string;
  correlation_id?: string;
}

/**
 * Event with linked records (for traceability UI)
 */
export interface AuditEventWithLinks extends AuditEvent {
  linked_payment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
  };
  linked_gl_entry?: {
    id: string;
    description: string;
    total_debit: number;
    status: string;
  };
  linked_invoice?: {
    id: string;
    number: string;
    total_gross: number;
  };
}
