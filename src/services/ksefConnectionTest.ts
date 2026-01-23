import { supabase } from '@/integrations/supabase/client';

/**
 * Test KSeF database connection and fix verification
 */
export async function testKsefConnection() {
  console.log('🧪 Testing KSeF database connection...');
  
  try {
    // Test 1: Check if ksef_integrations table exists and has correct columns
    console.log('📋 Test 1: KSeF integrations table structure');
    const { data: integrationsColumns, error: integrationsError } = await supabase
      .rpc('get_table_columns', { table_name: 'ksef_integrations' });
    
    if (integrationsError) {
      console.error('❌ Error checking ksef_integrations:', integrationsError);
      return false;
    }
    
    console.log('✅ KSeF integrations table columns:', integrationsColumns?.map((c: any) => c.column_name));
    
    // Test 2: Check if invoices_with_customer_name view works
    console.log('📋 Test 2: Invoices with customer name view');
    const { data: invoiceTest, error: invoiceError } = await supabase
      .from('invoices_with_customer_name')
      .select('id, number, customerName')
      .limit(1);
    
    if (invoiceError) {
      console.error('❌ Error checking invoices view:', invoiceError);
      return false;
    }
    
    console.log('✅ Invoices view working:', invoiceTest?.[0] ? 'Sample data loaded' : 'No data (table empty)');
    
    // Test 3: Check business profiles
    console.log('📋 Test 3: Business profiles');
    const { data: profiles, error: profilesError } = await supabase
      .from('business_profiles')
      .select('id, name, tax_id')
      .limit(3);
    
    if (profilesError) {
      console.error('❌ Error checking business profiles:', profilesError);
      return false;
    }
    
    console.log('✅ Business profiles found:', profiles?.length || 0);
    
    // Test 4: Test KSeF integration query (should work now)
    console.log('📋 Test 4: KSeF integration query');
    const testProfileId = profiles?.[0]?.id;
    
    if (testProfileId) {
      const { data: integration, error: integrationError } = await supabase
        .from('ksef_integrations')
        .select('*')
        .eq('business_profile_id', testProfileId)
        .eq('status', 'active')
        .maybeSingle();
      
      if (integrationError && integrationError.code !== 'PGRST116') {
        console.error('❌ Error checking KSeF integration:', integrationError);
        return false;
      }
      
      console.log('✅ KSeF integration query works:', integration ? 'Active integration found' : 'No active integration');
    }
    
    // Test 5: Test invoice query with customer names
    console.log('📋 Test 5: Invoice query with customer names');
    if (testProfileId) {
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices_with_customer_name')
        .select('id, number, customerName, total_gross_value')
        .eq('business_profile_id', testProfileId)
        .limit(3);
      
      if (invoicesError) {
        console.error('❌ Error checking invoices with customer names:', invoicesError);
        return false;
      }
      
      console.log('✅ Invoice query with customer names works:', invoices?.length || 0, 'invoices found');
      
      if (invoices && invoices.length > 0) {
        console.log('📄 Sample invoice:', {
          id: invoices[0].id,
          number: invoices[0].number,
          customer: invoices[0].customerName,
          amount: invoices[0].total_gross_value
        });
      }
    }
    
    console.log('🎉 All KSeF database tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ KSeF connection test failed:', error);
    return false;
  }
}

/**
 * Quick connection test for the Edge Function
 */
export async function quickConnectionTest() {
  try {
    // Simple query to test database connection
    const { data, error } = await supabase
      .from('business_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      message: 'Database connection working'
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
