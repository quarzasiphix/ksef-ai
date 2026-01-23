/**
 * KSeF Token Manager
 * 
 * Manages access and refresh tokens with automatic refresh.
 * Ensures tokens are always valid before API calls.
 */

import type { AuthTokens } from './ksefAuthCoordinator';

export interface TokenInfo {
  token: string;
  expiresIn: number;
  expiresAt: Date;
}

export interface StoredTokens {
  accessToken: TokenInfo;
  refreshToken: TokenInfo;
  companyId: string;
  contextType: string;
  contextValue: string;
}

/**
 * Token Manager Service
 * 
 * Features:
 * - Automatic token refresh 5 minutes before expiry
 * - Background refresh scheduling
 * - Token storage and retrieval
 * - Expiry checking
 */
export class KsefTokenManager {
  private tokens?: StoredTokens;
  private refreshTimer?: NodeJS.Timeout;
  private refreshCallback?: (refreshToken: string) => Promise<TokenInfo>;

  constructor() {}

  /**
   * Set refresh callback
   * 
   * This callback is called when tokens need to be refreshed.
   * 
   * @param callback - Function to refresh access token
   */
  setRefreshCallback(callback: (refreshToken: string) => Promise<TokenInfo>): void {
    this.refreshCallback = callback;
  }

  /**
   * Store tokens
   * 
   * @param tokens - Access and refresh tokens
   * @param companyId - Company ID
   * @param contextType - Context type (nip, pesel, etc.)
   * @param contextValue - Context value
   */
  storeTokens(
    tokens: AuthTokens,
    companyId: string,
    contextType: string,
    contextValue: string
  ): void {
    this.tokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      companyId,
      contextType,
      contextValue
    };

    console.log('[TokenManager] Tokens stored:', {
      companyId,
      contextType,
      accessTokenExpiresIn: tokens.accessToken.expiresIn,
      refreshTokenExpiresIn: tokens.refreshToken.expiresIn
    });

    // Schedule automatic refresh
    this.scheduleRefresh();
  }

  /**
   * Get valid access token
   * 
   * Returns current token if valid, otherwise refreshes automatically.
   * 
   * @returns Valid access token
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      throw new Error('No tokens available. Please authenticate first.');
    }

    // Check if token is expiring soon (within 5 minutes)
    if (this.isExpiringSoon(this.tokens.accessToken)) {
      console.log('[TokenManager] Access token expiring soon, refreshing...');
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken.token;
  }

  /**
   * Get stored tokens
   * 
   * @returns Stored tokens or undefined
   */
  getTokens(): StoredTokens | undefined {
    return this.tokens;
  }

  /**
   * Check if token is expiring soon
   * 
   * @param token - Token to check
   * @param thresholdMinutes - Threshold in minutes (default: 5)
   * @returns true if expiring within threshold
   */
  private isExpiringSoon(token: TokenInfo, thresholdMinutes: number = 5): boolean {
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 60000;

    return minutesUntilExpiry < thresholdMinutes;
  }

  /**
   * Check if token is expired
   * 
   * @param token - Token to check
   * @returns true if expired
   */
  private isExpired(token: TokenInfo): boolean {
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    return now >= expiresAt;
  }

  /**
   * Refresh access token
   * 
   * Uses refresh token to get new access token.
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.tokens) {
      throw new Error('No tokens available');
    }

    if (!this.refreshCallback) {
      throw new Error('Refresh callback not set. Call setRefreshCallback() first.');
    }

    // Check if refresh token is expired
    if (this.isExpired(this.tokens.refreshToken)) {
      console.error('[TokenManager] Refresh token expired. Re-authentication required.');
      this.clearTokens();
      throw new Error('Refresh token expired. Please re-authenticate.');
    }

    try {
      console.log('[TokenManager] Refreshing access token...');

      const newAccessToken = await this.refreshCallback(this.tokens.refreshToken.token);

      // Update access token
      this.tokens.accessToken = newAccessToken;

      console.log('[TokenManager] Access token refreshed successfully:', {
        expiresIn: newAccessToken.expiresIn
      });

      // Reschedule next refresh
      this.scheduleRefresh();

    } catch (error) {
      console.error('[TokenManager] Failed to refresh access token:', error);
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Schedule automatic token refresh
   * 
   * Schedules refresh 5 minutes before token expiry.
   */
  private scheduleRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    if (!this.tokens) {
      return;
    }

    const now = new Date();
    const expiresAt = new Date(this.tokens.accessToken.expiresAt);
    const refreshAt = new Date(expiresAt.getTime() - 5 * 60 * 1000); // 5 minutes before expiry

    const delay = refreshAt.getTime() - now.getTime();

    if (delay <= 0) {
      // Token already needs refresh
      console.log('[TokenManager] Token needs immediate refresh');
      this.refreshAccessToken().catch(error => {
        console.error('[TokenManager] Scheduled refresh failed:', error);
      });
      return;
    }

    console.log('[TokenManager] Scheduled refresh in', Math.round(delay / 60000), 'minutes');

    this.refreshTimer = setTimeout(() => {
      console.log('[TokenManager] Executing scheduled refresh...');
      this.refreshAccessToken().catch(error => {
        console.error('[TokenManager] Scheduled refresh failed:', error);
      });
    }, delay);
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.tokens = undefined;
    console.log('[TokenManager] Tokens cleared');
  }

  /**
   * Get token status
   * 
   * @returns Token status information
   */
  getTokenStatus(): {
    hasTokens: boolean;
    accessTokenValid?: boolean;
    refreshTokenValid?: boolean;
    accessTokenExpiresIn?: number;
    refreshTokenExpiresIn?: number;
  } {
    if (!this.tokens) {
      return { hasTokens: false };
    }

    const now = new Date();
    const accessExpiresAt = new Date(this.tokens.accessToken.expiresAt);
    const refreshExpiresAt = new Date(this.tokens.refreshToken.expiresAt);

    return {
      hasTokens: true,
      accessTokenValid: now < accessExpiresAt,
      refreshTokenValid: now < refreshExpiresAt,
      accessTokenExpiresIn: Math.max(0, Math.floor((accessExpiresAt.getTime() - now.getTime()) / 1000)),
      refreshTokenExpiresIn: Math.max(0, Math.floor((refreshExpiresAt.getTime() - now.getTime()) / 1000))
    };
  }

  /**
   * Destroy token manager
   * 
   * Clears tokens and timers.
   */
  destroy(): void {
    this.clearTokens();
    this.refreshCallback = undefined;
    console.log('[TokenManager] Destroyed');
  }
}
