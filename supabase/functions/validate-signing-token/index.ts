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

    const { token } = await req.json()

    if (!token) {
      throw new Error('Token is required')
    }

    // Hash the provided token
    const tokenHash = createHash('sha256').update(token).digest('hex')

    // Find token record
    const { data: tokenRecord, error: tokenError } = await supabaseClient
      .from('contract_signer_tokens')
      .select('*, contracts(*)')
      .eq('token_hash', tokenHash)
      .single()

    if (tokenError || !tokenRecord) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Invalid token' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Check if token is valid
    if (!tokenRecord.is_valid) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Token has been invalidated' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Check if token has been used
    if (tokenRecord.used_at) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Token has already been used' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(tokenRecord.expires_at)
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Token has expired' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Check contract status
    const contract = tokenRecord.contracts
    if (contract.status === 'signed' || contract.status === 'completed') {
      return new Response(
        JSON.stringify({ valid: false, reason: 'Contract is already signed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Token is valid
    return new Response(
      JSON.stringify({
        valid: true,
        contract_id: tokenRecord.contract_id,
        signer_email: tokenRecord.signer_email,
        contract: {
          id: contract.id,
          title: contract.title,
          description: contract.description,
          signature_policy: contract.signature_policy,
          file_url: contract.file_url,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
