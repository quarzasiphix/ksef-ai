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

// Export the query client for use in other files
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Enable refetch on window focus
      refetchOnMount: true, // Enable refetch when component mounts
      refetchOnReconnect: true, // Enable refetch on reconnect
      staleTime: 5 * 60 * 1000, // 5 minutes before data is considered stale
      gcTime: 10 * 60 * 1000, // 10 minutes before inactive queries are garbage collected
      retry: 1, // Only retry failed requests once
    },
  },
});

// --- Auth Context ---
type AuthContextType = { 
  user: any; 
  setUser: (u: any) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  setUser: () => {},
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AuthProvider - START"); // Add this
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const handleAuthStateChange = React.useCallback(async (_event: string, session: any) => {
    console.log("AuthProvider - handleAuthStateChange - event:", _event, "session:", session);
    
    // Only update state if it's actually different
    const currentUser = user;
    const newUser = session?.user || null;
    
    // Check if user state actually changed
    const userChanged = JSON.stringify(currentUser) !== JSON.stringify(newUser);
    
    if (!userChanged) {
      console.log("AuthProvider - User state unchanged, skipping update");
      return;
    }

    if (newUser) {
      console.log("AuthProvider - Setting new user");
      setUser(newUser);
      localStorage.setItem("sb_session", JSON.stringify(session));
      // Invalidate all queries to force refetch with new user data
      await queryClient.invalidateQueries();
    } else {
      console.log("AuthProvider - Removing user");
      setUser(null);
      localStorage.removeItem("sb_session");
      // Clear all queries when logging out
      queryClient.clear();
    }
    
    // Only set loading to false after the initial check
    if (loading) {
      console.log("AuthProvider - Initial load complete");
      setLoading(false);
    }
    
    console.log("AuthProvider - handleAuthStateChange - END");
  }, [user, loading, queryClient]);

  const logout = async () => {
    console.log("AuthProvider - logout - START"); // Add this
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear all queries
      queryClient.clear();

      // Explicitly remove specific query caches
      queryClient.removeQueries({ queryKey: ['invoices'] });
      queryClient.removeQueries({ queryKey: ['businessProfiles'] });
      queryClient.removeQueries({ queryKey: ['customers'] });
      queryClient.removeQueries({ queryKey: ['products'] });
      queryClient.removeQueries({ queryKey: ['settings'] });

      // Clear any persisted query state in localStorage/sessionStorage
      ['invoices', 'businessProfiles', 'customers', 'products', 'settings'].forEach(key => {
        localStorage.removeItem(`tanstack-query-${key}`);
        sessionStorage.removeItem(`tanstack-query-${key}`);
      });

      // Reset user state
      setUser(null);
      localStorage.removeItem("sb_session");
    } catch (error) {
      console.error("AuthProvider - Error during logout:", error); // Modified log
    }
    console.log("AuthProvider - logout - END"); // Add this
  };

  useEffect(() => {
    console.log("AuthProvider - useEffect - START");
    
    // Always check Supabase for a valid session on mount
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
        
        // Only update state if we have a session
        if (data?.session) {
          await handleAuthStateChange('INITIAL_SESSION', data.session);
        } else {
          // No session, ensure we're in a clean state
          setUser(null);
          localStorage.removeItem("sb_session");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in checkSession:", error);
        setLoading(false);
      }
    };

    checkSession();

    // Listen to auth state changes (login/logout/refresh)
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

  console.log("AuthProvider - rendering - loading:", loading, "user:", user); // Add this
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white text-xl">Ładowanie...</div>;
  }

  console.log("AuthProvider - rendering - authenticated, providing context"); // Add this
  return <AuthContext.Provider value={{ user, setUser, logout }}>{children}</AuthContext.Provider>;
};

const RequireAuth: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  console.log("RequireAuth - START"); // Add this
  const { user } = useAuth();
  console.log("RequireAuth - user from useAuth:", user); // Add this

  // Don't redirect until AuthProvider loading is done
  const [loading, setLoading] = useState(true);
  console.log("RequireAuth - initial loading state:", loading); // Add this

  useEffect(() => {
    console.log("RequireAuth - useEffect - setting loading to false"); // Add this
    setLoading(false);
  }, []);

  console.log("RequireAuth - rendering - loading:", loading, "user:", user); // Add this

  if (loading) {
    console.log("RequireAuth - rendering - still loading, returning null"); // Add this
    return null;
  }

  if (!user) {
    console.log("RequireAuth - rendering - no user, navigating to login"); // Add this
    return <Navigate to="/auth/login" replace />;
  }

  console.log("RequireAuth - rendering - user exists, rendering children/outlet"); // Add this
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
                    <Route path="settings" element={<BusinessProfiles />} />
                    <Route path="settings/business-profiles/new" element={<NewBusinessProfile />} />
                    <Route path="settings/business-profiles/:id" element={<EditBusinessProfile />} />
                    <Route path="settings/documents" element={<DocumentSettings />} />
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
