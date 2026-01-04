// Event-First Architecture Types

export type EventType =
  // Invoice lifecycle (canonical)
  | 'invoice_created'
  | 'invoice_issued'
  | 'invoice_approved'
  | 'invoice_posted'
  | 'invoice_reversed'
  | 'invoice_updated'
  | 'invoice_deleted'
  
  // Payment lifecycle (canonical)
  | 'payment_recorded'
  | 'payment_reversed'
  | 'payment_reconciled'
  
  // Decision lifecycle (canonical)
  | 'decision_created'
  | 'decision_used'
  | 'decision_expired'
  | 'decision_revoked'
  
  // Expense lifecycle (canonical)
  | 'expense_created'
  | 'expense_edited'
  | 'expense_paid'
  | 'expense_cancelled'
  | 'expense_deleted'
  | 'expense_approved'
  | 'expense_posted'
  | 'expense_reversed'
  
  // Contract lifecycle
  | 'contract_created'
  | 'contract_signed'
  | 'contract_terminated'
  
  // GL events
  | 'gl_entry_posted'
  | 'gl_entry_reversed'
  | 'period_closed'
  | 'period_reopened'
  
  // Legacy events (deprecated, for backward compatibility)
  | 'decision_approved'
  | 'decision_rejected'
  | 'invoice_exported'
  | 'expense_rejected'
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
  | 'payment_received'
  
  // System events
  | 'manual_adjustment'
  | 'system_action'
  | 'bank_account_created';

export interface UnifiedEvent {
  id: string;
  business_profile_id: string;
  
  // Event classification
  event_type: EventType;
  event_number?: string;
  
  // Actor (who did it)
  actor_id: string;
  actor_name: string;
  actor_role?: string;
  
  // Time anchoring (economic vs audit time)
  occurred_at: string; // When the economic event happened (user-specified)
  recorded_at: string; // When system recorded it (immutable)
  
  // Entity (what was affected)
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  
  // Document linkage
  document_type?: string;
  document_id?: string;
  document_number?: string;
  
  // Financial payload (for ledger integration)
  amount?: number;
  currency?: string;
  direction?: 'incoming' | 'outgoing' | 'neutral';
  
  // Decision linkage (for authorization trail)
  decision_id?: string;
  decision_reference?: string;
  
  // Event content
  action_summary: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  
  // Event chaining (for multi-step operations)
  parent_event_id?: string;
  correlation_id?: string;
  
  // Accounting control
  status: 'pending' | 'posted' | 'reversed';
  posted: boolean;
  needs_action: boolean;
  blocked_by?: string;
  blocked_reason?: string;
  
  // Classification & categorization
  source?: string;
  classification?: string;
  category?: string;
  vat_rate?: number;
  counterparty?: string;
  linked_documents?: any;
  
  // Reversal tracking
  is_reversed: boolean;
  reversed_by_event_id?: string;
  reversal_reason?: string;
  
  // Cash channel (for treasury integration)
  cash_channel?: 'bank' | 'cash' | 'card' | 'other';
  
  // Materiality flag
  is_material: boolean;
  
  // Audit metadata
  created_at: string;
  updated_at: string;
}

// Legacy interface for backward compatibility
export interface CompanyEvent {
  id: string;
  business_profile_id: string;
  event_type: EventType;
  event_number?: string;
  actor_id: string;
  actor_name: string;
  actor_role?: string;
  occurred_at: string;
  decision_id?: string;
  decision_reference?: string;
  authority_level?: string;
  entity_type: string;
  entity_id: string;
  entity_reference?: string;
  action_summary: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  parent_event_id?: string;
  is_material: boolean;
  created_at: string;
}

export interface CreateEventInput {
  business_profile_id: string;
  event_type: EventType;
  actor_id: string;
  actor_name: string;
  entity_type: string;
  entity_id: string;
  action_summary: string;
  occurred_at?: string; // Defaults to NOW if not provided
  entity_reference?: string;
  amount?: number;
  currency?: string;
  direction?: 'incoming' | 'outgoing' | 'neutral';
  decision_id?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  parent_event_id?: string;
  correlation_id?: string;
  status?: 'pending' | 'posted' | 'reversed';
  posted?: boolean;
  needs_action?: boolean;
  cash_channel?: 'bank' | 'cash' | 'card' | 'other';
}

export interface EnforcementCheck {
  is_allowed: boolean;
  blocked_by?: string;
  error_message?: string;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  // Canonical invoice lifecycle
  invoice_created: 'Utworzono fakturę',
  invoice_issued: 'Wystawiono fakturę',
  invoice_approved: 'Zatwierdzono fakturę',
  invoice_posted: 'Zaksięgowano fakturę',
  invoice_reversed: 'Cofnięto fakturę',
  invoice_updated: 'Zaktualizowano fakturę',
  invoice_deleted: 'Usunięto fakturę',
  
