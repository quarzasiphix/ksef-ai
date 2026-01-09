import { QueryClient, QueryClientConfig } from "@tanstack/react-query";

// Track query fetch attempts to detect infinite loads
const queryFetchAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FETCH_ATTEMPTS = 3;
const FETCH_ATTEMPT_WINDOW = 5000; // 5 seconds

// Track active queries to prevent duplicates
const activeQueries = new Map<string, AbortController>();

// Create and export the query client instance with aggressive caching
// This configuration enables instant page loads with cached data
// while background sync keeps data fresh
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // STALE-WHILE-REVALIDATE STRATEGY: Show cached data immediately, refetch in background
      refetchOnWindowFocus: true,  // Refetch when user returns to tab
      refetchOnMount: 'always',    // Always refetch on mount, but show cache first
      refetchOnReconnect: true,    // Refetch when connection restored
      
      // Aggressive caching - data stays fresh for 5 minutes
      staleTime: 5 * 60 * 1000,    // 5 min - data considered fresh
      gcTime: 30 * 60 * 1000,      // 30 min - keep in memory/cache
      
      // Background refetch controlled by sync manager
      refetchInterval: false,       // Disabled - sync manager handles this
      
      // Network mode: prefer cache over network for instant UI
      networkMode: 'offlineFirst',
      
      // Retry failed requests with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          console.warn('[QueryClient] Not retrying client error:', error?.status);
          return false;
        }
        // Don't retry if aborted (user navigated away)
        if (error?.name === 'AbortError' || error?.name === 'CanceledError') {
          console.log('[QueryClient] Query cancelled, not retrying');
          return false;
        }
        // Retry up to 2 times for network/server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Detect infinite loads and force cache fallback
      queryFn: undefined, // Will be set per-query
      
      // CRITICAL: Use placeholder data to show cached data while refetching
      // This prevents loading spinners when switching tabs
      placeholderData: (previousData: any) => previousData,
      
      // Enable initial data from cache
      initialDataUpdatedAt: () => Date.now(),
    },
  },
});

/**
 * Wrapper for query functions that detects infinite loads
 * and forces cache fallback if too many attempts in short time
 */
export function withInfiniteLoadDetection<T>(
  queryKey: string,
  queryFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const now = Date.now();
    const attempts = queryFetchAttempts.get(queryKey);
    
    // Check if we're in an infinite load situation
    if (attempts && attempts.count >= MAX_FETCH_ATTEMPTS) {
      if (now - attempts.lastAttempt < FETCH_ATTEMPT_WINDOW) {
        console.warn(
          `[QueryClient] Infinite load detected for ${queryKey}. ` +
          `${attempts.count} attempts in ${FETCH_ATTEMPT_WINDOW}ms. ` +
          'Using cached data only.'
        );
        
        // Get cached data
        const cached = queryClient.getQueryData([queryKey]);
        if (cached) {
          console.log(`[QueryClient] Returning cached data for ${queryKey}`);
          return cached as T;
        }
        
        // If no cache, throw error to prevent infinite loop
        throw new Error('Infinite load detected and no cached data available');
      }
      
      // Reset counter if outside time window
      queryFetchAttempts.set(queryKey, { count: 1, lastAttempt: now });
    } else {
      // Track this attempt
      queryFetchAttempts.set(queryKey, {
        count: (attempts?.count || 0) + 1,
        lastAttempt: now,
      });
    }
    
    try {
      const result = await queryFn();
      // Reset counter on success
      queryFetchAttempts.delete(queryKey);
      return result;
    } catch (error) {
      // On error, check if we have cached data to fall back to
      const cached = queryClient.getQueryData([queryKey]);
      if (cached) {
        console.warn(
          `[QueryClient] Query failed for ${queryKey}, using cached data:`,
          error
        );
        return cached as T;
      }
      throw error;
    }
  };
}