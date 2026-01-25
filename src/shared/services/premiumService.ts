import { supabase } from '@/integrations/supabase/client';

export interface PremiumStatus {
  business_profile_id?: string;
  business_name?: string;
  entity_type?: string;
  user_id: string;
  user_tier?: string;
  user_covers_all_businesses?: boolean;
  user_status?: string;
  user_period_end?: string;
  business_tier?: string;
  business_status?: string;
  business_period_end?: string;
  legacy_status?: string;
  legacy_period_end?: string;
  has_premium: boolean;
  effective_tier: string;
  premium_source: string;
  covers_all_businesses: boolean;
}

export interface PremiumCheckResult {
  has_premium: boolean;
  tier: 'free' | 'premium' | 'enterprise';
  source: string;
  covers_all_businesses: boolean;
  business_tier: string;
}

/**
 * Check premium access for a specific business profile
 */
export async function checkBusinessPremiumAccess(
  userId: string,
  businessProfileId: string
): Promise<PremiumCheckResult> {
  try {
    const { data, error } = await supabase
      .rpc('check_business_premium_access', {
        p_user_id: userId,
        p_business_profile_id: businessProfileId
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking premium access:', error);
    return {
      has_premium: false,
      tier: 'free',
      source: 'error',
      covers_all_businesses: false,
      business_tier: 'free'
    };
  }
}

/**
 * Get premium status for all businesses of a user
 */
export async function getUserPremiumStatus(userId: string): Promise<PremiumStatus[]> {
  try {
    const { data, error } = await supabase
      .from('premium_status')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user premium status:', error);
    return [];
  }
}

/**
 * Check if user has enterprise (covers all businesses)
 */
export async function hasEnterpriseAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_premium_subscriptions')
      .select('tier, covers_all_businesses')
      .eq('user_id', userId)
      .eq('tier', 'enterprise')
      .eq('covers_all_businesses', true)
      .eq('status', 'active')
      .gt('current_period_end', new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error('Error checking enterprise access:', error);
    return false;
  }
}

/**
 * Create/update user premium subscription (for enterprise)
 */
export async function upsertUserPremiumSubscription(
  userId: string,
  tier: 'premium' | 'enterprise',
  coversAllBusinesses: boolean = false,
  stripeSubscriptionId?: string,
  currentPeriodStart?: string,
  currentPeriodEnd?: string
) {
  try {
    const { data, error } = await supabase
      .from('user_premium_subscriptions')
      .upsert({
        user_id: userId,
        tier,
        covers_all_businesses: coversAllBusinesses,
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting user premium subscription:', error);
    throw error;
  }
}

/**
 * Create/update business premium subscription
 */
export async function upsertBusinessPremiumSubscription(
  businessProfileId: string,
  userId: string,
  tier: 'premium',
  stripeSubscriptionId?: string,
  currentPeriodStart?: string,
  currentPeriodEnd?: string,
  planId?: string
) {
  try {
    const { data, error } = await supabase
      .from('business_premium_subscriptions')
      .upsert({
        business_profile_id: businessProfileId,
        user_id: userId,
        tier,
        stripe_subscription_id: stripeSubscriptionId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        plan_id: planId,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error upserting business premium subscription:', error);
    throw error;
  }
}

/**
 * Cancel premium subscription
 */
export async function cancelPremiumSubscription(
  type: 'user' | 'business',
  id: string,
  cancelAtPeriodEnd: boolean = false
) {
  try {
    const table = type === 'user' ? 'user_premium_subscriptions' : 'business_premium_subscriptions';
    
    const { data, error } = await supabase
      .from(table)
      .update({
        cancel_at_period_end: cancelAtPeriodEnd,
        canceled_at: cancelAtPeriodEnd ? null : new Date().toISOString(),
        status: cancelAtPeriodEnd ? 'active' : 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error canceling premium subscription:', error);
    throw error;
  }
}