  // Canonical payment lifecycle
  payment_recorded: 'Zarejestrowano płatność',
  payment_reversed: 'Cofnięto płatność',
  payment_reconciled: 'Uzgodniono płatność',
  
  // Canonical decision lifecycle
  decision_created: 'Utworzono decyzję',
  decision_used: 'Użyto decyzji',
  decision_expired: 'Wygasła decyzja',
  decision_revoked: 'Cofnięto decyzję',
  
  // Canonical expense lifecycle
  expense_created: 'Utworzono wydatek',
  expense_edited: 'Zmodyfikowano wydatek',
  expense_paid: 'Opłacono wydatek',
  expense_cancelled: 'Anulowano wydatek',
  expense_deleted: 'Usunięto wydatek',
  expense_approved: 'Zatwierdzono wydatek',
  expense_posted: 'Zaksięgowano wydatek',
  expense_reversed: 'Cofnięto wydatek',
  
  // Contract lifecycle
  contract_created: 'Utworzono umowę',
  contract_signed: 'Podpisano umowę',
  contract_terminated: 'Rozwiązano umowę',
  
  // GL events
  gl_entry_posted: 'Zaksięgowano zapis',
  gl_entry_reversed: 'Cofnięto zapis',
  period_closed: 'Zamknięto okres',
  period_reopened: 'Otwarto okres',
  
  // Legacy (deprecated)
  decision_approved: 'Zatwierdzono decyzję',
  decision_rejected: 'Odrzucono decyzję',
  invoice_exported: 'Wyeksportowano fakturę',
  expense_rejected: 'Odrzucono wydatek',
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
  
  // System events
  manual_adjustment: 'Korekta ręczna',
  system_action: 'Akcja systemowa',
  bank_account_created: 'Utworzono konto bankowe',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  // Canonical invoice lifecycle
  invoice_created: '🧾',
  invoice_issued: '📤',
  invoice_approved: '✅',
  invoice_posted: '📊',
  invoice_reversed: '↩️',
  invoice_updated: '✏️',
  invoice_deleted: '🗑️',
  
  // Canonical payment lifecycle
  payment_recorded: '💵',
  payment_reversed: '↩️',
  payment_reconciled: '✓',
  
  // Canonical decision lifecycle
  decision_created: '📋',
  decision_used: '🔑',
  decision_expired: '⏰',
  decision_revoked: '🚫',
  
  // Canonical expense lifecycle
  expense_created: '💸',
  expense_edited: '✏️',
  expense_paid: '💳',
  expense_cancelled: '🚫',
  expense_deleted: '🗑️',
  expense_approved: '✅',
  expense_posted: '📊',
  expense_reversed: '↩️',
  
  // Contract lifecycle
  contract_created: '📝',
  contract_signed: '✍️',
  contract_terminated: '🚫',
  
  // GL events
  gl_entry_posted: '📒',
  gl_entry_reversed: '↩️',
  period_closed: '🔒',
  period_reopened: '🔓',
  
  // Legacy (deprecated)
  decision_approved: '✅',
  decision_rejected: '❌',
  invoice_exported: '📊',
  expense_rejected: '✗',
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
  
  // System events
  manual_adjustment: '🔧',
  system_action: '🤖',
  bank_account_created: '🏦',
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  // Canonical invoice lifecycle
  invoice_created: 'purple',
  invoice_issued: 'indigo',
  invoice_approved: 'green',
  invoice_posted: 'blue',
  invoice_reversed: 'orange',
  invoice_updated: 'gray',
  invoice_deleted: 'red',
  
  // Canonical payment lifecycle
  payment_recorded: 'green',
  payment_reversed: 'orange',
  payment_reconciled: 'blue',
  
  // Canonical decision lifecycle
  decision_created: 'blue',
  decision_used: 'green',
  decision_expired: 'yellow',
  decision_revoked: 'red',
  
  // Canonical expense lifecycle
  expense_created: 'orange',
  expense_edited: 'gray',
  expense_paid: 'green',
  expense_cancelled: 'red',
  expense_deleted: 'red',
  expense_approved: 'green',
  expense_posted: 'blue',
  expense_reversed: 'orange',
  
  // Contract lifecycle
  contract_created: 'teal',
  contract_signed: 'green',
  contract_terminated: 'red',
  
  // GL events
  gl_entry_posted: 'blue',
  gl_entry_reversed: 'orange',
  period_closed: 'red',
  period_reopened: 'green',
  
  // Legacy (deprecated)
  decision_approved: 'green',
  decision_rejected: 'red',
  invoice_exported: 'cyan',
  expense_rejected: 'red',
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
  
  // System events
  manual_adjustment: 'yellow',
  system_action: 'gray',
  bank_account_created: 'blue',
};
