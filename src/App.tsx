import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types"; // Import Database type

import Layout from "./components/layout/Layout";
import GlobalDataLoader from "./components/layout/GlobalDataLoader";
import Dashboard from "./pages/Dashboard";
import InvoiceList from "./pages/invoices/InvoiceList";
import InvoiceDetail from "./pages/invoices/InvoiceDetail";
import NewInvoice from "./pages/invoices/NewInvoice";
import { TransactionType } from "./types";
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
import { SidebarProvider } from "@/components/ui/sidebar";
import EditInvoice from "./pages/invoices/EditInvoice";
import SettingsMenu from "./pages/settings/SettingsMenu"; // Import the new component

// Export the query client for use in other files
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

// --- Auth Context ---
type AuthContextType = { 
  user: any; 
  setUser: (u: any) => void;
  logout: () => Promise<void>;
  isPremium: boolean; // Add isPremium to context type
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: async () => {},
  isPremium: false, // Default value
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AuthProvider - START");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false); // State for premium status
  const queryClient = useQueryClient();

  const fetchPremiumStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('is_active, ends_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('ends_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching premium status:", error);
        setIsPremium(false);
        return;
      }

      // Check if there is an active subscription that hasn't ended
      const hasActiveSubscription = data && data.length > 0 && (!data[0].ends_at || new Date(data[0].ends_at) > new Date());
      setIsPremium(hasActiveSubscription);

    } catch (error) {
      console.error("Error in fetchPremiumStatus:", error);
      setIsPremium(false);
    }
  };

  const handleAuthStateChange = React.useCallback(async (_event: string, session: any) => {
    console.log("AuthProvider - handleAuthStateChange - event:", _event, "session:", session);

    const currentUser = user;
    const newUser = session?.user || null;

    const userChanged = JSON.stringify(currentUser) !== JSON.stringify(newUser);

    if (!userChanged && _event !== 'SIGNED_IN') { // Also run for SIGNED_IN even if user object is same (e.g. on refresh)
      console.log("AuthProvider - User state unchanged, skipping update");
      // If user state is unchanged but it's a SIGNED_IN event, re-fetch premium status
      if (newUser?.id) {
         fetchPremiumStatus(newUser.id);
      }
      return;
    }

    if (newUser) {
      console.log("AuthProvider - Setting new user and fetching premium status");
      setUser(newUser);
      localStorage.setItem("sb_session", JSON.stringify(session));
      await fetchPremiumStatus(newUser.id);
      await queryClient.invalidateQueries();
    } else {
      console.log("AuthProvider - Removing user and clearing premium status");
      setUser(null);
      setIsPremium(false); // Clear premium status on logout
      localStorage.removeItem("sb_session");
      queryClient.clear();
    }

    if (loading) {
      console.log("AuthProvider - Initial load complete");
      setLoading(false);
    }

    console.log("AuthProvider - handleAuthStateChange - END");
  }, [user, loading, queryClient]);

  const logout = async () => {
    console.log("AuthProvider - logout - START");
    try {
      await supabase.auth.signOut();
      queryClient.clear();
      queryClient.removeQueries({ queryKey: ['invoices'] });
      queryClient.removeQueries({ queryKey: ['businessProfiles'] });
      queryClient.removeQueries({ queryKey: ['customers'] });
      queryClient.removeQueries({ queryKey: ['products'] });
      queryClient.removeQueries({ queryKey: ['settings'] });
      ['invoices', 'businessProfiles', 'customers', 'products', 'settings'].forEach(key => {
        localStorage.removeItem(`tanstack-query-${key}`);
        sessionStorage.removeItem(`tanstack-query-${key}`);
      });
      setUser(null);
      setIsPremium(false); // Clear premium status on logout
      localStorage.removeItem("sb_session");
    } catch (error) {
      console.error("AuthProvider - Error during logout:", error);
    }
    console.log("AuthProvider - logout - END");
  };

  useEffect(() => {
    console.log("AuthProvider - useEffect - START");

    const checkSession = async () => {
      console.log("AuthProvider - useEffect - checkSession - START");
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          setLoading(false);
          return;
        }

        console.log("AuthProvider - useEffect - checkSession - after getSession, data:", data);

        if (data?.session) {
          await handleAuthStateChange('INITIAL_SESSION', data.session);
        } else {
          setUser(null);
          setIsPremium(false);
          localStorage.removeItem("sb_session");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in checkSession:", error);
        setLoading(false);
      }
    };

    checkSession();

    if (supabase.auth.onAuthStateChange) {
      console.log("AuthProvider - useEffect - setting up auth state listener");
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log("Auth state changed:", event);
          handleAuthStateChange(event, session);
        }
      );

      return () => {
        console.log("AuthProvider - useEffect - cleaning up auth state listener");
        subscription?.unsubscribe();
      };
    }
  }, [handleAuthStateChange]);

  console.log("AuthProvider - rendering - loading:", loading, "user:", user, "isPremium:", isPremium);
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white text-xl">Ładowanie...</div>;
  }

  console.log("AuthProvider - rendering - authenticated, providing context");
  return <AuthContext.Provider value={{ user, setUser, logout, isPremium }}>{children}</AuthContext.Provider>;
};

