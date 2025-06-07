import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.11.0?target=deno"; // Using esm.sh for Deno compatibility

// Add CORS headers (you might want a shared file for this)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  //const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY_PROD');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY_TEST'); // test key
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
    // Provide a unique identifier for the server-side application
    // so that Stripe can accurately aggregate usage data.
    // See https://stripe.com/docs/building-integrations#sending-requests-to-stripe
    typescript: true,
    host: 'api.stripe.com',
    port: 443
  });
  try {
    const { priceId, userId, paymentMethod, email } = await req.json(); // Added email
    if (!priceId || !userId) {
      return new Response(JSON.stringify({
        error: "Missing priceId or userId"
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Determine mode based on payment method
    // Card payments use subscription mode, BLIK uses payment mode (one-off)
    const mode = paymentMethod === 'blik' ? 'payment' : 'subscription';
    
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: mode,
      success_url: `${req.headers.get('origin')}/settings?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/settings?status=cancelled`,
      metadata: {
        user_id: userId,
        payment_method: paymentMethod || 'card',
        ...(email ? { email } : {})
      },
      ...(email ? { customer_email: email } : {}),
    };

    // For BLIK payments, we can add specific payment method types
    if (paymentMethod === 'blik') {
      sessionConfig.payment_method_types = ['blik'];
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    
    return new Response(JSON.stringify({
      url: session.url
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Stripe checkout session creation failed:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
