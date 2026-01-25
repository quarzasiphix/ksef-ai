import React from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Crown, AlertCircle, Building2, CheckCircle2, Star, Zap, Shield, Calculator, CreditCard, FileText, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { getBusinessPricing } from '@/shared/lib/subscription-utils';

interface RequirePremiumProps {
  children?: React.ReactNode;
  feature?: string;
}

const RequirePremium: React.FC<RequirePremiumProps> = ({ 
  children, 
  feature = "Ta funkcjonalność" 
}) => {
  const { openPremiumDialog } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();

  // Get current business profile
  const currentProfile = profiles?.find(p => p.id === selectedProfileId);
  const entityType = currentProfile?.entityType || 'dzialalnosc';
  const isJDG = entityType === 'dzialalnosc';
  const isSpolka = entityType === 'sp_zoo' || entityType === 'sa';

  // Get business-specific pricing
  const pricing = getBusinessPricing(entityType);

  const title = "Funkcja Premium";
  const description = `${feature} jest dostępna tylko w planie ${pricing.planName} (${pricing.planPrice}/miesiąc) dla ${currentProfile?.name || 'tej firmy'}.`;

  return (
    <Card className={`max-w-md mx-auto ${
      isJDG 
        ? 'border-emerald-200 dark:border-emerald-800' 
        : 'border-amber-200 dark:border-amber-800'
    }`}>
      <CardHeader className="text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          isJDG 
            ? 'bg-emerald-100' 
            : 'bg-amber-100'
        }`}>
          <Crown className={`h-6 w-6 ${
            isJDG ? 'text-emerald-600' : 'text-amber-600'
          }`} />
        </div>
        
        {/* Business Profile Info */}
        {currentProfile && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{currentProfile.name}</span>
            <Badge variant="secondary" className="text-xs">
              {isJDG ? 'JDG' : 'Spółka'}
            </Badge>
          </div>
        )}
        
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        
        {/* Pricing Display */}
        <div className={`mt-4 p-3 rounded-lg ${
          isJDG 
            ? 'bg-emerald-50 dark:bg-emerald-950/20' 
            : 'bg-amber-50 dark:bg-amber-950/20'
        }`}>
          <div className="text-2xl font-bold">{pricing.planPrice}</div>
          <div className="text-xs text-muted-foreground">za miesiąc</div>
        </div>
      </CardHeader>
      
      <CardContent className="text-center space-y-4">
        {/* Features List */}
        <div className="text-left space-y-2">
          <div className="text-sm font-medium text-muted-foreground mb-2">Co zyskasz z Premium:</div>
          <div className="space-y-1">
            {pricing.features.slice(0, 3).map((featureItem, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                <span>{featureItem}</span>
              </div>
            ))}
          </div>
          {pricing.features.length > 3 && (
            <div className="text-xs text-muted-foreground">
              +{pricing.features.length - 3} więcej funkcji
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button 
          className={`w-full ${
            isJDG
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700'
          }`}
          onClick={openPremiumDialog}
        >
          Aktywuj {pricing.planName} za {pricing.planPrice}/miesiąc
        </Button>
        
        {children}
      </CardContent>
    </Card>
  );
};

export default RequirePremium;
