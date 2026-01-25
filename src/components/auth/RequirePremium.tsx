import React from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Crown, AlertCircle, Building2 } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useQuery } from '@tanstack/react-query';

interface RequirePremiumProps {
  children?: React.ReactNode;
  feature?: string;
}

const RequirePremium: React.FC<RequirePremiumProps> = ({ 
  children, 
  feature = "Ta funkcjonalność" 
}) => {
  const { user, supabase, openPremiumDialog } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();

  // Get current business profile
  const currentProfile = profiles?.find(p => p.id === selectedProfileId);
  const entityType = currentProfile?.entityType || 'dzialalnosc';
  const isJDG = entityType === 'dzialalnosc';
  const isSpolka = entityType === 'sp_zoo' || entityType === 'sa';

  // Fetch business profile premium status
  const { data: businessPremium } = useQuery({
    queryKey: ["businessPremium", selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return null;
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, subscription_tier, subscription_status, subscription_ends_at")
        .eq("id", selectedProfileId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProfileId,
    staleTime: 60 * 1000,
  });

  const now = new Date();
  const isPremiumActive = businessPremium?.subscription_status === 'active';
  const premiumExpired = businessPremium?.subscription_ends_at && new Date(businessPremium.subscription_ends_at) < now;
  const isTrialing = businessPremium?.subscription_status === 'trial';

  // Entity-specific pricing
  const planPrice = isJDG ? '19 zł' : '89 zł';
  const planName = isJDG ? 'JDG Premium' : 'Spółka Premium';

  const title = premiumExpired
    ? "Subskrypcja Premium wygasła"
    : isTrialing
    ? "Okres próbny aktywny"
    : "Funkcja Premium";

  const description = premiumExpired
    ? `${feature} była dostępna w ramach subskrypcji dla ${currentProfile?.name || 'tej firmy'}, która wygasła.`
    : isTrialing
    ? `${feature} jest dostępna w ramach okresu próbnego. Aktywuj pełną subskrypcję, aby kontynuować po zakończeniu okresu próbnego.`
    : `${feature} jest dostępna tylko w planie ${planName} (${planPrice}/miesiąc) dla ${currentProfile?.name || 'tej firmy'}.`;

  return (
    <Card className={`max-w-md mx-auto ${
      isJDG 
        ? 'border-emerald-200 dark:border-emerald-800' 
        : 'border-amber-200 dark:border-amber-800'
    }`}>
      <CardHeader className="text-center">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
          premiumExpired 
            ? 'bg-red-100' 
            : isJDG 
              ? 'bg-emerald-100' 
              : 'bg-amber-100'
        }`}>
          {premiumExpired ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <Crown className={`h-6 w-6 ${
              isJDG ? 'text-emerald-600' : 'text-amber-600'
            }`} />
          )}
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
        {!isPremiumActive && (
          <div className={`mt-4 p-3 rounded-lg ${
            isJDG 
              ? 'bg-emerald-50 dark:bg-emerald-950/20' 
              : 'bg-amber-50 dark:bg-amber-950/20'
          }`}>
            <div className="text-2xl font-bold">{planPrice}</div>
            <div className="text-xs text-muted-foreground">za miesiąc</div>
          </div>
        )}
      </CardHeader>
      <CardContent className="text-center space-y-2">
        <Button 
          className={`w-full ${
            isJDG
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
              : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700'
          }`}
          onClick={openPremiumDialog}
        >
          {premiumExpired ? "Odnów Premium" : isTrialing ? "Aktywuj pełną subskrypcję" : `Aktywuj ${planName}`}
        </Button>
        {children}
      </CardContent>
    </Card>
  );
};

export default RequirePremium;
