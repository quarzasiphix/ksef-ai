import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/shared/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { AuthProvider } from '@/shared/context/AuthContext';
import { queryClient } from '@/shared/lib/queryClient';
import { RouteRenderer } from '@/components/routing/RouteRenderer';

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
 */
const App = () => {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router>
            <AuthProvider>
              <RouteRenderer />
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