const RequireAuth: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  console.log("RequireAuth - START");
  const { user } = useAuth();
  console.log("RequireAuth - user from useAuth:", user);

  const [loading, setLoading] = useState(true);
  console.log("RequireAuth - initial loading state:", loading);

  useEffect(() => {
    console.log("RequireAuth - useEffect - setting loading to false");
    setLoading(false);
  }, []);

  console.log("RequireAuth - rendering - loading:", loading, "user:", user);

  if (loading) {
    console.log("RequireAuth - rendering - still loading, returning null");
    return null;
  }

  if (!user) {
    console.log("RequireAuth - rendering - no user, navigating to login");
    return <Navigate to="/auth/login" replace />;
  }

  console.log("RequireAuth - rendering - user exists, rendering children/outlet");
  return <>{children ? children : <Outlet />}</>;
};

const App = () => (
  <ThemeProvider defaultTheme="dark">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" offset={10} />
        <BrowserRouter>
          <AuthProvider>
            <SidebarProvider>
              <Routes>
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route element={<RequireAuth />}>
                  <Route path="/" element={<Layout />}>
                    {/* Main routes */}
                    <Route index element={<Dashboard />} />
                    {/* Invoice routes */}
                    <Route path="invoices/new" element={<NewInvoice />} />

                    {/* Income routes */}
                    <Route path="/income/:id" element={<InvoiceDetail type="income" />} />
                    <Route path="/income/:id/edit" element={<EditInvoice />} />

                    {/* Expense routes */}
                    <Route path="/expense/:id" element={<InvoiceDetail type="expense" />} />
                    <Route path="/expense/:id/edit" element={<EditInvoice />} />

                    {/* Legacy routes for backward compatibility */}
                    <Route path="/invoices/:id" element={<InvoiceDetail type="income" />} />
                    {/* Customer routes */}
                    <Route path="customers" element={<CustomerList />} />
                    <Route path="customers/new" element={<NewCustomer />} />
                    <Route path="customers/edit/:id" element={<EditCustomer />} />
                    <Route path="customers/:id" element={<CustomerDetail />} />
                    {/* Product routes */}
                    <Route path="products" element={<ProductList />} />
                    <Route path="products/new" element={<NewProduct />} />
                    <Route path="products/edit/:id" element={<EditProduct />} />
                    <Route path="products/:id" element={<ProductDetail />} />
                    {/* Settings routes */}
                    <Route path="settings" element={<SettingsMenu />} >
                      <Route path="business-profiles" element={<BusinessProfiles />} />
                      <Route path="business-profiles/new" element={<NewBusinessProfile />} />
                      <Route path="business-profiles/:id" element={<EditBusinessProfile />} />
                      <Route path="documents" element={<DocumentSettings />} />
                      {/* Using Outlet in SettingsMenu will render the nested routes */}
                    </Route>

                    {/* New invoice routes */}
                    <Route path="income/new" element={<NewInvoice type={TransactionType.INCOME} />} />
                    <Route path="expense/new" element={<NewInvoice type={TransactionType.EXPENSE} />} />
                    {/* Legacy routes for backward compatibility */}
                    <Route path="income" element={<IncomeList />} />
                    <Route path="expense" element={<ExpenseList />} />
                    {/* Catch-all for any other routes */}
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Routes>
            </SidebarProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
