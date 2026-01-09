import { queryClient } from './queryClient';

/**
 * Simple localStorage-based cache persistence for React Query
 * Saves query data to localStorage for instant offline access
 */

const STORAGE_KEY_PREFIX = 'rq_cache_';
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 50; // Limit total cached queries
const MAX_ENTRY_SIZE = 100 * 1024; // 100KB per entry max

interface CachedQuery {
  data: any;
  timestamp: number;
  queryKey: string;
}

/**
 * Save query data to localStorage
 */
export function persistQueryData(queryKey: readonly unknown[], data: any) {
  try {
    const key = STORAGE_KEY_PREFIX + JSON.stringify(queryKey);
    const cached: CachedQuery = {
      data,
      timestamp: Date.now(),
      queryKey: JSON.stringify(queryKey),
    };
    
    const serialized = JSON.stringify(cached);
    
    // Check size before persisting
    if (serialized.length > MAX_ENTRY_SIZE) {
      console.warn(`[QueryPersistence] Entry too large (${serialized.length} bytes), skipping:`, queryKey);
      return;
    }
    
    // Check total cache count and cleanup if needed
    const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    if (cacheKeys.length >= MAX_CACHE_ENTRIES) {
      console.log('[QueryPersistence] Cache limit reached, cleaning up');
      clearOldCache();
    }
    
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.error('[QueryPersistence] Failed to persist:', error);
    // Clear old data if quota exceeded
    if (error instanceof Error && (error.name === 'QuotaExceededError' || error.message.includes('quota'))) {
      console.warn('[QueryPersistence] Quota exceeded, clearing cache');
      clearOldCache();
      // Try one more time after cleanup
      try {
        const key = STORAGE_KEY_PREFIX + JSON.stringify(queryKey);
        const cached: CachedQuery = {
          data,
          timestamp: Date.now(),
          queryKey: JSON.stringify(queryKey),
        };
        localStorage.setItem(key, JSON.stringify(cached));
      } catch (retryError) {
        console.error('[QueryPersistence] Failed to persist after cleanup:', retryError);
      }
    }
  }
}

/**
 * Restore query data from localStorage
 */
export function restoreQueryData<T = any>(queryKey: readonly unknown[]): T | undefined {
  try {
    const key = STORAGE_KEY_PREFIX + JSON.stringify(queryKey);
    const cached = localStorage.getItem(key);
    
    if (!cached) return undefined;
    
    const parsed: CachedQuery = JSON.parse(cached);
    
    // Check if cache is still valid
    const age = Date.now() - parsed.timestamp;
    if (age > MAX_CACHE_AGE) {
      localStorage.removeItem(key);
      return undefined;
    }
    
    return parsed.data as T;
  } catch (error) {
    console.error('[QueryPersistence] Failed to restore:', error);
    return undefined;
  }
}

/**
 * Clear old cached queries to free up space
 */
export function clearOldCache() {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    
    if (cacheKeys.length === 0) return;
    
    // Sort by age and remove oldest 70% (more aggressive)
    const cached = cacheKeys
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: data.timestamp || 0 };
        } catch {
          // Remove corrupted entries immediately
          localStorage.removeItem(key);
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => a!.timestamp - b!.timestamp);
    
    const toRemove = cached.slice(0, Math.ceil(cached.length * 0.7));
    toRemove.forEach(item => {
      if (item) localStorage.removeItem(item.key);
    });
    
    console.log(`[QueryPersistence] Cleared ${toRemove.length}/${cacheKeys.length} cache entries`);
  } catch (error) {
    console.error('[QueryPersistence] Failed to clear old cache:', error);
    // If all else fails, clear all cache
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
      console.warn('[QueryPersistence] Emergency: Cleared all cache');
    } catch {}
  }
}

/**
 * Initialize cache persistence for all queries
 * Automatically saves successful queries to localStorage
 */
export function initializeQueryPersistence() {
  // Subscribe to query cache updates
  queryClient.getQueryCache().subscribe((event) => {
    if (event?.type === 'updated' && event.query.state.status === 'success') {
      const data = event.query.state.data;
      if (data !== undefined) {
        // Skip caching large arrays (likely list views)
        if (Array.isArray(data) && data.length > 100) {
          console.log('[QueryPersistence] Skipping large array cache:', event.query.queryKey);
          return;
        }
        
        // Only cache important queries (profiles, settings, small datasets)
        const queryKey = JSON.stringify(event.query.queryKey);
        const shouldCache = 
          queryKey.includes('profile') ||
          queryKey.includes('settings') ||
          queryKey.includes('user') ||
          queryKey.includes('business-profile') ||
          (Array.isArray(data) && data.length <= 20);
        
        if (shouldCache) {
          persistQueryData(event.query.queryKey, data);
        }
      }
    }
  });
  
  console.log('[QueryPersistence] Initialized selective cache persistence');
}

/**
 * Restore all cached queries on app startup
 */
export function restoreAllCachedQueries() {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(k => k.startsWith(STORAGE_KEY_PREFIX));
    
    let restored = 0;
    cacheKeys.forEach(key => {
      try {
        const cached = localStorage.getItem(key);
        if (!cached) return;
        
        const parsed: CachedQuery = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        
        if (age > MAX_CACHE_AGE) {
          localStorage.removeItem(key);
          return;
        }
        
        const queryKey = JSON.parse(parsed.queryKey);
        queryClient.setQueryData(queryKey, parsed.data);
        restored++;
      } catch (error) {
        console.error('[QueryPersistence] Failed to restore query:', error);
      }
    });
    
    console.log(`[QueryPersistence] Restored ${restored} cached queries`);
  } catch (error) {
    console.error('[QueryPersistence] Failed to restore cache:', error);
  }
}
