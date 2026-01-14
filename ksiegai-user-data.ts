import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ksiegai_user_id } = await req.json()

    if (!ksiegai_user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing ksiegai_user_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user data
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      ksiegai_user_id
    )

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    // Get business profile
    const { data: businessData, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, name')
      .eq('user_id', ksiegai_user_id)
      .single()

    const businessProfile = businessError ? null : businessData

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          business_profile: businessProfile
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error fetching Ksiegai user data:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
