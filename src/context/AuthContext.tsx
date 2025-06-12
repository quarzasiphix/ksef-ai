import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";
import ReactLazy from "react";
import { checkPremiumStatus } from "@/integrations/supabase/repositories/PremiumRepository";

const PremiumCheckoutModalLazy = ReactLazy.lazy(() => import("@/components/premium/PremiumCheckoutModal"));

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  register: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  logout: () => Promise<void>;
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;
  openPremiumDialog: () => void;
  supabase: typeof supabase;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const queryClient = useQueryClient();

  const openPremiumDialog = () => {
    setShowPremiumModal(true);
  };

  // Helper for minimum loading time
  const minDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log("Auth state changed:", event, session);
    
    if (session?.user) {
      setUser(session.user);
      await queryClient.invalidateQueries();
    } else {
      setUser(null);
      queryClient.clear();
    }
    
    if (loading) {
      setLoading(false);
    }
  };

  useEffect(() => {
    let checkedInitial = false;

    const checkAndSetPremium = async (session: Session | null) => {
      if (session && session.user) {
        setUser(session.user);
        const premium = await checkPremiumStatus(session.user.id);
        setIsPremium(premium);
      } else {
        setUser(null);
        setIsPremium(false);
      }
      setLoading(false);
    };

    // 1. Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkedInitial = true;
      checkAndSetPremium(session);
    });

    // 2. Listen for session restoration or login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only show global loading overlay while app is boot-strapping or right after an explicit SIGNED_IN event (fresh login).
      if (!checkedInitial) {
        setLoading(true);
      }

      // Always update user/premium status in background, but avoid toggling the loading flag after bootstrap.
      checkAndSetPremium(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const register = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    try {
      // Use local scope to avoid requiring a "global" sign-out which may fail for non-privileged sessions.
      const { error } = await supabase.auth.signOut({ scope: "local" });

      // Fallback to the default behaviour if local scope is not supported (older clients)
      if (error?.message?.includes("scope")) {
        const fallback = await supabase.auth.signOut();
        if (fallback.error) throw fallback.error;
      } else if (error) {
        throw error;
      }

      setUser(null);
      queryClient.clear();
    } catch (err) {
      console.error("Logout failed", err);
      // Notify the user that something went wrong.
      import("@/hooks/use-toast").then(({ toast }) => {
        toast({
          title: "Błąd wylogowania",
          description: "Nie udało się wylogować. Spróbuj ponownie później.",
          variant: "destructive",
        });
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPremium, setIsPremium, openPremiumDialog, supabase }}>
      {children}
      {showPremiumModal && (
        <ReactLazy.Suspense fallback={null}>
          <PremiumCheckoutModalLazy
            isOpen={showPremiumModal}
            onClose={() => setShowPremiumModal(false)}
          />
        </ReactLazy.Suspense>
      )}
    </AuthContext.Provider>
  );
};