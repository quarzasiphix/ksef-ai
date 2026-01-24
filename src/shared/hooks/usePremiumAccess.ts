import { useQuery } from '@tanstack/react-query';
import { 
  getEffectiveTier, 
  hasCapability, 
  isPremium,
  hasUmbrellaSubscription,
  getUserBusinessesWithTiers,
  type EffectiveTierResult,
  type UmbrellaType
} from '@/shared/services/premiumAccessService';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

/**
 * Primary hook for checking premium access
 * 
 * Uses the canonical getEffectiveTier function with umbrella hierarchy:
 * 1. Enterprise umbrella → all businesses premium
 * 2. Legacy umbrella → all businesses premium (backwards compatibility)
 * 3. Business subscription → only that business premium
 * 4. Free → no premium features
 */
export const usePremiumAccess = () => {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  
  // Get effective tier for current business
  const { 
    data: effectiveTier, 
    isLoading: isTierLoading,
    refetch: refetchTier
  } = useQuery({
    queryKey: ['effective-tier', user?.id, selectedProfileId],
    queryFn: () => {
      if (!user || !selectedProfileId) return null;
      return getEffectiveTier(user.id, selectedProfileId);
    },
    enabled: !!user && !!selectedProfileId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Get umbrella status
  const { 
    data: umbrellaStatus,
    isLoading: isUmbrellaLoading
  } = useQuery({
    queryKey: ['umbrella-status', user?.id],
    queryFn: () => {
      if (!user) return null;
      return hasUmbrellaSubscription(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
  
  // Helper to check capability
  const checkCapability = async (capability: string): Promise<boolean> => {
    if (!user || !selectedProfileId) return false;
    return hasCapability(user.id, selectedProfileId, capability);
  };
  
  // Helper to check if premium
  const checkIsPremium = async (): Promise<boolean> => {
    if (!user || !selectedProfileId) return false;
    return isPremium(user.id, selectedProfileId);
  };
  
  return {
    // Effective tier data
    effectiveTier,
    tier: effectiveTier?.tier ?? 'free',
    source: effectiveTier?.source ?? 'free',
    
    // Premium status
    isPremium: effectiveTier?.tier !== 'free',
    isFree: effectiveTier?.tier === 'free',
    
    // Umbrella status
    isUmbrellaUser: umbrellaStatus?.hasUmbrella ?? false,
    umbrellaType: umbrellaStatus?.umbrellaType ?? null,
    isEnterpriseUser: umbrellaStatus?.umbrellaType === 'enterprise',
    isLegacyUser: umbrellaStatus?.umbrellaType === 'legacy',
    
    // Loading states
    isLoading: isTierLoading || isUmbrellaLoading,
    
    // Helper functions
    hasCapability: checkCapability,
    checkIsPremium,
    refetch: refetchTier
  };
};

/**
 * Hook to get all businesses with their tiers
 * 
 * Useful for subscription management UI
 */
export const useUserBusinessesWithTiers = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-businesses-with-tiers', user?.id],
    queryFn: () => {
      if (!user) return [];
      return getUserBusinessesWithTiers(user.id);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to check a specific capability
 * 
 * More efficient than usePremiumAccess when you only need one capability
 */
export const useCapability = (capability: string) => {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  
  return useQuery({
    queryKey: ['capability', capability, user?.id, selectedProfileId],
    queryFn: () => {
      if (!user || !selectedProfileId) return false;
      return hasCapability(user.id, selectedProfileId, capability);
    },
    enabled: !!user && !!selectedProfileId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook for backwards compatibility with old AuthContext.isPremium
 * 
 * This maintains the same API as before but uses the new system
 */
export const useLegacyPremiumCheck = () => {
  const { isPremium, isLoading } = usePremiumAccess();
  
  return {
    isPremium,
    isLoading
  };
};
