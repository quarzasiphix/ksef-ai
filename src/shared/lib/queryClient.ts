import { QueryClient } from "@tanstack/react-query";

// Create and export the query client instance with aggressive caching
// This configuration enables instant page loads with cached data
// while background sync keeps data fresh
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Show cached data immediately, don't refetch on mount/focus
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true, // Do refetch when connection restored
      
      // Aggressive caching - data stays fresh for 10 minutes
      staleTime: 10 * 60 * 1000, // 10 min
      gcTime: 30 * 60 * 1000,    // 30 min - keep in memory
      
      // Background refetch controlled by sync manager
      refetchInterval: false, // Disabled - sync manager handles this
      
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});