import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCompanyPremiumStatus } from '../hooks/useSubscription';
import { rpcPremiumService } from '../services/rpcPremiumService';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAuth } from '@/shared/hooks/useAuth';

interface PremiumContextType {
  hasPremium: boolean;
  isLoading: boolean;
  level: 'free' | 'user' | 'business' | 'enterprise';
  subscriptionType?: string;
  features: Record<string, any>;
  expiresAt?: string;
  source: 'user_subscription' | 'business_subscription' | 'enterprise_subscription';
  canAccessFeature: (feature: string) => boolean;
  requirePremium: (feature?: string) => boolean;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const { selectedProfileId } = useBusinessProfile();
  const { user } = useAuth();

  // Use the centralized service for comprehensive premium checking
  const { data: premiumAccess, isLoading, refetch } = useQuery({
    queryKey: ['premium-access', selectedProfileId, user?.id],
    queryFn: async () => {
      console.log('[PremiumContext] Query function called for user:', user?.id, 'business:', selectedProfileId);
      if (!user) return {
        hasAccess: false,
        level: 'free' as const,
        features: {},
        source: 'user_subscription' as const
      };
      return rpcPremiumService.getPremiumAccess(user.id, selectedProfileId || undefined);
    },
    enabled: !!user,
    staleTime: 0, // Always consider data stale to force refetch
    gcTime: 5 * 60 * 1000, // 5 minutes (garbage collection time)
    // Refetch when business profile changes
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
  });

  // Add effect to manually refetch when business profile changes
  useEffect(() => {
    if (user && selectedProfileId) {
      console.log('[PremiumContext] Business profile changed to:', selectedProfileId, 'refetching premium status');
      // Invalidate cache and refetch
      refetch();
    }
  }, [selectedProfileId, user?.id, refetch]);

  const canAccessFeature = (feature: string): boolean => {
    if (isLoading || !premiumAccess) return false;
    return premiumAccess.hasAccess && premiumAccess.features[feature] === true;
  };

  const requirePremium = (feature?: string): boolean => {
    if (isLoading || !premiumAccess) return false;
    return premiumAccess.hasAccess;
  };

  const value: PremiumContextType = {
    hasPremium: premiumAccess?.hasAccess ?? false,
    isLoading,
    level: premiumAccess?.level ?? 'free',
    subscriptionType: premiumAccess?.subscriptionType,
    features: premiumAccess?.features ?? {},
    expiresAt: premiumAccess?.expiresAt,
    source: premiumAccess?.source ?? 'user_subscription',
    canAccessFeature,
    requirePremium
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
};

// Premium feature names for consistent usage
export const PREMIUM_FEATURES = {
  KSEF_INTEGRATION: 'ksef_integration',
  AUTOMATED_INVOICES: 'automated_invoices',
  ADVANCED_REPORTS: 'advanced_reports',
  API_ACCESS: 'api_access',
  MULTI_CURRENCY: 'multi_currency',
  PRIORITY_SUPPORT: 'priority_support',
  CUSTOM_BRANDING: 'custom_branding',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  BATCH_OPERATIONS: 'batch_operations',
  EXPORT_ADVANCED: 'export_advanced',
  UNLIMITED_BUSINESSES: 'unlimited_businesses',
  ALL_FEATURES: 'all_features',
  GOVERNANCE_FEATURES: 'governance_features'
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];
