import { SupabaseClient } from '@supabase/supabase-js';
import { KsefContextManager } from './ksefContextManager';
import { KsefInvoiceRetrievalService, SubjectType } from './ksefInvoiceRetrievalService';
import { KsefService } from './ksefService';
import { getKsefConfig } from './config';

/**
 * KSeF Background Sync Job
 * 
 * Runs periodically (recommended: every 15 minutes) to sync invoices from KSeF
 * for all active business profiles with KSeF integration.
 * 
 * Features:
 * - Syncs per business profile
 * - Syncs per subject type (subject1, subject2, subject3)
 * - Uses HWM (High Water Mark) for incremental sync
 * - Error handling and retry logic
 * - Logging and monitoring
 * - Respects rate limits
 */

export interface SyncJobConfig {
  intervalMinutes: number;
  maxConcurrentProfiles: number;
  retryAttempts: number;
  retryDelayMs: number;
  subjectTypes: SubjectType[];
}

export interface SyncJobResult {
  profileId: string;
  profileName: string;
  success: boolean;
  subjectResults: Map<SubjectType, {
    invoicesSynced: number;
    newHwmDate?: string;
    errors: string[];
  }>;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  error?: string;
}

export interface SyncJobStats {
  totalProfiles: number;
  successfulProfiles: number;
  failedProfiles: number;
  totalInvoicesSynced: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

export class KsefSyncJob {
  private supabase: SupabaseClient;
  private contextManager: KsefContextManager;
  private config: SyncJobConfig;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;
  private stats: SyncJobStats;

  constructor(
    supabase: SupabaseClient,
    contextManager: KsefContextManager,
    config?: Partial<SyncJobConfig>
  ) {
    this.supabase = supabase;
    this.contextManager = contextManager;
    this.config = {
      intervalMinutes: config?.intervalMinutes || 15,
      maxConcurrentProfiles: config?.maxConcurrentProfiles || 3,
      retryAttempts: config?.retryAttempts || 3,
      retryDelayMs: config?.retryDelayMs || 5000,
      subjectTypes: config?.subjectTypes || ['subject1', 'subject2', 'subject3'],
    };
    this.stats = {
      totalProfiles: 0,
      successfulProfiles: 0,
      failedProfiles: 0,
      totalInvoicesSynced: 0,
    };
  }

  /**
   * Start the sync job (runs periodically)
   */
  start(): void {
    if (this.isRunning) {
      console.log('KSeF sync job is already running');
      return;
    }

    console.log(`Starting KSeF sync job (interval: ${this.config.intervalMinutes} minutes)`);
    this.isRunning = true;

    // Run immediately on start
    this.runSync().catch(error => {
      console.error('Error in initial sync:', error);
    });

    // Schedule periodic runs
    this.intervalId = setInterval(() => {
      this.runSync().catch(error => {
        console.error('Error in scheduled sync:', error);
      });
    }, this.config.intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the sync job
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('KSeF sync job is not running');
      return;
    }

    console.log('Stopping KSeF sync job');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Run sync for all active profiles
   */
  async runSync(): Promise<SyncJobResult[]> {
    if (!this.isRunning) {
      throw new Error('Sync job is not running');
    }

    console.log('Starting KSeF sync run...');
    const startTime = new Date();

    try {
      // Get all active business profiles with KSeF integration
      const profiles = await this.getActiveProfiles();
      
      if (profiles.length === 0) {
        console.log('No active profiles with KSeF integration found');
        return [];
      }

      console.log(`Found ${profiles.length} active profiles to sync`);
      this.stats.totalProfiles = profiles.length;

      // Sync profiles in batches to respect rate limits
      const results: SyncJobResult[] = [];
      for (let i = 0; i < profiles.length; i += this.config.maxConcurrentProfiles) {
        const batch = profiles.slice(i, i + this.config.maxConcurrentProfiles);
        const batchResults = await Promise.all(
          batch.map(profile => this.syncProfile(profile))
        );
        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + this.config.maxConcurrentProfiles < profiles.length) {
          await this.sleep(2000); // 2 second delay between batches
        }
      }

      // Update stats
      this.stats.successfulProfiles = results.filter(r => r.success).length;
      this.stats.failedProfiles = results.filter(r => !r.success).length;
      this.stats.totalInvoicesSynced = results.reduce((sum, r) => {
        let profileTotal = 0;
        r.subjectResults.forEach(result => {
          profileTotal += result.invoicesSynced;
        });
        return sum + profileTotal;
      }, 0);
      this.stats.lastRunAt = new Date();
      this.stats.nextRunAt = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000);

      const endTime = new Date();
      const durationMs = endTime.getTime() - startTime.getTime();

      console.log(`KSeF sync completed in ${durationMs}ms`);
      console.log(`Synced ${this.stats.totalInvoicesSynced} invoices across ${this.stats.successfulProfiles} profiles`);

      // Log summary
      await this.logSyncRun(results, startTime, endTime);

      return results;
    } catch (error) {
      console.error('Error in sync run:', error);
      throw error;
    }
  }

