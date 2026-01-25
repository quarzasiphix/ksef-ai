import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionRecord {
  id: string;
  starts_at?: string;
  ends_at?: string;
  trial_ends_at?: string;
  cancel_at_period_end?: boolean;
  is_active?: boolean; // Legacy field - will be ignored
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data, error } = await supabaseClient
      .from('enhanced_subscriptions')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    // Calculate is_active dynamically for each subscription
    const updatedSubscriptions = (data as SubscriptionRecord[]).map(subscription => {
      const now = new Date()
      
      // Check if subscription has started
      if (subscription.starts_at && new Date(subscription.starts_at) > now) {
        return { ...subscription, is_active: false }
      }
      
      // Check if subscription has ended
      if (subscription.ends_at && new Date(subscription.ends_at) <= now) {
        return { ...subscription, is_active: false }
      }
      
      // If there's a trial end date and it's in the past, subscription is inactive
      // (unless there's a regular end date that's still in the future)
      if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) <= now && !subscription.ends_at) {
        return { ...subscription, is_active: false }
      }
      
      return { ...subscription, is_active: true }
    })

    return new Response(
      JSON.stringify({ subscriptions: updatedSubscriptions }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
