import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";

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

    // Get business profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('business_profiles')
      .select('*')
      .eq('id', businessProfileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || !profile.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ 
          status: 'not_started',
          chargesEnabled: false,
          payoutsEnabled: false,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_PROD') as string, {
      apiVersion: '2024-04-10',
    });

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_connect_account_id);

    const chargesEnabled = account.charges_enabled || false;
    const payoutsEnabled = account.payouts_enabled || false;
    const status = (chargesEnabled && payoutsEnabled) ? 'enabled' : 'pending';

    // Update database
    const { error: updateError } = await supabaseClient
      .from('business_profiles')
      .update({
        stripe_charges_enabled: chargesEnabled,
        stripe_payouts_enabled: payoutsEnabled,
        stripe_connect_status: status,
        stripe_onboarding_completed_at: (chargesEnabled && payoutsEnabled) ? new Date().toISOString() : null,
      })
      .eq('id', businessProfileId);

    if (updateError) {
      console.error('Error updating status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        status,
        chargesEnabled,
        payoutsEnabled,
        accountId: account.id,
        detailsSubmitted: account.details_submitted,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in stripe-connect-status:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
