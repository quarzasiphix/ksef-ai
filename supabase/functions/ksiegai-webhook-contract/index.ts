import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ksiegai-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  let processingStatus = 'failed'
  let errorMessage = ''

  try {
    const payload = await req.text()
    const payloadHash = createHmac('sha256', '').update(payload).digest('hex')
    
    // Verify HMAC signature
    const signature = req.headers.get('x-ksiegai-signature')
    const timestamp = req.headers.get('x-ksiegai-timestamp')
    
    if (!signature || !timestamp) {
      throw new Error('Missing signature or timestamp headers')
    }

    // Check timestamp window (5 minutes)
    const requestTime = parseInt(timestamp)
    const now = Date.now()
    if (Math.abs(now - requestTime) > 300000) {
      throw new Error('Request timestamp outside acceptable window')
    }

    // Verify HMAC
    const webhookSecret = Deno.env.get('KSIEGAI_WEBHOOK_SECRET') ?? ''
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex')

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature')
    }

    // Parse payload
    const data = JSON.parse(payload)
    const { event_type, contract_id, customer_id, linked_invoice_id, contract_data } = data

    // Find CRM client by Księgai customer_id
    const { data: ksiegaiCustomer } = await supabaseClient
      .from('ksiegai_customers')
      .select('crm_user_id')
      .eq('ksiegai_customer_id', customer_id)
      .single()

    if (!ksiegaiCustomer) {
      throw new Error('Customer not linked to CRM')
    }

    // Find CRM client
    const { data: client } = await supabaseClient
      .from('clients')
      .select('id')
      .eq('ksiegai_profile_id', customer_id)
      .single()

    if (!client) {
      throw new Error('Client not found in CRM')
    }

    // Check if contract already synced
    const { data: existingSync } = await supabaseClient
      .from('ksiegai_contracts_sync')
      .select('id, crm_contract_id')
      .eq('ksiegai_contract_id', contract_id)
      .single()

    let crmContractId: string

    if (existingSync) {
      // Update existing contract
      crmContractId = existingSync.crm_contract_id

      // Check for conflicts
      const { data: crmContract } = await supabaseClient
        .from('contracts')
        .select('status, signed_at, updated_at')
        .eq('id', crmContractId)
        .single()

      if (crmContract) {
        // Conflict detection: CRM says signed but Księgai is updating
        if (crmContract.status === 'signed' && event_type === 'contract.updated') {
          await supabaseClient
            .from('ksiegai_contracts_sync')
            .update({
              conflict_detected: true,
              conflict_reason: 'CRM contract signed but Księgai sent update',
              last_ksiegai_update: new Date().toISOString(),
            })
            .eq('id', existingSync.id)

          throw new Error('Conflict detected: contract already signed in CRM')
        }

        // Update non-signing fields only
        await supabaseClient
          .from('contracts')
          .update({
            title: contract_data.title,
            description: contract_data.description,
            combined_with_invoice_id: linked_invoice_id,
          })
          .eq('id', crmContractId)
      }

      // Update sync record
      await supabaseClient
        .from('ksiegai_contracts_sync')
        .update({
          last_synced_at: new Date().toISOString(),
          last_ksiegai_update: new Date().toISOString(),
        })
        .eq('id', existingSync.id)

    } else {
      // Create new contract in CRM
      const { data: newContract, error: contractError } = await supabaseClient
        .from('contracts')
        .insert({
          client_id: client.id,
          title: contract_data.title,
          description: contract_data.description,
          status: 'sent',
          signature_policy: contract_data.signature_policy || 'simple_only',
          required_signature_level: contract_data.required_signature_level || 'simple',
          file_url: contract_data.file_url,
          ksiegai_contract_id: contract_id,
          ksiegai_synced_at: new Date().toISOString(),
          combined_with_invoice_id: linked_invoice_id,
        })
        .select()
        .single()

      if (contractError) {
        throw contractError
      }

      crmContractId = newContract.id

      // Create sync record
      await supabaseClient
        .from('ksiegai_contracts_sync')
        .insert({
          crm_contract_id: crmContractId,
          ksiegai_contract_id: contract_id,
          ksiegai_user_id: ksiegaiCustomer.crm_user_id,
          crm_client_id: client.id,
          sync_direction: 'ksiegai_to_crm',
          sync_status: 'active',
          last_synced_at: new Date().toISOString(),
          last_ksiegai_update: new Date().toISOString(),
        })

      // Log audit event
      await supabaseClient
        .from('contract_audit_events')
        .insert({
          contract_id: crmContractId,
          event_type: 'contract_synced_from_ksiegai',
          event_data: {
            ksiegai_contract_id: contract_id,
            event_type,
            linked_invoice_id,
          },
        })
    }

    processingStatus = 'success'

    // Log webhook
    await supabaseClient
      .from('ksiegai_webhook_log')
      .insert({
        webhook_type: event_type,
        payload_hash: payloadHash,
        signature_header: signature,
        signature_valid: true,
        ip_address: ipAddress,
        processing_status: processingStatus,
      })

    return new Response(
      JSON.stringify({
        success: true,
        crm_contract_id: crmContractId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    errorMessage = (error as Error).message
    processingStatus = 'failed'

    // Log failed webhook
    await supabaseClient
      .from('ksiegai_webhook_log')
      .insert({
        webhook_type: 'unknown',
        payload_hash: '',
        signature_header: req.headers.get('x-ksiegai-signature') || '',
        signature_valid: false,
        ip_address: ipAddress,
        processing_status: processingStatus,
        error_message: errorMessage,
      })

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
