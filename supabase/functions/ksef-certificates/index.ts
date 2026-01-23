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
    console.log('🔑 Getting KSeF public key certificates')
    
    // Get the URL path to determine the endpoint
    const url = new URL(req.url)
    const path = url.pathname
    
    console.log('🔑 Request path:', path)
    
    let ksefEndpoint: string
    
    if (path.includes('/security/public-key-certificates')) {
      ksefEndpoint = 'https://api-test.ksef.mf.gov.pl/v2/security/public-key-certificates'
    } else {
      throw new Error(`Unknown endpoint: ${path}`)
    }
    
    console.log('🔑 Forwarding to KSeF endpoint:', ksefEndpoint)
    
    // Make request to KSeF API
    const response = await fetch(ksefEndpoint, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'KsiegaI/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`KSeF API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    console.log('✅ KSeF certificates received:', data)
    console.log('🔑 Certificates count:', Array.isArray(data) ? data.length : 'Not an array')
    
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
    console.error('❌ KSeF certificates error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Failed to get KSeF certificates',
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
