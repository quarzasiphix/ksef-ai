import React from 'react';
import RequirePremium from './RequirePremium';
import { useCapabilityCheck } from '@/shared/hooks/useSubscriptionAccess';

interface RequireCapabilityProps {
  capability: string;
  children?: React.ReactNode;
  feature?: string;
  fallback?: React.ReactNode;
}

/**
 * A wrapper component that conditionally renders children based on subscription capability.
 * 
 * Usage examples:
 * 
 * <RequireCapability capability="ksef_integration">
 *   <KSeFIntegrationComponent />
 * </RequireCapability>
 * 
 * <RequireCapability 
 *   capability="ai_document_recognition" 
 *   feature="Rozpoznawanie dokumentów AI"
 * >
 *   <AIDocumentProcessor />
 * </RequireCapability>
 * 
 * <RequireCapability 
 *   capability="multi_user" 
 *   fallback={<UpgradePrompt />}
 * >
 *   <TeamManagement />
 * </RequireCapability>
 */
export const RequireCapability: React.FC<RequireCapabilityProps> = ({ 
  capability, 
  children, 
  feature,
  fallback 
}) => {
  const { hasAccess, isLoading, needsUpgrade } = useCapabilityCheck(capability);

  // Show loading state while checking subscription
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // User has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User needs upgrade, show fallback or RequirePremium
  if (needsUpgrade) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Default to RequirePremium with capability-specific messaging
    const featureName = feature || getCapabilityDisplayName(capability);
    return <RequirePremium feature={featureName} />;
  }

  // Fallback case (shouldn't reach here, but just in case)
  if (fallback) {
    return <>{fallback}</>;
  }

  return <RequirePremium feature={feature || "Ta funkcjonalność"} />;
};

/**
 * Higher-order component version for wrapping existing components
 */
export function withCapabilityCheck<P extends object>(
  capability: string,
  feature?: string,
  fallback?: React.ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <RequireCapability 
        capability={capability} 
        feature={feature}
        fallback={fallback}
      >
        <WrappedComponent {...props} />
      </RequireCapability>
    );
  };
}

/**
 * Hook version for imperative capability checking
 */
export function useCapabilityGuard(capability: string) {
  const { hasAccess, isLoading, needsUpgrade, effectiveTier } = useCapabilityCheck(capability);
  
  const guard = React.useCallback((callbackToExecute?: () => void) => {
    if (isLoading) return false;
    if (hasAccess) {
      callbackToExecute?.();
      return true;
    }
    return false;
  }, [hasAccess, isLoading]);

  return {
    hasAccess,
    isLoading,
    needsUpgrade,
    effectiveTier,
    guard,
    canExecute: hasAccess && !isLoading,
  };
}

/**
 * Helper function to get display names for capabilities
 */
function getCapabilityDisplayName(capability: string): string {
  const displayNames: Record<string, string> = {
    'ksef_integration': 'Integracja KSeF',
    'jpk_exports': 'Eksport JPK',
    'ai_document_recognition': 'Rozpoznawanie dokumentów AI',
    'bank_integrations': 'Integracje bankowe',
    'multi_user': 'Wielu użytkowników',
    'custom_reports': 'Niestandardowe raporty',
    'api_access': 'Dostęp API',
    'advanced_analytics': 'Zaawansowana analityka',
    'document_ocr': 'OCR dokumentów',
    'automated_bookkeeping': 'Automatyczna księgowość',
    'governance_features': 'Funkcje governance',
    'decision_repository': 'Repozytorium uchwał',
    'risk_management': 'Zarządzanie ryzykiem',
    'custom_integrations': 'Niestandardowe integracje',
  };

  return displayNames[capability] || "Funkcja Premium";
}

export default RequireCapability;
