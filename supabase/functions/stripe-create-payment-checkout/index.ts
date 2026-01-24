import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.2';
import { initializeStripe } from '../_shared/stripe-config.ts';
import type Stripe from 'https://esm.sh/stripe@14.25.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This endpoint is PUBLIC - no auth required (accessed via share link)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { shareSlug } = await req.json();

    if (!shareSlug) {
      return new Response(
        JSON.stringify({ error: 'Share slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get share and validate
    const { data: share, error: shareError } = await supabaseAdmin
      .from('shared')
      .select('*, invoices(*), business_profiles(*)')
      .eq('slug', shareSlug)
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ error: 'Share link not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const invoice = share.invoices;
    const businessProfile = share.business_profiles;

    if (!invoice || !businessProfile) {
      return new Response(
        JSON.stringify({ error: 'Invoice or business profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment can be created
    if (!invoice.payments_enabled) {
      return new Response(
        JSON.stringify({ error: 'Płatności nie są włączone dla tej faktury' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invoice.payment_status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'Faktura została już opłacona' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!businessProfile.stripe_connect_account_id || !businessProfile.stripe_charges_enabled) {
      return new Response(
        JSON.stringify({ error: 'Sprzedawca nie ma aktywnego konta płatności' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already a pending session (created in last 30 minutes)
    if (invoice.stripe_checkout_session_id && invoice.payment_status === 'pending') {
      const { data: existingPayment } = await supabaseAdmin
        .from('invoice_payments')
        .select('*')
        .eq('provider_checkout_id', invoice.stripe_checkout_session_id)
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .single();

      if (existingPayment) {
        // Return existing session - don't create duplicate
        const { stripe: stripeForRetrieval } = await initializeStripe();
        
        try {
          const session = await stripeForRetrieval.checkout.sessions.retrieve(invoice.stripe_checkout_session_id);
          if (session.status === 'open') {
            return new Response(
              JSON.stringify({ url: session.url }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (e) {
          console.log('Existing session not found or expired, creating new one');
        }
      }
    }

    // Initialize Stripe with centralized config
    const { stripe, mode } = await initializeStripe();
    console.log(`[stripe-create-payment-checkout] Using ${mode} mode`);

    // Calculate amount in minor units (grosze)
    const amountMinor = invoice.amount_gross_minor || Math.round(invoice.total_gross_value * 100);
    const currency = (invoice.currency || 'PLN').toLowerCase();

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'blik', 'p24'],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: `Faktura ${invoice.number}`,
              description: `Płatność za fakturę ${invoice.number}`,
            },
            unit_amount: amountMinor,
          },
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get('APP_URL')}/share/${shareSlug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL')}/share/${shareSlug}?payment=cancelled`,
      metadata: {
        invoice_id: invoice.id,
        business_profile_id: businessProfile.id,
        share_slug: shareSlug,
        invoice_number: invoice.number,
      },
      payment_intent_data: {
        transfer_data: {
          destination: businessProfile.stripe_connect_account_id,
        },
        metadata: {
          invoice_id: invoice.id,
          business_profile_id: businessProfile.id,
        },
      },
      locale: 'pl',
    });

    // Update invoice with session ID and set to pending
    await supabaseAdmin
      .from('invoices')
      .update({
        stripe_checkout_session_id: session.id,
        payment_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    // Create payment record
    await supabaseAdmin
      .from('invoice_payments')
      .insert({
        invoice_id: invoice.id,
        business_profile_id: businessProfile.id,
        user_id: businessProfile.user_id,
        provider: 'stripe',
        provider_checkout_id: session.id,
        amount_minor: amountMinor,
        currency: currency,
        status: 'pending',
        metadata: {
          share_slug: shareSlug,
          invoice_number: invoice.number,
        },
      });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in stripe-create-payment-checkout:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
