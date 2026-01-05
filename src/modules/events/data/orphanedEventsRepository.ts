/**
 * Orphaned Events Repository
 * 
 * Data access layer for backwards compatibility with events without chain_id
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  OrphanedEvent,
  AttachEventResult,
  OrphanedEventsSummary,
  ChainSearchResult,
  BulkAttachResult,
  AttachEventToChainInput,
  SearchChainsInput,
} from '../types/orphanedEvents';

/**
 * Get orphaned events for a business profile
 */
export async function getOrphanedEvents(
  businessProfileId: string,
  limit: number = 100
): Promise<OrphanedEvent[]> {
  const { data, error } = await supabase.rpc('get_orphaned_events', {
    p_business_profile_id: businessProfileId,
    p_limit: limit,
  });

  if (error) throw error;
  return data as OrphanedEvent[];
}

/**
 * Get orphaned events summary
 */
export async function getOrphanedEventsSummary(
  businessProfileId: string
): Promise<OrphanedEventsSummary | null> {
  const { data, error } = await supabase
    .from('orphaned_events_summary')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No orphaned events
    throw error;
  }

  return data as OrphanedEventsSummary;
}

/**
 * Auto-attach event to appropriate chain
 */
export async function autoAttachEvent(eventId: string): Promise<AttachEventResult> {
  const { data, error } = await supabase.rpc('auto_attach_event', {
    p_event_id: eventId,
  });

  if (error) throw error;
  return data as AttachEventResult;
}

/**
 * Manually attach event to specific chain
 */
export async function attachEventToChain(
  input: AttachEventToChainInput
): Promise<AttachEventResult> {
  const { data, error } = await supabase.rpc('attach_event_to_chain', {
    p_event_id: input.event_id,
    p_chain_id: input.chain_id,
    p_causation_event_id: input.causation_event_id || null,
  });

  if (error) throw error;
  return data as AttachEventResult;
}

/**
 * Search chains for manual attachment
 */
export async function searchChainsForAttach(
  input: SearchChainsInput
): Promise<ChainSearchResult[]> {
  const { data, error } = await supabase.rpc('search_chains_for_attach', {
    p_business_profile_id: input.business_profile_id,
    p_search_query: input.search_query || null,
    p_event_id: input.event_id || null,
    p_limit: input.limit || 10,
  });

  if (error) throw error;
  return data as ChainSearchResult[];
}

/**
 * Bulk auto-attach all orphaned events
 */
export async function bulkAutoAttachOrphanedEvents(
  businessProfileId: string,
  limit: number = 100
): Promise<BulkAttachResult> {
  const { data, error } = await supabase.rpc('bulk_auto_attach_orphaned_events', {
    p_business_profile_id: businessProfileId,
    p_limit: limit,
  });

  if (error) throw error;
  return data as BulkAttachResult;
}

/**
 * Check if event is orphaned
 */
export async function isEventOrphaned(eventId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('events')
    .select('chain_id')
    .eq('id', eventId)
    .single();

  if (error) throw error;
  return data.chain_id === null;
}

/**
 * Get orphaned events count for business profile
 */
export async function getOrphanedEventsCount(
  businessProfileId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('business_profile_id', businessProfileId)
    .is('chain_id', null);

  if (error) throw error;
  return count || 0;
}

/**
 * Get suggested chain for orphaned event
 */
export async function getSuggestedChainForEvent(
  eventId: string
): Promise<{ chain_id: string; chain_title: string; confidence: number } | null> {
  const { data, error } = await supabase.rpc('get_orphaned_events', {
    p_business_profile_id: '', // Will be filtered by event
    p_limit: 1,
  });

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const event = data.find((e: OrphanedEvent) => e.event_id === eventId);
  if (!event || !event.suggested_chain_id) return null;

  return {
    chain_id: event.suggested_chain_id,
    chain_title: event.suggested_chain_title || '',
    confidence: event.confidence,
  };
}
