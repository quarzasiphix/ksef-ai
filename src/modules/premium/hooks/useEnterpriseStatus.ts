import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '@/shared/services/subscriptionService';
import { useAuth } from '@/shared/hooks/useAuth';

export const useEnterpriseStatus = () => {
  const { user } = useAuth();

  const {
    data: enterpriseSubscription,
    isLoading: enterpriseLoading
  } = useQuery({
    queryKey: ['enterprise-subscription', user?.id],
    queryFn: () => user ? subscriptionService.getEnterpriseSubscription(user.id) : Promise.resolve(null),
    enabled: !!user
  });

  const hasEnterprise = !!enterpriseSubscription?.is_active;

  return {
    hasEnterprise,
    enterpriseSubscription,
    isLoading: enterpriseLoading
  };
};
