import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

console.log("Socket/heartbeat Edge Function started");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Get the Supabase Service Role Key from env
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");

  if (!supabaseServiceRoleKey || !supabaseUrl) {
    return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse the request body for user_id (or get from JWT if you want)
  let userId: string | null = null;
  try {
    const body = await req.json();
    userId = body.user_id;
  } catch {
    return new Response(JSON.stringify({ error: "Missing or invalid user_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Check premium status
  const { data: premium, error: premiumError } = await supabase
    .from("premium_subscriptions")
    .select("id,ends_at,is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Check ban status (if you have a banned_users table)
  const { data: ban, error: banError } = await supabase
    .from("banned_users")
    .select("id,reason")
    .eq("user_id", userId)
    .maybeSingle();

  return new Response(
    JSON.stringify({
      premium: !!premium && (!premium.ends_at || new Date(premium.ends_at) > new Date()),
      premium_until: premium?.ends_at ?? null,
      banned: !!ban,
      ban_reason: ban?.reason ?? null,
      // Add more fields as needed (e.g., sessions, etc.)
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
