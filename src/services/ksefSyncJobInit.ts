import { supabase } from '@/integrations/supabase/client';
import { KsefContextManager } from '@/shared/services/ksef/ksefContextManager';
import { createSyncJob } from '@/shared/services/ksef/ksefSyncJob';
import { getKsefConfig } from '@/shared/services/ksef/config';

/**
 * KSeF Sync Job Initialization
 * 
 * This file initializes the background sync job that runs every 15 minutes
 * to fetch invoices from KSeF for all active business profiles.
 * 
 * Import this file in your app initialization (e.g., main.tsx or App.tsx):
 * import './services/ksefSyncJobInit';
 */

// Get KSeF configuration
const config = getKsefConfig('test'); // Use 'production' in production

// Initialize context manager
const contextManager = new KsefContextManager(config, supabase);

// Create and start sync job
const ksefSyncJob = createSyncJob(supabase, contextManager, {
  intervalMinutes: 15,        // Sync every 15 minutes (recommended)
  maxConcurrentProfiles: 3,   // Max profiles to sync in parallel
  retryAttempts: 3,           // Retry failed syncs
  retryDelayMs: 5000,         // Delay between retries
  subjectTypes: ['subject1', 'subject2', 'subject3'], // All subject types
});

// Start the sync job
ksefSyncJob.start();

// Make sync job available globally for manual operations
export { ksefSyncJob };

// Log initialization
console.log('KSeF sync job initialized and started');
console.log('Sync interval: 15 minutes');
console.log('Environment:', config.environment);

// Handle cleanup on app shutdown
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ksefSyncJob.stop();
  });
}

// Export for manual operations
export const getKsefSyncJob = () => ksefSyncJob;
export const getKsefContextManager = () => contextManager;
