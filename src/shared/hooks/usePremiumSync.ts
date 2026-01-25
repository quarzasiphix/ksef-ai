import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { premiumSyncService } from '@/shared/services/premiumSyncService';

interface PremiumSyncStatus {
  isActive: boolean;
  tier: string;
  token: string | null;
  isConnected: boolean;
  hasValidToken: boolean;
  tokenExpiry: Date | null;
  lastVerified: Date | null;
  isLoading: boolean;
}

/**
 * Hook for real-time premium verification with encrypted tokens
 * 
 * Features:
 * - Real-time subscription monitoring via WebSocket
 * - Server-side verification with encrypted tokens
 * - Auto-refresh before token expiry
 * - Prevents console manipulation
 * - Network resilient with auto-reconnect
 * 
 * Usage:
 * ```tsx
 * const { isActive, tier, token, forceVerify } = usePremiumSync();
 * 
 * if (!isActive) {
 *   return <RequirePremium />;
 * }
 * 
 * // Use token for premium API calls
 * await fetch('/api/premium-feature', {
 *   headers: { 'X-Premium-Token': token }
 * });
 * ```
 */
export function usePremiumSync(): PremiumSyncStatus & {
  forceVerify: () => Promise<boolean>;
  hasPremiumAccess: () => boolean;
} {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  
  const [status, setStatus] = useState<PremiumSyncStatus>({
    isActive: false,
    tier: 'free',
    token: null,
    isConnected: false,
    hasValidToken: false,
    tokenExpiry: null,
    lastVerified: null,
    isLoading: true,
  });

  // Initialize real-time sync when user and business are available
  useEffect(() => {
    if (!user?.id || !selectedProfileId) {
      setStatus(prev => ({
        ...prev,
        isActive: false,
        tier: 'free',
        token: null,
        isLoading: false,
      }));
      return;
    }

    let mounted = true;

    const initializeSync = async () => {
      try {
        await premiumSyncService.startRealtimeSync(user.id, selectedProfileId);
        
        if (mounted) {
          updateStatus();
        }
      } catch (error) {
        console.error('[usePremiumSync] Failed to initialize sync:', error);
        if (mounted) {
          setStatus(prev => ({ ...prev, isLoading: false }));
        }
      }
    };

    // Subscribe to status changes
    const unsubscribe = premiumSyncService.addListener((premiumStatus) => {
      if (mounted) {
        setStatus(prev => ({
          ...prev,
          isActive: premiumStatus.isActive,
          tier: premiumStatus.tier,
          lastVerified: premiumStatus.lastVerified,
          isLoading: false,
        }));
      }
    });

    initializeSync();

    // Cleanup on unmount
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.id, selectedProfileId]);

  // Update status from service
  const updateStatus = useCallback(() => {
    const serviceStatus = premiumSyncService.getStatus();
    const token = premiumSyncService.getToken();
    
    setStatus(prev => ({
      ...prev,
      token,
      isConnected: serviceStatus.isConnected,
      hasValidToken: serviceStatus.hasValidToken,
      tokenExpiry: serviceStatus.tokenExpiry,
      tier: serviceStatus.tier,
      isActive: serviceStatus.hasValidToken && serviceStatus.tier !== 'free',
      isLoading: false,
    }));
  }, []);

  // Periodically update status to keep UI in sync
  useEffect(() => {
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateStatus]);

  // Force verification (useful for manual refresh or testing)
  const forceVerify = useCallback(async () => {
    setStatus(prev => ({ ...prev, isLoading: true }));
    const result = await premiumSyncService.forceVerify();
    updateStatus();
    return result;
  }, [updateStatus]);

  // Helper to check premium access
  const hasPremiumAccess = useCallback(() => {
    return premiumSyncService.hasPremiumAccess();
  }, []);

  return {
    ...status,
    forceVerify,
    hasPremiumAccess,
  };
}

/**
 * Hook for checking a specific premium feature
 * 
 * Usage:
 * ```tsx
 * const { hasAccess, isLoading } = usePremiumFeature('advanced_analytics');
 * 
 * if (isLoading) return <Loading />;
 * if (!hasAccess) return <RequirePremium feature="advanced_analytics" />;
 * 
 * return <AdvancedAnalytics />;
 * ```
 */
export function usePremiumFeature(feature: string) {
  const { isActive, tier, token, isLoading } = usePremiumSync();
  
  // Define feature requirements
  const featureRequirements: Record<string, string[]> = {
    'advanced_analytics': ['jdg_premium', 'spolka_premium', 'enterprise'],
    'unlimited_invoices': ['jdg_premium', 'spolka_premium', 'enterprise'],
    'ksef_integration': ['jdg_premium', 'spolka_premium', 'enterprise'],
    'multi_business': ['enterprise'],
    'api_access': ['enterprise'],
    'priority_support': ['enterprise'],
  };

  const requiredTiers = featureRequirements[feature] || [];
  const hasAccess = isActive && requiredTiers.includes(tier);

  return {
    hasAccess,
    isActive,
    tier,
    token,
    isLoading,
    requiredTiers,
  };
}

/**
 * Hook for premium route protection
 * 
 * Usage:
 * ```tsx
 * function PremiumRoute({ children }: { children: React.ReactNode }) {
 *   const { isAllowed, isLoading } = usePremiumRoute();
 *   
 *   if (isLoading) return <Loading />;
 *   if (!isAllowed) return <Navigate to="/premium" />;
 *   
 *   return <>{children}</>;
 * }
 * ```
 */
export function usePremiumRoute() {
  const { isActive, isLoading } = usePremiumSync();
  
  return {
    isAllowed: isActive,
    isLoading,
  };
}

/**
 * Hook for getting premium token for API calls
 * 
 * Usage:
 * ```tsx
 * const { token, isValid } = usePremiumToken();
 * 
 * const response = await fetch('/api/premium-endpoint', {
 *   headers: {
 *     'Authorization': `Bearer ${authToken}`,
 *     'X-Premium-Token': token
 *   }
 * });
 * ```
 */
export function usePremiumToken() {
  const { token, hasValidToken, tokenExpiry } = usePremiumSync();
  
  return {
    token,
    isValid: hasValidToken,
    expiry: tokenExpiry,
  };
}
