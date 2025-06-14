
import { supabase } from "../client";

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

export async function startFreeTrial(userId: string): Promise<{ success: boolean; error?: any }> {
  // First, double-check eligibility server-side before inserting
  const isEligible = await checkTrialEligibility(userId);
  if (!isEligible) {
    return { success: false, error: new Error("User not eligible for a free trial.") };
  }
  
  const ends_at = new Date();
  ends_at.setDate(ends_at.getDate() + 7);

  const { error } = await supabase
    .from("premium_subscriptions")
    .insert({
      user_id: userId,
      is_active: true,
      ends_at: ends_at.toISOString(),
      // Use a special identifier to distinguish trials from paid subscriptions
      stripe_subscription_id: 'FREE_TRIAL',
    });

  if (error) {
    console.error("Error starting free trial:", error);
    return { success: false, error };
  }

  return { success: true };
}
