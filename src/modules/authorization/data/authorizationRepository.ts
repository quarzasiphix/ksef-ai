import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AuthorizationScope {
  action_types?: string[];
  amount_limit?: number;
  currency?: string;
  valid_from?: string;
  valid_to?: string;
  categories?: string[];
  counterparties?: string[];
}

export interface Authorization {
  id: string;
  business_profile_id: string;
  type: 'decision' | 'contract' | 'policy' | 'consent';
  ref_id: string;
  ref_type: string;
  scope: AuthorizationScope;
  required_signatures: number;
  current_signatures: number;
  status: 'pending' | 'approved' | 'active' | 'expired' | 'revoked';
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthorizationCheck {
  id: string;
  authorization_id: string;
  business_profile_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  result: 'allowed' | 'blocked' | 'warning';
  reason?: string;
  checked_amount?: number;
  checked_currency?: string;
  checked_category?: string;
  checked_counterparty?: string;
  checked_by?: string;
  checked_at: string;
}

export interface CreateAuthorizationInput {
  type: 'decision' | 'contract' | 'policy' | 'consent';
  ref_id: string;
  ref_type: string;
  scope: AuthorizationScope;
  title: string;
  description?: string;
  required_signatures?: number;
}

// ============================================================================
// AUTHORIZATION FUNCTIONS
// ============================================================================

/**
 * Get all authorizations for current business profile
 */
export async function getAuthorizations(
  businessProfileId: string,
  status?: string
): Promise<Authorization[]> {
  let query = supabase
    .from('authorizations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get authorization by ID
 */
export async function getAuthorization(authorizationId: string): Promise<Authorization | null> {
  const { data, error } = await supabase
    .from('authorizations')
    .select('*')
    .eq('id', authorizationId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Create new authorization
 */
export async function createAuthorization(
  businessProfileId: string,
  input: CreateAuthorizationInput
): Promise<Authorization> {
  const { data, error } = await supabase
    .from('authorizations')
    .insert({
      business_profile_id: businessProfileId,
      ...input,
      required_signatures: input.required_signatures || 1,
      current_signatures: 0,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update authorization status
 */
export async function updateAuthorizationStatus(
  authorizationId: string,
  status: 'pending' | 'approved' | 'active' | 'expired' | 'revoked'
): Promise<Authorization> {
  const { data, error } = await supabase
    .from('authorizations')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', authorizationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Check if action is authorized using database function
 */
export async function checkAuthorization(params: {
  businessProfileId: string;
  actionType: string;
  amount?: number;
  currency?: string;
  category?: string;
  counterparty?: string;
}): Promise<{
  is_authorized: boolean;
  authorization_id?: string;
  reason?: string;
}> {
  const { data, error } = await supabase.rpc('check_authorization', {
    p_business_profile_id: params.businessProfileId,
    p_action_type: params.actionType,
    p_amount: params.amount || null,
    p_currency: params.currency || null,
    p_category: params.category || null,
    p_counterparty: params.counterparty || null,
  });

  if (error) throw error;
  return data?.[0] || { is_authorized: false, reason: 'No authorization found' };
}

/**
 * Record authorization check (audit trail)
 */
export async function recordAuthorizationCheck(
  businessProfileId: string,
  params: {
    authorization_id: string;
    action_type: string;
    entity_type: string;
    entity_id: string;
    result: 'allowed' | 'blocked' | 'warning';
    reason?: string;
    checked_amount?: number;
    checked_currency?: string;
    checked_category?: string;
    checked_counterparty?: string;
  }
): Promise<AuthorizationCheck> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('authorization_checks')
    .insert({
      ...params,
      business_profile_id: businessProfileId,
      checked_by: user.user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get authorization checks (audit trail)
 */
export async function getAuthorizationChecks(
  businessProfileId: string,
  filters?: {
    entity_type?: string;
    entity_id?: string;
    result?: 'allowed' | 'blocked' | 'warning';
  }
): Promise<AuthorizationCheck[]> {
  let query = supabase
    .from('authorization_checks')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('checked_at', { ascending: false });

  if (filters?.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }

  if (filters?.entity_id) {
    query = query.eq('entity_id', filters.entity_id);
  }

  if (filters?.result) {
    query = query.eq('result', filters.result);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Update expired authorizations (call periodically)
 */
export async function updateExpiredAuthorizations(): Promise<void> {
  const { error } = await supabase.rpc('update_authorization_status');
  if (error) throw error;
}

/**
 * Get authorizations expiring soon (within days)
 */
export async function getExpiringSoonAuthorizations(
  businessProfileId: string,
  days: number = 30
): Promise<Authorization[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const { data, error } = await supabase
    .from('authorizations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('status', 'active')
    .not('scope->valid_to', 'is', null)
    .lte('scope->valid_to', futureDate.toISOString())
    .order('scope->valid_to', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get company readiness metrics
 */
export async function getCompanyReadinessMetrics(businessProfileId: string): Promise<{
  total_score: number;
  active_authorizations: number;
  expired_authorizations: number;
  pending_authorizations: number;
  expiring_soon: number;
}> {
  const authorizations = await getAuthorizations(businessProfileId);
  const expiringSoon = await getExpiringSoonAuthorizations(businessProfileId, 30);

  const active = authorizations.filter(a => a.status === 'active').length;
  const expired = authorizations.filter(a => a.status === 'expired').length;
  const pending = authorizations.filter(a => a.status === 'pending').length;

  const totalScore = authorizations.length > 0
    ? Math.round((active / authorizations.length) * 100)
    : 0;

  return {
    total_score: totalScore,
    active_authorizations: active,
    expired_authorizations: expired,
    pending_authorizations: pending,
    expiring_soon: expiringSoon.length,
  };
}
