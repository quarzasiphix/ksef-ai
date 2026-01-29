import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionRecord {
  id: string;
  user_id: string;
  business_profile_id?: string;
  subscription_level: 'user' | 'company' | 'enterprise';
  starts_at?: string;
  ends_at?: string;
  trial_ends_at?: string;
  cancel_at_period_end?: boolean;
}

interface EnterpriseBenefit {
  id: string;
  user_id: string;
  business_profile_id?: string;
  benefit_type: string;
  is_active: boolean;
  expires_at?: string;
}

/**
 * Calculate if subscription is currently active based on dates
 */
function calculateIsActive(subscription: SubscriptionRecord): boolean {
  const now = new Date();
  
  // Check if subscription has started
  if (subscription.starts_at && new Date(subscription.starts_at) > now) {
    return false;
  }
  
  // Check if subscription has ended
  if (subscription.ends_at && new Date(subscription.ends_at) <= now) {
    return false;
  }
  
  // If there's a trial end date and it's in the past, subscription is inactive
  if (subscription.trial_ends_at && new Date(subscription.trial_ends_at) <= now && !subscription.ends_at) {
    return false;
  }
  
  return true;
}

/**
 * Determine subscription tier based on subscription level
 */
function getTierFromSubscription(subscription: SubscriptionRecord): string {
  if (subscription.subscription_level === 'enterprise') return 'enterprise';
  if (subscription.subscription_level === 'company') return 'spolka_premium';
  if (subscription.subscription_level === 'user') return 'jdg_premium';
  return 'free';
}

/**
 * Generate encrypted premium token
 */
async function generatePremiumToken(payload: {
  userId: string;
  businessId: string;
  tier: string;
  expiry: number;
}): Promise<string> {
  const secret = Deno.env.get('PREMIUM_TOKEN_SECRET') || 'default-secret-change-in-production';
  
  // Create token payload
  const tokenData = {
    userId: payload.userId,
    businessId: payload.businessId,
    tier: payload.tier,
    expiry: payload.expiry,
    timestamp: Date.now(),
    nonce: crypto.randomUUID()
  };
  
  // Convert to JSON and encode
  const tokenString = JSON.stringify(tokenData);
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenString);
  
  // Create HMAC signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, data);
  
  // Combine data and signature
  const combined = new Uint8Array(data.length + signature.byteLength);
  combined.set(data, 0);
  combined.set(new Uint8Array(signature), data.length);
  
  // Base64 encode
  return base64Encode(combined);
}

/**
 * Log premium access for audit trail
 */
async function logPremiumAccess(
  supabaseClient: any,
  userId: string,
  businessId: string,
  tier: string,
  verified: boolean
): Promise<void> {
  try {
    await supabaseClient
      .from('premium_access_logs')
      .insert({
        user_id: userId,
        business_profile_id: businessId,
        tier: tier,
        verified: verified,
        accessed_at: new Date().toISOString(),
        ip_address: null, // Could extract from request headers
        user_agent: null  // Could extract from request headers
      });
  } catch (error) {
    console.error('Failed to log premium access:', error);
    // Don't fail the request if logging fails
  }
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

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          message: 'Unauthorized - Please log in' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { businessId } = await req.json()
    
    if (!businessId) {
      return new Response(
        JSON.stringify({ 
          verified: false, 
          message: 'Business ID required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user-level premium subscriptions first (highest priority for user badges)
    const { data: userSubscription, error: userSubError } = await supabaseClient
      .from('enhanced_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .is_('business_profile_id', null) // User-level subscriptions have no business_profile_id
      .maybeSingle()

    if (!userSubError && userSubscription) {
      const isActive = calculateIsActive(userSubscription);
      
      if (isActive) {
        const tier = getTierFromSubscription(userSubscription);
        const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        const token = await generatePremiumToken({
          userId: user.id,
          businessId,
          tier,
          expiry
        });

        await logPremiumAccess(supabaseClient, user.id, businessId, tier, true);

        return new Response(
          JSON.stringify({ 
            verified: true, 
            token,
            expiry,
            tier,
            source: 'user_premium_subscription'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check enterprise benefits for this specific business (second priority)
    const { data: enterpriseBenefits, error: benefitsError } = await supabaseClient
      .from('enterprise_benefits')
      .select('*')
      .eq('user_id', user.id)
      .eq('business_profile_id', businessId)
      .eq('benefit_type', 'premium_access')
      .eq('is_active', true)
      .maybeSingle()

    if (!benefitsError && enterpriseBenefits) {
      // Check if benefit has expired
      if (!enterpriseBenefits.expires_at || new Date(enterpriseBenefits.expires_at) > new Date()) {
        const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        const token = await generatePremiumToken({
          userId: user.id,
          businessId,
          tier: 'enterprise',
          expiry
        });

        await logPremiumAccess(supabaseClient, user.id, businessId, 'enterprise', true);

        return new Response(
          JSON.stringify({ 
            verified: true, 
            token,
            expiry,
            tier: 'enterprise',
            source: 'enterprise_benefits'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check enhanced subscriptions
    const { data: subscription, error: subError } = await supabaseClient
      .from('enhanced_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('business_profile_id', businessId)
      .maybeSingle()

    if (subError) {
      console.error('Error fetching subscription:', subError);
    }

    if (subscription) {
      const isActive = calculateIsActive(subscription);
      
      if (isActive) {
        const tier = getTierFromSubscription(subscription);
        const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        const token = await generatePremiumToken({
          userId: user.id,
          businessId,
          tier,
          expiry
        });

        await logPremiumAccess(supabaseClient, user.id, businessId, tier, true);

        return new Response(
          JSON.stringify({ 
            verified: true, 
            token,
            expiry,
            tier,
            source: 'enhanced_subscription'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check business profile subscription (legacy)
    const { data: businessProfile, error: profileError } = await supabaseClient
      .from('business_profiles')
      .select('subscription_tier, subscription_status, subscription_ends_at, subscription_starts_at')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!profileError && businessProfile) {
      const now = new Date();
      const endsAt = businessProfile.subscription_ends_at ? new Date(businessProfile.subscription_ends_at) : null;
      const startsAt = businessProfile.subscription_starts_at ? new Date(businessProfile.subscription_starts_at) : null;
      
      const isActive = 
        businessProfile.subscription_status === 'active' &&
        (!startsAt || startsAt <= now) &&
        (!endsAt || endsAt > now);

      if (isActive && businessProfile.subscription_tier !== 'free') {
        const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        const token = await generatePremiumToken({
          userId: user.id,
          businessId,
          tier: businessProfile.subscription_tier,
          expiry
        });

        await logPremiumAccess(supabaseClient, user.id, businessId, businessProfile.subscription_tier, true);

        return new Response(
          JSON.stringify({ 
            verified: true, 
            token,
            expiry,
            tier: businessProfile.subscription_tier,
            source: 'business_profile'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // No active subscription found
    await logPremiumAccess(supabaseClient, user.id, businessId, 'free', false);

    return new Response(
      JSON.stringify({ 
        verified: false,
        tier: 'free',
        message: 'No active premium subscription found'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ 
        verified: false,
        message: 'Internal server error',
        error: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
