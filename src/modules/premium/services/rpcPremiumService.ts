import { supabase } from '@/integrations/supabase/client';

export interface PremiumAccessResult {
  hasAccess: boolean;
  level: 'free' | 'user' | 'business' | 'enterprise';
  subscriptionType?: string;
  features: Record<string, any>;
  expiresAt?: string;
  source: 'user_subscription' | 'business_subscription' | 'enterprise_subscription';
  debugInfo?: any;
}

interface VerifyPremiumResponse {
  verified: boolean;
  token?: string;
  expiry?: number;
  tier?: string;
  source?: string;
  message?: string;
}

/**
 * RPC-based premium service that uses Supabase Edge Function
 * This provides a single source of truth for premium status checking
 */
class RpcPremiumService {
  /**
   * Check premium access using the verify-premium-access Edge Function
   * This is the most reliable method as it runs server-side
   */
  async getPremiumAccess(userId: string, businessProfileId?: string): Promise<PremiumAccessResult> {
    // console.log(`[RpcPremiumService] Checking premium via Edge Function for user ${userId}, business ${businessProfileId}`); // Disabled to reduce console spam
    
    // If no business profile, return free tier
    if (!businessProfileId) {
      // console.log('[RpcPremiumService] No business profile provided, returning free tier'); // Disabled to reduce console spam
      return {
        hasAccess: false,
        level: 'free',
        features: { basic_features: true },
        source: 'user_subscription'
      };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke<VerifyPremiumResponse>(
        'verify-premium-access',
        {
          body: {
            businessId: businessProfileId
          }
        }
      );

      if (error) {
        // console.error('[RpcPremiumService] Edge Function error:', error); // Disabled to reduce console spam
        // Fallback to free on error
        return {
          hasAccess: false,
          level: 'free',
          features: { basic_features: true },
          source: 'user_subscription',
          debugInfo: { error: error.message }
        };
      }

      if (!data) {
        // console.warn('[RpcPremiumService] No data returned from Edge Function'); // Disabled to reduce console spam
        return {
          hasAccess: false,
          level: 'free',
          features: { basic_features: true },
          source: 'user_subscription',
          debugInfo: { error: 'No data returned' }
        };
      }

      // console.log('[RpcPremiumService] Edge Function response:', data); // Disabled to reduce console spam
      
      // Convert Edge Function response to PremiumAccessResult
      const tier = data.tier || 'free';
      const level = this.mapTierToLevel(tier);
      
      return {
        hasAccess: data.verified,
        level,
        features: this.getFeaturesForTier(tier),
        expiresAt: data.expiry ? new Date(data.expiry).toISOString() : undefined,
        source: this.mapSourceToSubscriptionSource(data.source),
        subscriptionType: tier,
        debugInfo: { 
          token: data.token,
          originalTier: tier,
          originalSource: data.source
        }
      };

    } catch (error) {
      console.error('[RpcPremiumService] Exception calling Edge Function:', error);
      // Fallback to free on exception
      return {
        hasAccess: false,
        level: 'free',
        features: { basic_features: true },
        source: 'user_subscription',
        debugInfo: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }
  
  /**
   * Map tier string to level enum
   */
  private mapTierToLevel(tier: string): 'free' | 'user' | 'business' | 'enterprise' {
    if (tier === 'enterprise') return 'enterprise';
    if (tier === 'spolka_premium') return 'business';
    if (tier === 'jdg_premium') return 'user';
    return 'free';
  }
  
  /**
   * Map source string to subscription source enum
   */
  private mapSourceToSubscriptionSource(source?: string): 'user_subscription' | 'business_subscription' | 'enterprise_subscription' {
    if (source === 'enterprise_benefits') return 'enterprise_subscription';
    if (source === 'enhanced_subscription') return 'business_subscription';
    if (source === 'business_profile') return 'business_subscription';
    if (source === 'business_premium_subscription') return 'business_subscription';
    if (source === 'user_premium_subscription') return 'user_subscription';
    return 'user_subscription';
  }
  
  /**
   * Get features for a given tier
   */
  private getFeaturesForTier(tier: string): Record<string, any> {
    const features: Record<string, any> = {
      basic_features: true
    };
    
    if (tier === 'free') {
      return features;
    }
    
    // Premium features
    if (tier === 'jdg_premium' || tier === 'spolka_premium' || tier === 'enterprise') {
      features.ksef_integration = true;
      features.automated_invoices = true;
      features.advanced_reports = true;
      features.multi_currency = true;
      features.priority_support = true;
      features.advanced_analytics = true;
      features.batch_operations = true;
      features.export_advanced = true;
    }
    
    // Enterprise-only features
    if (tier === 'enterprise') {
      features.api_access = true;
      features.custom_branding = true;
      features.unlimited_businesses = true;
      features.all_features = true;
      features.governance_features = true;
    }
    
    return features;
  }

  /**
   * Check if user has any premium access (user-level or enterprise)
   * This doesn't require a business profile
   */
  async hasUserLevelPremium(userId: string): Promise<boolean> {
    const result = await this.getPremiumAccess(userId);
    return result.hasAccess && (result.level === 'user' || result.level === 'enterprise');
  }

  /**
   * Check if a specific business has premium access
   */
  async hasBusinessPremium(userId: string, businessProfileId: string): Promise<boolean> {
    const result = await this.getPremiumAccess(userId, businessProfileId);
    return result.hasAccess;
  }
}

export const rpcPremiumService = new RpcPremiumService();
