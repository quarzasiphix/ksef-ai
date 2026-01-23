import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async function handleInvoiceExport(req) {
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
