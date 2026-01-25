import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceGenerationRequest {
  userId?: string; // Optional - if not provided, generates for authenticated user
  billingPeriodStart?: string; // Optional - defaults to start of current month
  billingPeriodEnd?: string; // Optional - defaults to end of current month
}

interface PremiumSubscription {
  id: string;
  business_profile_id: string;
  subscription_type_id: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  business_profile: {
    id: string;
    name: string;
    entity_type: string;
    is_vat_exempt: boolean;
    vat_status: string;
    vat_exemption_reason?: string;
  };
  subscription_type: {
    id: string;
    name: string;
    display_name: string;
    price_monthly: number;
    price_annual: number;
  };
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

    const body: InvoiceGenerationRequest = await req.json().catch(() => ({}));
    const targetUserId = body.userId || user.id;

    // Only allow users to generate their own invoices (unless service role)
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceRole = authHeader.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
    
    if (targetUserId !== user.id && !isServiceRole) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Cannot generate invoices for other users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate billing period
    const now = new Date();
    const billingPeriodStart = body.billingPeriodStart 
      ? new Date(body.billingPeriodStart)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    
    const billingPeriodEnd = body.billingPeriodEnd
      ? new Date(body.billingPeriodEnd)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get all active premium subscriptions for this user with VAT status
    const { data: subscriptions, error: subsError } = await supabaseClient
      .from("enhanced_subscriptions")
      .select(`
        id,
        business_profile_id,
        subscription_type_id,
        is_active,
        starts_at,
        ends_at,
        business_profile:business_profiles!business_profile_id (
          id,
          name,
          entity_type,
          is_vat_exempt,
          vat_status,
          vat_exemption_reason
        ),
        subscription_type:subscription_types!subscription_type_id (
          id,
          name,
          display_name,
          price_monthly,
          price_annual
        )
      `)
      .eq("user_id", targetUserId)
      .eq("is_active", true)
      .lte("starts_at", billingPeriodEnd.toISOString())
      .or(`ends_at.is.null,ends_at.gte.${billingPeriodStart.toISOString()}`);

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions", details: subsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No active premium subscriptions found",
          message: "User has no active premium subscriptions to invoice"
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate invoice items and total with per-company VAT
    const invoiceItems = [];
    let subtotalAmount = 0;
    let totalVatAmount = 0;

    for (const sub of subscriptions as unknown as PremiumSubscription[]) {
      // Determine billing cycle (default to monthly)
      const billingCycle = "monthly"; // TODO: Get from subscription metadata
      const unitPrice = billingCycle === "annual" 
        ? sub.subscription_type.price_annual 
        : sub.subscription_type.price_monthly;

      // Determine VAT status and rate based on business profile
      let vatStatus = "standard";
      let vatRate = 0.23;
      let vatAmount = 0;
      let netAmount = unitPrice;
      let grossAmount = unitPrice;

      if (sub.business_profile.is_vat_exempt) {
        vatStatus = "exempt";
        vatRate = 0;
        vatAmount = 0;
        netAmount = unitPrice;
        grossAmount = unitPrice;
      } else if (sub.business_profile.vat_status === "none") {
        vatStatus = "exempt";
        vatRate = 0;
        vatAmount = 0;
        netAmount = unitPrice;
        grossAmount = unitPrice;
      } else if (sub.business_profile.vat_status === "zero") {
        vatStatus = "zero";
        vatRate = 0;
        vatAmount = 0;
        netAmount = unitPrice;
        grossAmount = unitPrice;
      } else {
        // Standard VAT (23%)
        vatStatus = "standard";
        vatRate = 0.23;
        vatAmount = Math.round(unitPrice * vatRate);
        netAmount = unitPrice;
        grossAmount = unitPrice + vatAmount;
      }

      const item = {
        business_profile_id: sub.business_profile_id,
        subscription_id: sub.id,
        description: `${sub.subscription_type.display_name} - ${sub.business_profile.name}`,
        subscription_type: sub.subscription_type.name,
        billing_cycle: billingCycle,
        quantity: 1,
        unit_price: unitPrice,
        amount: grossAmount, // Total amount for this item (net + VAT)
        vat_status: vatStatus,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        net_amount: netAmount,
        gross_amount: grossAmount,
        period_start: billingPeriodStart.toISOString(),
        period_end: billingPeriodEnd.toISOString(),
      };

      invoiceItems.push(item);
      subtotalAmount += netAmount; // Sum of net amounts
      totalVatAmount += vatAmount; // Sum of VAT amounts
    }

    const totalAmount = subtotalAmount + totalVatAmount;

    // Generate invoice number using database function
    const { data: invoiceNumberData, error: invoiceNumError } = await supabaseClient
      .rpc("generate_invoice_number");

    if (invoiceNumError) {
      console.error("Error generating invoice number:", invoiceNumError);
      return new Response(
        JSON.stringify({ error: "Failed to generate invoice number" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const invoiceNumber = invoiceNumberData as string;

    // Calculate due date (7 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("subscription_invoices")
      .insert({
        user_id: targetUserId,
        invoice_number: invoiceNumber,
        subtotal_amount: subtotalAmount,
        tax_amount: totalVatAmount,
        total_amount: totalAmount,
        currency: "pln",
        status: "pending",
        billing_period_start: billingPeriodStart.toISOString(),
        billing_period_end: billingPeriodEnd.toISOString(),
        due_date: dueDate.toISOString(),
        issued_at: new Date().toISOString(),
        metadata: {
          generated_by: "auto",
          subscription_count: subscriptions.length,
          vat_exempt_companies: invoiceItems.filter(item => item.vat_status === 'exempt').length,
          vat_standard_companies: invoiceItems.filter(item => item.vat_status === 'standard').length,
        },
      })
      .select()
      .single();

    if (invoiceError) {
      console.error("Error creating invoice:", invoiceError);
      return new Response(
        JSON.stringify({ error: "Failed to create invoice", details: invoiceError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create invoice items
    const itemsWithInvoiceId = invoiceItems.map(item => ({
      ...item,
      invoice_id: invoice.id,
    }));

    const { error: itemsError } = await supabaseClient
      .from("subscription_invoice_items")
      .insert(itemsWithInvoiceId);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      // Rollback: delete the invoice
      await supabaseClient
        .from("subscription_invoices")
        .delete()
        .eq("id", invoice.id);

      return new Response(
        JSON.stringify({ error: "Failed to create invoice items", details: itemsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return invoice with items
    const { data: fullInvoice, error: fetchError } = await supabaseClient
      .from("subscription_invoices")
      .select(`
        *,
        items:subscription_invoice_items (
          *,
          business_profile:business_profiles (
            id,
            name,
            entity_type
          )
        )
      `)
      .eq("id", invoice.id)
      .single();

    if (fetchError) {
      console.error("Error fetching full invoice:", fetchError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice: fullInvoice || invoice,
        message: `Invoice ${invoiceNumber} generated successfully`,
        summary: {
          invoice_number: invoiceNumber,
          total_companies: subscriptions.length,
          subtotal: subtotalAmount / 100, // Convert to PLN
          tax: totalVatAmount / 100,
          total: totalAmount / 100,
          due_date: dueDate.toISOString(),
          vat_exempt_companies: invoiceItems.filter(item => item.vat_status === 'exempt').length,
          vat_standard_companies: invoiceItems.filter(item => item.vat_status === 'standard').length,
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
        message: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
