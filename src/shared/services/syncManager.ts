import { queryClient } from '@/shared/lib/queryClient';
import { supabase } from '@/integrations/supabase/client';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncTimestamps {
  invoices?: string;
  contracts?: string;
  decisions?: string;
  ledger?: string;
  discussions?: string;
  employees?: string;
  bankAccounts?: string;
}

interface SyncCheckResponse {
  hasUpdates: {
    invoices: boolean;
    contracts: boolean;
    decisions: boolean;
    ledger: boolean;
    discussions: boolean;
    employees: boolean;
    bankAccounts: boolean;
  };
  latestTimestamps: {
    invoices: string | null;
    contracts: string | null;
    decisions: string | null;
    ledger: string | null;
    discussions: string | null;
    employees: string | null;
    bankAccounts: string | null;
  };
  counts: {
    invoices: number;
    contracts: number;
    decisions: number;
    ledger: number;
    discussions: number;
    employees: number;
    bankAccounts: number;
  };
}

class SyncManager {
  private status: SyncStatus = 'idle';
  private syncInterval: number | null = null;
  private lastSyncTime: Date | null = null;
  private currentBusinessProfileId: string | null = null;
  private listeners: Set<(status: SyncStatus, lastSync: Date | null) => void> = new Set();
  private syncCheckIntervalMs = 60 * 1000; // 60 seconds
  private isOnline = navigator.onLine;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    console.log('[SyncManager] Network online');
    this.isOnline = true;
    this.updateStatus('idle');
    // Trigger immediate sync when coming back online
    if (this.currentBusinessProfileId) {
      this.checkForUpdates(this.currentBusinessProfileId);
    }
  };

  private handleOffline = () => {
    console.log('[SyncManager] Network offline');
    this.isOnline = false;
    this.updateStatus('offline');
  };

  private updateStatus(status: SyncStatus) {
    this.status = status;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status, this.lastSyncTime));
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus, lastSync: Date | null) => void) {
    this.listeners.add(listener);
    // Immediately notify with current status
    listener(this.status, this.lastSyncTime);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start background sync for a business profile
   */
  start(businessProfileId: string) {
    console.log('[SyncManager] Starting sync for profile:', businessProfileId);
    
    this.currentBusinessProfileId = businessProfileId;
    
    // Clear any existing interval
    this.stop();
    
    // Initial sync check
    this.checkForUpdates(businessProfileId);
    
    // Set up periodic sync checks
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && this.status !== 'syncing') {
        this.checkForUpdates(businessProfileId);
      }
    }, this.syncCheckIntervalMs);
  }

  /**
   * Stop background sync
   */
  stop() {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.currentBusinessProfileId = null;
  }

  /**
   * Force a manual sync check
   */
  async forceSync() {
    if (!this.currentBusinessProfileId) {
      console.warn('[SyncManager] No business profile set');
      return;
    }
    
    if (!this.isOnline) {
      console.warn('[SyncManager] Cannot sync while offline');
      return;
    }
    
    await this.checkForUpdates(this.currentBusinessProfileId);
  }

  /**
   * Check for updates and invalidate queries if needed
   */
  private async checkForUpdates(businessProfileId: string) {
    if (!this.isOnline) {
      return;
    }

    try {
      this.updateStatus('syncing');
      
      // Get last sync timestamps from localStorage
      const lastSyncTimestamps = this.getLastSyncTimestamps(businessProfileId);
      
      // Call edge function to check for updates
      const { data, error } = await supabase.functions.invoke<SyncCheckResponse>('sync-check', {
        body: {
          businessProfileId,
          lastSyncTimestamps,
        },
      });

      if (error) {
        console.error('[SyncManager] Sync check error:', error);
        this.updateStatus('error');
        return;
      }

      if (!data) {
        console.warn('[SyncManager] No data returned from sync check');
        this.updateStatus('idle');
        return;
      }

      // Invalidate queries for entities that have updates
      const invalidations: Promise<void>[] = [];

      if (data.hasUpdates.invoices) {
        console.log('[SyncManager] Invalidating invoices queries');
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['invoices', businessProfileId] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['invoice'] }));
      }

      if (data.hasUpdates.contracts) {
        console.log('[SyncManager] Invalidating contracts queries');
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['contracts', businessProfileId] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['contract'] }));
      }

      if (data.hasUpdates.decisions) {
        console.log('[SyncManager] Invalidating decisions queries');
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['decisions', businessProfileId] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['decision'] }));
      }

      if (data.hasUpdates.ledger) {
        console.log('[SyncManager] Invalidating ledger queries');
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['ledger', businessProfileId] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['ledger-events'] }));
      }

      if (data.hasUpdates.discussions) {
        console.log('[SyncManager] Invalidating discussions queries');
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['discussions', businessProfileId] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['discussion'] }));
      }

      if (data.hasUpdates.employees) {
        console.log('[SyncManager] Invalidating employees queries');
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['employees', businessProfileId] }));
      }

      if (data.hasUpdates.bankAccounts) {
        console.log('[SyncManager] Invalidating bank accounts queries');
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['bank-accounts', businessProfileId] }));
      }

      // Wait for all invalidations to complete
      await Promise.all(invalidations);

      // Update last sync timestamps
      this.saveLastSyncTimestamps(businessProfileId, data.latestTimestamps);
      
      this.lastSyncTime = new Date();
      this.updateStatus('idle');
      
      console.log('[SyncManager] Sync check completed', {
        hasUpdates: Object.values(data.hasUpdates).some(v => v),
        counts: data.counts,
      });

    } catch (error) {
      console.error('[SyncManager] Sync check failed:', error);
      this.updateStatus('error');
    }
  }

  /**
   * Get last sync timestamps from localStorage
   */
  private getLastSyncTimestamps(businessProfileId: string): SyncTimestamps {
    const key = `sync_timestamps_${businessProfileId}`;
    const stored = localStorage.getItem(key);
    
    if (!stored) {
      return {};
    }
    
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }

  /**
   * Save last sync timestamps to localStorage
   */
  private saveLastSyncTimestamps(businessProfileId: string, timestamps: Partial<SyncTimestamps>) {
    const key = `sync_timestamps_${businessProfileId}`;
    const current = this.getLastSyncTimestamps(businessProfileId);
    
    const updated = {
      ...current,
      ...Object.fromEntries(
        Object.entries(timestamps).filter(([_, v]) => v !== null)
      ),
    };
    
    localStorage.setItem(key, JSON.stringify(updated));
  }

  /**
   * Get current sync status
   */
  getStatus(): { status: SyncStatus; lastSync: Date | null } {
    return {
      status: this.status,
      lastSync: this.lastSyncTime,
    };
  }

  /**
   * Clear all sync data for a business profile
   */
  clearSyncData(businessProfileId: string) {
    const key = `sync_timestamps_${businessProfileId}`;
    localStorage.removeItem(key);
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
