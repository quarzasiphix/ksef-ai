import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutRequest {
  invoiceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CheckoutRequest = await req.json();
    const { invoiceId, successUrl, cancelUrl } = body;

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: "Invoice ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invoice with items
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("subscription_invoices")
      .select(`
        *,
        items:subscription_invoice_items (
          *,
          business_profile:business_profiles (
            id,
            name
          )
        )
      `)
      .eq("id", invoiceId)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invoice is already paid
    if (invoice.status === "paid") {
      return new Response(
        JSON.stringify({ error: "Invoice is already paid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    let stripeCustomerId = invoice.metadata?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Get user email
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single();

      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Update invoice with customer ID
      await supabaseClient
        .from("subscription_invoices")
        .update({
          metadata: {
            ...invoice.metadata,
            stripe_customer_id: stripeCustomerId,
          },
        })
        .eq("id", invoiceId);
    }

    // Prepare line items for Stripe
    const lineItems = invoice.items.map((item: any) => ({
      price_data: {
        currency: "pln",
        product_data: {
          name: item.description,
          description: `${item.billing_cycle === "annual" ? "Roczna" : "Miesięczna"} subskrypcja`,
          metadata: {
            business_profile_id: item.business_profile_id,
            subscription_id: item.subscription_id,
          },
        },
        unit_amount: item.unit_price, // Already in grosze
      },
      quantity: item.quantity,
    }));

    // Add tax line item
    if (invoice.tax_amount > 0) {
      lineItems.push({
        price_data: {
          currency: "pln",
          product_data: {
            name: "VAT 23%",
            description: "Podatek VAT",
          },
          unit_amount: invoice.tax_amount,
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session
    const baseUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:8080";
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl || `${baseUrl}/invoices/${invoiceId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/invoices/${invoiceId}`,
      metadata: {
        invoice_id: invoiceId,
        user_id: user.id,
        invoice_number: invoice.invoice_number,
      },
      payment_intent_data: {
        metadata: {
          invoice_id: invoiceId,
          user_id: user.id,
          invoice_number: invoice.invoice_number,
        },
      },
      locale: "pl",
      billing_address_collection: "required",
      payment_method_types: ["card", "blik", "p24"],
    });

    // Update invoice with checkout session ID
    await supabaseClient
      .from("subscription_invoices")
      .update({
        stripe_checkout_session_id: session.id,
        status: "pending",
      })
      .eq("id", invoiceId);

    // Log payment attempt
    await supabaseClient
      .from("invoice_payment_attempts")
      .insert({
        invoice_id: invoiceId,
        amount: invoice.total_amount,
        currency: invoice.currency,
        payment_method: "stripe_checkout",
        status: "pending",
        metadata: {
          checkout_session_id: session.id,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: session.url,
        session_id: session.id,
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount / 100, // Convert to PLN
          currency: invoice.currency,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
