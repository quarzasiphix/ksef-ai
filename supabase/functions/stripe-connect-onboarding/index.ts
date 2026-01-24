import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { initializeStripeConnect } from "../_shared/stripe-config.ts";
import type Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { businessProfileId } = await req.json();

    if (!businessProfileId) {
      return new Response(
        JSON.stringify({ error: 'Business profile ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get business profile with Stripe account
    const { data: profile, error: profileError } = await supabaseClient
      .from('business_profiles')
      .select('*')
      .eq('id', businessProfileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Business profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ error: 'Stripe account not created yet. Call create-account first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe Connect with centralized config
    const { stripe, mode } = await initializeStripeConnect();
    console.log(`[stripe-connect-onboarding] Using ${mode} mode`);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_connect_account_id,
      refresh_url: `${Deno.env.get('APP_URL')}/settings/business-profiles/${businessProfileId}/edit?stripe_refresh=1`,
      return_url: `${Deno.env.get('APP_URL')}/settings/business-profiles/${businessProfileId}/edit?stripe_success=1`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({ url: accountLink.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in stripe-connect-onboarding:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
