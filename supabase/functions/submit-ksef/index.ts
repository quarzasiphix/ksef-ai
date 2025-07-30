// supabase/functions/submit-ksef/index.ts
// Edge Function: Submit signed XML to KSEF and store the result
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// KSEF API endpoint (demo/test)
const KSEF_API_URL = "https://ksef-test.mf.gov.pl/api/submit"; // Replace with real endpoint

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
  if (error || !invoice || !invoice.ksef_signed_xml) {
    return new Response(JSON.stringify({ error: "Invoice or signed XML not found" }), { status: 404 });
  }

  // Submit to KSEF API (simulate for now)
  // In production, use fetch to POST the signed XML to KSEF
  // const ksefResponse = await fetch(KSEF_API_URL, { ... })
  // Here we simulate a successful response
  const ksefReference = `REF-${invoiceId}`;
  const ksefUpo = `<UPO>Confirmation for ${invoiceId}</UPO>`;

  // Update invoice in Supabase
  await supabase.from("invoices").update({
    ksef_status: "submitted",
    ksef_reference: ksefReference,
    ksef_upo: ksefUpo,
    ksef_error: null
  }).eq("id", invoiceId);

  return new Response(JSON.stringify({ ksefReference, ksefUpo }), { headers: { "Content-Type": "application/json" } });
});
