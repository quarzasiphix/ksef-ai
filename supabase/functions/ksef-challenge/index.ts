import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔐 Getting KSeF challenge')
    
    // Make request to KSeF API
    const response = await fetch('https://api-test.ksef.mf.gov.pl/v2/auth/challenge', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`KSeF API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('✅ KSeF challenge received:', data)
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
    
  } catch (error) {
    console.error('❌ KSeF challenge error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Failed to get KSeF challenge',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 500
      }
    )
  }
})
