
import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

// Import the query client
import { queryClient } from '@/lib/queryClient';

// Auth components and context
import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { BusinessProfileProvider } from '@/context/BusinessProfileContext';
import { useHeartbeat } from '@/hooks/useHeartbeat';

// Auth pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// Public pages
import Home from '@/pages/public/Home';
import PrivacyPolicy from '@/pages/policies/PrivacyPolicy';
import TOSPolicy from '@/pages/policies/TOSPolicy';
import RefundsPolicy from '@/pages/policies/RefundsPolicy';

// Layout components
import Layout from '@/components/layout/Layout';
import PublicLayout from '@/components/public/PublicLayout';

// Welcome component
import Welcome from '@/components/welcome/Welcome';

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
import BusinessProfiles from '@/pages/settings/BusinessProfiles';
import NewBusinessProfile from '@/pages/settings/NewBusinessProfile';
import EditBusinessProfile from '@/pages/settings/EditBusinessProfile';
import DocumentSettings from '@/pages/settings/DocumentSettings';
import SettingsMenu from '@/pages/settings/SettingsMenu';
import ProfileSettings from '@/pages/settings/ProfileSettings';
import NotFound from '@/pages/NotFound';

// Import transaction types
import { TransactionType } from '@/types';

// Income detail page
import IncomeDetail from '@/pages/income/[id]';

const AppLoadingScreen = ({ loading, checkingPremium }: { loading: boolean, checkingPremium: boolean }) => (
  <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/90 transition-colors ${checkingPremium ? 'text-amber-500' : 'text-primary'}`}>
    <div className="text-2xl font-bold animate-pulse">
      {checkingPremium ? 'Checking for premium...' : 'Ładowanie...'}
    </div>
    {checkingPremium && (
      <div className="mt-2 text-sm font-medium text-amber-600">Ładowanie premium...</div>
    )}
  </div>
);

// Protected route wrapper component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <AppLoadingScreen loading={true} checkingPremium={!!user && loading} />;
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
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <AppLoadingScreen loading={true} checkingPremium={!!user && loading} />;
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
                <Route path="/employees" element={
                  <ProtectedRoute>
                    <EmployeesList />
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
  const { user } = useAuth();
  useHeartbeat({
    onStatus: (status) => {
      // Handle status updates
    },
  });
  return null;
}

export default App;
