/**
 * Mock Ledger Data Generator
 * 
 * Generates sample financial events for development and testing.
 * In production, this will be replaced with actual database queries.
 */

import type { LedgerEvent } from '../types/ledger';
import { getMoneyDirection, getEventLabel } from '../types/ledger';

export function generateMockLedgerEvents(): LedgerEvent[] {
  const events: LedgerEvent[] = [
    // Invoice issued
    {
      id: '1',
      timestamp: '2024-12-20T10:30:00Z',
      date: '2024-12-20',
      eventType: 'invoice_issued',
      eventLabel: getEventLabel('invoice_issued'),
      documentType: 'invoice',
      documentId: 'inv-001',
      documentNumber: 'FV/2024/12/001',
      counterparty: 'ABC Sp. z o.o.',
      amount: 12000,
      currency: 'PLN',
      direction: getMoneyDirection('invoice_issued'),
      cashChannel: 'none',
      linkedDocuments: [
        {
          type: 'contract',
          id: 'contract-001',
          number: 'UMW/2024/05',
          relationship: 'Część umowy',
        },
      ],
      status: 'pending',
    },
    
    // Expense added
    {
      id: '2',
      timestamp: '2024-12-19T14:15:00Z',
      date: '2024-12-19',
      eventType: 'expense_added',
      eventLabel: getEventLabel('expense_added'),
      documentType: 'expense',
      documentId: 'exp-001',
      documentNumber: 'FK/2024/12/045',
      counterparty: 'Google Ads',
      amount: -2400,
      currency: 'PLN',
      direction: getMoneyDirection('expense_added'),
      cashChannel: 'bank',
      linkedDocuments: [
        {
          type: 'invoice',
          id: 'inv-001',
          number: 'FV/2024/12/001',
          relationship: 'Koszt związany z',
        },
      ],
      status: 'completed',
    },
    
    // Payment received
    {
      id: '3',
      timestamp: '2024-12-18T09:45:00Z',
      date: '2024-12-18',
      eventType: 'payment_received',
      eventLabel: getEventLabel('payment_received'),
      documentType: 'payment',
      documentId: 'pay-001',
      documentNumber: 'PAY-001',
      counterparty: 'XYZ Corporation',
      amount: 8500,
      currency: 'PLN',
      direction: getMoneyDirection('payment_received'),
      cashChannel: 'bank',
      linkedDocuments: [
        {
          type: 'invoice',
          id: 'inv-002',
          number: 'FV/2024/11/089',
          relationship: 'Rozlicza fakturę',
        },
      ],
      status: 'completed',
    },
    
    // Contract signed
    {
      id: '4',
      timestamp: '2024-12-15T11:00:00Z',
      date: '2024-12-15',
      eventType: 'contract_signed',
      eventLabel: getEventLabel('contract_signed'),
      documentType: 'contract',
      documentId: 'contract-002',
      documentNumber: 'UMW/2024/12',
      counterparty: 'Tech Solutions Ltd',
      amount: 0,
      currency: 'PLN',
      direction: 'neutral',
      cashChannel: 'none',
      linkedDocuments: [],
      status: 'completed',
    },
    
    // Expense paid
    {
      id: '5',
      timestamp: '2024-12-14T16:20:00Z',
      date: '2024-12-14',
      eventType: 'expense_paid',
      eventLabel: getEventLabel('expense_paid'),
      documentType: 'expense',
      documentId: 'exp-002',
      documentNumber: 'FK/2024/12/032',
      counterparty: 'Office Supplies Co.',
      amount: -450,
      currency: 'PLN',
      direction: getMoneyDirection('expense_paid'),
      cashChannel: 'cash',
      linkedDocuments: [],
      status: 'completed',
    },
    
    // Invoice issued
    {
      id: '6',
      timestamp: '2024-12-12T13:30:00Z',
      date: '2024-12-12',
      eventType: 'invoice_issued',
      eventLabel: getEventLabel('invoice_issued'),
      documentType: 'invoice',
      documentId: 'inv-003',
      documentNumber: 'FV/2024/12/002',
      counterparty: 'Retail Store Inc',
      amount: 5600,
      currency: 'PLN',
      direction: getMoneyDirection('invoice_issued'),
      cashChannel: 'none',
      linkedDocuments: [],
      status: 'completed',
    },
    
    // Payment sent
    {
      id: '7',
      timestamp: '2024-12-10T10:00:00Z',
      date: '2024-12-10',
      eventType: 'payment_sent',
      eventLabel: getEventLabel('payment_sent'),
      documentType: 'payment',
      documentId: 'pay-002',
      documentNumber: 'PAY-002',
      counterparty: 'Cloud Hosting Provider',
      amount: -890,
      currency: 'PLN',
      direction: getMoneyDirection('payment_sent'),
      cashChannel: 'bank',
      linkedDocuments: [
        {
          type: 'expense',
          id: 'exp-003',
          number: 'FK/2024/12/018',
          relationship: 'Opłaca wydatek',
        },
      ],
      status: 'completed',
    },
    
    // Adjustment
    {
      id: '8',
      timestamp: '2024-12-08T15:45:00Z',
      date: '2024-12-08',
      eventType: 'adjustment',
      eventLabel: getEventLabel('adjustment'),
      documentType: 'adjustment',
      documentId: 'adj-001',
      documentNumber: 'KOR/2024/001',
      counterparty: 'Korekta księgowa',
      amount: -150,
      currency: 'PLN',
      direction: 'neutral',
      cashChannel: 'none',
      linkedDocuments: [
        {
          type: 'invoice',
          id: 'inv-004',
          number: 'FV/2024/11/078',
          relationship: 'Korekta do',
        },
      ],
      status: 'completed',
      notes: 'Korekta błędnej kwoty VAT',
    },
  ];

  return events;
}

/**
 * Get ledger events for a specific invoice
 */
export function getMockLedgerEventsForInvoice(invoiceId: string): LedgerEvent[] {
  const allEvents = generateMockLedgerEvents();
  
  // Filter events that are directly this invoice or linked to it
  return allEvents.filter(event => 
    event.documentId === invoiceId ||
    event.linkedDocuments.some(link => link.id === invoiceId)
  );
}

/**
 * Get ledger events for a specific expense
 */
export function getMockLedgerEventsForExpense(expenseId: string): LedgerEvent[] {
  const allEvents = generateMockLedgerEvents();
  
  return allEvents.filter(event => 
    event.documentId === expenseId ||
    event.linkedDocuments.some(link => link.id === expenseId)
  );
}

/**
 * Get ledger events for a specific contract
 */
export function getMockLedgerEventsForContract(contractId: string): LedgerEvent[] {
  const allEvents = generateMockLedgerEvents();
  
  return allEvents.filter(event => 
    event.documentId === contractId ||
    event.linkedDocuments.some(link => link.id === contractId)
  );
}
