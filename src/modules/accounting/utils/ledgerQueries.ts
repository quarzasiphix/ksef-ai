/**
 * Ledger Query Utilities
 * 
 * Helper functions for filtering and querying ledger events.
 * These utilities enable Faktury/Wydatki/Bank pages to be filtered views of the ledger.
 */

import type { LedgerEvent, LedgerFilters, DocumentType, LedgerEventType } from '../types/ledger';

/**
 * Filter ledger events by document type
 * Used to create filtered views (Faktury, Wydatki, etc.)
 */
export function filterByDocumentType(
  events: LedgerEvent[],
  documentType: DocumentType | DocumentType[]
): LedgerEvent[] {
  const types = Array.isArray(documentType) ? documentType : [documentType];
  return events.filter(event => types.includes(event.documentType));
}

/**
 * Filter ledger events by event type
 */
export function filterByEventType(
  events: LedgerEvent[],
  eventType: LedgerEventType | LedgerEventType[]
): LedgerEvent[] {
  const types = Array.isArray(eventType) ? eventType : [eventType];
  return events.filter(event => types.includes(event.eventType));
}

/**
 * Get invoice-related events (for Faktury page)
 * Includes: invoice_issued, invoice_paid, payment_received
 */
export function getInvoiceEvents(events: LedgerEvent[]): LedgerEvent[] {
  return events.filter(event => 
    event.documentType === 'invoice' ||
    event.eventType === 'invoice_issued' ||
    event.eventType === 'invoice_paid' ||
    (event.eventType === 'payment_received' && event.linkedDocuments.some(d => d.type === 'invoice'))
  );
}

/**
 * Get expense-related events (for Wydatki page)
 * Includes: expense_added, expense_paid, payment_sent
 */
export function getExpenseEvents(events: LedgerEvent[]): LedgerEvent[] {
  return events.filter(event => 
    event.documentType === 'expense' ||
    event.eventType === 'expense_added' ||
    event.eventType === 'expense_paid' ||
    (event.eventType === 'payment_sent' && event.linkedDocuments.some(d => d.type === 'expense'))
  );
}

/**
 * Get cash-related events (for Bank/Kasa pages)
 * Includes: payment_received, payment_sent, bank_transaction
 */
export function getCashEvents(events: LedgerEvent[]): LedgerEvent[] {
  return events.filter(event => 
    event.cashChannel === 'bank' ||
    event.cashChannel === 'cash' ||
    event.cashChannel === 'mixed' ||
    event.eventType === 'payment_received' ||
    event.eventType === 'payment_sent'
  );
}

/**
 * Get contract-related events (for Kontrakty page)
 * Includes: contract_signed and all linked events
 */
export function getContractEvents(events: LedgerEvent[], contractId?: string): LedgerEvent[] {
  if (contractId) {
    // Get events for specific contract
    return events.filter(event => 
      event.documentId === contractId ||
      event.linkedDocuments.some(d => d.id === contractId)
    );
  }
  
  // Get all contract events
  return events.filter(event => 
    event.documentType === 'contract' ||
    event.linkedDocuments.some(d => d.type === 'contract')
  );
}

/**
 * Apply comprehensive filters to ledger events
 */
export function applyFilters(
  events: LedgerEvent[],
  filters: LedgerFilters
): LedgerEvent[] {
  let filtered = [...events];

  // Date range
  if (filters.startDate) {
    filtered = filtered.filter(event => 
      new Date(event.timestamp) >= new Date(filters.startDate!)
    );
  }
  if (filters.endDate) {
    filtered = filtered.filter(event => 
      new Date(event.timestamp) <= new Date(filters.endDate!)
    );
  }

  // Document types
  if (filters.documentTypes && filters.documentTypes.length > 0) {
    filtered = filterByDocumentType(filtered, filters.documentTypes);
  }

  // Event types
  if (filters.eventTypes && filters.eventTypes.length > 0) {
    filtered = filterByEventType(filtered, filters.eventTypes);
  }

  // Counterparty
  if (filters.counterparty) {
    const query = filters.counterparty.toLowerCase();
    filtered = filtered.filter(event => 
      event.counterparty.toLowerCase().includes(query)
    );
  }

  // Contract
  if (filters.contractId) {
    filtered = getContractEvents(filtered, filters.contractId);
  }

  // Status
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(event => {
      if (filters.status === 'paid') {
        return event.status === 'completed';
      }
      if (filters.status === 'unpaid') {
        return event.status === 'pending';
      }
      return true;
    });
  }

  // Amount range
  if (filters.minAmount !== undefined) {
    filtered = filtered.filter(event => 
      Math.abs(event.amount) >= filters.minAmount!
    );
  }
  if (filters.maxAmount !== undefined) {
    filtered = filtered.filter(event => 
      Math.abs(event.amount) <= filters.maxAmount!
    );
  }

  // Business profile
  if (filters.businessProfileId) {
    filtered = filtered.filter(event => 
      event.businessProfileId === filters.businessProfileId
    );
  }

  return filtered;
}

/**
 * Sort events chronologically (most recent first)
 */
export function sortByTimestamp(
  events: LedgerEvent[],
  ascending: boolean = false
): LedgerEvent[] {
  return [...events].sort((a, b) => {
    const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    return ascending ? -diff : diff;
  });
}

/**
 * Group events by date
 */
export function groupByDate(
  events: LedgerEvent[]
): Record<string, LedgerEvent[]> {
  return events.reduce((acc, event) => {
    const dateKey = event.date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, LedgerEvent[]>);
}

/**
 * Calculate summary statistics for events
 */
export function calculateSummary(events: LedgerEvent[]) {
  const incoming = events
    .filter(e => e.direction === 'incoming')
    .reduce((sum, e) => sum + e.amount, 0);
  
  const outgoing = events
    .filter(e => e.direction === 'outgoing')
    .reduce((sum, e) => sum + Math.abs(e.amount), 0);

  return {
    totalIncoming: incoming,
    totalOutgoing: outgoing,
    netPosition: incoming - outgoing,
    eventCount: events.length,
    currency: events[0]?.currency || 'PLN',
  };
}

/**
 * Search events by query string
 * Searches: document number, counterparty, event label
 */
export function searchEvents(
  events: LedgerEvent[],
  query: string
): LedgerEvent[] {
  if (!query) return events;
  
  const lowerQuery = query.toLowerCase();
  return events.filter(event => 
    event.documentNumber.toLowerCase().includes(lowerQuery) ||
    event.counterparty.toLowerCase().includes(lowerQuery) ||
    event.eventLabel.toLowerCase().includes(lowerQuery) ||
    event.notes?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get events related to a specific document
 */
export function getRelatedEvents(
  events: LedgerEvent[],
  documentId: string,
  documentType: DocumentType
): LedgerEvent[] {
  return events.filter(event => 
    // Direct match
    event.documentId === documentId ||
    // Linked document match
    event.linkedDocuments.some(link => 
      link.id === documentId && link.type === documentType
    )
  );
}
