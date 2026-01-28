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

/**
 * RPC-based premium service that uses Supabase Edge Function
 * This provides a single source of truth for premium status checking
 */
class RpcPremiumService {
  /**
   * Check premium access using the RPC function
   * This is the most reliable method as it runs server-side
   */
  async getPremiumAccess(userId: string, businessProfileId?: string): Promise<PremiumAccessResult> {
    console.log(`[RpcPremiumService] Checking premium via RPC for user ${userId}, business ${businessProfileId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke<PremiumAccessResult>(
        'check-premium-access',
        {
          body: {
            userId,
            businessProfileId
          }
        }
      );

      if (error) {
        console.error('[RpcPremiumService] RPC error:', error);
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
        console.warn('[RpcPremiumService] No data returned from RPC');
        return {
          hasAccess: false,
          level: 'free',
          features: { basic_features: true },
          source: 'user_subscription',
          debugInfo: { error: 'No data returned' }
        };
      }

      console.log('[RpcPremiumService] RPC response:', data);
      return data;

    } catch (error) {
      console.error('[RpcPremiumService] Exception calling RPC:', error);
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
