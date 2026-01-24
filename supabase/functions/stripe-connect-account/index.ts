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

    // Get authenticated user
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

    // Verify user owns this business profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('business_profiles')
      .select('*')
      .eq('id', businessProfileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Business profile not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe Connect with centralized config
    const { stripe, mode } = await initializeStripeConnect();
    console.log(`[stripe-connect-account] Using ${mode} mode`);

    // If account already exists, return it
    if (profile.stripe_connect_account_id) {
      return new Response(
        JSON.stringify({ 
          accountId: profile.stripe_connect_account_id,
          status: profile.stripe_connect_status,
          chargesEnabled: profile.stripe_charges_enabled,
          payoutsEnabled: profile.stripe_payouts_enabled,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'PL',
      email: profile.email || user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual', // or 'company' based on entity_type
      business_profile: {
        name: profile.name,
        support_email: profile.email || user.email,
      },
      metadata: {
        business_profile_id: businessProfileId,
        user_id: user.id,
      },
    });

    // Update database with new account ID
    const { error: updateError } = await supabaseClient
      .from('business_profiles')
      .update({
        stripe_connect_account_id: account.id,
        stripe_connect_status: 'pending',
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
      })
      .eq('id', businessProfileId);

    if (updateError) {
      console.error('Error updating business profile:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save account information' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        accountId: account.id,
        status: 'pending',
        chargesEnabled: false,
        payoutsEnabled: false,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in stripe-connect-account:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
