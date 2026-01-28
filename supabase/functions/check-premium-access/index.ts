import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PremiumCheckRequest {
  userId: string;
  businessProfileId?: string;
}

interface PremiumCheckResponse {
  hasAccess: boolean;
  level: 'free' | 'user' | 'business' | 'enterprise';
  subscriptionType?: string;
  features: Record<string, any>;
  expiresAt?: string;
  source: 'user_subscription' | 'business_subscription' | 'enterprise_subscription';
  debugInfo?: any;
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

    const { userId, businessProfileId } = await req.json() as PremiumCheckRequest

    console.log('[check-premium-access] Checking premium for user:', userId, 'business:', businessProfileId)

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          hasAccess: false, 
          level: 'free', 
          features: {}, 
          source: 'user_subscription' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Query the premium_status view for comprehensive premium check
    let query = supabaseClient
      .from('premium_status')
      .select('*')
      .eq('user_id', userId)

    if (businessProfileId) {
      query = query.eq('business_profile_id', businessProfileId)
    }

    const { data, error } = await query.single()

    if (error && error.code !== 'PGRST116') {
      console.error('[check-premium-access] Error querying premium_status:', error)
      throw error
    }

    // If no business profile specified, check for user-level premium
    if (!businessProfileId) {
      // Check if user has enterprise or user-level subscription
      const { data: userPremium, error: userError } = await supabaseClient
        .from('premium_status')
        .select('*')
        .eq('user_id', userId)
        .or('user_tier.not.is.null,effective_tier.eq.enterprise')
        .limit(1)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        console.error('[check-premium-access] Error checking user premium:', userError)
      }

      if (userPremium && (userPremium.user_tier || userPremium.effective_tier === 'enterprise')) {
        const level = userPremium.effective_tier === 'enterprise' ? 'enterprise' : 'user'
        const features = getFeaturesForTier(userPremium.effective_tier)
        
        return new Response(
          JSON.stringify({
            hasAccess: true,
            level,
            subscriptionType: userPremium.user_tier || 'enterprise',
            features,
            expiresAt: userPremium.user_period_end,
            source: level === 'enterprise' ? 'enterprise_subscription' : 'user_subscription',
            debugInfo: { queryType: 'user_level', data: userPremium }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // No user-level premium
      return new Response(
        JSON.stringify({ 
          hasAccess: false, 
          level: 'free', 
          features: { basic_features: true }, 
          source: 'user_subscription',
          debugInfo: { queryType: 'user_level', message: 'No user-level premium found' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Business profile specified - check business-specific premium
    if (!data) {
      console.log('[check-premium-access] No premium status found for business:', businessProfileId)
      return new Response(
        JSON.stringify({ 
          hasAccess: false, 
          level: 'free', 
          features: { basic_features: true }, 
          source: 'user_subscription',
          debugInfo: { queryType: 'business_level', message: 'No premium status found' }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log('[check-premium-access] Premium status data:', data)

    const hasAccess = data.has_premium === 'true' || data.has_premium === true
    const level = mapTierToLevel(data.effective_tier)
    const subscriptionType = data.business_tier || data.user_tier
    const expiresAt = data.business_period_end || data.user_period_end
    const source = mapSource(data.premium_source)
    const features = getFeaturesForTier(data.effective_tier)

    const response: PremiumCheckResponse = {
      hasAccess,
      level,
      subscriptionType,
      features,
      expiresAt,
      source,
      debugInfo: {
        queryType: 'business_level',
        rawData: data,
        businessProfileId,
        userId
      }
    }

    console.log('[check-premium-access] Response:', response)

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[check-premium-access] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        hasAccess: false,
        level: 'free',
        features: {},
        source: 'user_subscription'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

function mapTierToLevel(tier: string | null): 'free' | 'user' | 'business' | 'enterprise' {
  switch (tier) {
    case 'enterprise':
      return 'enterprise'
    case 'premium':
      return 'business'
    case 'admin':
    case 'manual_client':
      return 'user'
    case 'free':
    default:
      return 'free'
  }
}

function mapSource(source: string): 'user_subscription' | 'business_subscription' | 'enterprise_subscription' {
  switch (source) {
    case 'enterprise_subscription':
      return 'enterprise_subscription'
    case 'business_subscription':
      return 'business_subscription'
    case 'user_subscription':
    default:
      return 'user_subscription'
  }
}

function getFeaturesForTier(tier: string | null): Record<string, any> {
  switch (tier) {
    case 'enterprise':
      return {
        all_features: true,
        unlimited_businesses: true,
        priority_support: true,
        custom_branding: true,
        ksef_integration: true,
        automated_invoices: true,
        advanced_reports: true,
        api_access: true,
        multi_currency: true,
        advanced_analytics: true,
        batch_operations: true,
        export_advanced: true
      }
    
    case 'premium':
      return {
        premium_features: true,
        ksef_integration: true,
        automated_invoices: true,
        advanced_reports: true,
        api_access: true,
        multi_currency: true,
        advanced_analytics: true,
        batch_operations: true,
        export_advanced: true
      }
    
    case 'admin':
      return {
        all_features: true,
        unlimited_businesses: true,
        priority_support: true,
        can_manage_users: true,
        can_manage_subscriptions: true,
        can_access_all_features: true
      }
    
    case 'manual_client':
      return {
        premium_features: true,
        unlimited_businesses: true,
        priority_support: true,
        ksef_integration: true,
        automated_invoices: true,
        advanced_reports: true,
        api_access: true,
        multi_currency: true,
        advanced_analytics: true,
        batch_operations: true,
        export_advanced: true
      }
    
    case 'free':
    default:
      return {
        basic_features: true
      }
  }
}
