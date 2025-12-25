/**
 * Ledger Data Hooks
 * 
 * React hooks for accessing ledger data with filtering and caching.
 * These hooks enable all financial pages to be filtered views of the ledger.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { LedgerEvent, LedgerFilters } from '../types/ledger';
import { generateMockLedgerEvents } from '../data/mockLedgerData';
import {
  applyFilters,
  sortByTimestamp,
  calculateSummary,
  getInvoiceEvents,
  getExpenseEvents,
  getCashEvents,
  getContractEvents,
} from '../utils/ledgerQueries';

/**
 * Main hook for accessing ledger data
 * TODO: Replace mock data with actual backend query
 */
export function useLedgerData(filters?: LedgerFilters) {
  const { data: allEvents, isLoading, error } = useQuery({
    queryKey: ['ledger', 'all'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      // return await fetchLedgerEvents();
      return generateMockLedgerEvents();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Apply filters and sort
  const filteredEvents = useMemo(() => {
    if (!allEvents) return [];
    const filtered = filters ? applyFilters(allEvents, filters) : allEvents;
    return sortByTimestamp(filtered);
  }, [allEvents, filters]);

  // Calculate summary
  const summary = useMemo(() => 
    calculateSummary(filteredEvents),
    [filteredEvents]
  );

  return {
    events: filteredEvents,
    allEvents: allEvents || [],
    isLoading,
    error,
    summary,
  };
}

/**
 * Hook for invoice-related events (Faktury page)
 * Filters ledger to show only invoice events
 */
export function useInvoiceLedger(filters?: LedgerFilters) {
  const { allEvents, isLoading, error } = useLedgerData();

  const invoiceEvents = useMemo(() => {
    const filtered = getInvoiceEvents(allEvents);
    return filters ? applyFilters(filtered, filters) : filtered;
  }, [allEvents, filters]);

  const summary = useMemo(() => 
    calculateSummary(invoiceEvents),
    [invoiceEvents]
  );

  return {
    events: sortByTimestamp(invoiceEvents),
    isLoading,
    error,
    summary,
  };
}

/**
 * Hook for expense-related events (Wydatki page)
 * Filters ledger to show only expense events
 */
export function useExpenseLedger(filters?: LedgerFilters) {
  const { allEvents, isLoading, error } = useLedgerData();

  const expenseEvents = useMemo(() => {
    const filtered = getExpenseEvents(allEvents);
    return filters ? applyFilters(filtered, filters) : filtered;
  }, [allEvents, filters]);

  const summary = useMemo(() => 
    calculateSummary(expenseEvents),
    [expenseEvents]
  );

  return {
    events: sortByTimestamp(expenseEvents),
    isLoading,
    error,
    summary,
  };
}

/**
 * Hook for cash-related events (Bank/Kasa pages)
 * Filters ledger to show only cash movement events
 */
export function useCashLedger(filters?: LedgerFilters) {
  const { allEvents, isLoading, error } = useLedgerData();

  const cashEvents = useMemo(() => {
    const filtered = getCashEvents(allEvents);
    return filters ? applyFilters(filtered, filters) : filtered;
  }, [allEvents, filters]);

  const summary = useMemo(() => 
    calculateSummary(cashEvents),
    [cashEvents]
  );

  return {
    events: sortByTimestamp(cashEvents),
    isLoading,
    error,
    summary,
  };
}

/**
 * Hook for contract-related events (Kontrakty page)
 * Filters ledger to show contract and linked events
 */
export function useContractLedger(contractId?: string, filters?: LedgerFilters) {
  const { allEvents, isLoading, error } = useLedgerData();

  const contractEvents = useMemo(() => {
    const filtered = getContractEvents(allEvents, contractId);
    return filters ? applyFilters(filtered, filters) : filtered;
  }, [allEvents, contractId, filters]);

  const summary = useMemo(() => 
    calculateSummary(contractEvents),
    [contractEvents]
  );

  return {
    events: sortByTimestamp(contractEvents),
    isLoading,
    error,
    summary,
  };
}

/**
 * Hook for events related to a specific document
 * Used in mini ledgers on detail pages
 */
export function useDocumentLedger(
  documentId: string,
  documentType: 'invoice' | 'expense' | 'contract'
) {
  const { allEvents, isLoading, error } = useLedgerData();

  const documentEvents = useMemo(() => {
    return allEvents.filter(event => 
      event.documentId === documentId ||
      event.linkedDocuments.some(link => 
        link.id === documentId && link.type === documentType
      )
    );
  }, [allEvents, documentId, documentType]);

  return {
    events: sortByTimestamp(documentEvents),
    isLoading,
    error,
  };
}
