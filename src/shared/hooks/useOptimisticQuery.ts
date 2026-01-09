import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/**
 * Optimistic query hook that NEVER shows loading spinner if cached data exists
 * 
 * Strategy:
 * 1. Check cache first - if exists, show immediately
 * 2. Fetch in background
 * 3. Update UI when fresh data arrives
 * 4. Only show loading on first-ever fetch (no cache)
 * 
 * This prevents the "stuck loading" issue when switching tabs rapidly
 */
export function useOptimisticQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends readonly unknown[] = readonly unknown[]
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> & { isBackgroundRefetching: boolean } {
  const [hasInitialData, setHasInitialData] = useState(false);
  
  const query = useQuery({
    ...options,
    // Force stale-while-revalidate behavior
    placeholderData: (previousData: any) => previousData,
    // Always refetch in background, but show cache first
    refetchOnMount: 'always',
  });
  
  // Track if we have any data (initial or cached)
  useEffect(() => {
    if (query.data !== undefined && !hasInitialData) {
      setHasInitialData(true);
    }
  }, [query.data, hasInitialData]);
  
  // Determine if we're doing a background refetch
  const isBackgroundRefetching = query.isFetching && hasInitialData;
  
  // Override isLoading to NEVER show loading if we have cached data
  const isLoading = query.isLoading && !hasInitialData;
  
  return {
    ...query,
    isLoading: isLoading as typeof query.isLoading,
    isBackgroundRefetching,
  } as UseQueryResult<TData, TError> & { isBackgroundRefetching: boolean };
}

/**
 * Hook to prefetch data on hover/focus for instant navigation
 */
export function usePrefetchOnHover<TData = unknown>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  enabled: boolean = true
) {
  const prefetch = () => {
    if (!enabled) return;
    
    // Prefetch data silently in background
    queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };
  
  return {
    onMouseEnter: prefetch,
    onFocus: prefetch,
  };
}

/**
 * Hook to get cached data immediately without triggering a fetch
 */
export function useCachedData<TData = unknown>(
  queryKey: readonly unknown[]
): TData | undefined {
  const [cachedData, setCachedData] = useState<TData | undefined>(() => {
    return queryClient.getQueryData<TData>(queryKey);
  });
  
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event?.query.queryKey === queryKey) {
        const data = queryClient.getQueryData<TData>(queryKey);
        setCachedData(data);
      }
    });
    
    return unsubscribe;
  }, [queryKey]);
  
  return cachedData;
}

// Re-export queryClient for use in hooks
import { queryClient } from '@/shared/lib/queryClient';
