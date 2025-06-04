import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Home from "./pages/Home";
import PublicLayout from "./components/layout/PublicLayout";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TOSPolicy from "./pages/policies/TOSPolicy";
import RefundsPolicy from "./pages/policies/RefundsPolicy";
import { AuthProvider } from "./context/AuthContext";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import Layout from "./components/layout/Layout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BusinessProfileProvider } from "@/context/BusinessProfileContext";

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <BusinessProfileProvider>
      <SidebarProvider>
        <Layout>{children}</Layout>
      </SidebarProvider>
    </BusinessProfileProvider>
  );
};

// Public route wrapper component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Only redirect to dashboard if on home page and user is logged in
  if (user && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  return <PublicLayout>{children}</PublicLayout>;
};

const App = () => {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" offset={10} />
          <AuthProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={
                  <PublicRoute>
                    <Home />
                  </PublicRoute>
                } />
                <Route path="/auth/login" element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } />
                <Route path="/auth/register" element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } />
                <Route path="/policies/privacy" element={
                  <PublicRoute>
                    <PrivacyPolicy />
                  </PublicRoute>
                } />
                <Route path="/policies/tos" element={
                  <PublicRoute>
                    <TOSPolicy />
                  </PublicRoute>
                } />
                <Route path="/policies/refunds" element={
                  <PublicRoute>
                    <RefundsPolicy />
                  </PublicRoute>
                } />

                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;