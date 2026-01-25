import { useState } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { PremiumUpgradeDialog } from '../components/PremiumUpgradeDialog';

interface UsePremiumGuardOptions {
  businessName?: string;
  entityType?: 'jdg' | 'spolka';
  businessProfileId?: string;
}

export const usePremiumGuard = (options: UsePremiumGuardOptions = {}) => {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { user } = useAuth();

  const requirePremium = (callback?: () => void) => {
    if (!user) {
      // User not logged in
      return false;
    }
    
    // Store business profile ID for auto-selection in checkout
    if (options.businessProfileId) {
      sessionStorage.setItem('premiumCheckoutBusinessId', options.businessProfileId);
    }
    
    // Show upgrade dialog
    setShowUpgradeDialog(true);
    return false;
  };

  const PremiumGuardComponent = () => (
    <PremiumUpgradeDialog
      open={showUpgradeDialog}
      onOpenChange={setShowUpgradeDialog}
      businessName={options.businessName}
      entityType={options.entityType}
    />
  );

  return {
    requirePremium,
    showUpgradeDialog,
    setShowUpgradeDialog,
    PremiumGuardComponent
  };
};
