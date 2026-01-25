import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/context/AuthContext';
import { usePremium } from '@/shared/context/PremiumContext';
import { PremiumUpgradeDialog } from './PremiumUpgradeDialog';
import { usePremiumGuard } from '../hooks/usePremiumGuard';

interface PremiumRouteGuardProps {
  children: React.ReactNode;
  businessName?: string;
}

export const PremiumRouteGuard: React.FC<PremiumRouteGuardProps> = ({ 
  children, 
  businessName 
}) => {
  const { hasPremium } = usePremium();
  const { requirePremium, PremiumGuardComponent } = usePremiumGuard({ 
    businessName 
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasPremium) {
      // Store the attempted route for later redirect after premium purchase
      sessionStorage.setItem('redirectAfterPremium', location.pathname);
      requirePremium();
    }
  }, [hasPremium, location.pathname, requirePremium]);

  if (!hasPremium) {
    return <PremiumGuardComponent />;
  }

  return <>{children}</>;
};
