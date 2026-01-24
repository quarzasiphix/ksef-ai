/**
 * Hook to fetch Stripe products from database
 * Products are managed from admin panel
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  stripe_product_id_test: string | null;
  stripe_product_id_prod: string | null;
  stripe_price_id_test: string | null;
  stripe_price_id_prod: string | null;
  price_amount: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time';
  interval_count: number;
  is_active: boolean;
  plan_type: 'monthly' | 'annual' | 'lifetime';
  features: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useStripeProducts() {
  return useQuery({
    queryKey: ['stripe-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_products')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as StripeProduct[];
    },
  });
}

export function useStripeProduct(planType: string) {
  return useQuery({
    queryKey: ['stripe-product', planType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_products')
        .select('*')
        .eq('plan_type', planType)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as StripeProduct;
    },
    enabled: !!planType,
  });
}

/**
 * Get the appropriate Stripe price ID based on current app mode
 */
export async function getStripePriceId(product: StripeProduct): Promise<string | null> {
  // Fetch current mode from app_settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('stripe_mode')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  const mode = settings?.stripe_mode || 'test';

  return mode === 'live' 
    ? product.stripe_price_id_prod 
    : product.stripe_price_id_test;
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Get interval label in Polish
 */
export function getIntervalLabel(interval: string, count: number): string {
  if (interval === 'one_time') return 'jednorazowo';
  
  const labels: Record<string, string> = {
    month: count === 1 ? 'miesiąc' : 'miesięcy',
    year: count === 1 ? 'rok' : 'lat',
  };
  
  return count === 1 ? labels[interval] : `${count} ${labels[interval]}`;
}
