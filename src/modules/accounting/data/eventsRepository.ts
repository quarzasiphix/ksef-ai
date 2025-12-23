import { supabase } from '../../../integrations/supabase/client';
import type { CompanyEvent, CreateEventInput, EnforcementCheck, EventType } from '@/shared/types/events';

// ============================================
// EVENT CRUD OPERATIONS
// ============================================

export async function getCompanyEvents(
  businessProfileId: string,
  options?: {
    limit?: number;
    eventType?: EventType;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<CompanyEvent[]> {
  let query = supabase
    .from('company_events')
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

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getEventById(id: string): Promise<CompanyEvent | null> {
  const { data, error } = await supabase
    .from('company_events')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getEventChain(eventId: string): Promise<CompanyEvent[]> {
  // Get the event and all its ancestors
  const events: CompanyEvent[] = [];
  let currentEventId: string | undefined = eventId;

  while (currentEventId) {
    const event = await getEventById(currentEventId);
    if (!event) break;
    
    events.unshift(event); // Add to beginning
    currentEventId = event.parent_event_id;
  }

  return events;
}

export async function getEntityEvents(
  entityType: string,
  entityId: string
): Promise<CompanyEvent[]> {
  const { data, error } = await supabase
    .from('company_events')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('occurred_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createEvent(input: CreateEventInput): Promise<CompanyEvent> {
  const { data, error } = await supabase.rpc('log_company_event', {
    p_business_profile_id: input.business_profile_id,
    p_event_type: input.event_type,
    p_actor_id: input.actor_id,
    p_actor_name: input.actor_name,
    p_decision_id: input.decision_id || null,
    p_entity_type: input.entity_type,
    p_entity_id: input.entity_id,
    p_entity_reference: input.entity_reference || null,
    p_action_summary: input.action_summary,
    p_changes: input.changes || {},
    p_metadata: input.metadata || {},
    p_parent_event_id: input.parent_event_id || null,
  });

  if (error) throw error;

  // Fetch the created event
  const event = await getEventById(data);
  if (!event) throw new Error('Failed to fetch created event');

  return event;
}

// ============================================
// ENFORCEMENT OPERATIONS
// ============================================

export async function checkEnforcement(
  businessProfileId: string,
  entityType: string,
  entityData: Record<string, any>
): Promise<EnforcementCheck> {
  const { data, error } = await supabase.rpc('check_enforcement_rules', {
    p_business_profile_id: businessProfileId,
    p_entity_type: entityType,
    p_entity_data: entityData,
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    return { is_allowed: true };
  }

  const result = data[0];
  return {
    is_allowed: result.is_allowed,
    blocked_by: result.blocked_by,
    error_message: result.error_message,
  };
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
}> {
  let query = supabase
    .from('company_events')
    .select('event_type, occurred_at')
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

  return {
    total_events,
    events_by_type: events_by_type as Record<EventType, number>,
    events_by_day,
  };
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
    decisionId?: string;
    entityReference?: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    parentEventId?: string;
  }
): Promise<CompanyEvent> {
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
    decision_id: options?.decisionId,
    entity_reference: options?.entityReference,
    changes: options?.changes,
    metadata: options?.metadata,
    parent_event_id: options?.parentEventId,
  });
}
