import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/shared/services/subscriptionService';
import { useAuth } from '@/shared/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import { usePremiumSync } from '@/shared/hooks/usePremiumSync';

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: subscriptions,
    isLoading: subscriptionsLoading,
    error: subscriptionsError
  } = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: () => user ? subscriptionService.getUserSubscriptions(user.id) : Promise.resolve([]),
    enabled: !!user
  });

  // Use premium sync service instead of direct database queries
  const { isActive: hasEnterprise, tier, isLoading: enterpriseLoading } = usePremiumSync();
  
  // Create enterprise subscription object from sync service data
  const enterpriseSubscription = hasEnterprise && tier === 'enterprise' ? {
    id: 'sync-enterprise',
    user_id: user?.id,
    subscription_level: 'enterprise' as const,
    is_active: true,
    tier: 'enterprise'
  } : null;

  const {
    data: companies,
    isLoading: companiesLoading
  } = useQuery({
    queryKey: ['user-companies', user?.id],
    queryFn: () => user ? subscriptionService.getUserCompanies(user.id) : Promise.resolve([]),
    enabled: !!user
  });

  const {
    data: enterprisePricing,
    isLoading: pricingLoading
  } = useQuery({
    queryKey: ['enterprise-pricing', user?.id],
    queryFn: () => user ? subscriptionService.calculateEnterprisePricing(user.id) : Promise.resolve(null),
    enabled: !!user
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: ({ subscriptionId, immediate }: { subscriptionId: string; immediate?: boolean }) =>
      subscriptionService.cancelSubscription(subscriptionId, immediate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['enterprise-subscription'] });
      toast({
        title: 'Subscription cancelled',
        description: 'Your subscription has been cancelled successfully.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to cancel subscription: ${error.message}`,
        variant: 'destructive'
      });
    }
  });

  const hasActiveEnterprise = enterpriseSubscription?.is_active ?? false;
  const hasAnyActiveSubscription = subscriptions?.some(s => s.is_active) ?? false;

  return {
    subscriptions,
    enterpriseSubscription,
    companies,
    enterprisePricing,
    isLoading: subscriptionsLoading || enterpriseLoading || companiesLoading || pricingLoading,
    error: subscriptionsError,
    hasActiveEnterprise,
    hasAnyActiveSubscription,
    cancelSubscription: cancelSubscriptionMutation.mutate,
    isCancelling: cancelSubscriptionMutation.isPending
  };
};

export const useCompanyPremiumStatus = (businessProfileId?: string) => {
  const { user } = useAuth();
  
  // Use premium sync service instead of direct database queries
  const { isActive, tier, isLoading } = usePremiumSync();
  
  // Map sync service data to expected format
  const hasPremium = isActive && tier !== 'free';

  return {
    hasPremium,
    isLoading
  };
};

export const useSubscriptionTypes = () => {
  const { data: subscriptionTypes, isLoading } = useQuery({
    queryKey: ['subscription-types'],
    queryFn: () => subscriptionService.getSubscriptionTypes()
  });

  return {
    subscriptionTypes: subscriptionTypes ?? [],
    isLoading
  };
};
