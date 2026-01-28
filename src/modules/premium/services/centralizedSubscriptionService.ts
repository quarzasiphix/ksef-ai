import { supabase } from '@/integrations/supabase/client';

export interface UnifiedSubscription {
  id: string;
  user_id: string;
  business_profile_id?: string;
  subscription_type_id: string;
  subscription_level: 'user' | 'business' | 'enterprise';
  base_price: number;
  total_price: number;
  currency: string;
  billing_interval: 'month' | 'year';
  status: 'active' | 'inactive' | 'cancelled' | 'trial';
  starts_at: string;
  ends_at?: string;
  trial_ends_at?: string;
  cancelled_at?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;
  features: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  subscription_type?: SubscriptionType;
}

export interface SubscriptionType {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  level: 'user' | 'business' | 'enterprise';
  base_price: number;
  annual_price?: number;
  per_business_price?: number;
  features: Record<string, any>;
  permissions: Record<string, any>;
  icon?: string;
  color?: string;
  sort_order: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface PremiumAccessResult {
  hasAccess: boolean;
  level: 'free' | 'user' | 'business' | 'enterprise';
  subscriptionType?: string;
  features: Record<string, any>;
  expiresAt?: string;
  source: 'user_subscription' | 'business_subscription' | 'enterprise_subscription';
}

class CentralizedSubscriptionService {
  /**
   * Get comprehensive premium access for a user and business
   */
  async getPremiumAccess(userId: string, businessProfileId?: string): Promise<PremiumAccessResult> {
    console.log(`Getting premium access for user ${userId}, business ${businessProfileId}`);
    
    // 1. Check user-level subscriptions (admin, enterprise)
    const userSubscription = await this.getActiveUserSubscription(userId);
    
    // 2. Check business-level subscription if business provided
    const businessSubscription = businessProfileId 
      ? await this.getActiveBusinessSubscription(businessProfileId)
      : null;
    
    // 3. Determine access level and features
    if (userSubscription?.status === 'active') {
      console.log('Found active user subscription:', userSubscription.subscription_type?.name);
      
      if (userSubscription.subscription_level === 'enterprise') {
        // Enterprise covers all businesses
        return {
          hasAccess: true,
          level: 'enterprise',
          subscriptionType: userSubscription.subscription_type?.name,
          features: userSubscription.features || userSubscription.subscription_type?.features || {},
          expiresAt: userSubscription.ends_at,
          source: 'enterprise_subscription'
        };
      }
      
      if (userSubscription.subscription_level === 'user') {
        // User-level subscription (admin, manual client)
        return {
          hasAccess: true,
          level: 'user',
          subscriptionType: userSubscription.subscription_type?.name,
          features: userSubscription.features || userSubscription.subscription_type?.features || {},
          expiresAt: userSubscription.ends_at,
          source: 'user_subscription'
        };
      }
    }
    
    // 4. Check business subscription
    if (businessSubscription?.status === 'active') {
      console.log('Found active business subscription:', businessSubscription.subscription_type?.name);
      
      return {
        hasAccess: true,
        level: 'business',
        subscriptionType: businessSubscription.subscription_type?.name,
        features: businessSubscription.features || businessSubscription.subscription_type?.features || {},
        expiresAt: businessSubscription.ends_at,
        source: 'business_subscription'
      };
    }
    
    // 5. No active subscriptions found
    console.log('No active subscriptions found');
    return {
      hasAccess: false,
      level: 'free',
      features: {},
      source: 'user_subscription'
    };
  }

