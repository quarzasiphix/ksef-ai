import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { userId, syncAll = false } = await req.json()
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🚀 Ksiegai init for user:', userId, 'syncAll:', syncAll)

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from JWT token
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid JWT', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated:', user.id, 'Requested userId:', userId)
    
    // Verify user ID matches (for security)
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has Ksiegai linked account
    const { data: linkedAccount, error: linkError } = await (supabase as any)
      .from('ksiegai_linked_accounts')
      .select('*')
      .eq('crm_user_id', userId)
      .eq('status', 'active')
      .single()

    if (linkError || !linkedAccount) {
      console.error('No Ksiegai link found:', linkError)
      return new Response(
        JSON.stringify({ error: 'No active Ksiegai link found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔗 Ksiegai account found:', linkedAccount.ksiegai_user_id)

    // Get data from database tables
    const initResult = await getKsiegaiDataFromDatabase(supabase, userId, linkedAccount, syncAll)

    return new Response(
      JSON.stringify(initResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in ksiegai-init:', error)
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Get Ksiegai data from database tables
async function getKsiegaiDataFromDatabase(supabase: any, userId: string, linkedAccount: any, syncAll: boolean) {
  console.log('📊 Getting Ksiegai data from database for user:', linkedAccount.ksiegai_user_id)
  
  try {
    // If syncAll is true, trigger a sync first
    if (syncAll) {
      console.log('🔄 Triggering full sync...')
      await triggerFullSync(supabase, userId, linkedAccount)
    }
    
    // Get customers from ksiegai_customers table
    const { data: customers, error: customerError } = await supabase
      .from('ksiegai_customers')
      .select('*')
      .eq('crm_user_id', userId)
      .eq('ksiegai_user_id', linkedAccount.ksiegai_user_id)
      .order('created_at', { ascending: false })
    
    if (customerError) {
      console.error('Error fetching customers:', customerError)
    }
    
    // Get business profiles
    const { data: businessProfiles, error: profileError } = await supabase
      .from('ksiegai_business_profiles')
      .select('*')
      .eq('crm_user_id', userId)
      .eq('ksiegai_user_id', linkedAccount.ksiegai_user_id)
      .order('created_at', { ascending: false })
    
    if (profileError) {
      console.error('Error fetching business profiles:', profileError)
    }
    
    // Get invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('ksiegai_invoices')
      .select('*')
      .eq('crm_user_id', userId)
      .eq('ksiegai_user_id', linkedAccount.ksiegai_user_id)
      .order('created_at', { ascending: false })
    
    if (invoiceError) {
      console.error('Error fetching invoices:', invoiceError)
    }
    
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        id: userId,
        email: linkedAccount.ksiegai_user_email,
        ksiegai_user_id: linkedAccount.ksiegai_user_id
      },
      data: {
        customers: {
          items: customers || [],
          total: customers?.length || 0,
          total_contracts: customers?.reduce((sum: number, customer: any) => 
            sum + (customer.contracts?.length || 0), 0
          ) || 0
        },
        business_profiles: {
          items: businessProfiles || [],
          total: businessProfiles?.length || 0
        },
        invoices: {
          items: invoices || [],
          total: invoices?.length || 0
        }
      },
      syncAllTriggered: syncAll,
      message: `📊 Found ${customers?.length || 0} customers, ${businessProfiles?.length || 0} business profiles, ${invoices?.length || 0} invoices${syncAll ? ' (after sync)' : ''}`
    }
    
    console.log('📊 Database query results:', {
      customers: customers?.length || 0,
      businessProfiles: businessProfiles?.length || 0,
      invoices: invoices?.length || 0
    })
    
    return result
    
  } catch (error) {
    console.error('❌ Error getting data from database:', error)
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Failed to get Ksiegai data from database',
      data: {
        customers: { items: [], total: 0 },
        business_profiles: { items: [], total: 0 },
        invoices: { items: [], total: 0 }
      }
    }
  }
}

// Trigger full sync using the sync-ksiegai-customers function
async function triggerFullSync(supabase: any, userId: string, linkedAccount: any) {
  try {
    console.log('🔄 Calling sync-ksiegai-customers function...')
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No session found for sync')
      return
    }
    
    const syncFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-ksiegai-customers`
    
    const response = await fetch(syncFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: userId,
        syncAll: true
      })
    })
    
    if (response.ok) {
      const syncResult = await response.json()
      console.log('✅ Sync completed:', syncResult.message)
    } else {
      const errorText = await response.text()
      console.error('❌ Sync failed:', response.status, errorText)
    }
    
  } catch (error) {
    console.error('❌ Error triggering sync:', error)
  }
}