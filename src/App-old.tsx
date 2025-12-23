import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/shared/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { SidebarProvider } from '@/shared/ui/sidebar';
import { TooltipProvider } from '@/shared/ui/tooltip';

// Auth components
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import AuthCallback from '@/pages/auth/AuthCallback';
import { AuthProvider } from '@/shared/context/AuthContext';
import { BusinessProfileProvider } from '@/shared/context/BusinessProfileContext';

// Layout components
import Layout from '@/components/layout/Layout';
import PublicLayout from '@/components/public/PublicLayout';

// Page components
import Dashboard from '@/pages/Dashboard';
import IncomeList from '@/pages/income/IncomeList';
import ExpenseList from '@/modules/invoices/screens/expense/ExpenseList';
import CustomerList from '@/modules/customers/screens/CustomerList';
import NewCustomer from '@/modules/customers/screens/NewCustomer';
import EditCustomer from '@/modules/customers/screens/EditCustomer';
import CustomerDetail from '@/modules/customers/screens/CustomerDetail';
import ProductList from '@/modules/products/screens/ProductList';
import NewProduct from '@/modules/products/screens/NewProduct';
import EditProduct from '@/modules/products/screens/EditProduct';
import ProductDetail from '@/modules/products/screens/ProductDetail';
import NewInvoice from '@/modules/invoices/screens/invoices/NewInvoice';
import EditInvoice from '@/modules/invoices/screens/invoices/EditInvoice';
import InvoiceDetail from '@/modules/invoices/screens/invoices/InvoiceDetail';
import BusinessProfiles from '@/modules/settings/screens/BusinessProfiles';
import NewBusinessProfile from '@/modules/settings/screens/NewBusinessProfile';
import EditBusinessProfile from '@/modules/settings/screens/EditBusinessProfile';
import DocumentSettings from '@/modules/settings/screens/DocumentSettings';
import ERPIntegrations from '@/modules/settings/screens/ERPIntegrations';
import EmployeesList from '@/modules/employees/screens/EmployeesList';
import NewEmployee from '@/modules/employees/screens/NewEmployee';
import LabourHoursPage from '@/modules/employees/screens/LabourHoursPage';
import NotFound from '@/pages/NotFound';
import InventoryPage from '@/pages/inventory/InventoryPage';
import Accounting from '@/modules/accounting/screens/Accounting';
import BalanceSheet from '@/modules/accounting/screens/BalanceSheet';
import Shareholders from '@/modules/accounting/screens/Shareholders';
import Welcome from '@/modules/onboarding/components/welcome/Welcome';
import Premium from '@/pages/Premium';
import PremiumPlanDetails from '@/pages/PremiumPlanDetails';
import ShareDocuments from '@/pages/public/ShareDocuments';
import DocumentsHub from '@/modules/contracts/screens/DocumentsHub';
import ContractNew from '@/modules/contracts/screens/ContractNew';
import ContractDetails from '@/modules/contracts/screens/ContractDetails';
import DecisionsHub from '@/modules/decisions/screens/DecisionsHub';
import DecisionEdit from '@/modules/decisions/screens/DecisionEdit';
import DecisionDetails from '@/modules/decisions/screens/DecisionDetails';
import Analytics from '@/pages/Analytics';
import BankAccounts from "@/modules/banking/screens/BankAccounts";
import CapitalCommitments from '@/pages/assets/CapitalCommitments';
import BusinessInbox from '@/modules/inbox/screens/BusinessInbox';
import DiscussionsPage from '@/modules/inbox/screens/DiscussionsPage';
import ReceivedInvoiceDetail from '@/modules/inbox/screens/ReceivedInvoiceDetail';
import Index from "./pages/Index";
import SharedLinksPage from "./pages/SharedLinks";
import CompanyRegistry from '@/modules/spolka/screens/CompanyRegistry';
import CapitalEvents from '@/modules/spolka/screens/CapitalEvents';
import Resolutions from '@/modules/spolka/screens/Resolutions';
import CITDashboard from '@/modules/spolka/screens/CITDashboard';
import Documents from '@/modules/spolka/screens/Documents';
import AccountingShell from '@/modules/accounting/screens/AccountingShell';
import Kasa from '@/modules/accounting/screens/Kasa';
import TransactionalContracts from '@/modules/accounting/screens/TransactionalContracts';
import EventLog from '@/modules/accounting/screens/EventLog';
import { queryClient } from '@/shared/lib/queryClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { TransactionType } from '@/shared/types/common';
import { getParentDomain } from '@/shared/config/domains';
import SettingsMenu from './modules/settings/screens/SettingsMenu';
import ProfileSettings from './modules/settings/screens/ProfileSettings';
import TeamManagement from './modules/settings/screens/TeamManagement';
import PzCallbackHandler from './pages/ksef/PzCallbackHandler';

const AppLoadingScreen = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const location = useLocation();

  console.log('[ProtectedRoute] Checking auth:', { isLoading, isAuthenticated, user: user?.id });

  if (isLoading) {
    console.log('[ProtectedRoute] Still loading, showing loading screen');
    return <AppLoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to parent domain');
    // Redirect to parent domain if not authenticated
    window.location.href = getParentDomain();
    return <AppLoadingScreen />;
  }

  console.log('[ProtectedRoute] Authenticated, rendering protected content');
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

  return <>{children}</>;
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

  return (
    <BusinessProfileProvider>
      {children}
    </BusinessProfileProvider>
  );
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

