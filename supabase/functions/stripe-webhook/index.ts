import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.2"; // Use Supabase JS client

console.log("Stripe Webhook Edge Function started");

// This function handles CORS preflight requests and the actual function logic.
// Inlining CORS logic to avoid external file imports.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD');
  //const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeWebhookSecret || !supabaseServiceRoleKey) {
    console.error("Missing Stripe Webhook Secret or Supabase Service Role Key");
    return new Response(JSON.stringify({ error: "Internal server configuration error." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Initialize Stripe (using the Secret Key, NOT the webhook secret)
  // This might not be strictly needed for just webhook verification,
  // but good to have if you expand function logic.
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_PROD') as string, {
  //const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_TEST') as string, {
    apiVersion: '2024-04-10',
    typescript: true,
  });

  // Create a Supabase client with the Service Role Key
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') as string,
    supabaseServiceRoleKey
  );

  let event: Stripe.Event;
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
     return new Response(JSON.stringify({ error: "No stripe-signature header found." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
  }

  try {
    const rawBody = await req.text(); // Read the body as text for verification

    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      stripeWebhookSecret
    );
  } catch (err: any) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.CheckoutSession;
      console.log(`Checkout session completed for session ID: ${session.id}`);

      // Get user_id from metadata
      const userId = session.metadata?.user_id;
      const email = session.customer_details?.email || session.customer_email || session.metadata?.email || null;

      console.log(`Attempting to update premium_subscriptions for user ID: ${userId}`);

      if (!userId) {
        console.error(`User ID not found in checkout session metadata for session ID: ${session.id}`);
        // Return 200 to Stripe as the webhook was received, but log the issue for investigation
        return new Response(JSON.stringify({ received: true, message: "User ID missing in metadata" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Now, update your Supabase database
      try {
        console.log(`User ID ${userId} found in metadata. Proceeding with DB upsert.`);

        // For subscription products, session.subscription will contain the subscription ID
        const subscriptionId = session.subscription;

        if (!subscriptionId) {
             console.error(`Subscription ID not found in checkout session for session ID: ${session.id}`);
             // Return 200 to Stripe as the webhook was received, but log the issue for investigation
            return new Response(JSON.stringify({ received: true, message: "Subscription ID missing in session" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        console.log(`Subscription ID ${subscriptionId} found. Retrieving subscription details from Stripe.`);

        // Fetch the subscription details from Stripe to get current_period_end etc.
         const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);

         console.log(`Stripe subscription retrieved. Status: ${subscription.status}, current_period_end: ${subscription.current_period_end}`);

         // Safely get the end date
         let endsAt = null;
         if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
             endsAt = new Date(subscription.current_period_end * 1000).toISOString();
             console.log(`Calculated endsAt: ${endsAt}`);
         } else {
             console.warn(`current_period_end is missing or invalid for subscription ${subscription.id}. Value:`, subscription.current_period_end);
             // Depending on your logic, you might set a default end date or handle this case differently
             // For now, we'll leave ends_at as null if it's invalid
         }

        // --- Insert into transactions table ---
        const transactionPayload = {
          user_id: userId,
          email: email,
          transaction_id: session.id, // Stripe session id
          transaction_type: 'premium_subscription',
          payment_system: 'stripe',
          amount: session.amount_total ? session.amount_total / 100 : null,
          currency: session.currency || null,
          status: session.payment_status || 'unknown',
          metadata: session.metadata ? JSON.stringify(session.metadata) : null,
        };
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .insert([transactionPayload])
          .select()
          .maybeSingle();
        if (transactionError) {
          console.error('Error inserting transaction:', transactionError);
          return new Response(JSON.stringify({ error: 'Transaction insert failed.' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const newTransactionId = transactionData?.id?.toString() || session.id;

        // --- Upsert premium_subscriptions with transaction_id ---
        const { data, error } = await supabase
          .from('premium_subscriptions')
          .upsert(
            {
              user_id: userId, // Uses userId from session metadata
              is_active: true, // Sets to true on completion
              ends_at: endsAt, // Uses calculated end date (can be null)
              stripe_subscription_id: subscription.id, // Stores the Stripe subscription ID
              transaction_id: newTransactionId, // Link to transaction
            },
            { onConflict: 'user_id' } // Upserts based on user_id
          );

        if (error) {
          console.error("Error updating premium_subscriptions table:", error);
          return new Response(JSON.stringify({ error: "Database update failed." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // --- Broadcast realtime event for transactions (optional, for instant UI updates) ---
        // This is not strictly necessary if you use Supabase Realtime on the client,
        // but you can use the broadcast API if you want to push a custom event.
        // Example (uncomment if you want to use it):
        // await supabase.channel('transactions')
        //   .send({
        //     type: 'broadcast',
        //     event: 'new_transaction',
        //     payload: { ...transactionData },
        //   });

        console.log(`Successfully updated premium_subscriptions for user: ${userId} and inserted transaction.`);

      } catch (dbError) {
         console.error("Error processing checkout.session.completed event or updating DB:", dbError);
         return new Response(JSON.stringify({ error: "Webhook processing failed." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;

      // Assuming you have a customer ID associated with your Supabase user
      // You would need to link Stripe Customer ID to your Supabase User ID
      const stripeCustomerId = subscription.customer; // This is the Stripe Customer ID

      // TODO: Find the corresponding Supabase User ID based on stripeCustomerId
      // This requires a mapping in your database or metadata

      // For now, let's assume the customer ID is stored somewhere and we can look it up
      // Example (you'll need to implement the actual lookup):
      // const { data: user, error: userError } = await supabase
      //   .from('users') // Replace with your user table name
      //   .select('id')
      //   .eq('stripe_customer_id', stripeCustomerId)
      //   .single();

      // if (userError || !user) {
      //   console.error('Could not find Supabase user for Stripe customer ID:', stripeCustomerId, userError);
      //   // Decide how to handle a webhook event for an unknown user - perhaps log and return 200
      //   return new Response(JSON.stringify({ received: true, message: "User not found for customer ID" }), { status: 200 });
      // }

      // const userId = user.id;

      // --- FIX: Safely get the end date and handle potential missing userId ---
      let currentPeriodEndForUpsert = null;
      if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
         currentPeriodEndForUpsert = new Date(subscription.current_period_end * 1000).toISOString();
      } else {
         console.warn(`current_period_end is missing or invalid for subscription ${subscription.id} in update event. Value:`, subscription.current_period_end);
      }

      // IMPORTANT: Replace dummyUserId with actual lookup logic!
      const userIdForUpsert = 'REPLACE_WITH_ACTUAL_USER_ID'; // <<< IMPORTANT: Replace this with the actual user ID lookup


      // Only attempt to upsert if you have a valid user ID
      if (userIdForUpsert !== 'REPLACE_WITH_ACTUAL_USER_ID') {
         const { data, error } = await supabase
           .from('premium_subscriptions')
           .upsert({
             user_id: userIdForUpsert, // Use the actual user ID
             stripe_subscription_id: subscription.id,
             status: subscription.status, // e.g., 'active', 'canceled', 'past_due'
             ends_at: currentPeriodEndForUpsert, // Use the safely determined end date
             // Add other relevant fields from the subscription object
           }, { onConflict: 'stripe_subscription_id' }); // Upsert based on Stripe subscription ID

         if (error) {
           console.error('Error updating premium_subscriptions table on subscription update:', error);
            // Log the error but return 200 to Stripe to avoid retries
           return new Response(JSON.stringify({ received: true, error: "Database update failed on subscription update." }), { status: 200 });
         }

         console.log('Subscription updated:', subscription.id, 'for user:', userIdForUpsert);
      } else {
          console.warn(`Skipping premium_subscriptions update for subscription ${subscription.id} because user ID lookup is not implemented or failed.`);
          // Return 200 to Stripe as the webhook was received
          return new Response(JSON.stringify({ received: true, message: "User ID lookup not implemented." }), { status: 200 });
      }
      // --- END FIX ---


      // Then define and call a function to handle the event type
      break;
    case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log('Subscription deleted:', deletedSubscription.id);
        // TODO: Update premium_subscriptions table to set is_active to false for this subscription
        // You'll need to find the user_id based on the stripe_subscription_id
        // Example:
        // const { error: updateError } = await supabase
        //   .from('premium_subscriptions')
        //   .update({ is_active: false })
        //   .eq('stripe_subscription_id', deletedSubscription.id);
        // if (updateError) console.error('Error updating subscription status to inactive:', updateError);
        break;

    case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        // Handle successful payment - often this is redundant if you handle subscription.updated,
        // but can be useful for one-off payments or detailed logging.
        console.log('Invoice payment succeeded for invoice:', invoice.id);
        break;

    case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        // Handle failed payment - potentially notify user to update payment method
        console.error('Invoice payment failed for invoice:', failedInvoice.id);
        // TODO: You might want to update the status in your premium_subscriptions table
        break;

    default:
      // Optionally log unhandled event types
      console.log(`Unhandled event type ${event.type}`);
      break;
  }

  // Return a 200 response to acknowledge receipt of the event
  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
