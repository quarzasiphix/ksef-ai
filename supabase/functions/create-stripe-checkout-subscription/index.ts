import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { initializeStripe } from "../_shared/stripe-config.ts";
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
    // Get user from authorization header
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

    // Parse request body
    const { productId } = await req.json();
    if (!productId) {
      return new Response(
        JSON.stringify({ error: 'Product ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product from database
    const { data: product, error: productError } = await supabaseClient
      .from('stripe_products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Product not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current Stripe mode
    const { data: settings } = await supabaseClient
      .from('app_settings')
      .select('stripe_mode')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    const mode = settings?.stripe_mode || 'test';

    // Get appropriate price ID
    const priceId = mode === 'live' 
      ? product.stripe_price_id_prod 
      : product.stripe_price_id_test;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Stripe price ID not configured for ${mode} mode` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe with centralized config
    const { stripe } = await initializeStripe();
    console.log(`[create-stripe-checkout-subscription] Using ${mode} mode for product ${product.name}`);

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: product.interval === 'one_time' ? 'payment' : 'subscription',
      payment_method_types: ['card', 'blik', 'p24'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get('APP_URL')}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/premium`,
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        product_id: product.id,
        plan_type: product.plan_type,
      },
      subscription_data: product.interval !== 'one_time' ? {
        metadata: {
          user_id: user.id,
          product_id: product.id,
          plan_type: product.plan_type,
        },
      } : undefined,
    });

    // Log transaction
    await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        email: user.email,
        transaction_id: session.id,
        transaction_type: 'subscription_checkout',
        payment_system: 'stripe',
        amount: product.price_amount / 100,
        currency: product.currency,
        status: 'pending',
        metadata: {
          product_id: product.id,
          product_name: product.name,
          plan_type: product.plan_type,
          stripe_mode: mode,
        },
      });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-stripe-checkout-subscription:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
