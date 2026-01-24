import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from 'https://deno.land/std@0.168.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { contract_id, signer_email } = await req.json()

    if (!contract_id || !signer_email) {
      throw new Error('contract_id and signer_email are required')
    }

    // Verify contract exists and is in correct status
    const { data: contract, error: contractError } = await supabaseClient
      .from('contracts')
      .select('id, status, client_id')
      .eq('id', contract_id)
      .single()

    if (contractError || !contract) {
      throw new Error('Contract not found')
    }

    if (contract.status === 'signed' || contract.status === 'completed') {
      throw new Error('Contract is already signed')
    }

    // Generate cryptographically secure token
    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Hash the token for storage (never store raw token)
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Set expiry (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Store hashed token
    const { data: tokenRecord, error: tokenError } = await supabaseClient
      .from('contract_signer_tokens')
      .insert({
        contract_id,
        signer_email,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        is_valid: true,
      })
      .select()
      .single()

    if (tokenError) {
      throw tokenError
    }

    // Log audit event
    await supabaseClient
      .from('contract_audit_events')
      .insert({
        contract_id,
        event_type: 'signing_token_generated',
        event_data: {
          signer_email,
          expires_at: expiresAt.toISOString(),
          token_id: tokenRecord.id,
        },
        actor_email: signer_email,
      })

    // Generate signing URL
    const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'http://localhost:5173'
    const signingUrl = `${baseUrl}/sign/${token}`

    return new Response(
      JSON.stringify({
        success: true,
        signing_url: signingUrl,
        token_id: tokenRecord.id,
        expires_at: expiresAt.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
