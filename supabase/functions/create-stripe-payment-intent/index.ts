import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
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

  // Initialize Stripe with centralized config
  const { stripe, mode } = await initializeStripe();
  console.log(`[create-stripe-payment-intent] Using ${mode} mode`);

  try {
    const { amount, userId, currency = 'pln', description, email } = await req.json();
    if (!amount || !userId) {
      return new Response(JSON.stringify({
        error: "Missing amount or userId"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // in the smallest currency unit (e.g., grosze)
      currency: currency,
      payment_method_types: ['blik'],
      metadata: {
        user_id: userId,
        description: description || '',
        ...(email ? { email } : {})
      },
      description: description || undefined,
      ...(email ? { receipt_email: email } : {}),
    });

    return new Response(JSON.stringify({
      clientSecret: paymentIntent.client_secret
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Stripe PaymentIntent creation failed:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}); 