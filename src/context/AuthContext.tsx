import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  register: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  logout: () => Promise<void>;
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;
  isPremiumModalOpen: boolean;
  openPremiumDialog: () => void;
  closePremiumDialog: () => void;
  isPremiumSuccessOpen: boolean;
  showPremiumSuccess: () => void;
  hidePremiumSuccess: () => void;
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
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isPremiumSuccessOpen, setIsPremiumSuccessOpen] = useState(false);
  const queryClient = useQueryClient();

  const openPremiumDialog = () => setIsPremiumModalOpen(true);
  const closePremiumDialog = () => setIsPremiumModalOpen(false);
  const showPremiumSuccess = () => setIsPremiumSuccessOpen(true);
  const hidePremiumSuccess = () => setIsPremiumSuccessOpen(false);

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
    // Check for existing session
    const checkAuth = async () => {
      const start = Date.now();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await handleAuthStateChange('INITIAL_SESSION', session);
          // Check premium status once on initial load
          const { data, error } = await supabase
            .from("premium_subscriptions")
            .select("id,ends_at,is_active")
            .eq("user_id", session.user.id)
            .eq("is_active", true)
            .order("ends_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) {
            setIsPremium(false);
          } else if (data && data.is_active && (!data.ends_at || new Date(data.ends_at) > new Date())) {
            setIsPremium(true);
          } else {
            setIsPremium(false);
          }
        } else {
          setUser(null);
          setIsPremium(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsPremium(false);
      } finally {
        // Ensure loading is visible for at least 500ms
        const elapsed = Date.now() - start;
        if (elapsed < 500) {
          await minDelay(500 - elapsed);
        }
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      subscription.unsubscribe();
    };
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isPremium,
      setIsPremium,
      isPremiumModalOpen,
      openPremiumDialog,
      closePremiumDialog,
      isPremiumSuccessOpen,
      showPremiumSuccess,
      hidePremiumSuccess,
      supabase
    }}>
      {children}
    </AuthContext.Provider>
  );
}; 