import { supabase } from '@/integrations/supabase/client';

export type SubscriptionTier = 'free' | 'jdg_premium' | 'spolka_premium';
export type UmbrellaType = 'enterprise' | 'legacy' | null;

export interface EffectiveTierResult {
  tier: SubscriptionTier | 'premium';
  source: 'enterprise_umbrella' | 'legacy_umbrella' | 'business_subscription' | 'free';
  umbrellaType?: UmbrellaType;
  businessTier?: SubscriptionTier;
}

/**
 * CANONICAL FUNCTION - Use this everywhere for premium checks
 * 
 * Hierarchy (backwards compatible):
 * 1. Enterprise umbrella (user-level) → PREMIUM for all businesses
 * 2. Legacy umbrella (user-level) → PREMIUM for all businesses  
 * 3. Business subscription → tier from business
 * 4. Default → FREE
 * 
 * This preserves existing behavior: user.has_premium → all businesses premium
 */
export async function getEffectiveTier(
  userId: string, 
  businessProfileId: string
): Promise<EffectiveTierResult> {
  
  // Check user umbrella status
  const { data: umbrellaStatus, error: umbrellaError } = await supabase
    .from('user_umbrella_status')
    .select('has_umbrella, umbrella_type')
    .eq('user_id', userId)
    .single();
  
  if (umbrellaError && umbrellaError.code !== 'PGRST116') {
    console.error('Error checking umbrella status:', umbrellaError);
  }
  
  // 1. Enterprise umbrella overrides everything
  if (umbrellaStatus?.umbrella_type === 'enterprise') {
    return {
      tier: 'premium',
      source: 'enterprise_umbrella',
      umbrellaType: 'enterprise'
    };
  }
  
  // 2. Legacy umbrella (backwards compatibility for existing users)
  if (umbrellaStatus?.umbrella_type === 'legacy') {
    return {
      tier: 'premium',
      source: 'legacy_umbrella',
      umbrellaType: 'legacy'
    };
  }
  
  // 3. Check business-level subscription
  const { data: business, error: businessError } = await supabase
    .from('business_profiles')
    .select('subscription_tier, subscription_status, trial_ends_at')
    .eq('id', businessProfileId)
    .single();
  
  if (businessError && businessError.code !== 'PGRST116') {
    console.error('Error checking business subscription:', businessError);
  }
  
  // Check if trial is active
  const isTrialActive = business?.trial_ends_at && new Date(business.trial_ends_at) > new Date();
  
  if ((business?.subscription_status === 'active' || isTrialActive) && business.subscription_tier && business.subscription_tier !== 'free') {
    return {
      tier: business.subscription_tier as SubscriptionTier,
      source: 'business_subscription',
      businessTier: business.subscription_tier as SubscriptionTier
    };
  }
  
  // 4. Default to free
  return {
    tier: 'free',
    source: 'free',
    businessTier: 'free'
  };
}

/**
 * Check if user/business has a specific capability
 * 
 * Capabilities are feature flags that can be checked granularly
 */
export async function hasCapability(
  userId: string,
  businessProfileId: string,
  capability: string
): Promise<boolean> {
  const { tier } = await getEffectiveTier(userId, businessProfileId);
  
  // Define capabilities per tier
  const capabilities: Record<string, string[]> = {
    free: [
      'basic_invoicing',
      'basic_expenses',
      'basic_customers',
      'basic_reports'
    ],
    jdg_premium: [
      'basic_invoicing',
      'basic_expenses',
      'basic_customers',
      'basic_reports',
      'advanced_accounting',
      'jpk_export',
      'ksef_integration',
      'tax_calculations',
      'pit_reports',
      'vat_reports'
    ],
    spolka_premium: [
      'basic_invoicing',
      'basic_expenses',
      'basic_customers',
      'basic_reports',
      'advanced_accounting',
      'jpk_export',
      'ksef_integration',
      'tax_calculations',
      'pit_reports',
      'vat_reports',
      'governance',
      'decisions',
      'asset_management',
      'shareholder_tracking',
      'cit_reports',
      'balance_sheet'
    ],
    premium: [
      // Umbrella users get all capabilities
      'basic_invoicing',
      'basic_expenses',
      'basic_customers',
      'basic_reports',
      'advanced_accounting',
      'jpk_export',
      'ksef_integration',
      'tax_calculations',
      'pit_reports',
      'vat_reports',
      'governance',
      'decisions',
      'asset_management',
      'shareholder_tracking',
      'cit_reports',
      'balance_sheet'
    ]
  };
  
  return capabilities[tier]?.includes(capability) ?? false;
}

