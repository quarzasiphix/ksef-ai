
import { supabase } from "../../../integrations/supabase/client";
import { checkBusinessPremiumAccess } from "../../../shared/services/premiumService";
import { useBusinessProfile } from "../../../shared/context/BusinessProfileContext";

export async function checkPremiumStatus(userId: string): Promise<boolean> {
  try {
    // Get the user's selected business profile
    // Note: This is a temporary solution - ideally this should be called with businessProfileId
    const { data: profiles, error: profilesError } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .single();
    
    if (profilesError || !profiles) {
      console.error('No business profile found for user:', profilesError);
      return false;
    }
    
    // Check premium status using the new system
    const premiumStatus = await checkBusinessPremiumAccess(userId, profiles.id);
    return premiumStatus.has_premium;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

export async function checkTrialEligibility(userId: string): Promise<boolean> {
  try {
    // Check if user has any active business premium subscriptions
    const { count, error } = await supabase
      .from('business_premium_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      console.error("Error checking trial eligibility:", error);
      // Fail safely, don't offer trial if there's an error
      return false;
    }
    
    // If count is 0, user has never had a subscription and is eligible for a trial
    return count === 0;
  } catch (error) {
    console.error("Error checking trial eligibility:", error);
    return false;
  }
}
