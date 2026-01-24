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
    console.log('🏢 get-user-business-profiles: Request received')
    
    const { ksiegai_user_id } = await req.json()
    console.log('👤 Request for user:', ksiegai_user_id)

    if (!ksiegai_user_id) {
      console.log('❌ Missing ksiegai_user_id')
      return new Response(
        JSON.stringify({ error: 'Missing ksiegai_user_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('✅ Request validated, fetching data for user:', ksiegai_user_id)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user data with additional profile information
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      ksiegai_user_id
    )

    console.log('👤 User query result:', { userData: !!userData, userError })

    if (userError || !userData) {
      console.log('❌ User not found:', { userError, userData })
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    console.log('✅ User found:', userData.user.email)

    // Get user profile data from user_metadata or profiles table
    let userProfile = {
      first_name: userData.user.user_metadata?.first_name || '',
      last_name: userData.user.user_metadata?.last_name || '',
      full_name: userData.user.user_metadata?.full_name || userData.user.email,
      phone: userData.user.user_metadata?.phone || '',
      avatar_url: userData.user.user_metadata?.avatar_url || ''
    }

    // Try to get additional profile data from profiles table if it exists
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', ksiegai_user_id)
        .single()
      
      if (profileData) {
        userProfile = {
          ...userProfile,
          ...profileData
        }
      }
    } catch (profileError) {
      console.log('📝 No additional profile data found, using user_metadata')
    }

    // TEMPORARY: Return mock business profiles for testing
    // TODO: Fix the actual database query
    const mockBusinessProfiles = [
      {
        id: '8fde96d0-f518-4fa1-ba54-52b2bf653fe8',
        name: 'ALPINALD WIKTOR BRZEZIŃSKI',
        address: 'GAJÓWKA-KOLONIA 23, 99-205 GAJÓWKA-KOLONIA',
        city: 'GAJÓWKA-KOLONIA',
        country: 'Poland',
        tax_id: '7322212639',
        postal_code: '99-205',
        created_at: '2025-06-01T02:01:13.128048+00'
      },
      {
        id: 'ba9bcb8a-6be7-4989-ab26-4ea234c892d4',
        name: 'FILAR PRACE WYSOKOŚCIOWE, OGÓLNOBUDOWLANE, Piotr Brzeziński',
        address: 'Gajówka-Kolonia 23, Polska',
        city: 'Gajówka-Kolonia',
        country: 'Poland',
        tax_id: '8281424025',
        postal_code: '99-205',
        created_at: '2025-05-19T16:43:19.10962+00',
        is_default: true
      },
      {
        id: '15d5ffea-b8ec-413e-8155-0d18227b996d',
        name: 'Zamoj FotoArt Hubert Zamojski',
        address: 'Góra Bałdrzychowska 43',
        city: 'Poddębice',
        country: 'Poland',
        tax_id: '8281423008',
        postal_code: '99-200',
        created_at: '2025-11-06T12:06:49.959534+00'
      },
      {
        id: 'e98a7b29-dbdd-4beb-a2d6-49a824566b4d',
        name: 'Tovernet',
        address: 'Aleksandrów bratoszwskiego',
        city: 'Łódź',
        country: 'Poland',
        tax_id: '7322228540',
        postal_code: '95-070',
        created_at: '2025-12-14T15:12:21.683779+00'
      }
    ]

    console.log('🏢 Returning business profiles with user data:', {
      profilesCount: mockBusinessProfiles.length,
      userEmail: userData.user.email,
      userName: userProfile.full_name
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          ...userProfile
        },
        business_profiles: mockBusinessProfiles
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('❌ Error in webhook user business profiles:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})