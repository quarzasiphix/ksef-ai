import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useSearchParams } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import React, { createContext, useState, useEffect, useContext, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types"; // Import Database type

import Layout from "./components/layout/Layout";
import GlobalDataLoader from "./components/layout/GlobalDataLoader";
import Dashboard from "./pages/Dashboard";
import InvoiceList from "./pages/invoices/InvoiceList";
import InvoiceDetail from "./pages/invoices/InvoiceDetail";
import NewInvoice from "./pages/invoices/NewInvoice";
import { TransactionType } from "./common-types";
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
import ProfileSettings from "./pages/settings/ProfileSettings"; // Import the new component
import { AuthChangeEvent, Session, User, SupabaseClient, Subscription } from '@supabase/supabase-js'; // Import necessary types
import { BusinessProfileProvider } from './context/BusinessProfileContext'; // Import the provider
import PremiumCheckoutModal from "@/components/PremiumCheckoutModal"; // Import the modal
import Accounting from './pages/accounting/Accounting'; // Import Accounting component
import RequirePremium from './components/auth/RequirePremium'; // Import RequirePremium
import PremiumSuccessMessage from "@/components/PremiumSuccessMessage"; // Import PremiumSuccessMessage

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
interface AuthContextType {
  user: User | null; // Use Supabase User type
  setUser: (u: User | null) => void; // Use Supabase User type
  logout: () => Promise<void>;
  isPremium: boolean;
  session: Session | null; // Add session
  isLoading: boolean; // Add isLoading
  supabase: SupabaseClient<Database>; // Add supabase client
  openPremiumDialog: () => void; // Add function to open premium dialog
  closePremiumDialog: () => void; // Add function to close premium dialog
  isModalOpen: boolean; // Add isModalOpen to context type
  isShowingPremiumSuccess: boolean; // Add state for success message
  showPremiumSuccess: () => void; // Add handler to show success message
  hidePremiumSuccess: () => void; // Add handler to hide success message
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: async () => {},
  isPremium: false,
  session: null, // Default session
  isLoading: true, // Default loading state
  supabase: supabase, // Provide the actual supabase instance
  openPremiumDialog: () => {}, // Placeholder function
  closePremiumDialog: () => {}, // Placeholder function
  isModalOpen: false, // Add default value for isModalOpen
  isShowingPremiumSuccess: false, // Default value
  showPremiumSuccess: () => {},
  hidePremiumSuccess: () => {},
});

