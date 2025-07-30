// supabase/functions/pz-callback/index.ts
// Edge Function: Handle Profil Zaufany callback for KSEF
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// This endpoint is called by Profil Zaufany after signing
serve(async (req) => {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const invoiceId = url.searchParams.get("invoiceId"); // Pass invoiceId as state or param

  if (!code || !invoiceId) {
    return new Response(JSON.stringify({ error: "Missing code or invoiceId" }), { status: 400 });
  }

  // Simulate exchanging the code for a signed XML (in production, call PZ API)
  const signedXml = `<SignedInvoice id='${invoiceId}'>SIGNED_XML_CONTENT</SignedInvoice>`;

  // Update invoice in Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await supabase.from("invoices").update({ ksef_status: "signed", ksef_signed_xml: signedXml }).eq("id", invoiceId);

  // Redirect user to app with success
  const appRedirect = `https://ksiegai.pl/invoices/${invoiceId}?ksef_signed=1`;
  return Response.redirect(appRedirect, 302);
});
