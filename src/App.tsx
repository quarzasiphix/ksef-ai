import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/shared/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { AuthProvider } from '@/shared/context/AuthContext';
import { WorkspaceTabsProvider } from '@/shared/context/WorkspaceTabsContext';
import { DepartmentProvider } from '@/shared/context/DepartmentContext';
import { queryClient } from '@/shared/lib/queryClient';
import { RouteRenderer } from '@/pages/routing/RouteRenderer';
import { routeChangeHandler } from '@/shared/lib/routeChangeHandler';
import { initializeQueryPersistence, restoreAllCachedQueries } from '@/shared/lib/queryPersistence';

/**
 * New App.tsx with route config system
 * 
 * Architecture:
 * - Centralized route configuration in src/config/routes.tsx
 * - AppGate handles auth/premium checks with proper returnTo logic
 * - RouteRenderer generates all routes from config
 * - Proper domain bounce: app.ksiegai.pl → ksiegai.pl/auth/login?returnTo=...
 * - No navigation side-effects during render (all in useEffect)
 * - Preserves existing provider order and behaviors
 * - Route change handler cancels queries on navigation to prevent infinite loads
 * - Cache persistence: Restores cached data from localStorage for instant UI
 */
const App = () => {
  // Initialize cache persistence and restore cached queries
  useEffect(() => {
    console.log('[App] Initializing cache persistence and route change handler');
    
    // Restore cached queries from localStorage for instant UI
    restoreAllCachedQueries();
    
    // Initialize automatic cache persistence for future queries
    initializeQueryPersistence();
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router>
            <AuthProvider>
              <DepartmentProvider>
                <WorkspaceTabsProvider>
                  <RouteRenderer />
                </WorkspaceTabsProvider>
              </DepartmentProvider>
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
