import { BusinessProfile } from '@/shared/types';
import { User } from '@supabase/supabase-js';

export type SubscriptionTier = 'free' | 'jdg_premium' | 'spolka_premium' | 'enterprise';
export type SubscriptionStatus = 'active' | 'trial' | 'inactive' | 'cancelled' | 'past_due';

export interface BusinessSubscription {
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  subscription_ends_at?: string;
  subscription_starts_at?: string;
}

export interface EnterpriseBenefit {
  id: string;
  user_id: string;
  business_profile_id?: string;
  benefit_type: 'premium_access' | 'multi_business' | 'api_access' | 'priority_support';
  is_active: boolean;
  granted_at: string;
  expires_at?: string;
  granted_by_subscription_id?: string;
  metadata: Record<string, any>;
}

export interface UserSubscription {
  enterprise_active?: boolean;
  legacy_premium?: boolean; // For backward compatibility
  subscription_tier?: SubscriptionTier;
}

export interface EnhancedSubscription {
  id: string;
  user_id: string;
  business_profile_id?: string;
  subscription_type_id: string;
  subscription_level: 'user' | 'company' | 'enterprise';
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
  trial_ends_at?: string;
  cancel_at_period_end?: boolean;
}

export interface SubscriptionType {
  id: string;
  name: 'jdg' | 'spolka' | 'enterprise';
  display_name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  features: string[];
  is_active: boolean;
  display_order: number;
}

/**
 * Get the effective subscription tier for a business based on user and business subscriptions
 * Implements the hierarchy: Enterprise benefits > Enhanced subscription > Business subscription
 */
export function getEffectiveTier(
  user: UserSubscription | null | undefined,
  business: BusinessSubscription | null | undefined,
  enhancedSubscription?: EnhancedSubscription | null,
  enterpriseBenefits?: EnterpriseBenefit[] | null
): SubscriptionTier {
  if (!user) return 'free';
  
  // Enterprise benefits override everything
  if (enterpriseBenefits && enterpriseBenefits.length > 0) {
    const activeBenefits = enterpriseBenefits.filter(benefit => 
      benefit.is_active && 
      (!benefit.expires_at || new Date(benefit.expires_at) > new Date())
    );
    if (activeBenefits.length > 0) {
      return 'enterprise';
    }
  }
  
  // Legacy premium for backward compatibility
  if (user.legacy_premium) return 'jdg_premium'; // Default to JDG premium for legacy
  
  // Use enhanced subscription if available and active
  if (enhancedSubscription?.is_active) {
    if (enhancedSubscription.subscription_level === 'enterprise') return 'enterprise';
    if (enhancedSubscription.subscription_level === 'company') return 'spolka_premium';
    if (enhancedSubscription.subscription_level === 'user') return 'jdg_premium';
  }
  
  // Use business-level subscription
  if (business?.subscription_tier) {
    return business.subscription_tier;
  }
  
  return 'free';
}

/**
 * Check if a user has access to a specific capability based on effective tier
 */
export function hasCapability(
  user: UserSubscription | null | undefined,
  business: BusinessSubscription | null | undefined,
  capability: string,
  enhancedSubscription?: EnhancedSubscription | null,
  enterpriseBenefits?: EnterpriseBenefit[] | null
): boolean {
  const tier = getEffectiveTier(user, business, enhancedSubscription, enterpriseBenefits);
  
  // Define capability requirements
  const capabilityRequirements: Record<string, SubscriptionTier> = {
    'ksef_integration': 'jdg_premium',
    'jpk_exports': 'jdg_premium',
    'ai_document_recognition': 'jdg_premium',
    'bank_integrations': 'jdg_premium',
    'multi_user': 'enterprise',
    'custom_reports': 'enterprise',
    'api_access': 'enterprise',
    'advanced_analytics': 'jdg_premium',
    'document_ocr': 'jdg_premium',
    'automated_bookkeeping': 'jdg_premium',
    'governance_features': 'spolka_premium',
    'decision_repository': 'spolka_premium',
    'risk_management': 'enterprise',
    'custom_integrations': 'enterprise',
  };
  
  const requiredTier = capabilityRequirements[capability] || 'free';
  
  // Enterprise has access to everything
  if (tier === 'enterprise') return true;
  
  // Spółka premium has access to spolka and jdg features
  if (tier === 'spolka_premium') {
    return requiredTier !== 'enterprise';
  }
  
  // JDG premium has access to jdg features only
  if (tier === 'jdg_premium') {
    return requiredTier === 'free' || requiredTier === 'jdg_premium';
  }
  
  // Free only has access to free features
  return requiredTier === 'free';
}

/**
 * Get subscription status with trial and expiration handling
 */