const PremiumPlanRoute = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <AppLoadingScreen />;
  if (user) {
    return (
      <ProtectedRoute>
        <PremiumPlanDetails />
      </ProtectedRoute>
    );
  }
  return (
    <PublicLayout>
      <PremiumPlanDetails />
    </PublicLayout>
  );
};

const RootRedirect = () => {
  const { user, isLoading } = useAuth();
  
  console.log('[RootRedirect] Checking auth:', { isLoading, user: user?.id });
  
  if (isLoading) {
    console.log('[RootRedirect] Still loading, showing loading screen');
    return <AppLoadingScreen />;
  }
  
  if (user) {
    console.log('[RootRedirect] User authenticated, navigating to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  console.log('[RootRedirect] No user, redirecting to parent domain');
  // Redirect unauthenticated users to parent domain
  window.location.href = getParentDomain();
  return <AppLoadingScreen />;
};

const App = () => {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router>
            <AuthProvider>
              <Routes>
                {/* Root redirects to parent domain for unauthenticated, dashboard for authenticated */}
                <Route path="/" element={<RootRedirect />} />
                
                {/* Auth routes - accessible but minimal */}
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
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Premium marketing / upgrade page */}
                <Route path="/premium" element={<PremiumRoute />} />
                <Route path="/premium/plan/:planId" element={<PremiumPlanRoute />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />

                <Route path="/analytics" element={
                  <ProtectedRoute>
                    <Analytics />
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
                <Route path="/expense/share/:id" element={
                  <ProtectedRoute>
                    <ReceivedInvoiceDetail />
                  </ProtectedRoute>
                } />
                <Route path="/invoices/:id" element={
                  <ProtectedRoute>
                    <InvoiceDetail type="income" />
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
                <Route path="/settings/profile" element={
                  <ProtectedRoute>
                    <ProfileSettings />
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
                <Route path="/settings/erp" element={
                  <ProtectedRoute>
                    <ERPIntegrations />
                  </ProtectedRoute>
                } />
                <Route path="/settings/team" element={
                  <ProtectedRoute>
                    <TeamManagement />
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

                {/* Accounting (Premium) - persistent shell to avoid sidebar remount flicker */}
                <Route path="/accounting" element={
                  <ProtectedRoute>
                    <RequirePremium>
                      <AccountingShell />
                    </RequirePremium>
                  </ProtectedRoute>
                }>
                  <Route index element={<Accounting />} />
                  <Route path="bank" element={<BankAccounts />} />
                  <Route path="balance-sheet" element={<BalanceSheet />} />
                  <Route path="shareholders" element={<Shareholders />} />
                  <Route path="company-registry" element={<CompanyRegistry />} />
                  <Route path="capital-events" element={<CapitalEvents />} />
                  <Route path="resolutions" element={<Navigate to="/contracts/resolutions" replace />} />
                  <Route path="cit" element={<CITDashboard />} />
                  <Route path="contracts" element={<TransactionalContracts />} />
                  <Route path="documents" element={<Navigate to="/contracts" replace />} />
                  <Route path="kasa" element={<Kasa />} />
                  <Route path="event-log" element={<EventLog />} />
                </Route>

                {/* Onboarding / Welcome setup (full-page, no layout) */}
                <Route path="/welcome" element={
                  <OnboardingRoute>
                    <Welcome />
                  </OnboardingRoute>
                } />

                {/* Public shared documents route */}
                <Route path="/share/:slug" element={<PublicLayout><ShareDocuments /></PublicLayout>} />

                {/* Decisions routes */}
                <Route path="/decisions" element={
                  <ProtectedRoute>
                    <DecisionsHub />
                  </ProtectedRoute>
                } />

                <Route path="/decisions/:id/edit" element={
                  <ProtectedRoute>
                    <DecisionEdit />
                  </ProtectedRoute>
                } />

                <Route path="/decisions/:id" element={
                  <ProtectedRoute>
                    <DecisionDetails />
                  </ProtectedRoute>
                } />

                {/* Contracts routes */}
                <Route path="/contracts" element={
                  <ProtectedRoute>
                    <DocumentsHub />
                  </ProtectedRoute>
                } />
                <Route path="/contracts/new" element={
                  <ProtectedRoute>
                    <ContractNew />
                  </ProtectedRoute>
                } />
                <Route path="/contracts/resolutions" element={
                  <ProtectedRoute>
                    <Resolutions />
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

                {/* Assets routes */}
                <Route path="/assets" element={
                  <ProtectedRoute>
                    <CapitalCommitments />
                  </ProtectedRoute>
                } />

                {/* Business Inbox routes */}
                <Route path="/inbox" element={
                  <ProtectedRoute>
                    <BusinessInbox />
                  </ProtectedRoute>
                } />
                <Route path="/inbox/discussions" element={
                  <ProtectedRoute>
                    <DiscussionsPage />
                  </ProtectedRoute>
                } />
                <Route path="/inbox/invoice/:id" element={
                  <ProtectedRoute>
                    <ReceivedInvoiceDetail />
                  </ProtectedRoute>
                } />

                {/* Profil Zaufany callback route  <Route path="/pz-callback" element={<PzCallbackHandler />} /> */}
                
                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />

                {/* New route for shared links */}
                <Route path="/shares" element={
                  <ProtectedRoute>
                    <SharedLinksPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
