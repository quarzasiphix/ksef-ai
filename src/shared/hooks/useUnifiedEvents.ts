/**
 * React hooks for unified event system
 * 
 * Provides access to events through different views:
 * - Ledger: posted events sorted by occurred_at
 * - Inbox: unposted events needing action sorted by recorded_at
 * - Invoices: filtered ledger view
 * - Expenses: filtered ledger view
 * - Audit: all events sorted by recorded_at
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '../types/database.types';

type DbEvent = Database['public']['Tables']['events']['Row'];
type DbEventInsert = Database['public']['Tables']['events']['Insert'];
type DbEventUpdate = Database['public']['Tables']['events']['Update'];

/**
 * Hook to fetch ledger events (posted events sorted by occurred_at)
 */
export function useLedgerEvents(businessProfileId: string, filters?: {
  startDate?: string;
  endDate?: string;
  eventTypes?: string[];
  documentTypes?: string[];
  counterparty?: string;
}) {
  return useQuery({
    queryKey: ['events', 'ledger', businessProfileId, filters],
    queryFn: async () => {
      let query = supabase
        .from('ledger_live')
        .select('*')
        .eq('business_profile_id', businessProfileId);

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
        query = query.in('document_type', filters.documentTypes);
      }
      if (filters?.counterparty) {
        query = query.ilike('counterparty', `%${filters.counterparty}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!businessProfileId,
  });
}

/**
 * Hook to fetch inbox events (unposted events needing action sorted by recorded_at)
 */
export function useInboxEvents(businessProfileId: string) {
  return useQuery({
    queryKey: ['events', 'inbox', businessProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_live')
        .select('*')
        .eq('business_profile_id', businessProfileId);

      if (error) throw error;
      return data;
    },
    enabled: !!businessProfileId,
  });
}

/**
 * Hook to fetch invoice events (filtered ledger view)
 */
export function useInvoiceEvents(businessProfileId: string) {
  return useQuery({
    queryKey: ['events', 'invoices', businessProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices_ledger_view')
        .select('*')
        .eq('business_profile_id', businessProfileId);

      if (error) throw error;
      return data;
    },
    enabled: !!businessProfileId,
  });
}

/**
 * Hook to fetch expense events (filtered ledger view)
 */
export function useExpenseEvents(businessProfileId: string) {
  return useQuery({
    queryKey: ['events', 'expenses', businessProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses_ledger_view')
        .select('*')
        .eq('business_profile_id', businessProfileId);

      if (error) throw error;
      return data;
    },
    enabled: !!businessProfileId,
  });
}

/**
 * Hook to fetch audit log (all events sorted by recorded_at)
 */
export function useAuditLog(businessProfileId: string, filters?: {
  startDate?: string;
  endDate?: string;
  actorId?: string;
  eventTypes?: string[];
}) {
  return useQuery({
    queryKey: ['events', 'audit', businessProfileId, filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_log_view')
        .select('*')
        .eq('business_profile_id', businessProfileId);

      if (filters?.startDate) {
        query = query.gte('recorded_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('recorded_at', filters.endDate);
      }
      if (filters?.actorId) {
        query = query.eq('actor_id', filters.actorId);
      }
      if (filters?.eventTypes && filters.eventTypes.length > 0) {
        query = query.in('event_type', filters.eventTypes);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!businessProfileId,
  });
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: DbEventInsert) => {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'ledger', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'inbox', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'invoices', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'expenses', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'audit', data.business_profile_id] 
      });
    },
  });
}

/**
 * Hook to update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: DbEventUpdate }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'ledger', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'inbox', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'invoices', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'expenses', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'audit', data.business_profile_id] 
      });
    },
  });
}

/**
 * Hook to approve and post an event
 */
export function useApproveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data: checkResult, error: checkError } = await supabase
        .rpc('check_event_enforcement', { p_event_id: eventId });

      if (checkError) throw checkError;

      const check = checkResult?.[0];
      if (!check?.is_allowed) {
        throw new Error(check?.error_message || 'Event cannot be approved');
      }

      const { data, error } = await supabase
        .from('events')
        .update({
          status: 'posted',
          posted: true,
          needs_action: false,
          blocked_by: null,
          blocked_reason: null,
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'ledger', data.business_profile_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'inbox', data.business_profile_id] 
      });
    },
  });
}

/**
 * Hook to classify an event
 */
export function useClassifyEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      classification,
      category,
      vatRate,
      counterparty,
    }: {
      eventId: string;
      classification?: string;
      category?: string;
      vatRate?: number;
      counterparty?: string;
    }) => {
      const { data, error } = await supabase
        .from('events')
        .update({
          classification,
          category,
          vat_rate: vatRate,
          counterparty,
          status: 'classified',
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['events', 'inbox', data.business_profile_id] 
      });
    },
  });
}

/**
 * Hook to check if event can be posted
 */
export function useCheckEventEnforcement(eventId: string) {
  return useQuery({
    queryKey: ['events', 'enforcement', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('check_event_enforcement', { p_event_id: eventId });

      if (error) throw error;
      return data?.[0];
    },
    enabled: !!eventId,
  });
}

/**
 * Hook to get inbox reasons for an event
 */
export function useInboxReasons(eventId: string) {
  return useQuery({
    queryKey: ['events', 'inbox-reasons', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_inbox_reasons', { p_event_id: eventId });

      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}
