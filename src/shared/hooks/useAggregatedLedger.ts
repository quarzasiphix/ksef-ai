/**
 * Hook to fetch ledger data from unified events system
 * 
 * Reads from public.events (via ledger_live view) - the single source of truth
 * 
 * Phase 1.5: Migrated from edge function to direct database queries
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
 * Fetch ledger data from unified events system (ledger_live view)
 * Phase 1.5: Now reads from public.events - the single source of truth
 */
export function useAggregatedLedger(
  businessProfileId: string,
  filters?: LedgerFilters
) {
  return useQuery({
    queryKey: ['unified-ledger', businessProfileId, filters],
    queryFn: async () => {
      // Query ledger_live view which reads from public.events
      let query = supabase
        .from('ledger_live')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .order('occurred_at', { ascending: false });

      // Apply filters
      if (filters?.startDate) {
        query = query.gte('occurred_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('occurred_at', filters.endDate);
      }
      if (filters?.eventTypes && filters.eventTypes.length > 0) {
        query = query.in('event_type', filters.eventTypes);
      }
      if (filters?.documentTypes && filters.documentTypes.length > 0) {
        query = query.in('entity_type', filters.documentTypes);
      }

      const { data: events, error } = await query;

      if (error) throw error;

      // Transform to expected format
      const transformedEvents: AggregatedLedgerEvent[] = (events || []).map(event => ({
        id: event.id,
        event_type: event.event_type,
        occurred_at: event.occurred_at,
        recorded_at: event.recorded_at,
        amount: parseFloat(event.amount || '0'),
        currency: event.currency || 'PLN',
        direction: event.direction || 'neutral',
        document_type: event.entity_type,
        document_id: event.entity_id,
        document_number: event.entity_reference || event.document_number || '',
        counterparty: event.counterparty || null,
        status: event.status,
        posted: event.posted,
        source_table: 'events',
        metadata: {
          actor_name: event.actor_name,
          action_summary: event.action_summary,
          decision_id: event.decision_id,
          decision_number: event.decision_number,
          ...event.metadata,
        },
      }));

      // Calculate summary
      const summary: LedgerSummary = {
        total_incoming: transformedEvents
          .filter(e => e.direction === 'incoming')
          .reduce((sum, e) => sum + e.amount, 0),
        total_outgoing: transformedEvents
          .filter(e => e.direction === 'outgoing')
          .reduce((sum, e) => sum + e.amount, 0),
        event_count: transformedEvents.length,
        by_type: transformedEvents.reduce((acc, e) => {
          acc[e.event_type] = (acc[e.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        by_source: { events: transformedEvents.length },
      };

      return {
        events: transformedEvents,
        summary,
        metadata: {
          business_profile_id: businessProfileId,
          generated_at: new Date().toISOString(),
          filters_applied: {
            start_date: filters?.startDate,
            end_date: filters?.endDate,
            event_types: filters?.eventTypes,
            document_types: filters?.documentTypes,
          },
        },
      } as AggregatedLedgerResponse;
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
