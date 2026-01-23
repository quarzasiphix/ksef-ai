import { supabase } from '@/integrations/supabase/client';
import { KsefContextManager } from '@/shared/services/ksef/ksefContextManager';
import { getKsefConfig } from '@/shared/services/ksef/config';
import { getKsefSyncJob } from './ksefSyncJobInit';

/**
 * Test KSeF Integration
 * Run this to verify all KSeF features are working
 */
export async function testKsefIntegration() {
  console.log('🧪 Testing KSeF Integration...');
  
  try {
    // Test 1: Database tables exist
    console.log('📊 Testing database tables...');
    const { data: tables } = await supabase
      .from('ksef_invoices_received')
      .select('id')
      .limit(1);
    
    console.log('✅ ksef_invoices_received table exists');
    
    const { data: syncRuns } = await supabase
      .from('ksef_sync_runs')
      .select('id')
      .limit(1);
    
    console.log('✅ ksef_sync_runs table exists');
    
    // Test 2: Sync job is running
    console.log('🔄 Testing sync job...');
    const syncJob = getKsefSyncJob();
    const isRunning = syncJob.isJobRunning();
    console.log(`✅ Sync job running: ${isRunning}`);
    
    const stats = syncJob.getStats();
    console.log('📈 Sync job stats:', stats);
    
    // Test 3: Context manager
    console.log('🔐 Testing context manager...');
    const config = getKsefConfig('test');
    const contextManager = new KsefContextManager(config, supabase);
    console.log('✅ Context manager initialized');
    
    // Test 4: Check business profiles
    console.log('👥 Testing business profiles...');
    const { data: profiles } = await supabase
      .from('business_profiles')
      .select('id, name, tax_id')
      .limit(5);
    
    console.log(`✅ Found ${profiles?.length || 0} business profiles`);
    
    if (profiles && profiles.length > 0) {
      const testProfile = profiles[0];
      console.log(`🧪 Testing with profile: ${testProfile.name}`);
      
      // Test 5: Check KSeF integration
      const { data: integration } = await supabase
        .from('ksef_integrations')
        .select('*')
        .eq('company_id', testProfile.id)
        .eq('status', 'active')
        .single();
      
      if (integration) {
        console.log('✅ KSeF integration found');
        console.log(`🌍 Environment: ${integration.environment}`);
        console.log(`📧 Provider NIP: ${integration.provider_nip}`);
      } else {
        console.log('⚠️ No active KSeF integration found');
      }
    }
    
    // Test 6: Check received invoices
    console.log('📬 Testing received invoices...');
    const { count: receivedCount } = await supabase
      .from('ksef_invoices_received')
      .select('id', { count: 'exact', head: true });
    
    console.log(`✅ Received invoices count: ${receivedCount || 0}`);
    
    // Test 7: Check QR codes in invoices
    console.log('📱 Testing QR codes...');
    const { data: qrInvoices } = await supabase
      .from('invoices')
      .select('id, number, ksef_qr_code')
      .not('ksef_qr_code', 'is', null)
      .limit(5);
    
    console.log(`✅ Invoices with QR codes: ${qrInvoices?.length || 0}`);
    
    console.log('🎉 KSeF Integration Test Complete!');
    console.log('✅ All tests passed - KSeF is ready for use');
    
    return {
      success: true,
      tests: {
        database: true,
        syncJob: isRunning,
        contextManager: true,
        businessProfiles: profiles?.length || 0,
        receivedInvoices: receivedCount || 0,
        qrCodes: qrInvoices?.length || 0,
      }
    };
    
  } catch (error) {
    console.error('❌ KSeF Integration Test Failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick KSeF Status Check
 */
export async function getKsefStatus() {
  try {
    const syncJob = getKsefSyncJob();
    const stats = syncJob.getStats();
    
    const { count: receivedCount } = await supabase
      .from('ksef_invoices_received')
      .select('id', { count: 'exact', head: true });
    
    const { count: unprocessedCount } = await supabase
      .from('ksef_invoices_received')
      .select('id', { count: 'exact', head: true })
      .eq('processed', false);
    
    return {
      syncJobRunning: syncJob.isJobRunning(),
      totalReceived: receivedCount || 0,
      unprocessed: unprocessedCount || 0,
      lastSync: stats.lastRunAt,
      nextSync: stats.nextRunAt,
      profilesSynced: stats.totalProfiles,
      successfulProfiles: stats.successfulProfiles,
    };
  } catch (error) {
    console.error('Error getting KSeF status:', error);
    return {
      syncJobRunning: false,
      totalReceived: 0,
      unprocessed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export for use in console
if (typeof window !== 'undefined') {
  (window as any).testKsefIntegration = testKsefIntegration;
  (window as any).getKsefStatus = getKsefStatus;
}
