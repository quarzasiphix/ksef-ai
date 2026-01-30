import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePremiumSync } from '@/shared/hooks/usePremiumSync';
import { rpcPremiumService } from '../services/rpcPremiumService';
import { premiumSyncService } from "@/shared/services/premiumSyncService";
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
  hasUserLevelPremium: boolean; // New: indicates if user has enterprise/user premium
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const { selectedProfileId } = useBusinessProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Use premium sync service as primary source
  const { 
    isActive: syncActive, 
    tier: syncTier, 
    token, 
    isLoading: syncLoading, 
    tokenExpiry,
    lastVerified,
    forceVerify 
  } = usePremiumSync();

  // Get sync service status for token validation
  const syncStatus = premiumSyncService.getStatus();

  // Debug business profile changes
  useEffect(() => {
    // Only invalidate premium cache when business profile actually changes (not just re-renders)
    if (selectedProfileId) {
      // Check if this is a genuine profile change that affects premium status
      const currentStatus = premiumSyncService.getStatus();
      const currentBusinessId = premiumSyncService.getCurrentBusinessId();
      
      // Only re-verify if:
      // 1. No current business ID (first load)
      // 2. Business profile actually changed
      // 3. Current token is invalid or expired
      const shouldReverify = !currentBusinessId || 
                             currentBusinessId !== selectedProfileId || 
                             !currentStatus.hasValidToken;
      
      if (!shouldReverify) {
        // Skip if premium is still valid for the new profile
        return;
      }
      
      // Debounce the invalidation to prevent spam
      const timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['fallback-premium'] });
        queryClient.invalidateQueries({ queryKey: ['premium-sync'] });
        
        // Force verify premium status for new business profile (but only if token is invalid)
        setTimeout(() => {
          // Only force verify if we don't have a valid token
          if (!token || !syncStatus.hasValidToken) {
            forceVerify();
          }
        }, 1000); // Further increased timeout
      }, 500); // Increased debounce to 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedProfileId, user?.id, queryClient, forceVerify, token, syncStatus.hasValidToken]);

  // Determine which data source to use
  const useSyncData = !syncLoading && (syncActive || lastVerified);

  // Fallback RPC query when sync service is not ready OR for business-specific checks
  const { data: rpcData, isLoading: rpcLoading } = useQuery({
    queryKey: ['fallback-premium', selectedProfileId, user?.id],
    queryFn: async () => {
      if (!user || !selectedProfileId) return null;
      return rpcPremiumService.getPremiumAccess(user.id, selectedProfileId);
    },
    enabled: !!user && !!selectedProfileId && !useSyncData && !token, // Only run when sync data is not available AND no token
    staleTime: 60000, // Cache for 1 minute to further reduce spam
    gcTime: 120000, // Keep in cache for 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  const isLoading = syncLoading || (rpcLoading && !useSyncData);
  
  // Determine if user has user-level premium (enterprise or user tier)
  const hasUserLevelPremium = syncTier === 'enterprise' || syncTier === 'jdg_premium';

  // Map sync service data to PremiumContext format
  const hasPremium = syncActive && syncTier !== 'free';
  
  // Map tier names to expected levels
  const getLevelFromTier = (tier: string): 'free' | 'user' | 'business' | 'enterprise' => {
    if (tier === 'enterprise') return 'enterprise';
    if (tier === 'jdg_premium') return 'user';
    if (tier === 'spolka_premium') return 'business';
    return 'free';
  };

  const level = getLevelFromTier(syncTier);
  
  // For users with user-level premium, use sync data
  // For users without user-level premium, use RPC data to check business-specific premium
  const shouldUseRpcForBusinessCheck = !hasUserLevelPremium && rpcData;
  const isActive = shouldUseRpcForBusinessCheck ? (rpcData?.hasAccess ?? false) : (useSyncData ? syncActive : (rpcData?.hasAccess ?? false));
  const tier = shouldUseRpcForBusinessCheck ? (rpcData?.subscriptionType ?? 'free') : (useSyncData ? syncTier : (rpcData?.subscriptionType ?? 'free'));

  // Get features for the current tier
  const getFeaturesForTier = (tier: string): Record<string, any> => {
    const features: Record<string, any> = {
      basic_features: true
    };
    
    if (tier === 'free') {
      return features;
    }
    
    // Premium features for all premium tiers
    if (tier === 'jdg_premium' || tier === 'spolka_premium' || tier === 'enterprise') {
      features.ksef_integration = true;
      features.automated_invoices = true;
      features.advanced_reports = true;
      features.multi_currency = true;
      features.priority_support = true;
      features.advanced_analytics = true;
      features.batch_operations = true;
      features.export_advanced = true;
    }
    
    // Enterprise-only features
    if (tier === 'enterprise') {
      features.api_access = true;
      features.custom_branding = true;
      features.unlimited_businesses = true;
      features.all_features = true;
      features.governance_features = true;
    }
    
    return features;
  };

  const features = getFeaturesForTier(tier);

  const canAccessFeature = (feature: string): boolean => {
    if (isLoading || !isActive) return false;
    return features[feature] === true;
  };

  const requirePremium = (feature?: string): boolean => {
    if (isLoading || !isActive) return false;
    return true;
  };

  const value: PremiumContextType = {
    hasPremium,
    isLoading,
    level,
    subscriptionType: tier,
    features,
    expiresAt: tokenExpiry?.toISOString(),
    source: hasUserLevelPremium ? 'user_subscription' : 'business_subscription',
    canAccessFeature,
    requirePremium,
    hasUserLevelPremium,
  };

  // console.log('[PremiumContext] Premium data source:', { // Disabled to reduce console spam
  //   useSyncData,
  //   syncActive,
  //   syncTier,
  //   syncLoading,
  //   rpcData: rpcData?.hasAccess,
  //   rpcLoading,
  //   finalIsActive: isActive,
  //   finalTier: tier,
  //   hasPremium,
  //   level,
  //   isLoading,
  //   selectedProfileId,
  //   userId: user?.id,
  //   token,
  //   tokenExpiry,
  //   lastVerified
  // });

  // Additional debugging for sync service state
  // console.log('[PremiumContext] Full sync state available:', { // Disabled to reduce console spam
  //   hasUser: !!user,
  //   hasBusiness: !!selectedProfileId,
  //   shouldSync: !!(user && selectedProfileId)
  // });

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

// Export the type for use in other components
export type { PremiumContextType };

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
