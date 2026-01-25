import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe for TEST mode
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY_TEST');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
    
    if (!secretKey) {
      console.error('[Premium Webhook V2] Stripe secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webhookSecret) {
      console.error('[Premium Webhook V2] Webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(secretKey, {
      apiVersion: '2024-04-10',
      typescript: true,
    });

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`[Premium Webhook V2] Received event: ${event.type}`);
    } catch (err) {
      console.error('[Premium Webhook V2] Signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`[Premium Webhook V2] Checkout completed: ${session.id}`);
        
        // Extract metadata from session
        const businessProfileIds = session.metadata?.business_profile_ids;
        const userId = session.metadata?.user_id;
        const tier = session.metadata?.tier || 'premium';
        const billingCycle = session.metadata?.billing_cycle || 'monthly';
        
        if (userId && businessProfileIds) {
          const businessIds = JSON.parse(businessProfileIds);
          
          // Create business premium subscriptions
          for (const businessId of businessIds) {
            await supabaseClient
              .from('business_premium_subscriptions')
              .upsert({
                business_profile_id: businessId,
                user_id: userId,
                tier: tier,
                stripe_subscription_id: session.subscription as string,
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                billing_cycle: billingCycle,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
          }
          
          console.log(`[Premium Webhook V2] Created premium subscriptions for user: ${userId}, businesses: ${businessIds.length}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Premium Webhook V2] Subscription updated: ${subscription.id}`);
        
        const status = subscription.status === 'active' ? 'active' : 'canceled';
        
        // Update business premium subscriptions
        await supabaseClient
          .from('business_premium_subscriptions')
          .update({
            status: status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
          
        console.log(`[Premium Webhook V2] Updated subscription status: ${subscription.id} -> ${status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Premium Webhook V2] Subscription deleted: ${subscription.id}`);
        
        // Cancel business premium subscriptions
        await supabaseClient
          .from('business_premium_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
          
        console.log(`[Premium Webhook V2] Canceled subscription: ${subscription.id}`);
        break;
      }

      default:
        console.log(`[Premium Webhook V2] Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Premium Webhook V2] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