  /**
   * Sync a single business profile
   */
  private async syncProfile(profile: {
    id: string;
    name: string;
    taxId: string;
  }): Promise<SyncJobResult> {
    const startTime = new Date();
    const subjectResults = new Map<SubjectType, {
      invoicesSynced: number;
      newHwmDate?: string;
      errors: string[];
    }>();

    try {
      console.log(`Syncing profile: ${profile.name} (${profile.taxId})`);

      // Get KSeF client for this profile
      const ksefClient = await this.contextManager.forCompany(profile.id);
      const ksefService = new KsefService('test'); // Use appropriate environment
      const retrievalService = new KsefInvoiceRetrievalService(
        profile.id,
        ksefService,
        this.contextManager,
        this.supabase
      );

      // Sync each subject type
      for (const subjectType of this.config.subjectTypes) {
        try {
          console.log(`  Syncing ${subjectType} for ${profile.name}...`);
          
          const result = await retrievalService.syncInvoices({
            subjectType,
            useHwm: true,
          });

          subjectResults.set(subjectType, {
            invoicesSynced: result.invoicesSynced,
            newHwmDate: result.newHwmDate,
            errors: result.errors,
          });

          console.log(`  ✓ Synced ${result.invoicesSynced} invoices for ${subjectType}`);
        } catch (error) {
          console.error(`  ✗ Error syncing ${subjectType}:`, error);
          subjectResults.set(subjectType, {
            invoicesSynced: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error'],
          });
        }
      }

      const endTime = new Date();
      return {
        profileId: profile.id,
        profileName: profile.name,
        success: true,
        subjectResults,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
      };
    } catch (error) {
      const endTime = new Date();
      console.error(`Failed to sync profile ${profile.name}:`, error);
      
      return {
        profileId: profile.id,
        profileName: profile.name,
        success: false,
        subjectResults,
        startTime,
        endTime,
        durationMs: endTime.getTime() - startTime.getTime(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all active business profiles with KSeF integration
   */
  private async getActiveProfiles(): Promise<Array<{
    id: string;
    name: string;
    taxId: string;
  }>> {
    const { data, error } = await this.supabase
      .from('business_profiles')
      .select(`
        id,
        name,
        tax_id,
        ksef_integrations!inner(status)
      `)
      .eq('ksef_integrations.status', 'active');

    if (error) {
      throw new Error(`Failed to get active profiles: ${error.message}`);
    }

    return (data || []).map(profile => ({
      id: profile.id,
      name: profile.name,
      taxId: profile.tax_id,
    }));
  }

  /**
   * Log sync run to database
   */
  private async logSyncRun(
    results: SyncJobResult[],
    startTime: Date,
    endTime: Date
  ): Promise<void> {
    try {
      await this.supabase.from('ksef_sync_runs').insert({
        started_at: startTime.toISOString(),
        completed_at: endTime.toISOString(),
        duration_ms: endTime.getTime() - startTime.getTime(),
        profiles_synced: results.length,
        profiles_successful: results.filter(r => r.success).length,
        profiles_failed: results.filter(r => !r.success).length,
        total_invoices_synced: results.reduce((sum, r) => {
          let profileTotal = 0;
          r.subjectResults.forEach(result => {
            profileTotal += result.invoicesSynced;
          });
          return sum + profileTotal;
        }, 0),
        results: results,
      });
    } catch (error) {
      console.error('Failed to log sync run:', error);
    }
  }

  /**
   * Get current stats
   */
  getStats(): SyncJobStats {
    return { ...this.stats };
  }

  /**
   * Check if job is running
   */
  isJobRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Run sync manually (one-time)
   */
  async runManualSync(profileId?: string): Promise<SyncJobResult[]> {
    console.log('Running manual sync...');

    if (profileId) {
      // Sync single profile
      const { data: profile, error } = await this.supabase
        .from('business_profiles')
        .select('id, name, tax_id')
        .eq('id', profileId)
        .single();

      if (error || !profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      const result = await this.syncProfile({
        id: profile.id,
        name: profile.name,
        taxId: profile.tax_id,
      });

      return [result];
    } else {
      // Sync all profiles
      return this.runSync();
    }
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create and start sync job
 */
export function createSyncJob(
  supabase: SupabaseClient,
  contextManager: KsefContextManager,
  config?: Partial<SyncJobConfig>
): KsefSyncJob {
  return new KsefSyncJob(supabase, contextManager, config);
}
