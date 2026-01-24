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
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing Stripe signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Stripe for LIVE mode only
    const { stripe, webhookSecret } = await initializeStripe();
    
    if (!webhookSecret) {
      console.error('[Stripe Webhook LIVE] Webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log(`[Stripe Webhook LIVE] Received event: ${event.type}`);
    } catch (err) {
      console.error('[Stripe Webhook LIVE] Signature verification failed:', err.message);
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
        console.log(`[Stripe Webhook LIVE] Checkout completed: ${session.id}`);
        
        // Update transaction status
        await supabaseClient
          .from('transactions')
          .update({ status: 'completed' })
          .eq('transaction_id', session.id);

        // Handle subscription creation
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = session.subscription as string;
          const userId = session.client_reference_id;
          
          if (userId) {
            // Create premium subscription record
            await supabaseClient
              .from('premium_subscriptions')
              .upsert({
                user_id: userId,
                stripe_subscription_id: subscriptionId,
                status: 'active',
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            // Update user premium status
            await supabaseClient
              .from('user_subscription_status')
              .upsert({
                user_id: userId,
                is_premium: true,
                subscription_id: subscriptionId,
                updated_at: new Date().toISOString(),
              });

            console.log(`[Stripe Webhook LIVE] Premium access granted to user: ${userId}`);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook LIVE] Subscription updated: ${subscription.id}`);
        
        // Update subscription status
        const status = subscription.status === 'active' ? 'active' : 'inactive';
        const userId = subscription.metadata?.user_id;
        
        if (userId) {
          await supabaseClient
            .from('premium_subscriptions')
            .update({
              status: status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          await supabaseClient
            .from('user_subscription_status')
            .update({
              is_premium: status === 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook LIVE] Subscription deleted: ${subscription.id}`);
        
        const userId = subscription.metadata?.user_id;
        
        if (userId) {
          // Mark subscription as cancelled
          await supabaseClient
            .from('premium_subscriptions')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          // Remove premium access
          await supabaseClient
            .from('user_subscription_status')
            .update({
              is_premium: false,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          console.log(`[Stripe Webhook LIVE] Premium access revoked for user: ${userId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook LIVE] Payment succeeded: ${invoice.id}`);
        
        // Update transaction if exists
        if (invoice.payment_intent) {
          await supabaseClient
            .from('transactions')
            .update({ status: 'completed' })
            .eq('transaction_id', invoice.payment_intent as string);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook LIVE] Payment failed: ${invoice.id}`);
        
        // Update transaction status
        if (invoice.payment_intent) {
          await supabaseClient
            .from('transactions')
            .update({ status: 'failed' })
            .eq('transaction_id', invoice.payment_intent as string);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook LIVE] Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Stripe Webhook LIVE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
