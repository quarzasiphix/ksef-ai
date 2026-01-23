import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async function handleRequest(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname

  console.log('📄 Handling request:', path)

  // Handle auth/challenge endpoint (no auth required)
  if (path === '/auth/challenge' || path === '/ksef-challenge/auth/challenge') {
    try {
      console.log('🔐 Handling auth challenge request')
      
      const response = await fetch('https://api-test.ksef.mf.gov.pl/v2/auth/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        },
        body: JSON.stringify({})
      })
      
      console.log('🔐 KSeF challenge response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ KSeF challenge error response:', errorText)
        throw new Error(`Challenge failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('🔐 Challenge successful:', JSON.stringify(data, null, 2))
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    } catch (error) {
      console.error('❌ Challenge error:', error)
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
  }

  // Handle auth/ksef-token endpoint (auth required)
  if (path === '/auth/ksef-token' || path === '/ksef-challenge/auth/ksef-token') {
    try {
      console.log('🎫 Handling KSeF token request')
      
      const body = await req.json()
      console.log('🎫 Token request body:', JSON.stringify(body, null, 2))
      
      const response = await fetch('https://api-test.ksef.mf.gov.pl/v2/auth/ksef-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        },
        body: JSON.stringify(body)
      })
      
      console.log('🎫 KSeF token response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ KSeF token error response:', errorText)
        throw new Error(`Token request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('🎫 Token request successful:', JSON.stringify(data, null, 2))
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    } catch (error) {
      console.error('❌ Token request error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to get KSeF token',
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
  }

  // Handle auth/token/redeem endpoint (auth required) - MUST COME BEFORE generic /auth/ check
  if (path === '/auth/token/redeem' || path === '/ksef-challenge/auth/token/redeem') {
    try {
      console.log('🎫 Handling token redeem request')
      
      // Get authorization header (this is how KSeF API expects the token)
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({
            error: 'Missing authorization header',
            message: 'Bearer token required for token redemption'
          }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            status: 401
          }
        )
      }
      
      const token = authHeader.substring(7) // Remove 'Bearer ' prefix
      console.log('🎫 Using authentication token for redemption, length:', token.length)
      
      // KSeF token redeem uses Authorization header and empty body
      const response = await fetch('https://api-test.ksef.mf.gov.pl/v2/auth/token/redeem', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        }
      })
      
      console.log('🎫 Token redeem response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Token redeem error response:', errorText)
        throw new Error(`Token redeem failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('🎫 Token redeem successful:', JSON.stringify(data, null, 2))
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    } catch (error) {
      console.error('❌ Token redeem error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to redeem token',
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
  }

  // Handle auth status polling endpoint (GET request with reference number)
  if (path.startsWith('/auth/') || path.startsWith('/ksef-challenge/auth/')) {
    try {
      console.log('📊 Handling auth status request')
      
      // Extract reference number from path
      const pathParts = path.split('/')
      const referenceNumber = pathParts[pathParts.length - 1]
      
      if (!referenceNumber) {
        return new Response(
          JSON.stringify({
            error: 'Missing reference number',
            message: 'Reference number required in path'
          }),
          { 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            },
            status: 400
          }
        )
      }
      
      console.log('📊 Checking auth status for:', referenceNumber)
      
      // Auth status check might not require authorization - try without first
      let response = await fetch(`https://api-test.ksef.mf.gov.pl/v2/auth/${referenceNumber}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        }
      })
      
      // If 401, try with authorization header
      if (response.status === 401) {
        console.log('📊 Auth status requires authorization, retrying with token')
        const authHeader = req.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return new Response(
            JSON.stringify({
              error: 'Missing authorization header',
              message: 'Bearer token required for auth status check'
            }),
            { 
              headers: { 
                'Content-Type': 'application/json',
                ...corsHeaders
              },
              status: 401
            }
          )
        }
        
        const token = authHeader.substring(7) // Remove 'Bearer ' prefix
        console.log('📊 Using token for auth status check, length:', token.length)
        
        response = await fetch(`https://api-test.ksef.mf.gov.pl/v2/auth/${referenceNumber}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'User-Agent': 'KsiegaI/1.0'
          }
        })
      }
      
      console.log('📊 Auth status response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Auth status error response:', errorText)
        throw new Error(`Auth status check failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📊 Auth status successful:', JSON.stringify(data, null, 2))
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    } catch (error) {
      console.error('❌ Auth status error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to check auth status',
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
  }

  // Handle invoice export endpoint (auth required)
  if (path === '/invoices/exports' || path === '/ksef-challenge/invoices/exports') {
    try {
      console.log('📄 Handling invoice export request')
      
      const authHeader = req.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header')
      }
    
    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
      const body = await req.json()
      console.log('📤 Invoice export request body:', JSON.stringify(body, null, 2))
      console.log('📤 Token length:', token.length)
      console.log('📤 Token preview:', token.substring(0, 50) + '...')
      
      const response = await fetch('https://api-test.ksef.mf.gov.pl/v2/invoices/exports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        },
        body: JSON.stringify(body)
      })
      
      console.log('📤 KSeF API response status:', response.status)
      console.log('📤 KSeF API response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ KSeF API error response:', errorText)
        throw new Error(`Invoice export failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('📄 Invoice export successful:', JSON.stringify(data, null, 2))
      
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    } catch (error) {
      console.error('❌ Invoice export error:', error)
      return new Response(
        JSON.stringify({
          error: 'Failed to process invoice export',
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
  }

  // Handle unknown routes
  return new Response(
    JSON.stringify({
      error: 'Not found',
      message: `Route ${path} not found`
    }),
    { 
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      },
      status: 404
    }
  )
})
