import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/shared/ui/sidebar';
import { BusinessProfileProvider } from '@/shared/context/BusinessProfileContext';
import Layout from '@/components/layout/Layout';
import PublicLayout from '@/components/public/PublicLayout';
import Welcome from '@/modules/onboarding/components/welcome/Welcome';
import ShareDocuments from '@/pages/public/ShareDocuments';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import AuthCallback from '@/pages/auth/AuthCallback';
import { routes, flattenRoutes, type RouteConfig } from '@/shared/config/routes';
import { AppGate, ProtectedGate, PremiumGate, PublicGate } from './AppGate';
import { useAuth } from '@/shared/hooks/useAuth';
import { redirectToLogin } from '@/shared/utils/domainHelpers';
import { supabase } from '@/integrations/supabase/client';
import { ContentLoadingSpinner } from '@/components/layout/ContentLoadingSpinner';

const AppLoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

/**
 * Wraps route element with appropriate guard based on config
 * NOTE: Layout wrapping moved to parent route level to prevent remounts
 */
function wrapWithGuard(element: React.ReactNode, guard?: string) {
  if (!guard || guard === 'public') {
    return element;
  }

  // For protected/premium routes, just return the element
  // Layout will be wrapped at the parent level
  if (guard === 'protected' || guard === 'premium') {
    return element;
  }

  if (guard === 'onboarding') {
    return (
      <ProtectedGate>
        <BusinessProfileProvider>{element}</BusinessProfileProvider>
      </ProtectedGate>
    );
  }

  return element;
}

/**
 * Renders a single route with its guard
 */
function renderRoute(route: RouteConfig) {
  // Parent route with only children (no element)
  if (!route.element && route.children && route.children.length > 0) {
    return (
      <Route key={route.path} path={route.path}>
        {route.children.map(child => renderRoute(child))}
      </Route>
    );
  }

  const wrappedElement = (
    <Suspense fallback={<ContentLoadingSpinner />}>
      {wrapWithGuard(route.element, route.guard)}
    </Suspense>
  );

  if (route.children && route.children.length > 0) {
    return (
      <Route key={route.path} path={route.path} element={wrappedElement}>
        {route.children.map(child => renderRoute(child))}
      </Route>
    );
  }

  return <Route key={route.path} path={route.path} element={wrappedElement} />;
}

/**
 * Root redirect logic - checks if user needs onboarding
 */
const RootRedirect = () => {
  const { user, isLoading } = useAuth();
  const [checkingProfiles, setCheckingProfiles] = React.useState(true);
  const [hasProfiles, setHasProfiles] = React.useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('[RootRedirect] No user, redirecting to login');
      redirectToLogin();
    }
  }, [user, isLoading]);

  // Check if user has business profiles
  useEffect(() => {
    const checkProfiles = async () => {
      if (!user) {
        setCheckingProfiles(false);
        return;
      }

      try {
        const { data: profiles, error } = await supabase
          .from('business_profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('[RootRedirect] Error checking profiles:', error);
          setHasProfiles(false);
        } else {
          setHasProfiles(profiles && profiles.length > 0);
        }
      } catch (err) {
        console.error('[RootRedirect] Exception checking profiles:', err);
        setHasProfiles(false);
      } finally {
        setCheckingProfiles(false);
      }
    };

    if (user && !isLoading) {
      checkProfiles();
    }
  }, [user, isLoading]);

  console.log('[RootRedirect] State:', { isLoading, checkingProfiles, hasProfiles, userId: user?.id });

  if (isLoading || checkingProfiles) {
    return <AppLoadingScreen />;
  }

  if (user) {
    if (hasProfiles) {
      console.log('[RootRedirect] User has profiles, navigating to dashboard');
      return <Navigate to="/dashboard" replace />;
    } else {
      console.log('[RootRedirect] User has no profiles, navigating to onboarding');
      return <Navigate to="/welcome" replace />;
    }
  }

  return <AppLoadingScreen />;
};

/**
 * Main route renderer - generates all routes from config
 * Layout is now wrapped once around all protected routes to prevent remounts
 */
export const RouteRenderer: React.FC = () => {
  const flatRoutes = flattenRoutes(routes);

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth routes */}
      <Route
        path="/auth/login"
        element={
          <PublicGate>
            <Login />
          </PublicGate>
        }
      />
      <Route
        path="/auth/register"
        element={
          <PublicGate>
            <Register />
          </PublicGate>
        }
      />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Onboarding */}
      <Route
        path="/welcome"
        element={
          <ProtectedGate>
            <BusinessProfileProvider>
              <Welcome />
            </BusinessProfileProvider>
          </ProtectedGate>
        }
      />

      {/* Public shared documents */}
      <Route
        path="/share/:slug"
        element={
          <PublicLayout>
            <ShareDocuments />
          </PublicLayout>
        }
      />

      {/* All protected routes wrapped in persistent Layout */}
      <Route
        element={
          <ProtectedGate>
            <SidebarProvider>
              <BusinessProfileProvider>
                <Layout />
              </BusinessProfileProvider>
            </SidebarProvider>
          </ProtectedGate>
        }
      >
        {flatRoutes.map(route => renderRoute(route))}
      </Route>
    </Routes>
  );
};

export default RouteRenderer;
