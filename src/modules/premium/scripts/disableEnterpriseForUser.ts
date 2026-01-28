import { supabase } from '@/integrations/supabase/client';

/**
 * Disable enterprise subscription for a specific user
 * This will downgrade them to only have per-business premium access
 */
export async function disableEnterpriseForUser(userId: string) {
  console.log(`Disabling enterprise subscription for user: ${userId}`);

  try {
    // 1. Deactivate the enterprise subscription
    const { error: subError } = await supabase
      .from('enhanced_subscriptions')
      .update({ 
        is_active: false,
        ends_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('subscription_level', 'enterprise');

    if (subError) {
      console.error('Error deactivating enterprise subscription:', subError);
      throw subError;
    }

    // 2. Remove all enterprise benefits for this user
    const { error: benefitsError } = await supabase
      .from('enterprise_benefits')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('benefit_type', 'premium_access');

    if (benefitsError) {
      console.error('Error removing enterprise benefits:', benefitsError);
      throw benefitsError;
    }

    console.log(`Successfully disabled enterprise subscription for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to disable enterprise subscription:', error);
    throw error;
  }
}

/**
 * Check if user has enterprise subscription
 */
export async function checkEnterpriseSubscription(userId: string) {
  const { data, error } = await supabase
    .from('enhanced_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('subscription_level', 'enterprise')
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking enterprise subscription:', error);
    throw error;
  }

  return data;
}

// For the specific user mentioned in the issue
export async function disableEnterpriseForSpecificUser() {
  const userId = '6992a5f3-d1e7-4caf-ac2d-5ba2301028cc';
  
  try {
    const enterpriseSub = await checkEnterpriseSubscription(userId);
    
    if (enterpriseSub) {
      console.log('Found active enterprise subscription:', enterpriseSub);
      await disableEnterpriseForUser(userId);
      console.log('Enterprise subscription has been disabled');
    } else {
      console.log('No active enterprise subscription found for this user');
    }
  } catch (error) {
    console.error('Error in disableEnterpriseForSpecificUser:', error);
    throw error;
  }
}