export function getSubscriptionStatus(
  business: BusinessSubscription | null | undefined,
  enhancedSubscription?: EnhancedSubscription | null
): SubscriptionStatus {
  // Use enhanced subscription status if available
  if (enhancedSubscription?.is_active) {
    if (enhancedSubscription.trial_ends_at && new Date(enhancedSubscription.trial_ends_at) > new Date()) {
      return 'trial';
    }
    return 'active';
  }
  
  // Fall back to business subscription
  if (!business?.subscription_status) return 'inactive';
  
  const now = new Date();
  const endDate = business.subscription_ends_at ? new Date(business.subscription_ends_at) : null;
  
  // Check if subscription is active
  if (business.subscription_status === 'active' && (!endDate || endDate > now)) {
    return 'active';
  }
  
  // Check if trial is active
  if (business.subscription_status === 'trial' && endDate && endDate > now) {
    return 'trial';
  }
  
  // Check if expired
  if (endDate && endDate < now) {
    return 'inactive';
  }
  
  return business.subscription_status;
}

/**
 * Get days remaining in trial or subscription
 */
export function getDaysRemaining(
  business: BusinessSubscription | null | undefined,
  enhancedSubscription?: EnhancedSubscription | null
): number {
  // Use enhanced subscription trial if available
  if (enhancedSubscription?.trial_ends_at) {
    const trialEnd = new Date(enhancedSubscription.trial_ends_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
  
  // Fall back to business subscription
  if (!business) return 0;
  
  const now = new Date();
  const endDate = business.subscription_ends_at;
  
  if (!endDate) return 0;
  
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Get pricing information based on business entity type
 */
export function getBusinessPricing(entityType: string) {
  const isJDG = entityType === 'dzialalnosc';
  const isSpolka = entityType === 'sp_zoo' || entityType === 'sa';
  
  return {
    planName: isJDG ? 'JDG Premium' : isSpolka ? 'Spółka Standard' : 'Premium',
    planPrice: isJDG ? '19 zł' : isSpolka ? '89 zł' : '89 zł',
    planPriceNumeric: isJDG ? 19 : 89,
    features: isJDG ? [
      'Nieograniczone faktury',
      'Podstawowa księgowość',
      'Eksport JPK',
      'KSeF integracja',
    ] : [
      'System uchwał i decyzji',
      'Zarządzanie aktywami',
      'Decyzje powiązane z wydatkami',
      'Ścieżka audytu',
      'Śledzenie kapitału',
      'Nieograniczone dokumenty',
      'KSeF integracja',
    ],
    color: isJDG ? 'emerald' : 'amber',
    gradient: isJDG 
      ? 'from-emerald-500 to-emerald-600' 
      : 'from-amber-500 to-yellow-600',
  };
}

/**
 * Check if business needs premium upgrade based on current state
 */
export function needsPremiumUpgrade(
  user: UserSubscription | null | undefined,
  business: BusinessSubscription | null | undefined,
  capability: string,
  enhancedSubscription?: EnhancedSubscription | null,
  enterpriseBenefits?: EnterpriseBenefit[] | null
): { needsUpgrade: boolean; currentTier: SubscriptionTier; requiredTier: SubscriptionTier } {
  const currentTier = getEffectiveTier(user, business, enhancedSubscription, enterpriseBenefits);
  
  // Define capability requirements
  const capabilityRequirements: Record<string, SubscriptionTier> = {
    'ksef_integration': 'jdg_premium',
    'jpk_exports': 'jdg_premium',
    'ai_document_recognition': 'jdg_premium',
    'bank_integrations': 'jdg_premium',
    'multi_user': 'enterprise',
    'custom_reports': 'enterprise',
    'api_access': 'enterprise',
    'advanced_analytics': 'jdg_premium',
    'document_ocr': 'jdg_premium',
    'automated_bookkeeping': 'jdg_premium',
    'governance_features': 'spolka_premium',
    'decision_repository': 'spolka_premium',
    'risk_management': 'enterprise',
    'custom_integrations': 'enterprise',
  };
  
  const requiredTier = capabilityRequirements[capability] || 'free';
  const needsUpgrade = !hasCapability(user, business, capability, enhancedSubscription, enterpriseBenefits);
  
  return {
    needsUpgrade,
    currentTier,
    requiredTier,
  };
}

/**
 * Map subscription tier to display name
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const tierNames: Record<SubscriptionTier, string> = {
    'free': 'Darmowy',
    'jdg_premium': 'JDG Premium',
    'spolka_premium': 'Spółka Standard',
    'enterprise': 'Enterprise',
  };
  
  return tierNames[tier] || 'Darmowy';
}

/**
 * Check if user can access business-specific features
 */
export function canAccessBusinessFeatures(
  entityType: string,
  effectiveTier: SubscriptionTier
): boolean {
  const isSpolka = entityType === 'sp_zoo' || entityType === 'sa';
  
  if (isSpolka) {
    return effectiveTier === 'spolka_premium' || effectiveTier === 'enterprise';
  }
  
  // JDG can access features with JDG premium or higher
  return effectiveTier !== 'free';
}
