import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

// Auth components
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import { AuthProvider } from '@/context/AuthContext';
import { BusinessProfileProvider } from '@/context/BusinessProfileContext';

// Layout components
import Layout from '@/components/layout/Layout';
import PublicLayout from '@/components/public/PublicLayout';

// Page components
import Dashboard from '@/pages/Dashboard';
import Home from '@/pages/public/Home';
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
import NewInvoice from '@/pages/invoices/NewInvoice';
import EditInvoice from '@/pages/invoices/EditInvoice';
import InvoiceDetail from '@/pages/invoices/InvoiceDetail';
import BusinessProfiles from '@/pages/settings/BusinessProfiles';
import NewBusinessProfile from '@/pages/settings/NewBusinessProfile';
import EditBusinessProfile from '@/pages/settings/EditBusinessProfile';
import DocumentSettings from '@/pages/settings/DocumentSettings';
import EmployeesList from '@/pages/employees/EmployeesList';
import NewEmployee from '@/pages/employees/NewEmployee';
import LabourHoursPage from '@/pages/employees/LabourHoursPage';
import NotFound from '@/pages/NotFound';
import InventoryPage from '@/pages/inventory/InventoryPage';
import Accounting from '@/pages/accounting/Accounting';
import Welcome from '@/components/welcome/Welcome';
import Premium from '@/pages/Premium';
import ShareDocuments from '@/pages/public/ShareDocuments';
import ContractList from '@/pages/contracts/ContractList';
import ContractNew from '@/pages/contracts/ContractNew';
import ContractDetails from '@/pages/contracts/ContractDetails';
import BankAccounts from "@/pages/bank/BankAccounts";
import Index from "./pages/Index";
import SharedLinksPage from "./pages/SharedLinks";

import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { TransactionType } from '@/types/common';
import SettingsMenu from './pages/settings/SettingsMenu';

const AppLoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const location = useLocation();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return (
    <SidebarProvider>
      <BusinessProfileProvider>
        <Layout>
          {children}
        </Layout>
      </BusinessProfileProvider>
    </SidebarProvider>
  );
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const location = useLocation();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return (
    <PublicLayout>
      {children}
    </PublicLayout>
  );
};

// Premium guard component
const RequirePremium = ({ children }: { children: React.ReactNode }) => {
  const { isPremium, openPremiumDialog } = useAuth();
  if (!isPremium) {
    // Show premium dialog then redirect to settings
    openPremiumDialog();
    return <Navigate to="/settings" replace />;
  }
  return <>{children}</>;
};

const OnboardingRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const location = useLocation();

  if (isLoading) {
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};

// Route that chooses layout based on auth
const PremiumRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppLoadingScreen />;
  // Logged-in users see Premium inside the app layout
  if (user) {
    return (
      <ProtectedRoute>
        <Premium />
      </ProtectedRoute>
    );
  }
  // Visitors see public marketing version
  return (
    <PublicLayout>
      <Premium />
    </PublicLayout>
  );
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

                {/* Premium marketing / upgrade page */}
                <Route path="/premium" element={<PremiumRoute />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/bank" element={
                  <ProtectedRoute>
                    <BankAccounts />
                  </ProtectedRoute>
                } />
                <Route path="/income" element={
                  <ProtectedRoute>
                    <IncomeList />
                  </ProtectedRoute>
                } />
                <Route path="/expense" element={
                  <ProtectedRoute>
                    <ExpenseList />
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
                <Route path="/income/new" element={
                  <ProtectedRoute>
                    <NewInvoice type={TransactionType.INCOME} />
                  </ProtectedRoute>
                } />
                <Route path="/expense/new" element={
                  <ProtectedRoute>
                    <NewInvoice type={TransactionType.EXPENSE} />
                  </ProtectedRoute>
                } />
                <Route path="/income/edit/:id" element={
                  <ProtectedRoute>
                    <EditInvoice />
                  </ProtectedRoute>
                } />
                <Route path="/expense/:id/edit" element={
                  <ProtectedRoute>
                    <EditInvoice />
                  </ProtectedRoute>
                } />
                <Route path="/income/:id" element={
                  <ProtectedRoute>
                    <InvoiceDetail type="income" />
                  </ProtectedRoute>
                } />
                <Route path="/expense/:id" element={
                  <ProtectedRoute>
                    <InvoiceDetail type="expense" />
                  </ProtectedRoute>
                } />
                <Route path="/settings/business-profiles" element={
                  <ProtectedRoute>
                    <BusinessProfiles />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                      <SettingsMenu />
                  </ProtectedRoute>
                } />
                <Route path="/settings/business-profiles/new" element={
                  <ProtectedRoute>
                    <NewBusinessProfile />
                  </ProtectedRoute>
                } />
                <Route path="/settings/business-profiles/:id/edit" element={
                  <ProtectedRoute>
                    <EditBusinessProfile />
                  </ProtectedRoute>
                } />
                <Route path="/settings/documents" element={
                  <ProtectedRoute>
                    <DocumentSettings />
                  </ProtectedRoute>
                } />

                {/* Employee routes */}
                <Route path="/employees" element={
                  <ProtectedRoute>
                    <EmployeesList />
                  </ProtectedRoute>
                } />
                <Route path="/employees/new" element={
                  <ProtectedRoute>
                    <NewEmployee />
                  </ProtectedRoute>
                } />
                <Route path="/labour-hours" element={
                  <ProtectedRoute>
                    <LabourHoursPage />
                  </ProtectedRoute>
                } />

                {/* Inventory tracking (Premium) */}
                <Route path="/inventory" element={
                  <ProtectedRoute>
                    <RequirePremium>
                      <InventoryPage />
                    </RequirePremium>
                  </ProtectedRoute>
                } />

                {/* Accounting (Premium) */}
                <Route path="/accounting" element={
                  <ProtectedRoute>
                    <RequirePremium>
                      <Accounting />
                    </RequirePremium>
                  </ProtectedRoute>
                } />

                {/* Onboarding / Welcome setup (full-page, no layout) */}
                <Route path="/welcome" element={
                  <OnboardingRoute>
                    <Welcome />
                  </OnboardingRoute>
                } />

                {/* Public shared documents route */}
                <Route path="/share/:slug" element={<PublicLayout><ShareDocuments /></PublicLayout>} />

                {/* Contracts routes */}
                <Route path="/contracts" element={
                  <ProtectedRoute>
                    <ContractList />
                  </ProtectedRoute>
                } />
                <Route path="/contracts/new" element={
                  <ProtectedRoute>
                    <ContractNew />
                  </ProtectedRoute>
                } />
                <Route path="/contracts/:id" element={
                  <ProtectedRoute>
                    <ContractDetails />
                  </ProtectedRoute>
                } />
                <Route path="/contracts/:id/edit" element={
                  <ProtectedRoute>
                    <ContractNew />
                  </ProtectedRoute>
                } />

                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />

                {/* New route for shared links */}
                <Route path="/shares" element={
                  <ProtectedRoute>
                    <SharedLinksPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
