/**
 * Stripe Client Initialization
 * Dynamically loads Stripe with the correct publishable key based on app settings
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase } from '@/integrations/supabase/client';

let stripePromise: Promise<Stripe | null> | null = null;
let currentMode: 'test' | 'live' | null = null;

/**
 * Get Stripe instance with correct publishable key based on app settings
 */
export async function getStripe(): Promise<Stripe | null> {
  // Fetch current mode from app_settings
  const { data: settings } = await supabase
    .from('app_settings')
    .select('stripe_mode')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  const mode = (settings?.stripe_mode as 'test' | 'live') || 'test';

  // If mode changed or not initialized, reinitialize
  if (!stripePromise || currentMode !== mode) {
    currentMode = mode;
    
    const publishableKey = mode === 'live'
      ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
      : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST;

    if (!publishableKey) {
      console.error(`Stripe ${mode} publishable key not configured`);
      return null;
    }

    console.log(`[Stripe Client] Initializing in ${mode} mode`);
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

/**
 * Get current Stripe mode
 */
export async function getStripeMode(): Promise<'test' | 'live'> {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('stripe_mode')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .single();

  return (settings?.stripe_mode as 'test' | 'live') || 'test';
}
