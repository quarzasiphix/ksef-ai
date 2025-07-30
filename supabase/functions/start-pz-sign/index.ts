// supabase/functions/start-pz-sign/index.ts
// Edge Function: Initiate Profil Zaufany signing for KSEF
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// These should be set in your Supabase project environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Profil Zaufany endpoints (demo/test)
const PZ_AUTH_URL = "https://pz-demo.example.gov.pl/authorize"; // Replace with actual PZ demo endpoint
const PZ_CLIENT_ID = Deno.env.get("PZ_CLIENT_ID")!;
const PZ_REDIRECT_URI = Deno.env.get("PZ_REDIRECT_URI")!;

// KSEF XML generator stub (replace with real implementation)
function generateKsefXml(invoice: any): string {
  // TODO: Generate FA(2) XML according to KSEF spec
  return `<Invoice><Id>${invoice.id}</Id></Invoice>`;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const { invoiceId } = await req.json();
  if (!invoiceId) {
    return new Response(JSON.stringify({ error: "Missing invoiceId" }), { status: 400 });
  }

  // Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  // Fetch invoice
  const { data: invoice, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
  if (error || !invoice) {
    return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404 });
  }

  // Generate KSEF XML
  const xml = generateKsefXml(invoice);
  // Store XML and status
  await supabase.from("invoices").update({ ksef_status: "pending", ksef_signed_xml: xml }).eq("id", invoiceId);

  // Prepare PZ authorization URL (OAuth2-like)
  const state = crypto.randomUUID(); // For CSRF protection
  // You may want to store the state in a session table for verification
  const authUrl = `${PZ_AUTH_URL}?client_id=${encodeURIComponent(PZ_CLIENT_ID)}&redirect_uri=${encodeURIComponent(PZ_REDIRECT_URI)}&response_type=code&state=${encodeURIComponent(state)}`;

  return new Response(JSON.stringify({ authUrl }), { headers: { "Content-Type": "application/json" } });
});
