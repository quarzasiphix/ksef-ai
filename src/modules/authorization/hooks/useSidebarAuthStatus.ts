import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SidebarAuthStatus {
  decisions: {
    status: 'active' | 'pending' | 'blocked';
    pendingCount: number;
    expiringCount: number;
  };
  kasa: {
    hasConsent: boolean;
    status: 'active' | 'pending' | 'blocked';
  };
  invoices: {
    pendingAuthCount: number;
    status: 'active' | 'pending' | 'blocked';
  };
  overall: {
    status: 'active' | 'pending' | 'blocked';
    score: number;
  };
}

/**
 * Hook to get authorization status for sidebar visual encoding
 */
export function useSidebarAuthStatus() {
  return useQuery({
    queryKey: ['sidebar-auth-status'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data: profile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.user.id)
        .single();

      if (!profile) return null;

      // Get authorizations
      const { data: authorizations } = await supabase
        .from('authorizations')
        .select('*')
        .eq('business_profile_id', profile.id);

      const activeAuths = authorizations?.filter(a => a.status === 'active') || [];
      const pendingAuths = authorizations?.filter(a => a.status === 'pending') || [];
      const expiredAuths = authorizations?.filter(a => a.status === 'expired') || [];

      // Check for expiring soon (within 30 days)
      const expiringSoon = activeAuths.filter(a => {
        if (!a.scope?.valid_to) return false;
        const daysUntilExpiry = (new Date(a.scope.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry > 0 && daysUntilExpiry < 30;
      });

      // Check for kasa consent
      const hasKasaAuth = activeAuths.some(a => 
        a.scope?.action_types?.includes('kasa_create') || 
        a.title.toLowerCase().includes('kasa')
      );

      // Calculate overall score
      const totalScore = authorizations?.length 
        ? Math.round((activeAuths.length / authorizations.length) * 100)
        : 0;

      // Determine overall status
      let overallStatus: 'active' | 'pending' | 'blocked' = 'active';
      if (expiredAuths.length > 0) {
        overallStatus = 'blocked';
      } else if (pendingAuths.length > 0 || expiringSoon.length > 0) {
        overallStatus = 'pending';
      }

      // Determine decisions status
      let decisionsStatus: 'active' | 'pending' | 'blocked' = 'active';
      if (expiredAuths.length > 0) {
        decisionsStatus = 'blocked';
      } else if (pendingAuths.length > 0 || expiringSoon.length > 0) {
        decisionsStatus = 'pending';
      }

      // Determine kasa status
      const kasaStatus: 'active' | 'pending' | 'blocked' = hasKasaAuth ? 'active' : 'blocked';

      return {
        decisions: {
          status: decisionsStatus,
          pendingCount: pendingAuths.length,
          expiringCount: expiringSoon.length,
        },
        kasa: {
          hasConsent: hasKasaAuth,
          status: kasaStatus,
        },
        invoices: {
          pendingAuthCount: 0, // TODO: Implement invoice-specific checks
          status: 'active' as const,
        },
        overall: {
          status: overallStatus,
          score: totalScore,
        },
      } as SidebarAuthStatus;
    },
    refetchInterval: 60000, // Refresh every minute
  });
}
