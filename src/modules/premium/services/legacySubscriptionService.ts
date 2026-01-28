import { supabase } from '@/integrations/supabase/client';

export interface PremiumAccessResult {
  hasAccess: boolean;
  level: 'free' | 'user' | 'business' | 'enterprise';
  subscriptionType?: string;
  features: Record<string, any>;
  expiresAt?: string;
  source: 'user_subscription' | 'business_subscription' | 'enterprise_subscription';
}

/**
 * Legacy subscription service that uses the existing premium_status view
 * This will be replaced by the centralized service once the migration is applied
 */
class LegacySubscriptionService {
  /**
   * Get premium access using the existing premium_status view
   */
  async getPremiumAccess(userId: string, businessProfileId?: string): Promise<PremiumAccessResult> {
    console.log(`[LegacySubscriptionService] Getting premium access for user ${userId}, business ${businessProfileId}`);
    
    if (!businessProfileId) {
      console.log('[LegacySubscriptionService] No business profile ID provided, returning free');
      // No business selected - check for user-level subscriptions only
      return {
        hasAccess: false,
        level: 'free',
        features: {},
        source: 'user_subscription'
      };
    }

    console.log(`[LegacySubscriptionService] Querying premium_status for user ${userId}, business ${businessProfileId}`);

    // Query the premium_status view for the specific business
    const { data, error } = await supabase
      .from('premium_status')
      .select('*')
      .eq('user_id', userId)
      .eq('business_profile_id', businessProfileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[LegacySubscriptionService] Error querying premium_status:', error);
      throw error;
    }

    if (!data) {
      console.log('[LegacySubscriptionService] No premium status found for this business');
      return {
        hasAccess: false,
        level: 'free',
        features: {},
        source: 'user_subscription'
      };
    }

    console.log('[LegacySubscriptionService] Premium status data:', data);

    const hasAccess = data.has_premium === 'true';
    const level = this.mapTierToLevel(data.effective_tier);
    const subscriptionType = data.business_tier || data.user_tier;
    const expiresAt = data.business_period_end || data.user_period_end;
    const source = this.mapSource(data.premium_source);

    console.log('[LegacySubscriptionService] Mapped result:', {
      hasAccess,
      level,
      subscriptionType,
      expiresAt,
      source
    });

    // Map features based on subscription type
    const features = this.getFeaturesForTier(data.effective_tier);

    return {
      hasAccess,
      level,
      subscriptionType,
      features,
      expiresAt,
      source
    };
  }

  /**
   * Map the tier string to our level enum
   */
  private mapTierToLevel(tier: string | null): 'free' | 'user' | 'business' | 'enterprise' {
    switch (tier) {
      case 'enterprise':
        return 'enterprise';
      case 'premium':
        return 'business';
      case 'admin':
      case 'manual_client':
        return 'user';
      case 'free':
      default:
        return 'free';
    }
  }

  /**
   * Map the premium source to our source enum
   */
  private mapSource(source: string): 'user_subscription' | 'business_subscription' | 'enterprise_subscription' {
    switch (source) {
      case 'enterprise_subscription':
        return 'enterprise_subscription';
      case 'business_subscription':
        return 'business_subscription';
      case 'user_subscription':
      default:
        return 'user_subscription';
    }
  }

  /**
   * Get features for a given tier
   */
  private getFeaturesForTier(tier: string | null): Record<string, any> {
    switch (tier) {
      case 'enterprise':
        return {
          all_features: true,
          unlimited_businesses: true,
          priority_support: true,
          custom_branding: true,
          ksef_integration: true,
          automated_invoices: true,
          advanced_reports: true,
          api_access: true,
          multi_currency: true,
          advanced_analytics: true,
          batch_operations: true,
          export_advanced: true
        };
      
      case 'premium':
        return {
          premium_features: true,
          ksef_integration: true,
          automated_invoices: true,
          advanced_reports: true,
          api_access: true,
          multi_currency: true,
          advanced_analytics: true,
          batch_operations: true,
          export_advanced: true
        };
      
      case 'admin':
        return {
          all_features: true,
          unlimited_businesses: true,
          priority_support: true,
          can_manage_users: true,
          can_manage_subscriptions: true,
          can_access_all_features: true
        };
      
      case 'manual_client':
        return {
          premium_features: true,
          unlimited_businesses: true,
          priority_support: true,
          ksef_integration: true,
          automated_invoices: true,
          advanced_reports: true,
          api_access: true,
          multi_currency: true,
          advanced_analytics: true,
          batch_operations: true,
          export_advanced: true
        };
      
      case 'free':
      default:
        return {
          basic_features: true
        };
    }
  }
}

export const legacySubscriptionService = new LegacySubscriptionService();
