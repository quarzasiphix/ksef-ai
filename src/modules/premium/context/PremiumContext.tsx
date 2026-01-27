import React, { createContext, useContext, ReactNode } from 'react';
import { useCompanyPremiumStatus } from '../hooks/useSubscription';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

interface PremiumContextType {
  hasPremium: boolean;
  isLoading: boolean;
  canAccessFeature: (feature: string) => boolean;
  requirePremium: (feature?: string) => boolean;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const { selectedProfileId } = useBusinessProfile();
  const { hasPremium, isLoading } = useCompanyPremiumStatus(selectedProfileId);

  const canAccessFeature = (feature: string): boolean => {
    if (isLoading) return false;
    return hasPremium;
  };

  const requirePremium = (feature?: string): boolean => {
    if (isLoading) return false;
    return hasPremium;
  };

  const value: PremiumContextType = {
    hasPremium,
    isLoading,
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
  EXPORT_ADVANCED: 'export_advanced'
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];
