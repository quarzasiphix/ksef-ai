import { supabase } from '@/integrations/supabase/client';
import { Stripe } from 'stripe';

export interface SubscriptionType {
  id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  features: string[];
  is_active: boolean;
}

export interface EnhancedSubscription {
  id: string;
  user_id: string;
  business_profile_id?: string;
  subscription_type_id: string;
  subscription_level: 'user' | 'company' | 'enterprise';
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  is_active: boolean;
  starts_at: string;
  ends_at?: string;
  trial_ends_at?: string;
  cancel_at_period_end: boolean;
  metadata: Record<string, any>;
  subscription_type?: SubscriptionType;
}

export interface EnterpriseBenefit {
  id: string;
  user_id: string;
  business_profile_id?: string;
  benefit_type: string;
  is_active: boolean;
  granted_at: string;
  expires_at?: string;
  granted_by_subscription_id: string;
}

export interface CompanyInfo {
  id: string;
  name: string;
  entity_type: 'dzialalnosc' | 'sp_zoo' | 'sa';
  tax_id: string;
}

export interface EnterprisePricing {
  base_price: number;
  per_jdg_price: number;
  per_spolka_price: number;
  total_monthly_price: number;
  total_annual_price: number;
  company_count: number;
  jdg_count: number;
  spolka_count: number;
}

class SubscriptionService {
  /**
   * Get all available subscription types
   */
  async getSubscriptionTypes(): Promise<SubscriptionType[]> {
    const { data, error } = await supabase
      .from('subscription_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's subscriptions across all levels with dynamic is_active calculation
   */
  async getUserSubscriptions(userId: string): Promise<EnhancedSubscription[]> {
    try {
      // Direct query without nested select
      const { data, error } = await supabase
        .from('enhanced_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user subscriptions:', error);
        return [];
      }
      
      if (!data || data.length === 0) return [];
      
      // Fetch subscription types separately
      const typeIds = [...new Set(data.map(sub => sub.subscription_type_id).filter(Boolean))];
      const { data: types } = await supabase
        .from('subscription_types')
        .select('*')
        .in('id', typeIds);
      
      const typesMap = new Map(types?.map(t => [t.id, t]) || []);
      
      // Calculate is_active dynamically and attach subscription types
      return data.map(sub => ({
        ...sub,
        is_active: this.calculateIsActive(sub),
        subscription_type: sub.subscription_type_id ? typesMap.get(sub.subscription_type_id) : undefined
      }));
    } catch (error) {
      console.error('Exception in getUserSubscriptions:', error);
      return [];
    }
  }

  /**
   * Calculate is_active dynamically based on dates
   */
  private calculateIsActive(subscription: any): boolean {
    const now = new Date();
    
    // Check if subscription has started
    if (subscription.starts_at && new Date(subscription.starts_at) > now) {
      return false;
    }
    
    // Check if subscription has ended
    if (subscription.ends_at && new Date(subscription.ends_at) <= now) {
      return false;
    }
    
    // If there's a trial end date and it's in the past, subscription is inactive
    if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) <= now && !subscription.ends_at) {
      return false;
    }
    
