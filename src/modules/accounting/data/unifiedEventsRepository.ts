import { supabase } from '../../../integrations/supabase/client';
import type { UnifiedEvent, CreateEventInput, EventType } from '@/shared/types/events';

// ============================================
// UNIFIED EVENT CRUD OPERATIONS
// ============================================

export async function getEvents(
  businessProfileId: string,
  options?: {
    limit?: number;
    eventType?: EventType;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    posted?: boolean;
    needsAction?: boolean;
  }
): Promise<UnifiedEvent[]> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('occurred_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.eventType) {
    query = query.eq('event_type', options.eventType);
  }

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType);
  }

  if (options?.entityId) {
    query = query.eq('entity_id', options.entityId);
  }

  if (options?.startDate) {
    query = query.gte('occurred_at', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('occurred_at', options.endDate);
  }

  if (options?.posted !== undefined) {
    query = query.eq('posted', options.posted);
  }

  if (options?.needsAction !== undefined) {
    query = query.eq('needs_action', options.needsAction);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getEventById(id: string): Promise<UnifiedEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getEventChain(eventId: string): Promise<UnifiedEvent[]> {
  const { data, error } = await supabase.rpc('get_event_chain', {
    p_event_id: eventId,
  });

  if (error) throw error;
  return data || [];
}

export async function getEntityTimeline(
  entityType: string,
  entityId: string
): Promise<UnifiedEvent[]> {
  const { data, error } = await supabase.rpc('get_entity_timeline', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  });

  if (error) throw error;
  return data || [];
}

// ============================================
// EVENT CREATION (CANONICAL)
// ============================================

export async function createEvent(input: CreateEventInput): Promise<UnifiedEvent> {
  const { data: eventId, error } = await supabase.rpc('create_event', {
    p_business_profile_id: input.business_profile_id,
    p_event_type: input.event_type,
    p_actor_id: input.actor_id,
    p_actor_name: input.actor_name,
    p_entity_type: input.entity_type,
    p_entity_id: input.entity_id,
    p_action_summary: input.action_summary,
    p_occurred_at: input.occurred_at || new Date().toISOString(),
    p_entity_reference: input.entity_reference || null,
    p_amount: input.amount || null,
    p_currency: input.currency || 'PLN',
    p_direction: input.direction || null,
    p_decision_id: input.decision_id || null,
    p_changes: input.changes || {},
    p_metadata: input.metadata || {},
    p_parent_event_id: input.parent_event_id || null,
    p_correlation_id: input.correlation_id || null,
    p_status: input.status || 'pending',
    p_posted: input.posted || false,
    p_needs_action: input.needs_action || false,
    p_cash_channel: input.cash_channel || null,
  });

  if (error) throw error;

  // Fetch the created event
  const event = await getEventById(eventId);
  if (!event) throw new Error('Failed to fetch created event');

  return event;
}

// ============================================
// HELPER: Log event from client
// ============================================

export async function logEvent(
  businessProfileId: string,
  eventType: EventType,
  entityType: string,
  entityId: string,
  actionSummary: string,
  options?: {
    occurredAt?: string;
    entityReference?: string;
    amount?: number;
    currency?: string;
    direction?: 'incoming' | 'outgoing' | 'neutral';
    decisionId?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    parentEventId?: string;
    correlationId?: string;
    status?: 'pending' | 'posted' | 'reversed';
    posted?: boolean;
    needsAction?: boolean;
    cashChannel?: 'bank' | 'cash' | 'card' | 'other';
  }
): Promise<UnifiedEvent> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  return createEvent({
    business_profile_id: businessProfileId,
    event_type: eventType,
    actor_id: user.id,
    actor_name: user.email || 'Unknown',
    entity_type: entityType,
    entity_id: entityId,
    action_summary: actionSummary,
    occurred_at: options?.occurredAt,
    entity_reference: options?.entityReference,
    amount: options?.amount,
    currency: options?.currency,
    direction: options?.direction,
    decision_id: options?.decisionId,
    changes: options?.changes,
    metadata: options?.metadata,
    parent_event_id: options?.parentEventId,
    correlation_id: options?.correlationId,
    status: options?.status,
    posted: options?.posted,
    needs_action: options?.needsAction,
    cash_channel: options?.cashChannel,
  });
}

// ============================================
// LEDGER QUERIES (POSTED EVENTS ONLY)
// ============================================

export async function getLedgerEvents(
  businessProfileId: string,
  options?: {
    limit?: number;
    startDate?: string;
    endDate?: string;
    eventTypes?: EventType[];
    entityTypes?: string[];
  }
): Promise<UnifiedEvent[]> {
  let query = supabase
    .from('events')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('posted', true)
    .eq('is_reversed', false)
    .order('occurred_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.startDate) {
    query = query.gte('occurred_at', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('occurred_at', options.endDate);
  }

  if (options?.eventTypes && options.eventTypes.length > 0) {
    query = query.in('event_type', options.eventTypes);
  }

  if (options?.entityTypes && options.entityTypes.length > 0) {
    query = query.in('entity_type', options.entityTypes);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================
// ANALYTICS
// ============================================

export async function getEventStats(
  businessProfileId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  total_events: number;
  events_by_type: Record<EventType, number>;
  events_by_day: Array<{ date: string; count: number }>;
  posted_events: number;
  pending_events: number;
  needs_action_events: number;
}> {
  let query = supabase
    .from('events')
    .select('event_type, occurred_at, posted, status, needs_action')
    .eq('business_profile_id', businessProfileId);

  if (startDate) {
    query = query.gte('occurred_at', startDate);
  }

  if (endDate) {
    query = query.lte('occurred_at', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  const events = data || [];
  const total_events = events.length;

  // Count by type
  const events_by_type: Record<string, number> = {};
  events.forEach((event) => {
    events_by_type[event.event_type] = (events_by_type[event.event_type] || 0) + 1;
  });

  // Count by day
  const events_by_day_map: Record<string, number> = {};
  events.forEach((event) => {
    const date = new Date(event.occurred_at).toISOString().split('T')[0];
    events_by_day_map[date] = (events_by_day_map[date] || 0) + 1;
  });

  const events_by_day = Object.entries(events_by_day_map)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Count by status
  const posted_events = events.filter(e => e.posted).length;
  const pending_events = events.filter(e => e.status === 'pending').length;
  const needs_action_events = events.filter(e => e.needs_action).length;

  return {
    total_events,
    events_by_type: events_by_type as Record<EventType, number>,
    events_by_day,
    posted_events,
    pending_events,
    needs_action_events,
  };
}

// ============================================
// ACTIONS REQUIRING ATTENTION
// ============================================

export async function getEventsNeedingAction(
  businessProfileId: string
): Promise<UnifiedEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('needs_action', true)
    .order('occurred_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
