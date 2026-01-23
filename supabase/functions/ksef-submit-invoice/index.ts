import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { invoiceId, businessProfileId } = await req.json();

    if (!invoiceId || !businessProfileId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        items:invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    const { data: businessProfile, error: profileError } = await supabaseClient
      .from('business_profiles')
      .select('*')
      .eq('id', businessProfileId)
      .single();

    if (profileError || !businessProfile) {
      throw new Error('Business profile not found');
    }

    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('*')
      .eq('id', invoice.customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    if (!businessProfile.ksef_enabled || !businessProfile.ksef_token_encrypted) {
      return new Response(
        JSON.stringify({ error: 'KSeF not enabled for this business profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = atob(businessProfile.ksef_token_encrypted);
    const environment = businessProfile.ksef_environment || 'test';
    const baseUrl = environment === 'test' 
      ? 'https://api-test.ksef.mf.gov.pl/v2'
      : 'https://api.ksef.mf.gov.pl/v2';

    // KSeF API v2 uses Bearer token authentication directly
    const sessionToken = token;

    const xml = generateInvoiceXml(invoice, businessProfile, customer);

    // KSeF API v2: Create interactive session
    const sessionResponse = await fetch(`${baseUrl}/online/session/interactive`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        initiationData: {
          initiationType: 'Invoice',
        },
      }),
    });

    if (!sessionResponse.ok) {
      const errorData = await sessionResponse.json();
      throw new Error(errorData.exception?.description || 'Failed to create KSeF session');
    }

    const sessionData = await sessionResponse.json();
    const sessionReferenceNumber = sessionData.sessionReferenceNumber;

    // Upload invoice to session
    const uploadResponse = await fetch(`${baseUrl}/online/session/interactive/${sessionReferenceNumber}/invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/xml',
      },
      body: xml,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.exception?.description || 'Failed to upload invoice to KSeF');
    }

    // Close session to trigger processing
    const closeResponse = await fetch(`${baseUrl}/online/session/interactive/${sessionReferenceNumber}/close`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!closeResponse.ok) {
      const errorData = await closeResponse.json();
      throw new Error(errorData.exception?.description || 'Failed to close KSeF session');
    }

    const closeData = await closeResponse.json();
    const referenceNumber = sessionReferenceNumber;

    let upo = null;
    try {
      // Try to get UPO from session status
      const statusResponse = await fetch(`${baseUrl}/online/session/interactive/${sessionReferenceNumber}/status`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.upo && statusData.upo.pages && statusData.upo.pages.length > 0) {
          upo = JSON.stringify(statusData.upo.pages[0]);
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve UPO:', error);
    }

    const { error: updateError } = await supabaseClient
      .from('invoices')
      .update({
        ksef_status: 'submitted',
        ksef_reference_number: referenceNumber,
        ksef_submitted_at: new Date().toISOString(),
        ksef_upo: upo,
        ksef_error: null,
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Failed to update invoice:', updateError);
    }

    await supabaseClient.from('ksef_submission_log').insert({
      invoice_id: invoiceId,
      business_profile_id: businessProfileId,
      action: 'success',
      status_code: 200,
      response_data: closeData,
    });

    return new Response(
      JSON.stringify({
        success: true,
        referenceNumber,
        upo,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateInvoiceXml(invoice: any, businessProfile: any, customer: any): string {
  const formatNIP = (nip: string) => nip.replace(/[-\s]/g, '');
  const formatDate = (date: string) => new Date(date).toISOString().split('T')[0];
  const formatCurrency = (amount: number) => amount.toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Naglowek>
    <KodFormularza kodSystemowy="FA(3)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>3</WariantFormularza>
    <DataWytworzeniaFa>${new Date().toISOString()}</DataWytworzeniaFa>
    <SystemInfo>KsięgaI v1.0</SystemInfo>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>${formatNIP(businessProfile.taxId)}</NIP>
      <Nazwa>${businessProfile.name}</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>${businessProfile.country || 'PL'}</KodKraju>
      <AdresL1>${businessProfile.address || ''}</AdresL1>
      <AdresL2>${businessProfile.postalCode || ''} ${businessProfile.city || ''}</AdresL2>
    </Adres>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne>
      ${customer.taxId ? `<NIP>${formatNIP(customer.taxId)}</NIP>` : ''}
      <Nazwa>${customer.name}</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>${customer.country || 'PL'}</KodKraju>
      <AdresL1>${customer.address || ''}</AdresL1>
      <AdresL2>${customer.postalCode || ''} ${customer.city || ''}</AdresL2>
    </Adres>
  </Podmiot2>
  <Fa>
    <KodWaluty>${invoice.currency || 'PLN'}</KodWaluty>
    <P_1>${formatDate(invoice.issueDate)}</P_1>
    <P_2A>${invoice.number}</P_2A>
    ${invoice.dueDate ? `<P_6>${formatDate(invoice.dueDate)}</P_6>` : ''}
  </Fa>
  ${invoice.items.map((item: any, index: number) => `
  <FaWiersz>
    <NrWierszaFa>${index + 1}</NrWierszaFa>
    <P_7>${item.name || item.description || 'Pozycja'}</P_7>
    <P_8A>${formatCurrency(item.quantity || 1)}</P_8A>
    <P_8B>${item.unit || 'szt'}</P_8B>
    <P_9A>${formatCurrency(item.unitPrice || 0)}</P_9A>
    <P_11>${formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</P_11>
    <P_12>${item.vatExempt ? 'zw' : (item.vatRate || '23')}</P_12>
  </FaWiersz>`).join('')}
  <Podsumowanie>
    <P_13_1>${formatCurrency(invoice.totalNetValue || 0)}</P_13_1>
    ${invoice.totalVatValue ? `<P_14_1>${formatCurrency(invoice.totalVatValue)}</P_14_1>` : ''}
    <P_15>${formatCurrency(invoice.totalGrossValue || 0)}</P_15>
  </Podsumowanie>
</Faktura>`;
}
