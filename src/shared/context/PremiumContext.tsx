import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useBusinessProfile } from './BusinessProfileContext';
import { 
  checkBusinessPremiumAccess, 
  getUserPremiumStatus, 
  hasEnterpriseAccess,
  type PremiumStatus 
} from '@/shared/services/premiumService';

export interface PremiumContextType {
  // Premium status for current business
  hasPremium: boolean;
  tier: 'free' | 'premium' | 'enterprise';
  premiumSource: string;
  coversAllBusinesses: boolean;
  businessTier: string;
  
  // All businesses premium status
  allBusinessesStatus: PremiumStatus[];
  
  // Enterprise status
  hasEnterprise: boolean;
  
  // Loading states
  isLoading: boolean;
  isChecking: boolean;
  
  // Actions
  checkPremium: () => Promise<void>;
  refetch: () => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export const usePremium = () => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error("usePremium must be used within a PremiumProvider");
  }
  return context;
};

export const PremiumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();
  
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<{ userId: string; businessId: string } | null>(null);

  // Get premium status for current business
  const { data: currentPremiumStatus, refetch: refetchCurrent } = useQuery({
    queryKey: ['premium-status', user?.id, selectedProfileId],
    queryFn: async () => {
      if (!user || !selectedProfileId) {
        return null;
      }
      
      const result = await checkBusinessPremiumAccess(user.id, selectedProfileId);
      return result;
    },
    enabled: !!user && !!selectedProfileId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Get all businesses premium status
  const { data: allBusinessesStatus, refetch: refetchAll } = useQuery({
    queryKey: ['all-businesses-premium-status', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return getUserPremiumStatus(user.id);
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Check enterprise access
  const { data: hasEnterprise, refetch: refetchEnterprise } = useQuery({
    queryKey: ['enterprise-access', user?.id],
    queryFn: async () => {
      if (!user) return false;
      return hasEnterpriseAccess(user.id);
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });

  // Manual check function
  const checkPremium = async () => {
    if (!user || !selectedProfileId) return;
    
    setIsChecking(true);
    try {
      await refetchCurrent();
      await refetchAll();
      await refetchEnterprise();
    } finally {
      setIsChecking(false);
    }
  };

  // Combined refetch
  const refetch = () => {
    refetchCurrent();
    refetchAll();
    refetchEnterprise();
  };

  // Auto-check when user or selected profile changes
  useEffect(() => {
    if (user && selectedProfileId) {
      const checkKey = `${user.id}-${selectedProfileId}`;
      if (!lastCheck || lastCheck.userId !== user.id || lastCheck.businessId !== selectedProfileId) {
        checkPremium();
        setLastCheck({ userId: user.id, businessId: selectedProfileId });
      }
    }
  }, [user, selectedProfileId]);

  const value: PremiumContextType = {
    // Current business premium status
    hasPremium: currentPremiumStatus?.has_premium ?? false,
    tier: currentPremiumStatus?.tier ?? 'free',
    premiumSource: currentPremiumStatus?.source ?? 'free',
    coversAllBusinesses: currentPremiumStatus?.covers_all_businesses ?? false,
    businessTier: currentPremiumStatus?.business_tier ?? 'free',
    
    // All businesses status
    allBusinessesStatus: allBusinessesStatus || [],
    
    // Enterprise status
    hasEnterprise: hasEnterprise ?? false,
    
    // Loading states
    isLoading: !currentPremiumStatus && !!user && !!selectedProfileId,
    isChecking,
    
    // Actions
    checkPremium,
    refetch,
  };

  return (
    <PremiumContext.Provider value={value}>
      {children}
    </PremiumContext.Provider>
  );
};