    return true;
  }

  /**
   * Get user's active enterprise subscription
   */
  async getEnterpriseSubscription(userId: string): Promise<EnhancedSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('enhanced_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('subscription_level', 'enterprise')
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching enterprise subscription:', error);
        return null;
      }
      
      if (!data) return null;
      
      // Fetch subscription type separately if needed
      if (data.subscription_type_id) {
        const { data: subType } = await supabase
          .from('subscription_types')
          .select('*')
          .eq('id', data.subscription_type_id)
          .maybeSingle();
        
        if (subType) {
          return { ...data, subscription_type: subType };
        }
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getEnterpriseSubscription:', error);
      return null;
    }
  }

  /**
   * Get company-level subscription
   */
  async getCompanySubscription(businessProfileId: string): Promise<EnhancedSubscription | null> {
    console.log(`Getting company subscription for profile: ${businessProfileId}`);
    
    try {
      const { data, error } = await supabase
        .from('enhanced_subscriptions')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .eq('subscription_level', 'company')
        .eq('is_active', true)
        .maybeSingle();

      console.log('Company subscription query result:', { data, error });
      
      if (error) {
        console.error('Error getting company subscription:', error);
        return null;
      }
      
      if (!data) return null;
      
      // Fetch subscription type separately if needed
      if (data.subscription_type_id) {
        const { data: subType } = await supabase
          .from('subscription_types')
          .select('*')
          .eq('id', data.subscription_type_id)
          .maybeSingle();
        
        if (subType) {
          return { ...data, subscription_type: subType };
        }
      }
      
      return data;
    } catch (error) {
      console.error('Exception in getCompanySubscription:', error);
      return null;
    }
  }

  /**
   * Get all companies for a user
   */
  async getUserCompanies(userId: string): Promise<CompanyInfo[]> {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('id, name, entity_type, tax_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Calculate enterprise pricing based on user's companies
   */
  async calculateEnterprisePricing(userId: string): Promise<EnterprisePricing> {
    const companies = await this.getUserCompanies(userId);
    
    const basePrice = 5000; // 50 zł base in grosze
    const perJdgPrice = 1900; // 19 zł per JDG
    const perSpolkaPrice = 8900; // 89 zł per Spółka

    const jdgCount = companies.filter(c => c.entity_type === 'dzialalnosc').length;
    const spolkaCount = companies.filter(c => c.entity_type === 'sp_zoo' || c.entity_type === 'sa').length;
    const companyCount = companies.length;

    const totalMonthlyPrice = basePrice + (jdgCount * perJdgPrice) + (spolkaCount * perSpolkaPrice);
    const totalAnnualPrice = totalMonthlyPrice * 12; // Annual gets 2 months free effectively

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
   * Check if a business profile has premium access
   */
  async hasPremiumAccess(businessProfileId: string, userId: string): Promise<boolean> {
    // console.log(`Checking premium access for user ${userId}, profile ${businessProfileId}`); // Disabled to reduce console spam
    
    // Check company-level subscription
    const companySub = await this.getCompanySubscription(businessProfileId);
    // console.log('Company subscription:', companySub); // Disabled to reduce console spam
    if (companySub?.is_active) {
      // console.log('Found active company subscription'); // Disabled to reduce console spam
      return true;
    }

    // Check enterprise benefits
    const { data, error } = await supabase
      .from('enterprise_benefits')
      .select('*')
      .eq('user_id', userId)
      .eq('business_profile_id', businessProfileId)
      .eq('benefit_type', 'premium_access')
      .eq('is_active', true)
      .single();

    console.log('Enterprise benefits:', { data, error });
    if (error && error.code !== 'PGRST116') throw error;
    
    const hasEnterpriseBenefits = !!data;
    console.log('Has enterprise benefits:', hasEnterpriseBenefits);
    
    return hasEnterpriseBenefits;
  }

  /**
   * Assign enterprise benefits to all user's companies
   */
  async assignEnterpriseBenefits(userId: string, subscriptionId: string): Promise<void> {
    const companies = await this.getUserCompanies(userId);

    for (const company of companies) {
      await supabase
        .from('enterprise_benefits')
        .upsert({
          user_id: userId,
          business_profile_id: company.id,
          benefit_type: 'premium_access',
          is_active: true,
          granted_by_subscription_id: subscriptionId
        }, {
          onConflict: 'user_id, business_profile_id, benefit_type'
        });
    }
  }

  /**
   * Remove enterprise benefits from all user's companies
   */
  async removeEnterpriseBenefits(userId: string): Promise<void> {
    await supabase
      .from('enterprise_benefits')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('benefit_type', 'premium_access');
  }

  /**
   * Handle new business profile creation
   */
  async handleNewBusinessProfile(businessProfileId: string, userId: string): Promise<void> {
    // Check if user has enterprise subscription
    const enterpriseSub = await this.getEnterpriseSubscription(userId);
    
    if (enterpriseSub) {
      // Assign premium to new company
      await supabase
        .from('enterprise_benefits')
        .insert({
          user_id: userId,
          business_profile_id: businessProfileId,
          benefit_type: 'premium_access',
          is_active: true,
          granted_by_subscription_id: enterpriseSub.id
        });

      // Update enterprise subscription price
      await this.updateEnterpriseSubscriptionPrice(userId);
    }
  }

  /**
   * Update enterprise subscription price when company count changes
   */
  async updateEnterpriseSubscriptionPrice(userId: string): Promise<void> {
    const enterpriseSub = await this.getEnterpriseSubscription(userId);
    if (!enterpriseSub?.stripe_subscription_id) return;

    const pricing = await this.calculateEnterprisePricing(userId);
    
    // This would typically be called from a webhook or backend service
    // that can update the Stripe subscription
    console.log('Enterprise subscription price update needed:', {
      userId,
      newPrice: pricing.total_monthly_price,
      subscriptionId: enterpriseSub.stripe_subscription_id
    });
  }

  /**
   * Create enterprise subscription
   */
  async createEnterpriseSubscription(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    billingInterval: 'month' | 'year' = 'month'
  ): Promise<EnhancedSubscription> {
    const pricing = await this.calculateEnterprisePricing(userId);
    const subscriptionType = await this.getSubscriptionTypeByName('enterprise');
    
    if (!subscriptionType) {
      throw new Error('Enterprise subscription type not found');
    }

    const price = billingInterval === 'year' ? pricing.total_annual_price : pricing.total_monthly_price;

    const { data, error } = await supabase
      .from('enhanced_subscriptions')
      .insert({
        user_id: userId,
        subscription_type_id: subscriptionType.id,
        subscription_level: 'enterprise',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        is_active: true,
        metadata: {
          pricing: pricing,
          billing_interval: billingInterval,
          current_price: price
        }
      })
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create subscription');

    // Assign benefits to all companies
    await this.assignEnterpriseBenefits(userId, data.id);

    return data;
  }

  /**
   * Create company-level subscription
   */
  async createCompanySubscription(
    userId: string,
    businessProfileId: string,
    subscriptionTypeName: 'jdg' | 'spolka',
    stripeCustomerId: string,
    stripeSubscriptionId: string
  ): Promise<EnhancedSubscription> {
    const subscriptionType = await this.getSubscriptionTypeByName(subscriptionTypeName);
    
    if (!subscriptionType) {
      throw new Error(`${subscriptionTypeName} subscription type not found`);
    }

    const { data, error } = await supabase
      .from('enhanced_subscriptions')
      .insert({
        user_id: userId,
        business_profile_id: businessProfileId,
        subscription_type_id: subscriptionType.id,
        subscription_level: 'company',
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        is_active: true
      })
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create subscription');

    return data;
  }

  /**
   * Get subscription type by name
   */
  public async getSubscriptionTypeByName(name: string): Promise<SubscriptionType | null> {
    const { data, error } = await supabase
      .from('subscription_types')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediate = false): Promise<void> {
    if (immediate) {
      await supabase
        .from('enhanced_subscriptions')
        .update({ 
          is_active: false,
          ends_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
    } else {
      await supabase
        .from('enhanced_subscriptions')
        .update({ cancel_at_period_end: true })
        .eq('id', subscriptionId);
    }
  }

  /**
   * Get subscription usage statistics
   */
  async getSubscriptionUsage(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    let query = supabase
      .from('subscription_usage')
      .select('*')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('usage_date', startDate.toISOString().split('T')[0]);
    }
    if (endDate) {
      query = query.lte('usage_date', endDate.toISOString().split('T')[0]);
    }

    const { data, error } = await query.order('usage_date', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export const subscriptionService = new SubscriptionService();
