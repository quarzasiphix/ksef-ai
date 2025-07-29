import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import 'https://deno.land/x/xhr@0.1.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    console.log('Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceKey: !!supabaseServiceKey
    })

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: userData, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError) {
      console.error('Auth error:', userError)
      throw userError
    }

    const user = userData.user
    console.log('User:', { id: user?.id, email: user?.email })

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const adminClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    console.log('Checking existing subscriptions for user:', user.id)
    
    const { count, error: countError } = await adminClient
      .from('premium_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Count error:', countError)
      throw countError
    }
    
    console.log('Existing subscriptions count:', count)
    
    if (count !== null && count > 0) {
      return new Response(JSON.stringify({ error: 'User not eligible for a free trial.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const startsAt = new Date()
    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + 7)

    // Generate a unique ID for the free trial
    const freeTrialId = `free_trial_${user.id}_${Date.now()}`;

    console.log('Creating new subscription with ID:', freeTrialId, {
      user_id: user.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString()
    });

    const { data, error } = await adminClient
      .from('premium_subscriptions')
      .insert({
        user_id: user.id,
        is_active: true,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        stripe_subscription_id: freeTrialId, // Use unique ID
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      throw error
    }

    console.log('Subscription created successfully:', data)
    
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Unhandled error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})