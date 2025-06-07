import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

// Initialize Stripe with your secret key
// Ensure STRIPE_SECRET_KEY is set in your Supabase secrets
//const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_PROD') as string, {
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_TEST') as string, {
  apiVersion: '2024-04-10',
  typescript: true,
});

serve(async (req) => {
  // CORS handling (adjust origin as needed in production)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { priceId } = await req.json();

    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Price ID is required' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        status: 400,
      });
    }

    // Retrieve the price details from Stripe
    const price = await stripe.prices.retrieve(priceId, {
        expand: ['product'], // Optionally expand to get product details like name
    });

    // Check if the price or product is valid and active (optional but recommended)
    if (!price || !price.active || (price.product as Stripe.Product)?.active === false) {
         return new Response(JSON.stringify({ error: 'Invalid or inactive price ID' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            status: 400,
        });
    }

    return new Response(JSON.stringify(price), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching price:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      status: 500,
    });
  }
}); 