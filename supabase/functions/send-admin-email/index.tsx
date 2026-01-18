/// <reference lib="deno.ns" />
/// <reference lib="deno.unstable" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const buildCorsHeaders = (req: Request) => {
  const origin = req.headers.get("Origin") ?? "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  } as const;
};

interface AdminEmailRequest {
  templateKey: string;
  recipientEmail: string;
  variables?: Record<string, any>;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const authToken = authHeader?.replace("Bearer ", "");

    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authUser, error: authError } = await serviceSupabase.auth.getUser(authToken);
    if (authError || !authUser?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin using admin_users table
    const { data: adminUser, error: adminError } = await serviceSupabase
      .from("admin_users")
      .select("role, is_active")
      .eq("user_id", authUser.user.id)
      .maybeSingle();

    if (adminError || !adminUser || !adminUser.is_active) {
      console.error("Admin check failed:", adminError);
      return new Response(
        JSON.stringify({ error: "Forbidden: admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify role is admin or super_admin
    if (!['admin', 'super_admin'].includes(adminUser.role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: admin or super_admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let requestPayload: AdminEmailRequest;
    try {
      const rawBody = await req.text();
      if (!rawBody || rawBody.length === 0) {
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      requestPayload = JSON.parse(rawBody);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", details: String(parseError) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { templateKey, recipientEmail, variables } = requestPayload;

    if (!templateKey || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "templateKey and recipientEmail are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch email template by template_key
    const { data: template, error: templateError } = await serviceSupabase
      .from("email_templates")
      .select("*")
      .eq("template_key", templateKey)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error("Template fetch error:", templateError);
      return new Response(
        JSON.stringify({ error: `Template '${templateKey}' not found or inactive` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const n8nWebhookUrl =
      Deno.env.get("N8N_EMAIL_WEBHOOK_URL") || "https://n8n.srv1253136.hstgr.cloud/webhook/mailing-client";
    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: "N8N webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Helper function to replace all {{variable}} occurrences (whitespace safe)
    function replaceAllVariables(str: string, vars: Record<string, any>): string {
      if (!str || typeof str !== 'string') return '';
      if (!vars || typeof vars !== 'object') return str;

      let result = str;
      for (const [key, value] of Object.entries(vars)) {
        if (value == null) continue;
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, String(value));
      }
      return result;
    }

    // Helper function to render array items (e.g., invoice items)
    function renderArrayItems(html: string, arrayKey: string, items: any[]): string {
      if (!items || !Array.isArray(items) || items.length === 0) return html;

      // Find the template block for this array: {{#items}}...{{/items}}
      const blockRegex = new RegExp(`{{#${arrayKey}}}([\\s\\S]*?){{/${arrayKey}}}`, 'g');
      
      return html.replace(blockRegex, (match, template) => {
        // Render the template for each item
        return items.map(item => {
          let itemHtml = template;
          // Replace {{item.field}} with actual values
          for (const [key, value] of Object.entries(item)) {
            const itemRegex = new RegExp(`{{\\s*item\\.${key}\\s*}}`, 'g');
            itemHtml = itemHtml.replace(itemRegex, String(value ?? ''));
          }
          return itemHtml;
        }).join('');
      });
    }

    // Merge variables with email
    const allVariables: Record<string, any> = {
      ...(variables || {}),
      email: recipientEmail,
    };

    // Apply variable replacements in edge function
    const subjectTemplate = template.subject_pl || template.subject || '';
    let htmlTemplate = template.body_html_pl || template.html_content || '';
    
    // Handle array items (e.g., invoice items) if present
    if (allVariables.items && Array.isArray(allVariables.items)) {
      htmlTemplate = renderArrayItems(htmlTemplate, 'items', allVariables.items);
    }
    
    const finalSubject = replaceAllVariables(subjectTemplate, allVariables);
    const finalHtml = replaceAllVariables(htmlTemplate, allVariables);

    // Send ready-to-send email to n8n (no processing needed)
    const n8nBody = {
      to: recipientEmail,
      subject: finalSubject,
      html_body: finalHtml,
      templateName: template.name,
    };

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nBody),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("N8N webhook error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to trigger email send", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    const responseText = await n8nResponse.text();
    try {
      result = responseText ? JSON.parse(responseText) : { status: "accepted" };
    } catch (e) {
      result = { status: "accepted", raw: responseText };
    }

    return new Response(
      JSON.stringify({ success: true, message: "Admin email sent successfully", result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-admin-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});