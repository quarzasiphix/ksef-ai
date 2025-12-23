import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BusinessProfileProvider } from '@/context/BusinessProfileContext';
import Layout from '@/components/layout/Layout';
import PublicLayout from '@/components/public/PublicLayout';
import Welcome from '@/components/welcome/Welcome';
import ShareDocuments from '@/pages/public/ShareDocuments';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import AuthCallback from '@/pages/auth/AuthCallback';
import { routes, flattenRoutes, type RouteConfig } from '@/config/routes';
import { AppGate, ProtectedGate, PremiumGate, PublicGate } from './AppGate';
import { useAuth } from '@/hooks/useAuth';
import { redirectToLogin } from '@/utils/domainHelpers';

const AppLoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

/**
 * Wraps route element with appropriate guard based on config
 */
function wrapWithGuard(element: React.ReactNode, guard?: string) {
  if (!guard || guard === 'public') {
    return element;
  }

  if (guard === 'protected') {
    return (
      <ProtectedGate>
        <SidebarProvider>
          <BusinessProfileProvider>
            <Layout>{element}</Layout>
          </BusinessProfileProvider>
        </SidebarProvider>
      </ProtectedGate>
    );
  }

  if (guard === 'premium') {
    return (
      <PremiumGate>
        <SidebarProvider>
          <BusinessProfileProvider>
            <Layout>{element}</Layout>
          </BusinessProfileProvider>
        </SidebarProvider>
      </PremiumGate>
    );
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
    <Suspense fallback={<AppLoadingScreen />}>
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
 * Root redirect logic
 */
const RootRedirect = () => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('[RootRedirect] No user, redirecting to login');
      redirectToLogin();
    }
  }, [user, isLoading]);

  console.log('[RootRedirect] Checking auth:', { isLoading, user: user?.id });

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (user) {
    console.log('[RootRedirect] User authenticated, navigating to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLoadingScreen />;
};

/**
 * Main route renderer - generates all routes from config
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

      {/* All configured routes */}
      {flatRoutes.map(route => renderRoute(route))}
    </Routes>
  );
};

export default RouteRenderer;
