import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useBusinessProfile } from './BusinessProfileContext';
import PremiumCheckoutModal from '@/modules/premium/components/PremiumCheckoutModal';

/**
 * PremiumModalProvider - Renders the PremiumCheckoutModal with access to both Auth and BusinessProfile contexts
 * This component ensures the modal can access business profile information for entity-specific pricing
 */
export const PremiumModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isModalOpen, openPremiumDialog } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Sync modal state with AuthContext
  React.useEffect(() => {
    setIsOpen(isModalOpen);
  }, [isModalOpen]);

  const handleClose = () => {
    setIsOpen(false);
    // Note: The actual state management should be handled in AuthContext
    // This is just for local UI state
  };

  return (
    <>
      {children}
      {isOpen && (
        <PremiumCheckoutModal
          isOpen={isOpen}
          onClose={handleClose}
        />
      )}
    </>
  );
};
