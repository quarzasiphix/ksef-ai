// supabase/functions/shared-doc/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchParams } = new URL(req.url)
    const slug = searchParams.get('slug')

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: slug' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the share record
    const { data: share, error: shareError } = await supabaseClient
      .from('shared')
      .select('*')
      .eq('slug', slug)
      .single()

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ error: 'Share not found or access denied' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Handle view-once shares
    if (share.view_once) {
      // Mark as viewed
      await supabaseClient
        .from('shared')
        .update({ 
          viewed_at: new Date().toISOString(),
          // Optionally, you could delete the share here instead
          // or set an expiration
        })
        .eq('id', share.id)
    }

    // Get the shared document based on share type
    let document = null
    let error = null

    if (share.share_type === 'invoice' && share.invoice_id) {
      const { data, error: invoiceError } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('id', share.invoice_id)
        .single()
      document = data
      error = invoiceError
    } 
    else if (share.share_type === 'contract' && share.contract_id) {
      const { data, error: contractError } = await supabaseClient
        .from('contracts')
        .select('*')
        .eq('id', share.contract_id)
        .single()
      document = data
      error = contractError
    }
    // Add more document types as needed

    if (error || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return the document
    return new Response(
      JSON.stringify({ 
        document,
        share_type: share.share_type,
        view_once: share.view_once,
        expires_at: share.expires_at
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          // Cache for 1 minute to reduce database load
          'Cache-Control': 'public, max-age=60'
        }
      }
    )

  } catch (error) {
    console.error('Error in shared-doc function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})