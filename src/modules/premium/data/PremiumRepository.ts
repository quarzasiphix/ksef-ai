
import { supabase } from "../../../integrations/supabase/client";

export async function checkPremiumStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("premium_subscriptions")
    .select("id, ends_at, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return false;
  }
  if (data && data.is_active && (!data.ends_at || new Date(data.ends_at) > new Date())) {
    return true;
  } else {
    return false;
  }
}

export async function checkTrialEligibility(userId: string): Promise<boolean> {
  const { error, count } = await supabase
    .from("premium_subscriptions")
    .select("id", { count: 'exact', head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Error checking trial eligibility:", error);
    // Fail safely, don't offer trial if there's an error
    return false;
  }
  
  // If count is 0, user has never had a subscription and is eligible for a trial
  return count === 0;
}
