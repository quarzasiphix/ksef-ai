import { queryClient } from './queryClient';

/**
 * Route change handler that cancels ongoing queries when navigating
 * This prevents infinite loads when switching tabs quickly
 */
class RouteChangeHandler {
  private currentPath: string = window.location.pathname;
  private pendingQueries = new Set<string>();

  constructor() {
    // Listen for route changes
    this.setupRouteListener();
  }

  private setupRouteListener() {
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', this.handleRouteChange);
    
    // Intercept pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleRouteChange();
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleRouteChange();
    };
  }

  private handleRouteChange = () => {
    const newPath = window.location.pathname;
    
    if (newPath !== this.currentPath) {
      console.log('[RouteChangeHandler] Route changed:', this.currentPath, '→', newPath);
      
      // Cancel all ongoing queries
      queryClient.cancelQueries();
      
      // Clear pending queries tracking
      this.pendingQueries.clear();
      
      this.currentPath = newPath;
    }
  };

  /**
   * Track a query as pending
   */
  trackQuery(queryKey: string) {
    this.pendingQueries.add(queryKey);
  }

  /**
   * Mark a query as completed
   */
  completeQuery(queryKey: string) {
    this.pendingQueries.delete(queryKey);
  }

  /**
   * Get number of pending queries
   */
  getPendingCount(): number {
    return this.pendingQueries.size;
  }
}

// Export singleton instance
export const routeChangeHandler = new RouteChangeHandler();
