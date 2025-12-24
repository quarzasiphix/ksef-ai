/**
 * Supabase Edge Function: Export Invoices to XML
 * 
 * Endpoint: POST /functions/v1/export-invoices
 * 
 * Request body:
 * {
 *   "businessProfileId": "uuid",
 *   "mode": "portable" | "forensic",
 *   "periodFrom": "YYYY-MM-DD" (optional),
 *   "periodTo": "YYYY-MM-DD" (optional),
 *   "invoiceIds": ["uuid1", "uuid2"] (optional)
 * }
 * 
 * Response:
 * - Success: XML file download
 * - Error: JSON error response
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
interface ExportRequest {
  businessProfileId: string;
  mode: 'portable' | 'forensic';
  periodFrom?: string;
  periodTo?: string;
  invoiceIds?: string[];
}

interface Invoice {
  id: string;
  number: string;
  type: string;
  transaction_type: string;
  issue_date: string;
  due_date: string;
  sell_date: string;
  business_profile_id: string;
  customer_id: string | null;
  payment_method: string;
  is_paid: boolean;
  comments: string | null;
  total_net_value: number;
  total_gross_value: number;
  total_vat_value: number;
  ksef_status: string | null;
  ksef_reference_number: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  vat: boolean;
  vat_exemption_reason: string | null;
  status: string | null;
  currency: string;
  bank_account_id: string | null;
  exchange_rate: number | null;
  decision_id: string | null;
  decision_reference: string | null;
  business_profiles: any;
  customers: any;
  invoice_items: any[];
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const requestData: ExportRequest = await req.json();
    
    // Validate request
    if (!requestData.businessProfileId) {
      return new Response(
        JSON.stringify({ error: 'businessProfileId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch business profile
    const { data: businessProfile, error: profileError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', requestData.businessProfileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !businessProfile) {
      return new Response(
        JSON.stringify({ error: 'Business profile not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch invoices
    let query = supabase
      .from('invoices')
      .select(`
        *,
        business_profiles!inner(id, name, tax_id, address, city, postal_code, country, regon, email, phone),
        customers(id, name, tax_id, address, city, postal_code, country, email, phone),
        invoice_items(*)
      `)
      .eq('business_profile_id', requestData.businessProfileId)
      .eq('user_id', user.id);

    if (requestData.invoiceIds && requestData.invoiceIds.length > 0) {
      query = query.in('id', requestData.invoiceIds);
    }

    if (requestData.periodFrom) {
      query = query.gte('issue_date', requestData.periodFrom);
    }

    if (requestData.periodTo) {
      query = query.lte('issue_date', requestData.periodTo);
    }

    query = query.order('issue_date', { ascending: true });

    const { data: invoices, error: invoicesError } = await query;

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No invoices found matching criteria' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate XML
    const xml = generateInvoiceXml(
      invoices as Invoice[],
      businessProfile,
      requestData.mode || 'portable'
    );

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `invoices_${businessProfile.name.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.xml`;

    // Return XML file
    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Export failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate invoice export XML
 */
