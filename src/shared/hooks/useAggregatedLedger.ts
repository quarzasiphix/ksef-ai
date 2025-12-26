/**
 * Hook to fetch aggregated ledger data from edge function
 * 
 * This aggregates data from all financial tables:
 * - invoices
 * - expenses
 * - contracts
 * - bank_transactions
 * - account_movements
 * 
 * And transforms them into unified ledger events
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AggregatedLedgerEvent {
  id: string;
  event_type: string;
  occurred_at: string;
  recorded_at: string;
  amount: number;
  currency: string;
  direction: 'incoming' | 'outgoing' | 'neutral';
  document_type: string;
  document_id: string;
  document_number: string;
  counterparty: string | null;
  status: string;
  posted: boolean;
  source_table: string;
  metadata: Record<string, any>;
}

interface CurrencyTotals {
  incoming: number;
  outgoing: number;
  net: number;
}

interface LedgerSummary {
  total_incoming: number;
  total_outgoing: number;
  event_count: number;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  currency_totals?: Record<string, CurrencyTotals>;
}

interface AggregatedLedgerResponse {
  events: AggregatedLedgerEvent[];
  summary: LedgerSummary;
  metadata: {
    business_profile_id: string;
    generated_at: string;
    filters_applied: {
      start_date?: string;
      end_date?: string;
      event_types?: string[];
      document_types?: string[];
    };
  };
}

interface LedgerFilters {
  startDate?: string;
  endDate?: string;
  eventTypes?: string[];
  documentTypes?: string[];
}

/**
 * Fetch aggregated ledger data from all financial tables
 */
export function useAggregatedLedger(
  businessProfileId: string,
  filters?: LedgerFilters
) {
  return useQuery({
    queryKey: ['aggregated-ledger', businessProfileId, filters],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('aggregate-ledger-events', {
        body: {
          business_profile_id: businessProfileId,
          start_date: filters?.startDate,
          end_date: filters?.endDate,
          event_types: filters?.eventTypes,
          document_types: filters?.documentTypes,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data as AggregatedLedgerResponse;
    },
    enabled: !!businessProfileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get only invoice events from aggregated ledger
 */
export function useAggregatedInvoices(businessProfileId: string) {
  return useAggregatedLedger(businessProfileId, {
    eventTypes: ['invoice_issued', 'payment_received'],
    documentTypes: ['invoice', 'payment'],
  });
}

/**
 * Get only expense events from aggregated ledger
 */
export function useAggregatedExpenses(businessProfileId: string) {
  return useAggregatedLedger(businessProfileId, {
    eventTypes: ['expense_posted'],
    documentTypes: ['expense'],
  });
}

/**
 * Get only contract events from aggregated ledger
 */
export function useAggregatedContracts(businessProfileId: string) {
  return useAggregatedLedger(businessProfileId, {
    eventTypes: ['contract_signed'],
    documentTypes: ['contract'],
  });
}

/**
 * Get only bank/payment events from aggregated ledger
 */
export function useAggregatedPayments(businessProfileId: string) {
  return useAggregatedLedger(businessProfileId, {
    eventTypes: ['payment_received', 'payment_sent'],
    documentTypes: ['payment', 'bank_transaction'],
  });
}

/**
 * Get ledger events for a specific date range
 */
export function useAggregatedLedgerByDateRange(
  businessProfileId: string,
  startDate: string,
  endDate: string
) {
  return useAggregatedLedger(businessProfileId, {
    startDate,
    endDate,
  });
}

/**
 * Get ledger summary without full event list (lighter query)
 */
export function useAggregatedLedgerSummary(
  businessProfileId: string,
  filters?: LedgerFilters
) {
  const { data, ...rest } = useAggregatedLedger(businessProfileId, filters);
  
  return {
    data: data?.summary,
    metadata: data?.metadata,
    ...rest,
  };
}
