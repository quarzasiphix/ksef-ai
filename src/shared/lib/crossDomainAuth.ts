// Cross-domain authentication utilities for React app
// Matches the Next.js implementation for consistency

const COOKIE_NAME = 'ksiegai_auth_token';

export interface CrossDomainAuthToken {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user_id?: string;
}

const parseToken = (value: string | null): CrossDomainAuthToken | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error('Failed to parse cross-domain auth token:', error);
    return null;
  }
};

/**
 * Retrieve auth token from cookie or localStorage so the React app
 * can restore a session created on the Next.js marketing site.
 */
export const getCrossDomainAuthToken = (): CrossDomainAuthToken | null => {
  if (typeof window === 'undefined') return null;

  console.log('[crossDomainAuth] Reading token, hostname:', window.location.hostname);
  console.log('[crossDomainAuth] All cookies:', document.cookie);

  const cookies = document.cookie ? document.cookie.split(';') : [];
  const authCookie = cookies.find((cookie) =>
    cookie.trim().startsWith(`${COOKIE_NAME}=`)
  );

  if (authCookie) {
    console.log('[crossDomainAuth] Found auth cookie');
    const value = authCookie.split('=')[1];
    const decoded = decodeURIComponent(value);
    const token = parseToken(decoded);
    if (token) {
      console.log('[crossDomainAuth] Token parsed from cookie:', { user_id: token.user_id, expires_at: token.expires_at });
      return token;
    }
  } else {
    console.log('[crossDomainAuth] No auth cookie found');
  }

  try {
    const stored = localStorage.getItem(COOKIE_NAME);
    if (stored) {
      console.log('[crossDomainAuth] Found token in localStorage');
      return parseToken(stored);
    } else {
      console.log('[crossDomainAuth] No token in localStorage');
    }
  } catch (error) {
    console.error('Failed to read cross-domain auth token from localStorage:', error);
    return null;
  }
  
  return null;
};

/**
 * Clear auth token from both cookie and localStorage
 * This ensures logout works across both domains and prevents token reuse
 */
export const clearCrossDomainAuthToken = (): void => {
  if (typeof window === 'undefined') return;

  console.log('[crossDomainAuth] Clearing auth token from all storage');

  // Clear localStorage
  localStorage.removeItem(COOKIE_NAME);

  // Clear cookie on parent domain with multiple attempts to ensure it's gone
  const domains = [
    window.location.hostname.includes('localhost') ? 'localhost' : '.ksiegai.pl',
    window.location.hostname,
    'www.ksiegai.pl',
    'ksiegai.pl'
  ];

  domains.forEach(domain => {
    document.cookie = `${COOKIE_NAME}=; domain=${domain}; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${COOKIE_NAME}=; domain=${domain}; path=/; max-age=0`;
  });

  console.log('[crossDomainAuth] Auth token cleared from all domains');
};
