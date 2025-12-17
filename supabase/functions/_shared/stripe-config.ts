/**
 * Shared Stripe Configuration Module
 * Dynamically selects Stripe keys based on app_settings.stripe_mode
 */

import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

export interface StripeConfig {
  stripe: Stripe;
  mode: 'test' | 'live';
  webhookSecret: string;
}

/**
 * Get current Stripe mode from app_settings table
 */
async function getStripeMode(): Promise<'test' | 'live'> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('app_settings')
      .select('stripe_mode')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    if (error) {
      console.error('Error fetching stripe_mode from app_settings:', error);
      return 'test'; // Default to test mode on error
    }

    return (data?.stripe_mode as 'test' | 'live') || 'test';
  } catch (error) {
    console.error('Exception fetching stripe_mode:', error);
    return 'test'; // Default to test mode on exception
  }
}

/**
 * Initialize Stripe with the correct keys based on app settings
 * For premium subscriptions (Billing)
 */
export async function initializeStripe(): Promise<StripeConfig> {
  const mode = await getStripeMode();
  
  console.log(`[Stripe Billing] Initializing in ${mode} mode`);

  // Select appropriate keys based on mode
  const secretKey = mode === 'live' 
    ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
    : Deno.env.get('STRIPE_SECRET_KEY_TEST');

  const webhookSecret = mode === 'live'
    ? Deno.env.get('STRIPE_WEBHOOK_SECRET_LIVE')
    : Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');

  if (!secretKey) {
    throw new Error(`Stripe ${mode} secret key not configured`);
  }

  if (!webhookSecret) {
    console.warn(`Stripe ${mode} webhook secret not configured`);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-04-10',
    typescript: true,
  });

  return {
    stripe,
    mode,
    webhookSecret: webhookSecret || '',
  };
}

/**
 * Initialize Stripe for Connect operations
 * For merchant payment processing
 */
export async function initializeStripeConnect(): Promise<StripeConfig> {
  const mode = await getStripeMode();
  
  console.log(`[Stripe Connect] Initializing in ${mode} mode`);

  const secretKey = mode === 'live' 
    ? Deno.env.get('STRIPE_SECRET_KEY_LIVE')
    : Deno.env.get('STRIPE_SECRET_KEY_TEST');

  const webhookSecret = mode === 'live'
    ? Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET_LIVE')
    : Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET_TEST');

  if (!secretKey) {
    throw new Error(`Stripe Connect ${mode} secret key not configured`);
  }

  if (!webhookSecret) {
    console.warn(`Stripe Connect ${mode} webhook secret not configured`);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2024-04-10',
    typescript: true,
  });

  return {
    stripe,
    mode,
    webhookSecret: webhookSecret || '',
  };
}

/**
 * Get app URL based on environment
 */
export function getAppUrl(): string {
  const mode = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development';
  
  if (mode === 'production') {
    return Deno.env.get('APP_URL') || 'https://yourdomain.com';
  }
  
  return Deno.env.get('APP_URL_DEV') || 'http://localhost:5173';
}

/**
 * Check if feature is enabled
 */
export async function isFeatureEnabled(featureName: string): Promise<boolean> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase.rpc('is_feature_enabled', {
      feature_name: featureName
    });

    if (error) {
      console.error(`Error checking feature ${featureName}:`, error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error(`Exception checking feature ${featureName}:`, error);
    return false;
  }
}

/**
 * Log admin action to audit trail
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('admin_audit_log').insert({
      admin_user_id: adminUserId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}