/**
 * Simple boolean check - is this business premium?
 * 
 * Returns true if business has any premium tier (umbrella or business-level)
 */
export async function isPremium(
  userId: string,
  businessProfileId: string
): Promise<boolean> {
  const { tier } = await getEffectiveTier(userId, businessProfileId);
  return tier !== 'free';
}

/**
 * Check if user has umbrella subscription (enterprise or legacy)
 * 
 * Useful for showing "All businesses premium" badge
 */
export async function hasUmbrellaSubscription(userId: string): Promise<{
  hasUmbrella: boolean;
  umbrellaType: UmbrellaType;
}> {
  const { data: umbrellaStatus } = await supabase
    .from('user_umbrella_status')
    .select('has_umbrella, umbrella_type')
    .eq('user_id', userId)
    .single();
  
  return {
    hasUmbrella: umbrellaStatus?.has_umbrella ?? false,
    umbrellaType: umbrellaStatus?.umbrella_type as UmbrellaType ?? null
  };
}

/**
 * Get all businesses for a user with their effective tiers
 * 
 * Useful for subscription management UI
 */
export async function getUserBusinessesWithTiers(userId: string): Promise<Array<{
  id: string;
  name: string;
  entity_type: string;
  effectiveTier: EffectiveTierResult;
}>> {
  const { data: businesses } = await supabase
    .from('business_profiles')
    .select('id, name, entity_type')
    .eq('user_id', userId);
  
  if (!businesses) return [];
  
  const businessesWithTiers = await Promise.all(
    businesses.map(async (business) => ({
      ...business,
      effectiveTier: await getEffectiveTier(userId, business.id)
    }))
  );
  
  return businessesWithTiers;
}

/**
 * Subscribe a business to a tier
 * 
 * This creates a business-level subscription
 */
export async function subscribeBusinessToTier(
  businessProfileId: string,
  tier: 'jdg_premium' | 'spolka_premium',
  stripeSubscriptionId?: string,
  trialEndsAt?: Date
): Promise<void> {
  const { error } = await supabase
    .from('business_profiles')
    .update({
      subscription_tier: tier,
      subscription_status: trialEndsAt ? 'trial' : 'active',
      subscription_starts_at: new Date().toISOString(),
      trial_ends_at: trialEndsAt?.toISOString(),
      business_stripe_subscription_id: stripeSubscriptionId
    })
    .eq('id', businessProfileId);
  
  if (error) {
    throw new Error(`Failed to subscribe business: ${error.message}`);
  }
}

/**
 * Cancel business subscription
 */
export async function cancelBusinessSubscription(
  businessProfileId: string,
  immediate = false
): Promise<void> {
  const updates: any = {
    subscription_status: immediate ? 'inactive' : 'cancelled'
  };
  
  if (immediate) {
    updates.subscription_tier = 'free';
    updates.subscription_ends_at = new Date().toISOString();
  }
  
  const { error } = await supabase
    .from('business_profiles')
    .update(updates)
    .eq('id', businessProfileId);
  
  if (error) {
    throw new Error(`Failed to cancel business subscription: ${error.message}`);
  }
}

/**
 * Upgrade user to enterprise umbrella
 * 
 * This gives premium to all businesses
 */
export async function upgradeToEnterpriseUmbrella(
  userId: string,
  stripeSubscriptionId: string
): Promise<void> {
  // Use the new premium service to create enterprise subscription
  const { upsertUserPremiumSubscription } = await import('./premiumService');
  
  try {
    await upsertUserPremiumSubscription(
      userId,
      'enterprise',
      true, // covers all businesses
      stripeSubscriptionId,
      new Date().toISOString(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    );
  } catch (error) {
    throw new Error(`Failed to upgrade to enterprise: ${error.message}`);
  }
}
