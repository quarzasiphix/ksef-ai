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