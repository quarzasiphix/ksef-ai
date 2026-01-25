# Cross-Domain Authentication Loop Fix

## 🐛 Problem

Authentication loop between `ksiegai.pl` and `app.ksiegai.pl`:
- Logout on app doesn't clear session on marketing site
- Switching accounts causes glitches and loops
- Sessions get mixed up between domains

## 🔍 Root Cause

1. **Separate Supabase client instances** without session sync
2. **No storage isolation** - both domains write to same localStorage keys
3. **Global signOut doesn't work** across different client instances
4. **Cookie clearing happens before** Supabase session cleanup

## ✅ Solution

### 1. Configure Supabase Clients with Storage Isolation

**ksef-ai** (`src/integrations/supabase/client.ts`):
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://rncrzxjyffxmfbnxlqtm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGc...";

export const supabase = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: 'sb-app-auth', // Unique key for app domain
      storage: window.localStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);
```

**ksiegai-next** (`lib/supabase.ts`):
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-marketing-auth', // Unique key for marketing domain
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();
```

### 2. Fix Logout Flow in ksef-ai

**Update** `src/shared/context/AuthContext.tsx`:
```typescript
const logout = async () => {
  try {
    console.log("[AuthContext] Starting logout process");
    
    // Step 1: Sign out from Supabase FIRST (this clears the session)
    await supabase.auth.signOut({ scope: 'local' }); // Use 'local' not 'global'
    
    // Step 2: Clear cross-domain token
    clearCrossDomainAuthToken();
    
    // Step 3: Clean up all auth state
    cleanupAuthState();
    
    // Step 4: Clear React state
    setUser(null);
    setIsPremium(false);
    queryClient.clear();

    console.log("[AuthContext] Logout complete, redirecting to parent domain");
    
    // Step 5: Redirect to marketing site with logout flag
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
```

### 3. Handle Logout Flag in Next.js Header

**Update** `ksiegai-next/components/Header.tsx`:
```typescript
useEffect(() => {
  // Check for logout flag in URL
  const urlParams = new URLSearchParams(window.location.search);
  const logoutFlag = urlParams.get('logout');
  
  if (logoutFlag === 'true') {
    console.log("[Header] Logout flag detected, clearing session");
    clearAuthToken();
    supabase.auth.signOut({ scope: 'local' });
    setUser(null);
    
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }
  
  // ... rest of auth check logic
}, []);
```

### 4. Prevent Auto-Redirect Loop

**Update** `ksiegai-next/components/Header.tsx` - Add redirect cooldown:
```typescript
const handleGoToApp = async () => {
  console.log("[Header] Redirecting to app");
  
  // Set redirect timestamp to prevent loops
  sessionStorage.setItem('last_redirect', Date.now().toString());
  
  const token = getAuthToken();
  if (token) {
    redirectToApp('/dashboard');
  } else {
    console.error("[Header] No auth token available for redirect");
  }
};

// In useEffect, check for redirect loops:
useEffect(() => {
  const lastRedirect = sessionStorage.getItem('last_redirect');
  if (lastRedirect) {
    const timeSinceRedirect = Date.now() - parseInt(lastRedirect);
    if (timeSinceRedirect < 5000) { // 5 seconds cooldown
      console.log("[Header] Redirect cooldown active, skipping auto-redirect");
      return;
    }
  }
  
  // ... rest of logic
}, []);
```

### 5. Update Cross-Domain Auth Utils

**Both apps** - Add session cleanup:
```typescript
export const cleanupAllAuthState = (): void => {
  if (typeof window === 'undefined') return;

  console.log('[crossDomainAuth] Cleaning up all auth state');

  // Clear cross-domain token
  clearCrossDomainAuthToken();

  // Clear ALL Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-') || key.startsWith('supabase.auth.')) {
      localStorage.removeItem(key);
    }
  });

  // Clear from sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.startsWith('supabase.auth.')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  console.log('[crossDomainAuth] All auth state cleared');
};
```

## 🧪 Testing Checklist

- [ ] Login on ksiegai.pl → redirects to app.ksiegai.pl ✅
- [ ] Logout on app.ksiegai.pl → redirects to ksiegai.pl logged out ✅
- [ ] Login with Account A → works ✅
- [ ] Logout → works ✅
- [ ] Login with Account B → no glitches ✅
- [ ] No redirect loops ✅
- [ ] Sessions don't mix between accounts ✅
- [ ] Localhost development works ✅

## 🚀 Deployment Steps

1. Update ksef-ai Supabase client config
2. Update ksiegai-next Supabase client config
3. Update logout flow in AuthContext
4. Add logout flag handling in Header
5. Add redirect cooldown logic
6. Test thoroughly in localhost
7. Deploy both apps simultaneously
8. Monitor for any auth issues

## 📊 Key Changes Summary

| Issue | Before | After |
|-------|--------|-------|
| Storage keys | Same keys both domains | Isolated: `sb-app-auth` vs `sb-marketing-auth` |
| Logout order | Cookie first, then signOut | signOut first, then cookie |
| Logout scope | `global` (doesn't work) | `local` (works correctly) |
| Cross-domain sync | No logout flag | `?logout=true` flag |
| Redirect loops | No protection | 5-second cooldown |
| Session cleanup | Partial | Complete cleanup |

## 🔐 Security Improvements

- ✅ Proper session isolation between domains
- ✅ Complete cleanup on logout
- ✅ No session mixing between accounts
- ✅ PKCE flow for better security
- ✅ Auto token refresh enabled
