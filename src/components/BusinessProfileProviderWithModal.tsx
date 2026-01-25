import React from 'react';
import { BusinessProfileProvider } from '@/shared/context/BusinessProfileContext';
import { useAuth } from '@/shared/context/AuthContext';
import PremiumCheckoutModal from '@/modules/premium/components/PremiumCheckoutModal';

/**
 * BusinessProfileProviderWithModal - Wraps BusinessProfileProvider and renders PremiumCheckoutModal
 * This ensures the modal has access to both Auth and BusinessProfile contexts
 */
export const BusinessProfileProviderWithModal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isPremiumModalOpen, closePremiumDialog } = useAuth();
  
  return (
    <BusinessProfileProvider>
      {children}
      {isPremiumModalOpen && (
        <PremiumCheckoutModal
          isOpen={isPremiumModalOpen}
          onClose={closePremiumDialog}
        />
      )}
    </BusinessProfileProvider>
  );
};
