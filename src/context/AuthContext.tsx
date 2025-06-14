
import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";
import { checkPremiumStatus } from "@/integrations/supabase/repositories/PremiumRepository";
import { cleanupAuthState } from "@/lib/auth-utils";

const PremiumCheckoutModalLazy = React.lazy(() => import("@/components/premium/PremiumCheckoutModal"));

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loading: boolean; // For backward compatibility
  login: (email: string, password:string) => Promise<{ user: User | null; session: Session | null }>;
  register: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  logout: () => Promise<void>;
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;
  openPremiumDialog: () => void;
  supabase: typeof supabase;
  signInWithGoogle: () => Promise<void>;
  isModalOpen: boolean;
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

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const logout = async () => {
    try {
      cleanupAuthState();
      // Attempt global sign out, but don't fail if it doesn't work.
      // The cleanup and page reload will handle the client state.
      await supabase.auth.signOut({ scope: 'global' }).catch(console.error);

      setUser(null);
      setIsPremium(false);
      queryClient.clear();

      // Force a full page reload to go to login and clear all state.
      window.location.href = '/auth/login';
    } catch (err) {
      console.error("Logout failed unexpectedly:", err);
      // As a fallback, still try to redirect.
      if (!window.location.pathname.includes('/auth/login')) {
         window.location.href = '/auth/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: loading, loading: loading, login, register, logout, isPremium, setIsPremium, openPremiumDialog, supabase, signInWithGoogle, isModalOpen: showPremiumModal }}>
      {children}
      {showPremiumModal && (
        <React.Suspense fallback={null}>
          <PremiumCheckoutModalLazy
            isOpen={showPremiumModal}
            onClose={() => setShowPremiumModal(false)}
          />
        </React.Suspense>
      )}
    </AuthContext.Provider>
  );
};
