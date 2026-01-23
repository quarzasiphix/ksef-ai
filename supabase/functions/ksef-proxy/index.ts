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
    const url = new URL(req.url)
    const pathSegments = url.pathname.split('/').filter(Boolean)
    
    // Extract the KSeF API path after /ksef-proxy/
    const ksefPath = pathSegments.slice(2).join('/') // Skip 'functions' and 'ksef-proxy'
    
    if (!ksefPath) {
      return new Response(
        JSON.stringify({ error: 'KSeF API path required' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          },
          status: 400
        }
      )
    }

    // Build the KSeF API URL
    const ksefApiUrl = `https://api-test.ksef.mf.gov.pl/v2/${ksefPath}`
    
    console.log(`🔄 Proxying request to: ${ksefApiUrl}`)
    
    // Copy headers from original request, but remove some that cause issues
    const headers = new Headers()
    for (const [key, value] of req.headers.entries()) {
      if (!['host', 'origin', 'referer'].includes(key.toLowerCase())) {
        headers.append(key, value)
      }
    }
    
    // Add required KSeF headers
    headers.append('Accept', 'application/json')
    headers.append('Content-Type', 'application/json')
    
    // Make the request to KSeF API
    const response = await fetch(ksefApiUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? await req.text() : undefined,
    })
    
    // Copy response headers
    const responseHeaders = new Headers()
    for (const [key, value] of response.headers.entries()) {
      if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        responseHeaders.append(key, value)
      }
    }
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      responseHeaders.append(key, value)
    })
    
    // Return the response
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    })
    
  } catch (error) {
    console.error('❌ KSeF proxy error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Proxy error',
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