export const useAuth = () => useContext(AuthContext);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("AuthProvider - START");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for premium modal
  const [isShowingPremiumSuccess, setIsShowingPremiumSuccess] = useState(false); // State for success message
  const queryClient = useQueryClient();
  const prevIsPremiumRef = useRef(false); // Use ref to track previous premium status, initialize to false

  const openPremiumDialog = () => setIsModalOpen(true);
  const closePremiumDialog = () => setIsModalOpen(false);

  const showPremiumSuccessMessage = () => setIsShowingPremiumSuccess(true);
  const hidePremiumSuccessMessage = () => setIsShowingPremiumSuccess(false);

  const fetchPremiumStatus = async (userId: string) => {
    console.log("AuthProvider - fetchPremiumStatus - START for user:", userId);
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
        return false; // Indicate failure
      }

      const hasActiveSubscription = data && data.length > 0 && (!data[0].ends_at || new Date(data[0].ends_at) > new Date());

      console.log("AuthProvider - fetchPremiumStatus - hasActiveSubscription:", hasActiveSubscription, "current isPremium:", isPremium, "prev isPremium:", prevIsPremiumRef.current);

      // Update state
      setIsPremium(hasActiveSubscription);

      return hasActiveSubscription; // Return the status

    } catch (error) {
      console.error("Error in fetchPremiumStatus:", error);
      setIsPremium(false);
      return false; // Indicate failure
    }
  };

  const handleAuthStateChange = React.useCallback(async (_event: string, session: Session | null) => {
    console.log("AuthProvider - handleAuthStateChange - event:", _event, "session:", session);
    setSession(session);
    const newUser = session?.user || null;

    console.log("AuthProvider - handleAuthStateChange - newUser:", newUser, "_event:", _event);

    if (newUser) {
      console.log("AuthProvider - Setting new user and fetching premium status");
      setUser(newUser);
      localStorage.setItem("sb_session", JSON.stringify(session));
      // Fetch premium status after setting user
      await fetchPremiumStatus(newUser.id);
      await queryClient.invalidateQueries();
    } else {
      console.log("AuthProvider - Removing user and clearing premium status");
      setUser(null);
      setIsPremium(false);
      setIsShowingPremiumSuccess(false); // Hide success message on logout
      localStorage.removeItem("sb_session");
      queryClient.clear();
    }

    console.log("AuthProvider - handleAuthStateChange - END");
  }, [queryClient]); // Removed user dependency

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
      setIsPremium(false);
      setIsShowingPremiumSuccess(false); // Hide success message on logout
      localStorage.removeItem("sb_session");
    } catch (error) {
      console.error("AuthProvider - Error during logout:", error);
    }
    console.log("AuthProvider - logout - END");
  };

  // Effect for initial session check and auth listener setup
  useEffect(() => {
     console.log("AuthProvider - initial setup useEffect - START");
     const setupAuth = async () => {
        console.log("AuthProvider - setupAuth - START");
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
              console.error("Error getting session:", error);
              setUser(null);
              setIsPremium(false);
              localStorage.removeItem("sb_session");
              setLoading(false);
              return;
            }

            console.log("AuthProvider - setupAuth - after getSession, data:", data);

            const initialUser = data?.session?.user || null;
            const initialSession = data?.session || null;

            setSession(initialSession);
            setUser(initialUser);
            localStorage.setItem("sb_session", JSON.stringify(initialSession));

            let initialIsPremium = false;
            if (initialUser) {
              initialIsPremium = await fetchPremiumStatus(initialUser.id);
              console.log("AuthProvider - setupAuth - fetched initialIsPremium:", initialIsPremium);
            }

            setIsPremium(initialIsPremium);
            prevIsPremiumRef.current = initialIsPremium;
            console.log("AuthProvider - setupAuth - isPremium state set to:", initialIsPremium, "prevIsPremiumRef.current set to:", prevIsPremiumRef.current);

            if (supabase.auth.onAuthStateChange) {
               console.log("AuthProvider - setupAuth - setting up auth state listener");
               const { data: { subscription } } = supabase.auth.onAuthStateChange(
                 (event, session) => {
                   console.log("Auth state changed:", event);
                   handleAuthStateChange(event, session);
                 }
               );

               return () => {
                 console.log("AuthProvider - setupAuth - cleaning up auth state listener");
                 subscription?.unsubscribe();
               };
            }

        } catch (error) {
            console.error("Error in setupAuth:", error);
            setUser(null);
            setIsPremium(false);
            localStorage.removeItem("sb_session");
        } finally {
            setLoading(false);
            console.log("AuthProvider - setupAuth - FINALLY");
        }
     };

     setupAuth();

     // No cleanup needed here, as the subscription cleanup is handled inside setupAuth
  }, [handleAuthStateChange]); // Dependency includes handleAuthStateChange

  // Effect to subscribe to premium_subscriptions changes
  useEffect(() => {
      let subscription: any = null;
      console.log("AuthProvider - Realtime subscription useEffect - user:", user);

      if (user) {
          console.log("AuthProvider - Realtime subscription useEffect - Subscribing to premium_subscriptions for user:", user.id);
           subscription = supabase
              .channel('premium_changes') // Use a unique channel name
              .on('postgres_changes',
                  { event: 'UPDATE', schema: 'public', table: 'premium_subscriptions', filter: `user_id=eq.${user.id}` },
                  async (payload) => {
                      console.log('Realtime UPDATE payload:', payload);
                      // Refetch premium status on update
                      if (user) {
                         await fetchPremiumStatus(user.id);
                      }
                  }
              )
               .on('postgres_changes',
                  { event: 'DELETE', schema: 'public', table: 'premium_subscriptions', filter: `user_id=eq.${user.id}` },
                  async (payload) => {
                       console.log('Realtime DELETE payload:', payload);
                       // Refetch premium status on delete
                        if (user) {
                           await fetchPremiumStatus(user.id);
                        }
                  }
               )
              .subscribe();

           console.log("AuthProvider - Realtime subscription useEffect - Subscription established:", subscription);
      }

      return () => {
          console.log("AuthProvider - Realtime subscription useEffect - Cleaning up subscription.");
          if (subscription) {
              supabase.removeChannel(subscription);
          }
      };
  }, [user, fetchPremiumStatus]); // Dependencies: user and fetchPremiumStatus

  // Effect to detect isPremium change and show success message
  useEffect(() => {
    console.log("AuthProvider - isPremium effect - isPremium:", isPremium, "prevIsPremiumRef.current:", prevIsPremiumRef.current);

    // Only show success message if isPremium transitioned from false to true
    if (!prevIsPremiumRef.current && isPremium) {
       console.log("AuthProvider - isPremium effect - Premium status changed to true, showing success message.");
       showPremiumSuccessMessage();
    }
    // Update ref *after* the effect runs to store the latest state for the next render
    prevIsPremiumRef.current = isPremium;
    console.log("AuthProvider - isPremium effect - prevIsPremiumRef.current updated to:", prevIsPremiumRef.current);
  }, [isPremium, showPremiumSuccessMessage]); // Depends on isPremium and the handler

  // Effect to hide success message after a duration
   useEffect(() => {
    if (isShowingPremiumSuccess) {
      console.log("AuthProvider - hide success message effect - isShowingPremiumSuccess:", isShowingPremiumSuccess);
      const timer = setTimeout(() => {
        console.log("AuthProvider - hide success message effect - Hiding success message.");
        hidePremiumSuccessMessage();
      }, 20000); // Show for 20 seconds (increased duration)
      return () => {
         console.log("AuthProvider - hide success message effect - Clearing timeout.");
         clearTimeout(timer);
      };
    }
  }, [isShowingPremiumSuccess, hidePremiumSuccessMessage]);

  console.log("AuthProvider - rendering - loading:", loading, "user:", user, "isPremium:", isPremium);
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-neutral-900 text-white text-xl">Ładowanie...</div>;
  }

  const premiumFeatures = [
    "Tworzenie wielu profili firmowych",
    "Generowanie faktur bez limitu",
    "Pełny dostęp do statystyk i raportów",
    "Wsparcie KSeF (wkrótce)",
    "Priorytetowe wsparcie techniczne",
  ];

  console.log("AuthProvider - rendering - authenticated, providing context");
  return (
    <AuthContext.Provider value={{ user, setUser, logout, isPremium, session, isLoading: loading, supabase, openPremiumDialog, closePremiumDialog, isModalOpen, isShowingPremiumSuccess, showPremiumSuccess: showPremiumSuccessMessage, hidePremiumSuccess: hidePremiumSuccessMessage }}>
      {children}
      <PremiumCheckoutModal isOpen={isModalOpen} onClose={closePremiumDialog} />
       {/* Render Premium Success Message globally */}
      <PremiumSuccessMessage
        isOpen={isShowingPremiumSuccess}
        onClose={hidePremiumSuccessMessage}
        premiumFeatures={premiumFeatures} // Pass the features list
      />
    </AuthContext.Provider>
  );
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
  <ThemeProvider defaultTheme="system">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" offset={10} />
        <BrowserRouter>
          <AuthProvider>
            <BusinessProfileProvider>
              <SidebarProvider>
                <Routes>
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/register" element={<Register />} />
                  <Route element={<RequireAuth />}>
                    <Route path="/" element={<Layout />}>
                      {/* Main routes */}
                      <Route index element={<Dashboard />} />

                      {/* Accounting Route - Protected by RequirePremium */}
                      <Route element={<RequirePremium />}>
                         <Route path="accounting" element={<Accounting />} />
                      </Route>

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
                        <Route index element={<Navigate to="business-profiles" replace />} /> {/* Set profile as the default nested route */}
                        <Route path="profile" element={<ProfileSettings />} /> {/* Add the profile settings route */}
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
            </BusinessProfileProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;