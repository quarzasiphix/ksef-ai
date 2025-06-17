import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SidebarProvider } from '@/components/ui/sidebar';

// Auth components
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Layout components
import Layout from '@/components/layout/Layout';

// Page components
import Dashboard from '@/pages/Dashboard';
import IncomeList from '@/pages/income/IncomeList';
import ExpenseList from '@/pages/expense/ExpenseList';
import CustomerList from '@/pages/customers/CustomerList';
import NewCustomer from '@/pages/customers/NewCustomer';
import EditCustomer from '@/pages/customers/EditCustomer';
import CustomerDetail from '@/pages/customers/CustomerDetail';
import ProductList from '@/pages/products/ProductList';
import NewProduct from '@/pages/products/NewProduct';
import EditProduct from '@/pages/products/EditProduct';
import ProductDetail from '@/pages/products/ProductDetail';
import EmployeesList from '@/pages/employees/EmployeesList';
import NewInvoice from '@/pages/invoices/NewInvoice';
import EditInvoice from '@/pages/invoices/EditInvoice';
import InvoiceDetail from '@/pages/invoices/InvoiceDetail';
import Settings from '@/pages/settings/Settings';
import BusinessProfiles from '@/pages/settings/BusinessProfiles';
import NewBusinessProfile from '@/pages/settings/NewBusinessProfile';
import EditBusinessProfile from '@/pages/settings/EditBusinessProfile';
import DocumentSettings from '@/pages/settings/DocumentSettings';
import AccountingPage from '@/pages/accounting/AccountingPage';
import KsefPage from '@/pages/ksef/KsefPage';
import NotFound from '@/pages/NotFound';

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
  const { user, isLoading, isPremium } = useAuth();
  
  if (isLoading) {
    // Show gold if premium is being checked (loading && user exists but isPremium is still falsey)
    return <AppLoadingScreen loading={true} checkingPremium={!!user && isLoading} />;
  }
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <BusinessProfileProvider>
      <HeartbeatHandler />
      <SidebarProvider>
        <Layout>{children}</Layout>
      </SidebarProvider>
    </BusinessProfileProvider>
  );
};

// Public route wrapper component
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, isPremium } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    // Show gold if premium is being checked (loading && user exists but isPremium is still falsey)
    return <AppLoadingScreen loading={true} checkingPremium={!!user && isLoading} />;
  }
  
  // The redirection logic is now handled within PublicLayout to correctly
  // determine whether to show the welcome/onboarding screen or the dashboard.
  // This was preventing the check for a business profile after an OAuth login.
  if (user && location.pathname === '/') {
    // Intentionally left blank. PublicLayout will handle redirection.
  }

  return <PublicLayout>{children}</PublicLayout>;
};

const App = () => {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
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
                  <Route path="business-profiles/:id/edit" element={<EditBusinessProfile />} />
                  <Route path="documents" element={<DocumentSettings />} />
                </Route>
                <Route path="/accounting/*" element={
                  <ProtectedRoute>
                    <AccountingPage />
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
