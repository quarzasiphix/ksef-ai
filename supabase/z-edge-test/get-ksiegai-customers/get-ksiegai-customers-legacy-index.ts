import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 get-ksiegai-customers: Request received')
    
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token received, length:', token.length)
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    console.log('Auth result:', { user: !!user, error: authError })
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid JWT', details: authError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    console.log('User authenticated:', user.id)

    const { business_profile_id } = await req.json().catch(() => ({}))
    console.log('Business profile filter:', business_profile_id)

    // Get linked account
    const { data: linkedAccount, error: linkError } = await supabaseClient
      .from('ksiegai_linked_accounts')
      .select('*')
      .eq('crm_user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (linkError || !linkedAccount) {
      console.error('No linked account found:', linkError)
      return new Response(
        JSON.stringify({ error: 'No linked Ksiegai account found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('Linked account found:', linkedAccount.id)

    // Fetch ALL customers from Ksiegai
    const ksiegaiResponse = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/get-all-customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ksiegai_user_id: linkedAccount.ksiegai_user_id,
        business_profile_id: business_profile_id || null
      })
    })

    if (!ksiegaiResponse.ok) {
      const errorText = await ksiegaiResponse.text()
      console.error('Failed to fetch customers from Ksiegai:', errorText)
      throw new Error(`Failed to fetch customers from Ksiegai: ${errorText}`)
    }

    const ksiegaiData = await ksiegaiResponse.json()
    console.log('Fetched customers:', ksiegaiData.customers?.length || 0, 'Source:', ksiegaiData.source)

    return new Response(
      JSON.stringify({ 
        success: true,
        customers: ksiegaiData.customers || [],
        total_contracts: ksiegaiData.total_contracts || 0,
        user: ksiegaiData.user,
        source: ksiegaiData.source
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error fetching Ksiegai customers:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})