function generateInvoiceXml(
  invoices: Invoice[],
  businessProfile: any,
  mode: 'portable' | 'forensic'
): string {
  const exportId = crypto.randomUUID();
  const generatedAt = new Date().toISOString();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<InvoiceExport xmlns="https://ksiegai.pl/schema/invoice-export" version="1.0" generatedAt="${generatedAt}">\n`;
  
  // Source
  xml += '  <Source>\n';
  xml += `    <System>Ksiegal</System>\n`;
  xml += `    <BusinessProfileId>${businessProfile.id}</BusinessProfileId>\n`;
  xml += `    <BusinessProfileName>${escapeXml(businessProfile.name)}</BusinessProfileName>\n`;
  xml += `    <ExportId>${exportId}</ExportId>\n`;
  xml += `    <ExportMode>${mode}</ExportMode>\n`;
  xml += '  </Source>\n';
  
  // Invoices
  xml += `  <Invoices count="${invoices.length}">\n`;
  
  for (const invoice of invoices) {
    xml += generateInvoiceElement(invoice, businessProfile, mode);
  }
  
  xml += '  </Invoices>\n';
  xml += '</InvoiceExport>';
  
  return xml;
}

/**
 * Generate single invoice element
 */
function generateInvoiceElement(
  invoice: Invoice,
  businessProfile: any,
  mode: 'portable' | 'forensic'
): string {
  const isIncome = invoice.transaction_type === 'income';
  const seller = isIncome ? businessProfile : invoice.customers;
  const buyer = isIncome ? invoice.customers : businessProfile;
  
  let xml = `    <Invoice id="${invoice.id}" number="${escapeXml(invoice.number)}" type="${invoice.type}" transactionType="${invoice.transaction_type}">\n`;
  
  // Dates
  xml += `      <Dates issue="${invoice.issue_date}" sell="${invoice.sell_date}" due="${invoice.due_date}"`;
  if (mode === 'forensic') {
    xml += ` created="${invoice.created_at}" updated="${invoice.updated_at}"`;
  }
  xml += '/>\n';
  
  // Status
  const isOverdue = new Date(invoice.due_date) < new Date() && !invoice.is_paid;
  const lifecycle = invoice.is_paid ? 'payment_received' : 'issued';
  xml += `      <Status lifecycle="${lifecycle}" payment="${invoice.is_paid ? 'paid' : 'unpaid'}" isPaid="${invoice.is_paid}" ksef="${invoice.ksef_status || 'none'}" isOverdue="${isOverdue}"/>\n`;
  
  // Parties
  xml += '      <Parties>\n';
  xml += generatePartyElement('Seller', seller, mode);
  xml += generatePartyElement('Buyer', buyer, mode);
  xml += '      </Parties>\n';
  
  // Payment
  xml += `      <Payment method="${invoice.payment_method}" methodType="${invoice.payment_method}" currency="${invoice.currency || 'PLN'}"`;
  if (invoice.exchange_rate) {
    xml += ` exchangeRate="${invoice.exchange_rate.toFixed(4)}"`;
  }
  xml += '>\n';
  if (invoice.bank_account_id) {
    xml += `        <BankAccountId>${invoice.bank_account_id}</BankAccountId>\n`;
  }
  xml += '      </Payment>\n';
  
  // Totals
  xml += `      <Totals currency="${invoice.currency || 'PLN'}">\n`;
  xml += `        <Net>${invoice.total_net_value.toFixed(2)}</Net>\n`;
  xml += `        <Vat>${invoice.total_vat_value.toFixed(2)}</Vat>\n`;
  xml += `        <Gross>${invoice.total_gross_value.toFixed(2)}</Gross>\n`;
  xml += '      </Totals>\n';
  
  // VAT Info
  const vatEnabled = invoice.vat !== false;
  xml += `      <VatInfo enabled="${vatEnabled}"`;
  if (!vatEnabled && invoice.vat_exemption_reason) {
    xml += ` exemptionReason="${escapeXml(invoice.vat_exemption_reason)}"`;
  }
  xml += '/>\n';
  
  // Items
  xml += `      <Items count="${invoice.invoice_items.length}">\n`;
  for (const item of invoice.invoice_items) {
    xml += `        <Item id="${item.id}" name="${escapeXml(item.name)}" unit="${item.unit}" quantity="${item.quantity.toFixed(3)}">\n`;
    xml += `          <UnitPrice>${item.unit_price.toFixed(2)}</UnitPrice>\n`;
    xml += `          <VatRate>${item.vat_rate.toFixed(2)}</VatRate>\n`;
    if (item.vat_exempt) {
      xml += `          <VatExempt>true</VatExempt>\n`;
    }
    xml += '          <LineTotals>\n';
    xml += `            <Net>${item.total_net_value.toFixed(2)}</Net>\n`;
    xml += `            <Vat>${item.total_vat_value.toFixed(2)}</Vat>\n`;
    xml += `            <Gross>${item.total_gross_value.toFixed(2)}</Gross>\n`;
    xml += '          </LineTotals>\n';
    xml += '        </Item>\n';
  }
  xml += '      </Items>\n';
  
  // Notes
  if (invoice.comments) {
    xml += `      <Notes>${escapeXml(invoice.comments)}</Notes>\n`;
  }
  
  // External integrations
  if (invoice.ksef_reference_number || invoice.decision_id) {
    xml += '      <External>\n';
    if (invoice.ksef_reference_number) {
      xml += `        <KSeF reference="${escapeXml(invoice.ksef_reference_number)}"/>\n`;
    }
    if (invoice.decision_id) {
      xml += `        <Contract contractId="${invoice.decision_id}"`;
      if (invoice.decision_reference) {
        xml += ` contractNumber="${escapeXml(invoice.decision_reference)}"`;
      }
      xml += '/>\n';
    }
    xml += '      </External>\n';
  }
  
  // Audit (forensic mode)
  if (mode === 'forensic') {
    xml += '      <Audit>\n';
    xml += `        <CreatedBy>${invoice.user_id}</CreatedBy>\n`;
    if (invoice.decision_id) {
      xml += `        <DecisionId>${invoice.decision_id}</DecisionId>\n`;
    }
    if (invoice.decision_reference) {
      xml += `        <DecisionReference>${escapeXml(invoice.decision_reference)}</DecisionReference>\n`;
    }
    xml += '      </Audit>\n';
  }
  
  xml += '    </Invoice>\n';
  
  return xml;
}

/**
 * Generate party element
 */
function generatePartyElement(
  tag: string,
  party: any,
  mode: 'portable' | 'forensic'
): string {
  if (!party) {
    return `        <${tag}><Name>Unknown</Name></${tag}>\n`;
  }
  
  let xml = `        <${tag}`;
  if (mode === 'forensic' && party.id) {
    xml += ` id="${party.id}"`;
  }
  xml += '>\n';
  
  xml += `          <Name>${escapeXml(party.name)}</Name>\n`;
  
  if (party.tax_id) {
    xml += `          <NIP>${party.tax_id}</NIP>\n`;
  }
  
  if (party.regon) {
    xml += `          <REGON>${party.regon}</REGON>\n`;
  }
  
  if (party.address || party.city || party.postal_code) {
    xml += '          <Address>\n';
    if (party.address) xml += `            <Street>${escapeXml(party.address)}</Street>\n`;
    if (party.postal_code) xml += `            <PostalCode>${party.postal_code}</PostalCode>\n`;
    if (party.city) xml += `            <City>${escapeXml(party.city)}</City>\n`;
    xml += `            <Country>${party.country || 'PL'}</Country>\n`;
    xml += '          </Address>\n';
  }
  
  if (party.email || party.phone) {
    xml += '          <Contact>\n';
    if (party.email) xml += `            <Email>${escapeXml(party.email)}</Email>\n`;
    if (party.phone) xml += `            <Phone>${escapeXml(party.phone)}</Phone>\n`;
    xml += '          </Contact>\n';
  }
  
  xml += `        </${tag}>\n`;
  
  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
