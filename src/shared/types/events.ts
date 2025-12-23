// Event-First Architecture Types

export type EventType =
  | 'decision_created'
  | 'decision_approved'
  | 'decision_rejected'
  | 'invoice_created'
  | 'invoice_issued'
  | 'invoice_exported'
  | 'expense_created'
  | 'expense_approved'
  | 'expense_rejected'
  | 'contract_created'
  | 'contract_signed'
  | 'contract_terminated'
  | 'employee_hired'
  | 'employee_terminated'
  | 'bank_account_added'
  | 'bank_account_removed'
  | 'document_uploaded'
  | 'document_shared'
  | 'asset_acquired'
  | 'asset_disposed'
  | 'resolution_created'
  | 'capital_event'
  | 'payment_made'
  | 'payment_received';

export interface CompanyEvent {
  id: string;
  business_profile_id: string;
  
  // Event identification
  event_type: EventType;
  event_number?: string;
  
  // Who (owner/actor)
  actor_id: string;
  actor_name: string;
  actor_role?: string;
  
  // When
  occurred_at: string;
  
  // Why (authority/decision)
  decision_id?: string;
  decision_reference?: string;
  authority_level?: string;
  
  // What (object/entity)
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  
  // Consequence (what changed)
  action_summary: string;
  changes?: Record<string, any>;
  
  // Context
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  
  // Event chain
  parent_event_id?: string;
  is_material: boolean;
  
  // Audit
  created_at: string;
}

export interface CreateEventInput {
  business_profile_id: string;
  event_type: EventType;
  actor_id: string;
  actor_name: string;
  decision_id?: string;
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  action_summary: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  parent_event_id?: string;
}

export interface EnforcementCheck {
  is_allowed: boolean;
  blocked_by?: string;
  error_message?: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  decision_created: 'Utworzono decyzję',
  decision_approved: 'Zatwierdzono decyzję',
  decision_rejected: 'Odrzucono decyzję',
  invoice_created: 'Utworzono fakturę',
  invoice_issued: 'Wystawiono fakturę',
  invoice_exported: 'Wyeksportowano fakturę',
  expense_created: 'Utworzono wydatek',
  expense_approved: 'Zatwierdzono wydatek',
  expense_rejected: 'Odrzucono wydatek',
  contract_created: 'Utworzono umowę',
  contract_signed: 'Podpisano umowę',
  contract_terminated: 'Rozwiązano umowę',
  employee_hired: 'Zatrudniono pracownika',
  employee_terminated: 'Zwolniono pracownika',
  bank_account_added: 'Dodano konto bankowe',
  bank_account_removed: 'Usunięto konto bankowe',
  document_uploaded: 'Przesłano dokument',
  document_shared: 'Udostępniono dokument',
  asset_acquired: 'Nabywanie środka trwałego',
  asset_disposed: 'Zbycie środka trwałego',
  resolution_created: 'Utworzono uchwałę',
  capital_event: 'Zdarzenie kapitałowe',
  payment_made: 'Dokonano płatności',
  payment_received: 'Otrzymano płatność',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  decision_created: '📋',
  decision_approved: '✅',
  decision_rejected: '❌',
  invoice_created: '🧾',
  invoice_issued: '📤',
  invoice_exported: '📊',
  expense_created: '💸',
  expense_approved: '✓',
  expense_rejected: '✗',
  contract_created: '📝',
  contract_signed: '✍️',
  contract_terminated: '🚫',
  employee_hired: '👤',
  employee_terminated: '👋',
  bank_account_added: '🏦',
  bank_account_removed: '🏦',
  document_uploaded: '📄',
  document_shared: '🔗',
  asset_acquired: '🏢',
  asset_disposed: '📦',
  resolution_created: '⚖️',
  capital_event: '💰',
  payment_made: '💳',
  payment_received: '💵',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  decision_created: 'blue',
  decision_approved: 'green',
  decision_rejected: 'red',
  invoice_created: 'purple',
  invoice_issued: 'indigo',
  invoice_exported: 'cyan',
  expense_created: 'orange',
  expense_approved: 'green',
  expense_rejected: 'red',
  contract_created: 'teal',
  contract_signed: 'green',
  contract_terminated: 'red',
  employee_hired: 'green',
  employee_terminated: 'red',
  bank_account_added: 'blue',
  bank_account_removed: 'red',
  document_uploaded: 'gray',
  document_shared: 'blue',
  asset_acquired: 'green',
  asset_disposed: 'orange',
  resolution_created: 'purple',
  capital_event: 'yellow',
  payment_made: 'red',
  payment_received: 'green',
};
