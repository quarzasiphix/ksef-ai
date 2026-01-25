import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/context/AuthContext';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  getEffectiveTier, 
  hasCapability, 
  getSubscriptionStatus, 
  getDaysRemaining, 
  getBusinessPricing,
  needsPremiumUpgrade,
  type BusinessSubscription,
  type UserSubscription,
  type EnhancedSubscription,
  type EnterpriseBenefit,
  type SubscriptionTier,
  type SubscriptionStatus
} from '@/shared/lib/subscription-utils';

export function useSubscriptionAccess() {
  const { user } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();

  // Get current business profile
  const currentProfile = profiles?.find(p => p.id === selectedProfileId);
  const entityType = currentProfile?.entityType || 'dzialalnosc';

  // Get user subscription metadata from enterprise benefits instead of auth.users
  const { data: userSubscription, isLoading: isLoadingUser } = useQuery({
    queryKey: ["userSubscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // For now, return a basic user subscription object
      // In the future, this could be enhanced to check user metadata differently
      return {
        enterprise_active: false,
        legacy_premium: false,
      } as UserSubscription;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  // Fetch business profile premium status
  const { data: businessSubscription, isLoading: isLoadingBusiness } = useQuery({
    queryKey: ["businessSubscription", selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return null;
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, subscription_tier, subscription_status, subscription_ends_at, subscription_starts_at")
        .eq("id", selectedProfileId)
        .single();
      if (error) throw error;
      return data as BusinessSubscription;
    },
    enabled: !!selectedProfileId,
    staleTime: 60 * 1000,
  });

  // Fetch enhanced subscription info
  const { data: enhancedSubscription, isLoading: isLoadingEnhanced } = useQuery({
    queryKey: ["enhancedSubscription", user?.id, selectedProfileId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("enhanced_subscriptions")
        .select(`
          id,
          user_id,
          business_profile_id,
          subscription_type_id,
          subscription_level,
          is_active,
          starts_at,
          ends_at,
          trial_ends_at,
          cancel_at_period_end,
          subscription_types (
            name,
            display_name,
            features
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      return data as (EnhancedSubscription & { subscription_types: any }) || null;
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  // Fetch enterprise benefits
  const { data: enterpriseBenefits, isLoading: isLoadingEnterprise } = useQuery({
    queryKey: ["enterpriseBenefits", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("enterprise_benefits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return data as EnterpriseBenefit[];
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  // Calculate effective tier and status
  const effectiveTier = getEffectiveTier(userSubscription, businessSubscription, enhancedSubscription, enterpriseBenefits);
  const subscriptionStatus = getSubscriptionStatus(businessSubscription, enhancedSubscription);
  const daysRemaining = getDaysRemaining(businessSubscription, enhancedSubscription);
  const pricing = getBusinessPricing(entityType);

  // Helper functions
  const checkCapability = (capability: string) => {
    return hasCapability(userSubscription, businessSubscription, capability, enhancedSubscription, enterpriseBenefits);
  };

  const checkUpgradeNeeded = (capability: string) => {
    return needsPremiumUpgrade(userSubscription, businessSubscription, capability, enhancedSubscription, enterpriseBenefits);
  };

  const isActive = effectiveTier !== 'free';
  const isExpired = subscriptionStatus === 'inactive';
  const isTrial = subscriptionStatus === 'trial';
  const isEnterprise = effectiveTier === 'enterprise';

  return {
    // Data
    userSubscription,
    businessSubscription,
    enhancedSubscription,
    enterpriseBenefits,
    currentProfile,
    effectiveTier,
    subscriptionStatus,
    daysRemaining,
    pricing,

    // States
    isActive,
    isExpired,
    isTrial,
    isEnterprise,
    isLoading: isLoadingUser || isLoadingBusiness || isLoadingEnhanced || isLoadingEnterprise,

    // Helper functions
    checkCapability,
    checkUpgradeNeeded,
    hasCapability: checkCapability,
    needsPremiumUpgrade: checkUpgradeNeeded,

    // Pricing info
    planName: pricing.planName,
    planPrice: pricing.planPrice,
    features: pricing.features,
  };
}

export function useCapabilityCheck(capability: string) {
  const { checkCapability, effectiveTier, isLoading } = useSubscriptionAccess();
  
  const hasAccess = checkCapability(capability);
  const upgradeInfo = useSubscriptionAccess().checkUpgradeNeeded(capability);
  
  return {
    hasAccess,
    effectiveTier,
    isLoading,
    needsUpgrade: upgradeInfo.needsUpgrade,
    currentTier: upgradeInfo.currentTier,
    requiredTier: upgradeInfo.requiredTier,
  };
}
