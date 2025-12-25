/**
 * Financial Ledger Types
 * 
 * A unified view of all financial events in chronological order.
 * Each event represents a real financial effect linked to its source document.
 */

export type LedgerEventType = 
  | 'invoice_issued'
  | 'invoice_paid'
  | 'expense_added'
  | 'expense_paid'
  | 'payment_received'
  | 'payment_sent'
  | 'contract_signed'
  | 'adjustment'
  | 'decision_approved'
  | 'booking_entry';

export type DocumentType = 
  | 'invoice'
  | 'expense'
  | 'contract'
  | 'payment'
  | 'bank_transaction'
  | 'decision'
  | 'adjustment';

export type MoneyDirection = 'incoming' | 'outgoing' | 'neutral';

export type CashChannel = 'bank' | 'cash' | 'mixed' | 'none';

export interface LedgerEvent {
  id: string;
  
  // Layer 1: Time
  timestamp: string; // ISO 8601
  date: string; // Display date
  
  // Layer 2: Event Type
  eventType: LedgerEventType;
  eventLabel: string; // Human-readable: "Faktura wystawiona", "Płatność otrzymana"
  
  // Layer 3: Document Identity
  documentType: DocumentType;
  documentId: string;
  documentNumber: string; // Invoice number, expense ref, etc.
  counterparty: string; // Who/what this relates to
  
  // Layer 4: Money Effect
  amount: number;
  currency: string;
  direction: MoneyDirection;
  
  // Layer 5: Cash Channel (Reality Layer)
  cashChannel: CashChannel; // How money actually moved
  
  // Layer 6: Contextual Links
  linkedDocuments: Array<{
    type: DocumentType;
    id: string;
    number: string;
    relationship: string; // "Settles invoice", "Part of contract", "Related expense"
  }>;
  
  // Additional context
  status?: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  businessProfileId?: string;
}

export interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  documentTypes?: DocumentType[];
  eventTypes?: LedgerEventType[];
  counterparty?: string;
  contractId?: string;
  status?: 'paid' | 'unpaid' | 'all';
  minAmount?: number;
  maxAmount?: number;
  businessProfileId?: string;
}

export interface LedgerSummary {
  totalIncoming: number;
  totalOutgoing: number;
  netPosition: number;
  currency: string;
  period: {
    start: string;
    end: string;
  };
  eventCount: number;
}

/**
 * Helper to determine money direction from event type
 */
export function getMoneyDirection(eventType: LedgerEventType): MoneyDirection {
  switch (eventType) {
    case 'invoice_issued':
    case 'payment_received':
      return 'incoming';
    case 'expense_added':
    case 'payment_sent':
      return 'outgoing';
    case 'contract_signed':
    case 'decision_approved':
    case 'booking_entry':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/**
 * Helper to get event label in Polish
 */
export function getEventLabel(eventType: LedgerEventType): string {
  const labels: Record<LedgerEventType, string> = {
    invoice_issued: 'Faktura wystawiona',
    invoice_paid: 'Faktura opłacona',
    expense_added: 'Koszt dodany',
    expense_paid: 'Koszt opłacony',
    payment_received: 'Płatność otrzymana',
    payment_sent: 'Płatność wysłana',
    contract_signed: 'Umowa podpisana',
    adjustment: 'Korekta',
    decision_approved: 'Decyzja zatwierdzona',
    booking_entry: 'Zapis księgowy',
  };
  return labels[eventType] || eventType;
}

/**
 * Helper to get document type label in Polish
 */
export function getDocumentTypeLabel(documentType: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    invoice: 'Faktura',
    expense: 'Wydatek',
    contract: 'Umowa',
    payment: 'Płatność',
    bank_transaction: 'Transakcja bankowa',
    decision: 'Decyzja',
    adjustment: 'Korekta',
  };
  return labels[documentType] || documentType;
}