  /**
   * Get active user-level subscription
   */
  async getActiveUserSubscription(userId: string): Promise<UnifiedSubscription | null> {
    const { data, error } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        subscription_type:subscription_types(*)
      `)
      .eq('user_id', userId)
      .is('business_profile_id', null)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user subscription:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Get active business-level subscription
   */
  async getActiveBusinessSubscription(businessProfileId: string): Promise<UnifiedSubscription | null> {
    const { data, error } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        subscription_type:subscription_types(*)
      `)
      .eq('business_profile_id', businessProfileId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting business subscription:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<UnifiedSubscription[]> {
    const { data, error } = await supabase
      .from('unified_subscriptions')
      .select(`
        *,
        subscription_type:subscription_types(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create user-level subscription (admin, manual client)
   */
  async createUserSubscription(
    userId: string,
    subscriptionTypeName: string,
    options: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      metadata?: Record<string, any>;
      createdBy?: string;
    } = {}
  ): Promise<UnifiedSubscription> {
    // Get subscription type
    const subscriptionType = await this.getSubscriptionTypeByName(subscriptionTypeName);
    if (!subscriptionType || subscriptionType.level !== 'user') {
      throw new Error(`Invalid user subscription type: ${subscriptionTypeName}`);
    }

    const { data, error } = await supabase
      .from('unified_subscriptions')
      .insert({
        user_id: userId,
        subscription_type_id: subscriptionType.id,
        subscription_level: 'user',
        base_price: subscriptionType.base_price,
        total_price: subscriptionType.base_price,
        currency: 'PLN',
        billing_interval: 'month',
        status: 'active',
        starts_at: new Date().toISOString(),
        stripe_customer_id: options.stripeCustomerId,
        stripe_subscription_id: options.stripeSubscriptionId,
        features: subscriptionType.features,
        metadata: options.metadata || {},
        created_by: options.createdBy
      })
      .select(`
        *,
        subscription_type:subscription_types(*)
      `)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create user subscription');

    return data;
  }

  /**
   * Create business-level subscription
   */
  async createBusinessSubscription(
    userId: string,
    businessProfileId: string,
    subscriptionTypeName: string,
    options: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<UnifiedSubscription> {
    // Get subscription type
    const subscriptionType = await this.getSubscriptionTypeByName(subscriptionTypeName);
    if (!subscriptionType || subscriptionType.level !== 'business') {
      throw new Error(`Invalid business subscription type: ${subscriptionTypeName}`);
    }

    const { data, error } = await supabase
      .from('unified_subscriptions')
      .insert({
        user_id: userId,
        business_profile_id: businessProfileId,
        subscription_type_id: subscriptionType.id,
        subscription_level: 'business',
        base_price: subscriptionType.base_price,
        total_price: subscriptionType.base_price,
        currency: 'PLN',
        billing_interval: 'month',
        status: 'active',
        starts_at: new Date().toISOString(),
        stripe_customer_id: options.stripeCustomerId,
        stripe_subscription_id: options.stripeSubscriptionId,
        features: subscriptionType.features,
        metadata: options.metadata || {}
      })
      .select(`
        *,
        subscription_type:subscription_types(*)
      `)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create business subscription');

    return data;
  }

  /**
   * Create enterprise subscription
   */
  async createEnterpriseSubscription(
    userId: string,
    subscriptionTypeName: string,
    options: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      billingInterval?: 'month' | 'year';
      metadata?: Record<string, any>;
    } = {}
  ): Promise<UnifiedSubscription> {
    // Get subscription type
    const subscriptionType = await this.getSubscriptionTypeByName(subscriptionTypeName);
    if (!subscriptionType || subscriptionType.level !== 'enterprise') {
      throw new Error(`Invalid enterprise subscription type: ${subscriptionTypeName}`);
    }

    // Calculate enterprise pricing
    const pricing = await this.calculateEnterprisePricing(userId);
    const price = options.billingInterval === 'year' ? pricing.total_annual_price : pricing.total_monthly_price;

    const { data, error } = await supabase
      .from('unified_subscriptions')
      .insert({
        user_id: userId,
        subscription_type_id: subscriptionType.id,
        subscription_level: 'enterprise',
        base_price: pricing.base_price,
        total_price: price,
        currency: 'PLN',
        billing_interval: options.billingInterval || 'month',
        status: 'active',
        starts_at: new Date().toISOString(),
        stripe_customer_id: options.stripeCustomerId,
        stripe_subscription_id: options.stripeSubscriptionId,
        features: subscriptionType.features,
        metadata: {
          ...options.metadata,
          pricing: pricing,
          covers_all_businesses: true
        }
      })
      .select(`
        *,
        subscription_type:subscription_types(*)
      `)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create enterprise subscription');

    return data;
  }

  /**
   * Get subscription type by name
   */
  async getSubscriptionTypeByName(name: string): Promise<SubscriptionType | null> {
    const { data, error } = await supabase
      .from('subscription_types')
      .select('*')
      .eq('name', name)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Get all subscription types
   */
  async getSubscriptionTypes(): Promise<SubscriptionType[]> {
    const { data, error } = await supabase
      .from('subscription_types')
      .select('*')
      .eq('status', 'active')
      .order('sort_order');

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate enterprise pricing
   */
  async calculateEnterprisePricing(userId: string): Promise<{
    base_price: number;
    per_jdg_price: number;
    per_spolka_price: number;
    total_monthly_price: number;
    total_annual_price: number;
    company_count: number;
    jdg_count: number;
    spolka_count: number;
  }> {
    // Get user's businesses
    const { data: businesses, error } = await supabase
      .from('business_profiles')
      .select('id, name, entity_type, tax_id')
      .eq('user_id', userId);

    if (error) throw error;
    
    const basePrice = 5000; // 50 zł base in grosze
    const perJdgPrice = 1900; // 19 zł per JDG
    const perSpolkaPrice = 8900; // 89 zł per Spółka

    const jdgCount = businesses?.filter(c => c.entity_type === 'dzialalnosc').length || 0;
    const spolkaCount = businesses?.filter(c => c.entity_type === 'sp_zoo' || c.entity_type === 'sa').length || 0;
    const companyCount = businesses?.length || 0;

    const totalMonthlyPrice = basePrice + (jdgCount * perJdgPrice) + (spolkaCount * perSpolkaPrice);
    const totalAnnualPrice = totalMonthlyPrice * 12;

    return {
      base_price: basePrice,
      per_jdg_price: perJdgPrice,
      per_spolka_price: perSpolkaPrice,
      total_monthly_price: totalMonthlyPrice,
      total_annual_price: totalAnnualPrice,
      company_count: companyCount,
      jdg_count: jdgCount,
      spolka_count: spolkaCount
    };
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
    if (immediate) {
      await supabase
        .from('unified_subscriptions')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          ends_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
    } else {
      await supabase
        .from('unified_subscriptions')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
    }
  }
}

export const centralizedSubscriptionService = new CentralizedSubscriptionService();
