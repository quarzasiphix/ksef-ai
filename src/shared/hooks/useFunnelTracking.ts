// React hook for funnel event tracking
// Provides convenient tracking interface for components

import { useCallback, useEffect } from 'react';
import { trackFunnelEvent, FunnelEventData } from '@/shared/lib/analytics/funnelTracker';

/**
 * Hook to track funnel events for a specific page
 * Automatically tracks page view on mount
 */
export const useFunnelTracking = (pagePath: string) => {
  const track = useCallback(
    (eventName: string, eventData?: Record<string, any>) => {
      const data: FunnelEventData = {
        eventName,
        eventData,
        pagePath,
      };
      
      trackFunnelEvent(data);
    },
    [pagePath]
  );

  // Auto-track page view on mount
  useEffect(() => {
    track('page_view');
  }, [track]);

  return { track };
};
