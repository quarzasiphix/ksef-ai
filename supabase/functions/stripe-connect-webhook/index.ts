import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { initializeStripeConnect } from "../_shared/stripe-config.ts";
import type Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

console.log("Stripe Connect Webhook Edge Function started");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeWebhookSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeWebhookSecret || !supabaseServiceRoleKey) {
    console.error("Missing webhook secret or service role key");
    return new Response(
      JSON.stringify({ error: "Internal server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Initialize Stripe Connect with centralized config
  const { stripe, mode, webhookSecret } = await initializeStripeConnect();
  console.log(`[stripe-connect-webhook] Using ${mode} mode`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') as string,
    supabaseServiceRoleKey
  );

  let event: Stripe.Event;
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(
      JSON.stringify({ error: "No stripe-signature header found" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      stripeWebhookSecret
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`Processing event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session completed: ${session.id}`);

        const invoiceId = session.metadata?.invoice_id;
        const businessProfileId = session.metadata?.business_profile_id;

        if (!invoiceId || !businessProfileId) {
          console.error('Missing invoice_id or business_profile_id in metadata');
          return new Response(
            JSON.stringify({ received: true, message: "Missing metadata" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get payment intent ID
        const paymentIntentId = session.payment_intent as string;

        // Check if this event was already processed (idempotency)
        const { data: existingPayment } = await supabase
          .from('invoice_payments')
          .select('id')
          .eq('provider_event_id', event.id)
          .single();

        if (existingPayment) {
          console.log('Event already processed, skipping');
          return new Response(
            JSON.stringify({ received: true, message: "Already processed" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update or insert payment record
        const { data: payment, error: paymentError } = await supabase
          .from('invoice_payments')
          .select('*')
          .eq('provider_checkout_id', session.id)
          .single();

        if (payment) {
          // Update existing payment
          await supabase
            .from('invoice_payments')
            .update({
              status: 'succeeded',
              provider_payment_id: paymentIntentId,
              provider_event_id: event.id,
              succeeded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);
        } else {
          // Create new payment record (shouldn't happen but handle it)
          const { data: invoice } = await supabase
            .from('invoices')
            .select('user_id, amount_gross_minor, currency')
            .eq('id', invoiceId)
            .single();

          if (invoice) {
            await supabase
              .from('invoice_payments')
              .insert({
                invoice_id: invoiceId,
                business_profile_id: businessProfileId,
                user_id: invoice.user_id,
                provider: 'stripe',
                provider_payment_id: paymentIntentId,
                provider_checkout_id: session.id,
                provider_event_id: event.id,
                amount_minor: invoice.amount_gross_minor || Math.round(session.amount_total || 0),
                currency: invoice.currency || 'pln',
                status: 'succeeded',
                succeeded_at: new Date().toISOString(),
                metadata: session.metadata,
              });
          }
        }

        console.log(`Payment succeeded for invoice ${invoiceId}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment intent succeeded: ${paymentIntent.id}`);

        // Additional logging/tracking if needed
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment intent failed: ${paymentIntent.id}`);

        // Update payment record to failed
        const { data: payment } = await supabase
          .from('invoice_payments')
          .select('*')
          .eq('provider_payment_id', paymentIntent.id)
          .single();

        if (payment) {
          await supabase
            .from('invoice_payments')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Charge refunded: ${charge.id}`);

        // Find payment by payment_intent
        const { data: payment } = await supabase
          .from('invoice_payments')
          .select('*')
          .eq('provider_payment_id', charge.payment_intent as string)
          .single();

        if (payment) {
          await supabase
            .from('invoice_payments')
            .update({
              status: 'refunded',
              refunded_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        console.log(`Account updated: ${account.id}`);

        // Update business profile with account status
        await supabase
          .from('business_profiles')
          .update({
            stripe_charges_enabled: account.charges_enabled || false,
            stripe_payouts_enabled: account.payouts_enabled || false,
            stripe_connect_status: (account.charges_enabled && account.payouts_enabled) ? 'enabled' : 'pending',
          })
          .eq('stripe_connect_account_id', account.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
