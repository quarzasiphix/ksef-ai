import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2";
import { initializeStripe } from "../_shared/stripe-config.ts";
import type Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { stripe, webhookSecret } = await initializeStripe();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[handle-premium-webhook] Processing event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseClient, stripe, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabaseClient, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseClient, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(supabaseClient, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabaseClient, invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-premium-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCheckoutCompleted(
  supabaseClient: any,
  stripe: any,
  session: Stripe.Checkout.Session
) {
  console.log('[handleCheckoutCompleted] Processing checkout session:', session.id);

  const userId = session.metadata?.user_id;
  const businessProfileIds = session.metadata?.business_profile_ids?.split(',') || [];
  const billingCycle = session.metadata?.billing_cycle as 'monthly' | 'annual';

  if (!userId || businessProfileIds.length === 0) {
    console.error('Missing user_id or business_profile_ids in session metadata');
    return;
  }

  // Get the subscription
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Create enhanced subscriptions for each business profile
  for (const businessProfileId of businessProfileIds) {
    // Get business profile to determine subscription type
    const { data: profile } = await supabaseClient
      .from('business_profiles')
      .select('entity_type')
      .eq('id', businessProfileId)
      .single();

    let subType = 'jdg';
    let subscriptionLevel: 'user' | 'company' | 'enterprise' = 'user';
    
    if (profile?.entity_type === 'sp_zoo' || profile?.entity_type === 'sa') {
      subType = 'spolka';
      subscriptionLevel = 'company';
    }

    // Get subscription type ID
    const { data: subscriptionType } = await supabaseClient
      .from('subscription_types')
      .select('id')
      .eq('name', subType)
      .single();

    // Create or update enhanced subscription
    await supabaseClient
      .from('enhanced_subscriptions')
      .upsert({
        user_id: userId,
        business_profile_id: businessProfileId,
        subscription_type_id: subscriptionType.id,
        subscription_level: subscriptionLevel,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
        is_active: true,
        starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
        ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        metadata: {
          billing_cycle: billingCycle,
          stripe_session_id: session.id,
        },
      }, {
        onConflict: 'user_id,business_profile_id',
      });

    // Update business profile subscription status
    await supabaseClient
      .from('business_profiles')
      .update({
        subscription_tier: subType === 'jdg' ? 'jdg_premium' : 'spolka_premium',
        subscription_status: 'active',
        subscription_starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', businessProfileId);
  }

  // Update transaction status
  await supabaseClient
    .from('transactions')
    .update({
      status: 'completed',
      metadata: {
        stripe_subscription_id: subscriptionId,
        completed_at: new Date().toISOString(),
      },
    })
    .eq('transaction_id', session.id);

  console.log('[handleCheckoutCompleted] Successfully created subscriptions for', businessProfileIds.length, 'businesses');
}

async function handleSubscriptionUpdated(
  supabaseClient: any,
  subscription: Stripe.Subscription
) {
  console.log('[handleSubscriptionUpdated] Updating subscription:', subscription.id);

  const userId = subscription.metadata?.user_id;
  const businessProfileIds = subscription.metadata?.business_profile_ids?.split(',') || [];

  if (!userId || businessProfileIds.length === 0) {
    console.error('Missing metadata in subscription');
    return;
  }

  for (const businessProfileId of businessProfileIds) {
    await supabaseClient
      .from('enhanced_subscriptions')
      .update({
        is_active: subscription.status === 'active',
        starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
        ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        metadata: {
          ...subscription.metadata,
          stripe_status: subscription.status,
        },
      })
      .eq('stripe_subscription_id', subscription.id)
      .eq('business_profile_id', businessProfileId);

    // Update business profile
    await supabaseClient
      .from('business_profiles')
      .update({
        subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', businessProfileId);
  }
}

async function handleSubscriptionDeleted(
  supabaseClient: any,
  subscription: Stripe.Subscription
) {
  console.log('[handleSubscriptionDeleted] Deleting subscription:', subscription.id);

  await supabaseClient
    .from('enhanced_subscriptions')
    .update({
      is_active: false,
      ends_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  // Update business profiles
  const { data: subscriptions } = await supabaseClient
    .from('enhanced_subscriptions')
    .select('business_profile_id')
    .eq('stripe_subscription_id', subscription.id);

  if (subscriptions) {
    for (const sub of subscriptions) {
      await supabaseClient
        .from('business_profiles')
        .update({
          subscription_status: 'cancelled',
          subscription_tier: 'free',
        })
        .eq('id', sub.business_profile_id);
    }
  }
}

async function handleInvoicePaymentSucceeded(
  supabaseClient: any,
  invoice: Stripe.Invoice
) {
  console.log('[handleInvoicePaymentSucceeded] Processing invoice:', invoice.id);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Get subscription metadata
  const { data: subscriptions } = await supabaseClient
    .from('enhanced_subscriptions')
    .select('user_id, business_profile_id, subscription_type_id')
    .eq('stripe_subscription_id', subscriptionId);

  if (!subscriptions || subscriptions.length === 0) return;

  const userId = subscriptions[0].user_id;

  // Create subscription invoice
  const invoiceNumber = `SUB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  
  const { data: subscriptionInvoice } = await supabaseClient
    .from('subscription_invoices')
    .insert({
      user_id: userId,
      invoice_number: invoiceNumber,
      subtotal_amount: invoice.subtotal || 0,
      tax_amount: invoice.tax || 0,
      total_amount: invoice.total || 0,
      currency: invoice.currency,
      status: 'paid',
      billing_period_start: new Date(invoice.period_start * 1000).toISOString(),
      billing_period_end: new Date(invoice.period_end * 1000).toISOString(),
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paid_at: new Date().toISOString(),
      stripe_invoice_id: invoice.id,
      stripe_payment_intent_id: invoice.payment_intent as string,
      payment_method: 'stripe',
      metadata: {
        stripe_invoice_url: invoice.hosted_invoice_url,
        stripe_pdf_url: invoice.invoice_pdf,
      },
    })
    .select()
    .single();

  // Create invoice items for each business
  if (subscriptionInvoice) {
    for (const sub of subscriptions) {
      const { data: subscriptionType } = await supabaseClient
        .from('subscription_types')
        .select('display_name, price_monthly, price_annual')
        .eq('id', sub.subscription_type_id)
        .single();

      const { data: profile } = await supabaseClient
        .from('business_profiles')
        .select('name')
        .eq('id', sub.business_profile_id)
        .single();

      // Determine if annual or monthly (from invoice lines)
      const isAnnual = invoice.lines.data.some(line => 
        line.price?.recurring?.interval === 'year'
      );

      const unitPrice = isAnnual ? subscriptionType.price_annual : subscriptionType.price_monthly;

      await supabaseClient
        .from('subscription_invoice_items')
        .insert({
          invoice_id: subscriptionInvoice.id,
          business_profile_id: sub.business_profile_id,
          subscription_id: sub.id,
          description: `${subscriptionType.display_name} - ${profile.name}`,
          subscription_type: subscriptionType.display_name,
          billing_cycle: isAnnual ? 'annual' : 'monthly',
          quantity: 1,
          unit_price: unitPrice,
          amount: unitPrice,
          period_start: new Date(invoice.period_start * 1000).toISOString(),
          period_end: new Date(invoice.period_end * 1000).toISOString(),
          vat_status: 'exempt',
          vat_rate: 0,
          vat_amount: 0,
          net_amount: unitPrice,
          gross_amount: unitPrice,
        });
    }
  }

  console.log('[handleInvoicePaymentSucceeded] Created subscription invoice:', invoiceNumber);
}

async function handleInvoicePaymentFailed(
  supabaseClient: any,
  invoice: Stripe.Invoice
) {
  console.log('[handleInvoicePaymentFailed] Processing failed payment:', invoice.id);

  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  // Update subscription status
  await supabaseClient
    .from('enhanced_subscriptions')
    .update({
      metadata: {
        payment_failed: true,
        last_payment_error: invoice.last_finalization_error?.message,
      },
    })
    .eq('stripe_subscription_id', subscriptionId);

  // TODO: Send notification email to user about failed payment
}
