
import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { User, Session } from "@supabase/supabase-js";
import { checkPremiumStatus } from "@/modules/premium/data/PremiumRepository";
import { cleanupAuthState } from "@/shared/lib/auth-utils";
import { getParentDomain } from "@/shared/config/domains";
import { clearCrossDomainAuthToken, getCrossDomainAuthToken } from "@/shared/lib/crossDomainAuth";

const PremiumCheckoutModalLazy = React.lazy(() => import("@/modules/premium/components/PremiumCheckoutModal"));

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loading: boolean; // For backward compatibility
  login: (email: string, password:string) => Promise<{ user: User | null; session: Session | null }>;
  register: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  logout: () => Promise<void>;
  isPremium: boolean;
  setIsPremium: (value: boolean) => void;
  openPremiumDialog: (initialPlanId?: string) => void;
  closePremiumDialog: () => void;
  isPremiumModalOpen: boolean;
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
  const [premiumDialogInitialPlanId, setPremiumDialogInitialPlanId] = useState<string | null>(null);
  const [bootstrapComplete, setBootstrapComplete] = useState(false);
  const queryClient = useQueryClient();

  const openPremiumDialog = (initialPlanId?: string) => {
    setPremiumDialogInitialPlanId(initialPlanId ?? null);
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
    let mounted = true;

    const checkAndSetPremium = async (session: Session | null) => {
      if (!mounted) return;
      
      if (session && session.user) {
        // Set user FIRST before checking premium to avoid race condition
        setUser(session.user);
        
        const premium = await checkPremiumStatus(session.user.id);
        if (mounted) {
          setIsPremium(premium);
          setLoading(false);
        }
      } else {
        setUser(null);
        setIsPremium(false);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const restoreCrossDomainSession = async (): Promise<Session | null> => {
      const token = getCrossDomainAuthToken();
      console.log("[AuthContext] Cross-domain token:", token ? "found" : "not found", token);
      
      if (!token) {
        console.log("[AuthContext] No cross-domain token available");
        return null;
      }

      if (token.expires_at && Date.now() >= token.expires_at * 1000) {
        console.log("[AuthContext] Token expired, clearing");
        clearCrossDomainAuthToken();
        return null;
      }

      console.log("[AuthContext] Attempting to restore session with token");
      
      try {
        // Clear the token immediately to prevent reuse
        clearCrossDomainAuthToken();
        
        const { data, error } = await supabase.auth.setSession({
          access_token: token.access_token,
          refresh_token: token.refresh_token,
        });

        if (error) {
          console.error("[AuthContext] Failed to restore cross-domain session:", error);
          
          // If it's a refresh token reuse error, it's already cleared
          if (error.message?.includes('refresh_token') || error.message?.includes('Already Used')) {
            console.log("[AuthContext] Refresh token reuse detected, token already cleared");
          }
          
          return null;
        }

        console.log("[AuthContext] Session restored successfully:", data.session?.user?.id);
        return data.session ?? null;
      } catch (err) {
        console.error("[AuthContext] Network error during session restoration:", err);
        console.log("[AuthContext] Will retry setSession after a brief delay...");
        
        // Retry once after a short delay in case of transient network issue
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: token.access_token,
            refresh_token: token.refresh_token,
          });

          if (error) {
            console.error("[AuthContext] Retry failed:", error);
            
            // If it's a refresh token reuse error, it's already cleared
            if (error.message?.includes('refresh_token') || error.message?.includes('Already Used')) {
              console.log("[AuthContext] Refresh token reuse detected in retry, token already cleared");
            }
            
            return null;
          }

          console.log("[AuthContext] Session restored successfully on retry:", data.session?.user?.id);
          return data.session ?? null;
        } catch (retryErr) {
          console.error("[AuthContext] Retry also failed with network error:", retryErr);
          return null;
        }
      }
    };

    const bootstrap = async () => {
      if (!mounted) return;
      
      console.log("[AuthContext] Bootstrap starting...");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[AuthContext] Initial session from Supabase:", session ? "found" : "not found", session?.user?.id);
      
      const activeSession = session || (await restoreCrossDomainSession());
      console.log("[AuthContext] Active session after restoration:", activeSession ? "found" : "not found", activeSession?.user?.id);
      
      if (!mounted) return;
      
      checkedInitial = true;
      
      // Set user and loading state together to prevent intermediate renders
      if (activeSession && activeSession.user) {
        setUser(activeSession.user);
        const premium = await checkPremiumStatus(activeSession.user.id);
        if (mounted) {
          setIsPremium(premium);
          setLoading(false);
          setBootstrapComplete(true);
        }
      } else {
        setUser(null);
        setIsPremium(false);
        if (mounted) {
          setLoading(false);
          setBootstrapComplete(true);
        }
      }
      
      console.log("[AuthContext] Bootstrap complete, user set:", activeSession?.user?.id);
    };

    bootstrap();

    // 2. Listen for session restoration or login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      // CRITICAL: Don't process auth state changes until bootstrap completes
      // This prevents onAuthStateChange from setting loading=false while bootstrap is still running
      if (!checkedInitial) {
        console.log("[AuthContext] Ignoring auth state change during bootstrap:", event);
        return;
      }

      console.log("[AuthContext] Processing auth state change after bootstrap:", event);
      // Always update user/premium status in background after bootstrap completes
      checkAndSetPremium(session);
    });

    return () => {
      mounted = false;
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

  const signInWithGoogle = async () => {
    // For localhost development, redirect to marketing site for OAuth flow
    const isLocalhost = window.location.hostname === 'localhost';
    const port = window.location.port || '8080';
    
    if (isLocalhost) {
      // Redirect to marketing site with localhost callback parameters
      const marketingUrl = `https://ksiegai.pl?from=localhost&port=${port}&action=google_login`;
      window.location.href = marketingUrl;
      return;
    }
    
    // Production: use normal OAuth flow
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const closePremiumDialog = () => {
    setShowPremiumModal(false);
    setPremiumDialogInitialPlanId(null);
  };

  const logout = async () => {
    try {
      console.log("[AuthContext] Starting logout process");
      
      // Step 1: Sign out from Supabase FIRST (this clears the session properly)
      await supabase.auth.signOut({ scope: 'local' }); // Use 'local' not 'global'
      
      // Step 2: Clear cross-domain token
      clearCrossDomainAuthToken();
      
      // Step 3: Clean up all auth state
      cleanupAuthState();
      
      // Step 4: Clear React state
      setUser(null);
      setIsPremium(false);
      queryClient.clear();

      console.log("[AuthContext] Logout complete, redirecting to parent domain with logout flag");
      
      // Step 5: Redirect to marketing site with logout flag to clear their session too
      const isLocalhost = window.location.hostname === 'localhost';
      const parentDomain = isLocalhost 
        ? 'http://localhost:3000/?logout=true'
        : 'https://ksiegai.pl/?logout=true';
      
      window.location.href = parentDomain;
    } catch (err) {
      console.error("Logout failed unexpectedly:", err);
      // Fallback: still clear everything and redirect
      clearCrossDomainAuthToken();
      cleanupAuthState();
      const isLocalhost = window.location.hostname === 'localhost';
      const parentDomain = isLocalhost 
        ? 'http://localhost:3000/?logout=true'
        : 'https://ksiegai.pl/?logout=true';
      window.location.href = parentDomain;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading: loading, 
      loading: loading, 
      login, 
      register, 
      logout, 
      isPremium, 
      setIsPremium, 
      openPremiumDialog, 
      closePremiumDialog,
      isPremiumModalOpen: showPremiumModal,
      supabase, 
      signInWithGoogle, 
      isModalOpen: showPremiumModal 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
