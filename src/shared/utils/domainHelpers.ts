/**
 * Domain and URL helpers for cross-domain auth flow
 * 
 * Architecture:
 * - Marketing site: ksiegai.pl (Next.js)
 * - SPA app: app.ksiegai.pl (React)
 * 
 * Flow:
 * 1. User hits app.ksiegai.pl/accounting/balance-sheet (unauthenticated)
 * 2. Redirect to ksiegai.pl/auth/login?returnTo=https://app.ksiegai.pl/accounting/balance-sheet
 * 3. After login, Next.js redirects back to returnTo URL
 */

const ROOT_DOMAIN = 'ksiegai.pl';
const APP_DOMAIN = 'app.ksiegai.pl';

/**
 * Get the root domain (marketing site)
 */
export function getRootDomain(): string {
  // In development, use localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  
  return `https://${ROOT_DOMAIN}`;
}

/**
 * Get the app domain (SPA)
 */
export function getAppDomain(): string {
  // In development, use current origin
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin;
  }
  
  return `https://${APP_DOMAIN}`;
}

/**
 * Build login URL with returnTo parameter
 * 
 * @param returnTo - Full absolute URL to return to after login (defaults to current URL)
 * @returns Login URL on root domain with encoded returnTo
 * 
 * @example
 * buildLoginUrl() // https://ksiegai.pl/auth/login?returnTo=https%3A%2F%2Fapp.ksiegai.pl%2Faccounting
 * buildLoginUrl('https://app.ksiegai.pl/invoices/123') // https://ksiegai.pl/auth/login?returnTo=...
 */
export function buildLoginUrl(returnTo?: string): string {
  const returnToUrl = returnTo || window.location.href;
  const encodedReturnTo = encodeURIComponent(returnToUrl);
  
  return `${getRootDomain()}/auth/login?returnTo=${encodedReturnTo}`;
}

/**
 * Build premium page URL with optional reason
 * 
 * @param reason - Optional reason for premium upsell (e.g., 'accounting', 'inventory')
 * @returns Premium URL on root domain
 * 
 * @example
 * buildPremiumUrl('accounting') // https://ksiegai.pl/premium?reason=accounting
 */
export function buildPremiumUrl(reason?: string): string {
  const baseUrl = `${getRootDomain()}/premium`;
  
  if (reason) {
    return `${baseUrl}?reason=${encodeURIComponent(reason)}`;
  }
  
  return baseUrl;
}

/**
 * Check if we're currently on the app domain
 */
export function isAppDomain(): boolean {
  const hostname = window.location.hostname;
  
  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  
  // Production
  return hostname === APP_DOMAIN;
}

/**
 * Check if we're currently on the root domain
 */
export function isRootDomain(): boolean {
  const hostname = window.location.hostname;
  
  // Development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false; // Assume app domain in dev
  }
  
  // Production
  return hostname === ROOT_DOMAIN;
}

/**
 * Safely redirect to URL (prevents loops)
 * 
 * @param url - URL to redirect to
 * @param preventLoop - If true, check if we're already on that domain
 */
export function safeRedirect(url: string, preventLoop: boolean = true): void {
  if (preventLoop) {
    const targetUrl = new URL(url);
    const currentHost = window.location.host;

    // Don't redirect if we're already on the exact same host (hostname + port)
    if (targetUrl.host === currentHost) {
      console.warn('[safeRedirect] Already on target domain, skipping redirect');
      return;
    }
  }
  
  console.log('[safeRedirect] Redirecting to:', url);
  window.location.href = url;
}

/**
 * Redirect unauthenticated user to login with returnTo
 * Should be called from useEffect to avoid render loops
 */
export function redirectToLogin(returnTo?: string): void {
  const loginUrl = buildLoginUrl(returnTo);
  safeRedirect(loginUrl);
}

/**
 * Redirect to premium page
 * Should be called from useEffect to avoid render loops
 */
export function redirectToPremium(reason?: string): void {
  const premiumUrl = buildPremiumUrl(reason);
  safeRedirect(premiumUrl);
}

// Legacy export for backwards compatibility
export const getParentDomain = getRootDomain;
