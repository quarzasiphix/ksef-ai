import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionType {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  price_monthly_eur?: number;
  price_annual_eur?: number;
  price_per_business?: number;
  price_per_business_eur?: number;
  uses_tiered_pricing?: boolean;
  features: string[];
  is_active: boolean;
  display_order: number;
}

export const useSubscriptionTypes = () => {
  return useQuery({
    queryKey: ['subscription-types'],
    queryFn: async (): Promise<SubscriptionType[]> => {
      const { data, error } = await supabase
        .from('subscription_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) {
        console.error('Error fetching subscription types:', error);
        throw error;
      }

      return data as SubscriptionType[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useSubscriptionType = (name: string) => {
  return useQuery({
    queryKey: ['subscription-type', name],
    queryFn: async (): Promise<SubscriptionType | null> => {
      const { data, error } = await supabase
        .from('subscription_types')
        .select('*')
        .eq('name', name)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching subscription type:', error);
        return null;
      }

      return data as SubscriptionType;
    },
    enabled: !!name,
    staleTime: 5 * 60 * 1000,
  });
};
