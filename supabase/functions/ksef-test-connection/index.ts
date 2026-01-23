import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TestResult {
  success: boolean
  message: string
  details?: any
  error?: string
}

// CORS headers - specifically allow localhost for development
const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'https://localhost:3000',
    'https://localhost:8080',
    'https://localhost:5173'
  ];

  const isAllowed = !origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');

  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin || '*') : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
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

    console.log('🧪 Testing KSeF database connection...')

    const results: TestResult[] = []

    // Test 1: Database connection
    try {
      const { data, error } = await supabaseClient
        .from('business_profiles')
        .select('count')
        .limit(1)

      if (error) {
        results.push({
          success: false,
          message: 'Database connection failed',
          error: error.message
        })
      } else {
        results.push({
          success: true,
          message: 'Database connection working'
        })
      }
    } catch (error) {
      results.push({
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 2: KSeF integrations table structure
    try {
      const { data, error } = await supabaseClient
        .from('ksef_integrations')
        .select('id, business_profile_id, status')
        .limit(1)

      if (error) {
        results.push({
          success: false,
          message: 'KSeF integrations table error',
          error: error.message
        })
      } else {
        results.push({
          success: true,
          message: 'KSeF integrations table accessible',
          details: `Found ${data?.length || 0} records`
        })
      }
    } catch (error) {
      results.push({
        success: false,
        message: 'KSeF integrations table error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 3: Invoices with customer names view
    try {
      const { data, error } = await supabaseClient
        .from('invoices_with_customer_name')
        .select('id, number, customerName')
        .limit(1)

      if (error) {
        results.push({
          success: false,
          message: 'Invoices view error',
          error: error.message
        })
      } else {
        results.push({
          success: true,
          message: 'Invoices with customer names view working',
          details: `Found ${data?.length || 0} records`
        })
      }
    } catch (error) {
      results.push({
        success: false,
        message: 'Invoices view error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 4: Business profiles with KSeF integration
    try {
      const { data, error } = await supabaseClient
        .from('business_profiles')
        .select(`
          id,
          name,
          tax_id,
          ksef_integrations!inner(status)
        `)
        .eq('ksef_integrations.status', 'active')
        .limit(1)

      if (error) {
        results.push({
          success: false,
          message: 'Business profiles with KSeF integration error',
          error: error.message
        })
      } else {
        results.push({
          success: true,
          message: 'Business profiles with KSeF integration working',
          details: `Found ${data?.length || 0} active profiles`
        })
      }
    } catch (error) {
      results.push({
        success: false,
        message: 'Business profiles with KSeF integration error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Test 5: Sample invoice query
    try {
      const { data, error } = await supabaseClient
        .from('invoices_with_customer_name')
        .select('id, number, customerName, total_gross_value, ksef_status')
        .limit(3)

      if (error) {
        results.push({
          success: false,
          message: 'Sample invoice query error',
          error: error.message
        })
      } else {
        results.push({
          success: true,
          message: 'Sample invoice query working',
          details: {
            count: data?.length || 0,
            sample: data?.[0] ? {
              id: data[0].id,
              number: data[0].number,
              customer: data[0].customerName,
              amount: data[0].total_gross_value,
              ksefStatus: data[0].ksef_status
            } : null
          }
        })
      }
    } catch (error) {
      results.push({
        success: false,
        message: 'Sample invoice query error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Calculate overall success
    const successCount = results.filter(r => r.success).length
    const overallSuccess = successCount === results.length

    const response = {
      success: overallSuccess,
      message: overallSuccess 
        ? 'All KSeF connection tests passed!' 
        : `${successCount}/${results.length} tests passed`,
      results,
      summary: {
        total: results.length,
        passed: successCount,
        failed: results.length - successCount
      }
    }

    console.log('📊 Test results:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  } catch (error) {
    console.error('❌ KSeF test connection failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Test connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
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
