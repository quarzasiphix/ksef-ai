import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeStripe } from '../_shared/stripe-config.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature')
    }

    const body = await req.text()
    const stripeConfig = await getStripeConfig()
    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: '2023-10-16',
    })

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeConfig.webhookSecret
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400, headers: corsHeaders })
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log(`Processing webhook event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session, supabase)
        break
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription, supabase)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription, supabase)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription, supabase)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice, supabase)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice, supabase)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  console.log('Checkout session completed:', session.id)

  const userId = session.metadata?.user_id
  const subscriptionLevel = session.metadata?.subscription_level
  const businessProfileId = session.metadata?.business_profile_id

  if (!userId || !subscriptionLevel) {
    console.error('Missing required metadata in checkout session')
    return
  }

  // Create transaction record
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      email: session.customer_email,
      transaction_id: session.payment_intent as string,
      transaction_type: 'subscription',
      payment_system: 'stripe',
      amount: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency || 'pln',
      status: 'completed',
      metadata: {
        session_id: session.id,
        subscription_level,
        business_profile_id
      }
    })

  console.log(`Transaction recorded for user ${userId}`)
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  console.log('Subscription created:', subscription.id)

  const userId = subscription.metadata?.user_id
  const subscriptionLevel = subscription.metadata?.subscription_level
  const businessProfileId = subscription.metadata?.business_profile_id

  if (!userId || !subscriptionLevel) {
    console.error('Missing required metadata in subscription')
    return
  }

  // Get subscription type
  const { data: subscriptionType } = await supabase
    .from('subscription_types')
    .select('*')
    .eq('name', subscriptionLevel === 'enterprise' ? 'enterprise' : 
        subscription.metadata?.entity_type || 'jdg')
    .single()

  if (!subscriptionType) {
    console.error('Subscription type not found')
    return
  }

  // Create enhanced subscription record
  const { data: enhancedSub, error } = await supabase
    .from('enhanced_subscriptions')
    .insert({
      user_id: userId,
      business_profile_id: businessProfileId || null,
      subscription_type_id: subscriptionType.id,
      subscription_level: subscriptionLevel,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      is_active: subscription.status === 'active',
      starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
      ends_at: subscription.cancel_at_period_end ? 
        new Date(subscription.current_period_end * 1000).toISOString() : null,
      trial_ends_at: subscription.trial_end ? 
        new Date(subscription.trial_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: {
        stripe_subscription_object: subscription,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end
      }
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating enhanced subscription:', error)
    return
  }

  console.log(`Enhanced subscription created: ${enhancedSub.id}`)

  // Handle enterprise benefits
  if (subscriptionLevel === 'enterprise') {
    await assignEnterpriseBenefits(userId, enhancedSub.id, supabase)
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  console.log('Subscription updated:', subscription.id)

  // Update subscription record
  const { error } = await supabase
    .from('enhanced_subscriptions')
    .update({
      is_active: subscription.status === 'active',
      ends_at: subscription.cancel_at_period_end ? 
        new Date(subscription.current_period_end * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: {
        stripe_subscription_object: subscription,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        updated_at: new Date().toISOString()
      }
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
    return
  }

  // Handle enterprise benefits on status change
  const { data: enhancedSub } = await supabase
    .from('enhanced_subscriptions')
    .select('user_id, subscription_level')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (enhancedSub?.subscription_level === 'enterprise') {
    if (subscription.status === 'active') {
      await assignEnterpriseBenefits(enhancedSub.user_id, enhancedSub.id, supabase)
    } else {
      await removeEnterpriseBenefits(enhancedSub.user_id, supabase)
    }
  }

  console.log(`Subscription ${subscription.id} updated successfully`)
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  console.log('Subscription deleted:', subscription.id)

  // Mark subscription as inactive
  const { data: enhancedSub } = await supabase
    .from('enhanced_subscriptions')
    .select('user_id, subscription_level')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  const { error } = await supabase
    .from('enhanced_subscriptions')
    .update({
      is_active: false,
      ends_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error deleting subscription:', error)
    return
  }

  // Remove enterprise benefits if enterprise subscription
  if (enhancedSub?.subscription_level === 'enterprise') {
    await removeEnterpriseBenefits(enhancedSub.user_id, supabase)
  }

  console.log(`Subscription ${subscription.id} deleted successfully`)
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  console.log('Invoice payment succeeded:', invoice.id)

  // Create transaction record for successful payment
  if (invoice.subscription) {
    const { data: subscription } = await supabase
      .from('enhanced_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (subscription) {
      await supabase
        .from('transactions')
        .insert({
          user_id: subscription.user_id,
          email: invoice.customer_email,
          transaction_id: invoice.payment_intent as string,
          transaction_type: 'subscription_payment',
          payment_system: 'stripe',
          amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
          currency: invoice.currency || 'pln',
          status: 'completed',
          metadata: {
            invoice_id: invoice.id,
            subscription_id: invoice.subscription,
            period_start: invoice.period_start,
            period_end: invoice.period_end
          }
        })
    }
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  console.log('Invoice payment failed:', invoice.id)

  // Create transaction record for failed payment
  if (invoice.subscription) {
    const { data: subscription } = await supabase
      .from('enhanced_subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (subscription) {
      await supabase
        .from('transactions')
        .insert({
          user_id: subscription.user_id,
          email: invoice.customer_email,
          transaction_id: invoice.payment_intent as string,
          transaction_type: 'subscription_payment',
          payment_system: 'stripe',
          amount: invoice.amount_due ? invoice.amount_due / 100 : 0,
          currency: invoice.currency || 'pln',
          status: 'failed',
          metadata: {
            invoice_id: invoice.id,
            subscription_id: invoice.subscription,
            attempt_count: invoice.attempt_count,
            next_payment_attempt: invoice.next_payment_attempt
          }
        })
    }
  }
}

async function assignEnterpriseBenefits(
  userId: string,
  subscriptionId: string,
  supabase: any
) {
  console.log(`Assigning enterprise benefits for user: ${userId}`)

  // Get all user's companies
  const { data: companies } = await supabase
    .from('business_profiles')
    .select('id')
    .eq('user_id', userId)

  if (!companies || companies.length === 0) {
    console.log('No companies found for user')
    return
  }

  // Assign premium access to all companies
  for (const company of companies) {
    await supabase
      .from('enterprise_benefits')
      .upsert({
        user_id: userId,
        business_profile_id: company.id,
        benefit_type: 'premium_access',
        is_active: true,
        granted_by_subscription_id: subscriptionId
      }, {
        onConflict: 'user_id, business_profile_id, benefit_type'
      })
  }

  console.log(`Enterprise benefits assigned to ${companies.length} companies`)
}

async function removeEnterpriseBenefits(
  userId: string,
  supabase: any
) {
  console.log(`Removing enterprise benefits for user: ${userId}`)

  await supabase
    .from('enterprise_benefits')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('benefit_type', 'premium_access')

  console.log('Enterprise benefits removed')
}
