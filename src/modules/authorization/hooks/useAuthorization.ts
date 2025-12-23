import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthorizationScope {
  action_types?: string[];
  amount_limit?: number;
  currency?: string;
  valid_from?: string;
  valid_to?: string;
  categories?: string[];
  counterparties?: string[];
}

interface Authorization {
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

interface AuthorizationCheckResult {
  is_authorized: boolean;
  authorization_id?: string;
  reason?: string;
}

interface CheckAuthorizationParams {
  actionType: string;
  amount?: number;
  currency?: string;
  category?: string;
  counterparty?: string;
}

/**
 * Hook to check if an action is authorized
 */
export function useAuthorizationCheck(params: CheckAuthorizationParams) {
  return useQuery({
    queryKey: ['authorization-check', params],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) throw new Error('No business profile found');

      // Call the check_authorization function
      const { data, error } = await supabase.rpc('check_authorization', {
        p_business_profile_id: profile.id,
        p_action_type: params.actionType,
        p_amount: params.amount || null,
        p_currency: params.currency || null,
        p_category: params.category || null,
        p_counterparty: params.counterparty || null,
      });

      if (error) throw error;

      return data?.[0] as AuthorizationCheckResult;
    },
    enabled: !!params.actionType,
  });
}

/**
 * Hook to get all authorizations for current business profile
 */
export function useAuthorizations(status?: string) {
  return useQuery({
    queryKey: ['authorizations', status],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) return [];

      let query = supabase
        .from('authorizations')
        .select('*')
        .eq('business_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Authorization[];
    },
  });
}

/**
 * Hook to get a specific authorization
 */
export function useAuthorization(authorizationId: string) {
  return useQuery({
    queryKey: ['authorization', authorizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authorizations')
        .select('*')
        .eq('id', authorizationId)
        .single();

      if (error) throw error;
      return data as Authorization;
    },
    enabled: !!authorizationId,
  });
}

/**
 * Hook to record an authorization check (for audit trail)
 */
export function useRecordAuthorizationCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
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
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile) throw new Error('No business profile found');

      const { data, error } = await supabase
        .from('authorization_checks')
        .insert({
          ...params,
          business_profile_id: profile.id,
          checked_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorization-checks'] });
    },
  });
}

/**
 * Utility function to validate action against authorization
 */
export function validateAuthorization(
  authorization: Authorization,
  params: {
    amount?: number;
    currency?: string;
    category?: string;
  }
): { allowed: boolean; reason?: string } {
  const scope = authorization.scope;

  // Check status
  if (authorization.status !== 'active') {
    return {
      allowed: false,
      reason: `Uchwała ma status: ${authorization.status}`,
    };
  }

  // Check amount limit
  if (params.amount && scope.amount_limit) {
    if (params.amount > scope.amount_limit) {
      return {
        allowed: false,
        reason: `Przekracza limit uchwały "${authorization.title}" (${scope.amount_limit} ${scope.currency || 'PLN'})`,
      };
    }
  }

  // Check date range
  if (scope.valid_to) {
    const validTo = new Date(scope.valid_to);
    if (new Date() > validTo) {
      return {
        allowed: false,
        reason: `Uchwała "${authorization.title}" wygasła ${validTo.toLocaleDateString('pl-PL')}`,
      };
    }
  }

  // Check category
  if (params.category && scope.categories && scope.categories.length > 0) {
    if (!scope.categories.includes(params.category)) {
      return {
        allowed: false,
        reason: `Kategoria "${params.category}" nie jest objęta uchwałą "${authorization.title}"`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Hook to get authorization checks (audit trail)
 */
export function useAuthorizationChecks(filters?: {
  entity_type?: string;
  entity_id?: string;
  result?: 'allowed' | 'blocked' | 'warning';
}) {
  return useQuery({
    queryKey: ['authorization-checks', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile) return [];

      let query = supabase
        .from('authorization_checks')
        .select('*')
        .eq('business_profile_id', profile.id)
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
      return data;
    },
  });
}

/**
 * Helper to show authorization error toast
 */
export function showAuthorizationError(reason: string) {
  toast.error('Operacja zablokowana', {
    description: reason,
    duration: 5000,
  });
}

/**
 * Helper to show authorization warning toast
 */
export function showAuthorizationWarning(reason: string) {
  toast.warning('Uwaga: poza zakresem', {
    description: reason,
    duration: 5000,
  });
}
