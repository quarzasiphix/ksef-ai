import React from 'react';
import { Lock, Crown, Zap } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { useAuth } from '@/shared/hooks/useAuth';
import { useCompanyPremiumStatus } from '../hooks/useSubscription';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  feature?: string;
  title?: string;
  description?: string;
  showUpgradeButton?: boolean;
  fallback?: React.ReactNode;
}

export const PremiumFeatureGate: React.FC<PremiumFeatureGateProps> = ({
  children,
  feature = "ta funkcja",
  title = "Funkcja Premium",
  description = "Odblokuj zaawansowane możliwości dla swojej firmy",
  showUpgradeButton = true,
  fallback
}) => {
  const { openPremiumDialog } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  const { hasPremium, isLoading } = useCompanyPremiumStatus(selectedProfileId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hasPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <CardTitle className="text-amber-800 dark:text-amber-200">{title}</CardTitle>
        <CardDescription className="text-amber-600 dark:text-amber-400">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Crown className="h-4 w-4" />
            <span>Dostępne z subskrypcją Premium</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4" />
            <span>Przyspiesz pracę o 80%</span>
          </div>
        </div>
        
        {showUpgradeButton && (
          <Button 
            onClick={openPremiumDialog}
            className="bg-amber-600 hover:bg-amber-700 text-white w-full"
          >
            <Crown className="h-4 w-4 mr-2" />
            Odblokuj Premium
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

interface PremiumFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
  businessProfileName?: string;
}

export const PremiumFeatureDialog: React.FC<PremiumFeatureDialogProps> = ({
  open,
  onOpenChange,
  feature = "ta funkcja",
  businessProfileName
}) => {
  const { openPremiumDialog } = useAuth();

  const handleUpgrade = () => {
    onOpenChange(false);
    openPremiumDialog();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">Funkcja Premium</DialogTitle>
          <DialogDescription className="text-center">
            {businessProfileName ? (
              <>
                {feature} wymaga subskrypcji Premium dla firmy <strong>{businessProfileName}</strong>
              </>
            ) : (
              <> {feature} wymaga subskrypcji Premium </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium">Co otrzymasz z Premium:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Pełną integrację z KSeF</li>
              <li>• Automatyczne generowanie faktur</li>
              <li>• Zaawansowane raporty i analizy</li>
              <li>• Wsparcie priorytetowe</li>
              <li>• Dostęp do API</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
              <div className="font-semibold text-blue-800 dark:text-blue-200">19 zł</div>
              <div className="text-xs text-blue-600 dark:text-blue-400">JDG / miesięcznie</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3">
              <div className="font-semibold text-purple-800 dark:text-purple-200">89 zł</div>
              <div className="text-xs text-purple-600 dark:text-purple-400">Spółka / miesięcznie</div>
            </div>
          </div>
          
          <Button onClick={handleUpgrade} className="w-full">
            <Crown className="h-4 w-4 mr-2" />
            Przejdź do Premium
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Hook for premium feature gating
export const usePremiumFeature = () => {
  const { selectedProfileId } = useBusinessProfile();
  const { hasPremium, isLoading } = useCompanyPremiumStatus(selectedProfileId);
  const { openPremiumDialog } = useAuth();

  const requirePremium = (callback?: () => void) => {
    if (isLoading) return false;
    
    if (hasPremium) {
      callback?.();
      return true;
    }
    
    openPremiumDialog();
    return false;
  };

  return {
    hasPremium,
    isLoading,
    requirePremium
  };
};
