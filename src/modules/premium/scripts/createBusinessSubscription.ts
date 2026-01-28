import { supabase } from '@/integrations/supabase/client';
import { subscriptionService } from '@/shared/services/subscriptionService';

/**
 * Create a business-level subscription for a user
 * This is used when a user loses enterprise access but should have business premium
 */
export async function createBusinessSubscription(
  userId: string, 
  businessProfileId: string,
  subscriptionType: 'jdg' | 'spolka'
): Promise<void> {
  console.log(`Creating business subscription for user ${userId}, profile ${businessProfileId}, type ${subscriptionType}`);

  try {
    // Get subscription type details
    const subType = await subscriptionService.getSubscriptionTypeByName(subscriptionType);
    if (!subType) {
      throw new Error(`Subscription type ${subscriptionType} not found`);
    }

    // Check if business subscription already exists
    const existing = await subscriptionService.getCompanySubscription(businessProfileId);
    if (existing?.is_active) {
      console.log('Business subscription already exists and is active');
      return;
    }

    // Create a mock business subscription (without Stripe for now)
    const { data, error } = await supabase
      .from('enhanced_subscriptions')
      .insert({
        user_id: userId,
        business_profile_id: businessProfileId,
        subscription_type_id: subType.id,
        subscription_level: 'company',
        is_active: true,
        starts_at: new Date().toISOString(),
        // No Stripe info for now - this is a manual creation
        metadata: {
          created_manually: true,
          reason: 'enterprise_downgrade'
        }
      })
      .select(`
        *,
        subscription_type:subscription_types(*)
      `)
      .single();

    if (error) {
      console.error('Error creating business subscription:', error);
      throw error;
    }

    console.log('Business subscription created successfully:', data);
  } catch (error) {
    console.error('Failed to create business subscription:', error);
    throw error;
  }
}

/**
 * Check all subscriptions for a user and their businesses
 */
export async function checkUserSubscriptionStatus(userId: string) {
  try {
    // Get all user's businesses
    const businesses = await subscriptionService.getUserCompanies(userId);
    console.log('User businesses:', businesses);

    // Get all user's subscriptions
    const subscriptions = await subscriptionService.getUserSubscriptions(userId);
    console.log('User subscriptions:', subscriptions);

    // Check enterprise subscription
    const enterpriseSub = await subscriptionService.getEnterpriseSubscription(userId);
    console.log('Enterprise subscription:', enterpriseSub);

    // Check business subscriptions for each business
    const businessSubscriptions = [];
    for (const business of businesses) {
      const businessSub = await subscriptionService.getCompanySubscription(business.id);
      businessSubscriptions.push({
        business,
        subscription: businessSub
      });
    }
    console.log('Business subscriptions:', businessSubscriptions);

    return {
      businesses,
      subscriptions,
      enterpriseSub,
      businessSubscriptions
    };
  } catch (error) {
    console.error('Error checking user subscription status:', error);
    throw error;
  }
}

/**
 * Fix user's subscription by creating business subscriptions if needed
 */
export async function fixUserSubscription(userId: string) {
  console.log(`Fixing subscription for user: ${userId}`);
  
  try {
    const status = await checkUserSubscriptionStatus(userId);
    
    // If user has enterprise, no fix needed
    if (status.enterpriseSub?.is_active) {
      console.log('User has active enterprise subscription, no fix needed');
      return;
    }

    // For each business without a subscription, create one
    for (const { business, subscription } of status.businessSubscriptions) {
      if (!subscription?.is_active) {
        const subscriptionType = business.entity_type === 'dzialalnosc' ? 'jdg' : 'spolka';
        console.log(`Creating ${subscriptionType} subscription for business: ${business.name}`);
        await createBusinessSubscription(userId, business.id, subscriptionType);
      }
    }

    console.log('Subscription fix completed');
  } catch (error) {
    console.error('Failed to fix user subscription:', error);
    throw error;
  }
}
