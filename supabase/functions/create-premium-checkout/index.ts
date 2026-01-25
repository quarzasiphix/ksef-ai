import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { initializeStripe } from "../_shared/stripe-config.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  businessProfileIds: string[];
  billingCycle: 'monthly' | 'annual';
  subscriptionTypeId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { businessProfileIds, billingCycle, subscriptionTypeId }: CheckoutRequest = await req.json();

    if (!businessProfileIds || businessProfileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one business profile required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns all business profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('business_profiles')
      .select('id, name, entity_type')
      .in('id', businessProfileIds)
      .eq('user_id', user.id);

    if (profilesError || !profiles || profiles.length !== businessProfileIds.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid business profiles' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine subscription types for each business
    const lineItems = [];
    let totalAmount = 0;

    for (const profile of profiles) {
      // Determine subscription type based on entity_type
      let subType = 'jdg';
      if (profile.entity_type === 'sp_zoo' || profile.entity_type === 'sa') {
        subType = 'spolka';
      }

      // Get subscription type details
      const { data: subscriptionType } = await supabaseClient
        .from('subscription_types')
        .select('*')
        .eq('name', subType)
        .eq('is_active', true)
        .single();

      if (!subscriptionType) {
        return new Response(
          JSON.stringify({ error: `Subscription type ${subType} not found` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const price = billingCycle === 'annual' 
        ? subscriptionType.price_annual 
        : subscriptionType.price_monthly;

      lineItems.push({
        price_data: {
          currency: 'pln',
          product_data: {
            name: `${subscriptionType.display_name} - ${profile.name}`,
            description: `${billingCycle === 'annual' ? 'Roczny' : 'Miesięczny'} plan premium dla ${profile.name}`,
            metadata: {
              business_profile_id: profile.id,
              subscription_type: subType,
            },
          },
          recurring: {
            interval: billingCycle === 'annual' ? 'year' : 'month',
            interval_count: 1,
          },
          unit_amount: price,
        },
        quantity: 1,
      });

      totalAmount += price;
    }

    // Initialize Stripe
    const { stripe, mode } = await initializeStripe();
    console.log(`[create-premium-checkout] Creating checkout for ${profiles.length} businesses in ${mode} mode`);

    // Get or create Stripe customer
    let stripeCustomerId: string | undefined;
    const { data: existingCustomer } = await supabaseClient
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID
      await supabaseClient
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          stripe_customer_id: customer.id,
          email: user.email,
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card', 'blik', 'p24'],
      line_items: lineItems,
      success_url: `${Deno.env.get('APP_URL')}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/premium`,
      customer: stripeCustomerId,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        business_profile_ids: businessProfileIds.join(','),
        billing_cycle: billingCycle,
        business_count: businessProfileIds.length.toString(),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          business_profile_ids: businessProfileIds.join(','),
          billing_cycle: billingCycle,
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
    });

    // Log transaction
    await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        email: user.email,
        transaction_id: session.id,
        transaction_type: 'premium_subscription_checkout',
        payment_system: 'stripe',
        amount: totalAmount / 100,
        currency: 'pln',
        status: 'pending',
        metadata: {
          business_profile_ids: businessProfileIds,
          billing_cycle: billingCycle,
          business_count: businessProfileIds.length,
          stripe_mode: mode,
        },
      });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id,
        totalAmount,
        businessCount: businessProfileIds.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-premium-checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
