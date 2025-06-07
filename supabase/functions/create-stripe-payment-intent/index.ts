import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.11.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY_PROD');
  if (!stripeSecretKey) {
    return new Response(JSON.stringify({
      error: "Stripe secret key not configured"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-08-16',
    typescript: true,
    host: 'api.stripe.com',
    port: 443
  });
  try {
    const { amount, userId, currency = 'pln', description } = await req.json();
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
      },
      description: description || undefined,
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