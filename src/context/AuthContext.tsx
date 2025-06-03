import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isPremium: boolean;
  openPremiumDialog: () => void;
  supabase: typeof supabase;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const openPremiumDialog = () => {
    // Add your premium dialog logic here
    console.log('Opening premium dialog');
  };

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        // Add your auth check logic here
        setLoading(false);
      } catch (error) {
        console.error("Auth check failed:", error);
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    // Add your login logic here
  };

  const register = async (email: string, password: string) => {
    // Add your register logic here
  };

  const logout = async () => {
    // Add your logout logic here
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isPremium, openPremiumDialog, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}; 