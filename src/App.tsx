import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Home from "./pages/public/Home";
import PublicLayout from "./components/public/PublicLayout";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TOSPolicy from "./pages/policies/TOSPolicy";
import RefundsPolicy from "./pages/policies/RefundsPolicy";
import { AuthProvider } from "./context/AuthContext";
import { queryClient } from "./lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import Layout from "./components/layout/Layout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BusinessProfileProvider } from "@/context/BusinessProfileContext";
import { useHeartbeat } from "@/hooks/useHeartbeat";
import GlobalDataLoader from "./components/layout/GlobalDataLoader";
import InvoiceList from "./pages/invoices/InvoiceList";
import InvoiceDetail from "./pages/invoices/InvoiceDetail";
import NewInvoice from "./pages/invoices/NewInvoice";
import { TransactionType } from "@/types";
import BusinessProfiles from "./pages/settings/BusinessProfiles";
import NewBusinessProfile from "./pages/settings/NewBusinessProfile";
import EditBusinessProfile from "./pages/settings/EditBusinessProfile";
import NotFound from "./pages/NotFound";
import CustomerList from "./pages/customers/CustomerList";
import CustomerDetail from "./pages/customers/CustomerDetail";
import ProductList from "./pages/products/ProductList";
import NewCustomer from "./pages/customers/NewCustomer";
import EditCustomer from "./pages/customers/EditCustomer";
import NewProduct from "./pages/products/NewProduct";
import EditProduct from "./pages/products/EditProduct";
import ProductDetail from "./pages/products/ProductDetail";
import IncomeList from "./pages/income/IncomeList";
import DocumentSettings from "./pages/settings/DocumentSettings";
import ExpenseList from "./pages/expense/ExpenseList";
import IncomeDetail from "./pages/income/[id]";
import ExpenseDetail from "./pages/expense/[id]";
import EditInvoice from "./pages/invoices/EditInvoice";
import SettingsMenu from "./pages/settings/SettingsMenu";
import ProfileSettings from "./pages/settings/ProfileSettings";
import { AuthChangeEvent, Session, User, SupabaseClient, Subscription } from '@supabase/supabase-js';
import PremiumCheckoutModal from "@/components/premium/PremiumCheckoutModal";
import Accounting from './pages/accounting/Accounting';
import RequirePremium from './components/auth/RequirePremium';
import PremiumSuccessMessage from "@/components/premium/PremiumSuccessMessage";
import React from "react";
import Welcome from "@/components/welcome/Welcome";

const AppLoadingScreen = ({ loading, checkingPremium }: { loading: boolean, checkingPremium: boolean }) => (
  <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 transition-colors ${checkingPremium ? 'text-amber-500' : 'text-primary'}`}>
    <div className="text-2xl font-bold animate-pulse">
      {checkingPremium ? 'Checking for premium...' : ':loading in app'}
    </div>
    {checkingPremium && (
      <div className="mt-2 text-sm font-medium text-amber-600">Ładowanie premium...</div>
    )}
  </div>
);

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isPremium } = useAuth();
  
  if (loading) {
    // Show gold if premium is being checked (loading && user exists but isPremium is still falsey)
    return <AppLoadingScreen loading={true} checkingPremium={!!user && loading} />;
  }
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
  const { user, loading, isPremium } = useAuth();
  const location = useLocation();
  
  if (loading) {
    // Show gold if premium is being checked (loading && user exists but isPremium is still falsey)
    return <AppLoadingScreen loading={true} checkingPremium={!!user && loading} />;
  }
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
            <HeartbeatHandler />
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

                {/* Welcome route OUTSIDE main app layout */}
                <Route path="/welcome" element={<Welcome />} />

                {/* Protected routes (main app shell) */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/customers" element={
                  <ProtectedRoute>
                    <CustomerList />
                  </ProtectedRoute>
                } />
                <Route path="/customers/new" element={
                  <ProtectedRoute>
                    <NewCustomer />
                  </ProtectedRoute>
                } />
                <Route path="/customers/edit/:id" element={
                  <ProtectedRoute>
                    <EditCustomer />
                  </ProtectedRoute>
                } />
                <Route path="/customers/:id" element={
                  <ProtectedRoute>
                    <CustomerDetail />
                  </ProtectedRoute>
                } />
                <Route path="/products" element={
                  <ProtectedRoute>
                    <ProductList />
                  </ProtectedRoute>
                } />
                <Route path="/products/new" element={
                  <ProtectedRoute>
                    <NewProduct />
                  </ProtectedRoute>
                } />
                <Route path="/products/edit/:id" element={
                  <ProtectedRoute>
                    <EditProduct />
                  </ProtectedRoute>
                } />
                <Route path="/products/:id" element={
                  <ProtectedRoute>
                    <ProductDetail />
                  </ProtectedRoute>
                } />
                <Route path="/expense" element={
                  <ProtectedRoute>
                    <ExpenseList />
                  </ProtectedRoute>
                } />
                <Route path="/expense/new" element={
                  <ProtectedRoute>
                    <NewInvoice type={TransactionType.EXPENSE} />
                  </ProtectedRoute>
                } />
                <Route path="/expense/:id" element={
                  <ProtectedRoute>
                    <InvoiceDetail type={TransactionType.EXPENSE} />
                  </ProtectedRoute>
                } />
                <Route path="/income" element={
                  <ProtectedRoute>
                    <IncomeList />
                  </ProtectedRoute>
                } />
                <Route path="/income/:id" element={
                  <ProtectedRoute>
                    <IncomeDetail />
                  </ProtectedRoute>
                } />
                <Route path="/income/:id/edit" element={
                  <ProtectedRoute>
                    <EditInvoice />
                  </ProtectedRoute>
                } />
                <Route path="/expense/:id/edit" element={
                  <ProtectedRoute>
                    <EditInvoice />
                  </ProtectedRoute>
                } />
                <Route path="/settings/*" element={
                  <ProtectedRoute>
                    <SettingsMenu />
                  </ProtectedRoute>
                }>
                  <Route path="profile" element={<ProfileSettings />} />
                  <Route path="business-profiles" element={<BusinessProfiles />} />
                  <Route path="business-profiles/new" element={<NewBusinessProfile />} />
                  <Route path="business-profiles/:id" element={<EditBusinessProfile />} />
                  <Route path="documents" element={<DocumentSettings />} />
                </Route>
                <Route path="/accounting/*" element={
                  <ProtectedRoute>
                    <Accounting />
                  </ProtectedRoute>
                } />
                <Route path="/ksef/*" element={
                  <ProtectedRoute>
                    {/* <KsefPage /> */}
                    <h1> KSEF COMING SOON</h1>
                  </ProtectedRoute>
                } />

                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

function HeartbeatHandler() {
  const { setIsPremium } = useAuth();
  useHeartbeat({
    onStatus: (status) => {
      setIsPremium(!!status.premium);
      // Optionally: handle ban (logout), update premium, etc.
    },
  });
  return null;
}

export default App;