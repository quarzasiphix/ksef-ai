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
  const queryClient = useQueryClient();

  const openPremiumDialog = () => {
    // Add your premium dialog logic here
    console.log('Opening premium dialog');
  };

  const handleAuthStateChange = async (event: string, session: Session | null) => {
    console.log("Auth state changed:", event, session);
    
    if (session?.user) {
      setUser(session.user);
      localStorage.setItem("sb_session", JSON.stringify(session));
      await queryClient.invalidateQueries();
    } else {
      setUser(null);
      localStorage.removeItem("sb_session");
      queryClient.clear();
    }
    
    if (loading) {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await handleAuthStateChange('INITIAL_SESSION', session);
        } else {
          setUser(null);
          localStorage.removeItem("sb_session");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
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
    localStorage.removeItem("sb_session");
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPremium, openPremiumDialog, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}; 