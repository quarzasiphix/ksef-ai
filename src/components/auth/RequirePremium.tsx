import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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

  // Fetch latest subscription info
  const { data: lastSubscription } = useQuery({
    queryKey: ["lastSubscription", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("premium_subscriptions")
        .select("id, stripe_subscription_id, is_active, ends_at")
        .eq("user_id", user.id)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const now = new Date();
  const trialExpired = !!lastSubscription &&
    lastSubscription.stripe_subscription_id === "FREE_TRIAL" &&
    (!lastSubscription.is_active || (lastSubscription.ends_at && new Date(lastSubscription.ends_at) < now));

  const premiumExpired = !!lastSubscription &&
    lastSubscription.stripe_subscription_id !== "FREE_TRIAL" &&
    (!lastSubscription.is_active || (lastSubscription.ends_at && new Date(lastSubscription.ends_at) < now));

  const title = trialExpired
    ? "Darmowy okres próbny wygasł"
    : premiumExpired
    ? "Subskrypcja Premium wygasła"
    : "Funkcja Premium";

  const description = trialExpired
    ? `${feature} była dostępna w ramach okresu próbnego, który właśnie się zakończył.`
    : premiumExpired
    ? `${feature} była dostępna w ramach Twojej subskrypcji, która wygasła.`
    : `${feature} jest dostępna tylko dla użytkowników Premium`;

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          {trialExpired || premiumExpired ? (
            <AlertCircle className="h-6 w-6 text-red-600" />
          ) : (
            <Crown className="h-6 w-6 text-yellow-600" />
          )}
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-2">
        <Button className="w-full" onClick={openPremiumDialog}>
          {trialExpired ? "Kup Premium" : premiumExpired ? "Odnów Premium" : "Przejdź na Premium"}
        </Button>
        {children}
      </CardContent>
    </Card>
  );
};

export default RequirePremium;
