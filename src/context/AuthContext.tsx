
import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";
import PremiumCheckoutModal from "@/components/premium/PremiumCheckoutModal";

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

  // Check premium status function
  const checkPremiumStatus = async (userId: string) => {
    console.log("Checking premium status for user:", userId);
    try {
      const { data, error } = await supabase
        .from("premium_subscriptions")
        .select("id, ends_at, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking premium status:", error);
        setIsPremium(false);
        return false;
      }

      if (data && data.is_active && (!data.ends_at || new Date(data.ends_at) > new Date())) {
        console.log("User has active premium subscription");
        setIsPremium(true);
        return true;
      } else {
        console.log("User does not have active premium subscription");
        setIsPremium(false);
        return false;
      }
    } catch (error) {
      console.error("Premium status check failed:", error);
      setIsPremium(false);
      return false;
    }
  };

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log("Auth state changed:", event, session);
    
    if (session?.user) {
      setUser(session.user);
      
      // Check premium status FIRST before invalidating queries
      await checkPremiumStatus(session.user.id);
      
      // Then invalidate queries to load other data
      await queryClient.invalidateQueries();
    } else {
      setUser(null);
      setIsPremium(false);
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
          setUser(session.user);
          
          // Check premium status FIRST
          await checkPremiumStatus(session.user.id);
          
          // Then handle other auth state changes
          await handleAuthStateChange('INITIAL_SESSION', session);
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
    setIsPremium(false);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPremium, setIsPremium, openPremiumDialog, supabase }}>
      {children}
      <PremiumCheckoutModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />
    </AuthContext.Provider>
  );
};
