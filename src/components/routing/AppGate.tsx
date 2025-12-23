import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { redirectToLogin, redirectToPremium } from '@/shared/utils/domainHelpers';

const AppLoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

interface AppGateProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requirePremium?: boolean;
  redirectTo?: string;
}

/**
 * AppGate - Centralized auth and redirect logic
 * 
 * Handles:
 * - Auth loading states
 * - Redirect decisions (authenticated vs unauthenticated)
 * - Domain bounce (redirect to parent domain if not authenticated)
 * - Logging (can be extended)
 * - Premium checks
 * 
 * This makes ProtectedRoute and other guards much simpler.
 */
export const AppGate: React.FC<AppGateProps> = ({
  children,
  requireAuth = false,
  requirePremium = false,
  redirectTo,
}) => {
  const { user, isLoading, isPremium, openPremiumDialog } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!user;

  useEffect(() => {
    // Log navigation for debugging (can be extended to analytics)
    console.log('[AppGate]', {
      path: location.pathname,
      isAuthenticated,
      isLoading,
      requireAuth,
      requirePremium,
    });
  }, [location.pathname, isAuthenticated, isLoading, requireAuth, requirePremium]);

  // Auth redirect effect - MUST be called unconditionally (Rules of Hooks)
  useEffect(() => {
    if (requireAuth && !isAuthenticated && !isLoading) {
      console.log('[AppGate] Auth required but not authenticated, redirecting to login with returnTo');
      redirectToLogin(); // Uses current URL as returnTo
    }
  }, [requireAuth, isAuthenticated, isLoading]);

  // Premium redirect effect - MUST be called unconditionally (Rules of Hooks)
  useEffect(() => {
    if (requirePremium && !isPremium && !isLoading) {
      console.log('[AppGate] Premium required but user not premium, redirecting to premium page');
      // Extract reason from path if possible
      const reason = location.pathname.split('/')[1]; // e.g., 'accounting', 'inventory'
      redirectToPremium(reason);
    }
  }, [requirePremium, isPremium, isLoading, location.pathname]);

  // Custom redirect effect - MUST be called unconditionally (Rules of Hooks)
  useEffect(() => {
    if (redirectTo) {
      navigate(redirectTo, { replace: true, state: { from: location } });
    }
  }, [redirectTo, navigate, location]);

  // Still loading auth state
  if (isLoading) {
    return <AppLoadingScreen />;
  }

  // Auth required but user not authenticated
  if (requireAuth && !isAuthenticated) {
    return <AppLoadingScreen />;
  }

  // Premium required but user doesn't have premium
  if (requirePremium && !isPremium) {
    return <AppLoadingScreen />;
  }

  // Custom redirect
  if (redirectTo) {
    return <AppLoadingScreen />;
  }

  // All checks passed, render children
  return <>{children};</>;
};

/**
 * Convenience wrapper for protected routes
 */
export const ProtectedGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AppGate requireAuth={true}>{children}</AppGate>;
};

/**
 * Convenience wrapper for premium routes
 */
export const PremiumGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AppGate requireAuth={true} requirePremium={true}>{children}</AppGate>;
};

/**
 * Public gate - redirects authenticated users to dashboard
 */
export const PublicGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      console.log('[PublicGate] User authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true, state: { from: location } });
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (user) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
};

export default AppGate;
