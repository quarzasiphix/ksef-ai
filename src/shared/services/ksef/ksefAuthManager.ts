import { KsefConfig } from './types';

/**
 * KSeF Authentication Manager
 * Handles JWT-based authentication flow according to official KSeF 2.0 specification
 */
export class KsefAuthManager {
  private config: KsefConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  /**
   * Get authentication challenge
   * POST /auth/challenge
   */
  async getChallenge(): Promise<{
    challenge: string;
    timestamp: string;
  }> {
    const response = await fetch(`${this.config.baseUrl}/auth/challenge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get auth challenge');
    }

    return await response.json();
  }

  /**
   * Get authentication challenge (alias for AuthCoordinator)
   */
  async getAuthChallenge(): Promise<{
    challenge: string;
    timestamp: string;
  }> {
    return this.getChallenge();
  }

  /**
   * Authenticate with KSeF token (legacy method)
   * POST /auth/ksef-token
   */
  async authenticateWithKsefToken(
    requestOrToken: any,
    contextNip?: string
  ): Promise<{
    authenticationToken: string;
    referenceNumber: string;
  }> {
    let requestBody: any;

    // Support both old signature (token, nip) and new signature (request object)
    if (typeof requestOrToken === 'string' && contextNip) {
      // Old signature: authenticateWithKsefToken(token, nip)
      const challenge = await this.getChallenge();
      const encryptedToken = await this.encryptKsefToken(requestOrToken, challenge.timestamp);
      
      requestBody = {
        challenge: challenge.challenge,
        contextIdentifier: {
          type: 'Nip',
          value: contextNip,
        },
        encryptedToken: encryptedToken,
      };
    } else {
      // New signature: authenticateWithKsefToken(request)
      requestBody = requestOrToken;
    }

    const response = await fetch(`${this.config.baseUrl}/auth/ksef-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`KSeF token authentication failed: ${error.exception?.description || response.statusText}`);
    }

    const data = await response.json();

    return {
      authenticationToken: data.authenticationToken.token,
      referenceNumber: data.referenceNumber,
    };
  }

  /**
   * Check authentication status
   * GET /auth/{referenceNumber}
   */
  async checkAuthStatus(
    referenceNumber: string,
    authenticationToken: string
  ): Promise<{
    status: {
      code: number;
      description: string;
      details?: string[];
    };
  }> {
    const response = await fetch(`${this.config.baseUrl}/auth/${referenceNumber}`, {
      headers: {
        'Authorization': `Bearer ${authenticationToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to check auth status: ${error.exception?.description || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get authentication status (alias for AuthCoordinator)
   */
  async getAuthStatus(
    referenceNumber: string,
    authenticationToken: string
  ): Promise<{
    code: number;
    description: string;
    details?: string[];
  }> {
    const result = await this.checkAuthStatus(referenceNumber, authenticationToken);
    return result.status;
  }

  /**
   * Redeem authentication token for access token
   * POST /auth/token/redeem
   */
  async redeemToken(authenticationToken: string): Promise<{
    accessToken: {
      token: string;
      expiresIn: number;
    };
    refreshToken: {
      token: string;
      expiresIn: number;
    };
  }> {
    const response = await fetch(`${this.config.baseUrl}/auth/token/redeem`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authenticationToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to redeem token: ${error.exception?.description || response.statusText}`);
    }

    const data = await response.json();

    console.log('🔍 KSeF token redemption response:', data);

    // Handle different response structures
    let accessToken, refreshToken;
    
    if (data.accessToken && data.accessToken.token) {
      // Expected structure
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    } else if (data.access_token && data.refresh_token) {
      // Alternative structure
      accessToken = {
        token: data.access_token,
        validUntil: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : data.valid_until
      };
      refreshToken = {
        token: data.refresh_token,
        expires_in: data.refresh_expires_in || 86400
      };
    } else {
      throw new Error(`Unexpected token response structure: ${JSON.stringify(data)}`);
    }

    // Store tokens
    this.accessToken = accessToken.token;
    this.refreshToken = refreshToken.token;
    this.tokenExpiresAt = new Date(accessToken.validUntil);

    return {
      accessToken: {
        token: accessToken.token,
        expiresIn: accessToken.expiresIn || 3600,
      },
      refreshToken: {
        token: refreshToken.token,
        expiresIn: refreshToken.expiresIn || 86400,
      },
    };
  }

  /**
   * Refresh access token
   * POST /auth/token/refresh
   */
  async refreshAccessToken(refreshTokenParam?: string): Promise<{
    accessToken: {
      token: string;
      expiresIn: number;
    };
  }> {
    const tokenToUse = refreshTokenParam || this.refreshToken;
    
    if (!tokenToUse) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.config.baseUrl}/auth/token/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenToUse}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh token: ${error.exception?.description || response.statusText}`);
    }

    const data = await response.json();

    this.accessToken = data.accessToken.token;
    this.tokenExpiresAt = new Date(data.accessToken.validUntil);

    return {
      accessToken: {
        token: data.accessToken.token,
        expiresIn: data.accessToken.expiresIn || 3600
      }
    };
  }

  /**
   * Submit signed XAdES authentication request
   * POST /auth/token/signature
   */
  async submitSignedAuthRequest(
    signedXml: string,
    verifyCertificateChain: boolean = false
  ): Promise<{
    authenticationToken: string;
    referenceNumber: string;
  }> {
    const response = await fetch(
      `${this.config.baseUrl}/auth/token/signature?verifyCertificateChain=${verifyCertificateChain}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
        },
        body: signedXml,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to submit signed auth request: ${error.exception?.description || response.statusText}`);
    }

    const data = await response.json();

    return {
      authenticationToken: data.authenticationToken.token,
      referenceNumber: data.referenceNumber,
    };
  }

  /**
   * Complete authentication flow with KSeF token
   * Uses the proper implementation based on official KSeF clients
   */
  async authenticateComplete(
    ksefToken: string,
    contextNip: string,
    maxStatusChecks: number = 30,
    statusCheckDelayMs: number = 2000
  ): Promise<{
    accessToken: {
      token: string;
      expiresIn: number;
    };
    refreshToken: {
      token: string;
      expiresIn: number;
    };
  }> {
    console.log('🔐 Starting complete KSeF authentication flow...');
    
    // Use the proper authentication service
    const { KsefProperAuth } = await import('./ksefProperAuth');
    const properAuth = new KsefProperAuth(this.config);
    
    return await properAuth.authenticateWithKsefToken(
      ksefToken,
      contextNip,
      maxStatusChecks,
      statusCheckDelayMs
    );
  }

  /**
   * Encrypt KSeF token with timestamp using RSA-OAEP
   */
  private async encryptKsefToken(token: string, timestamp: string): Promise<string> {
    // Convert timestamp to milliseconds
    const timestampMs = new Date(timestamp).getTime();

    // Create token string: "{token}|{timestampMs}"
    const tokenWithTimestamp = `${token}|${timestampMs}`;

    // Get KSeF public key for token encryption
    const publicKey = await this.getPublicKeyForTokenEncryption();

    // Encrypt with RSA-OAEP
    const encoder = new TextEncoder();
    const data = encoder.encode(tokenWithTimestamp);

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      data
    );

    // Convert to Base64
    return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  }

  /**
   * Get KSeF public key for token encryption
   */
  private async getPublicKeyForTokenEncryption(): Promise<CryptoKey> {
    const response = await fetch(`${this.config.baseUrl}/security/public-key-certificates`);

    if (!response.ok) {
      throw new Error('Failed to fetch KSeF public key');
    }

    const certificates = await response.json();

    // Find certificate for KSeF token encryption
    const cert = certificates.find((c: any) =>
      c.usage?.includes('KsefTokenEncryption')
    );

    if (!cert) {
      throw new Error('No certificate found for KSeF token encryption');
    }

    // Parse certificate and extract public key
    const certPem = cert.certificate;
    const certDer = this.pemToDer(certPem);

    // Import RSA-OAEP public key
    return await crypto.subtle.importKey(
      'spki',
      certDer,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      false,
      ['encrypt']
    );
  }

  /**
   * Convert PEM certificate to DER format
   */
  private pemToDer(pem: string): ArrayBuffer {
    const b64 = pem
      .replace(/-----BEGIN CERTIFICATE-----/, '')
      .replace(/-----END CERTIFICATE-----/, '')
      .replace(/\s/g, '');

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Check if access token is expired or about to expire
   */
  isTokenExpired(bufferMinutes: number = 5): boolean {
    if (!this.tokenExpiresAt) {
      return true;
    }

    const now = new Date();
    const expiryWithBuffer = new Date(this.tokenExpiresAt.getTime() - bufferMinutes * 60 * 1000);

    return now >= expiryWithBuffer;
  }

  /**
   * Get access token, refreshing if needed
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.refreshAccessToken();
    }

    return this.accessToken!;
  }

  /**
   * Set tokens manually (e.g., from storage)
   */
  setTokens(accessToken: string, refreshToken: string, expiresAt: Date): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = expiresAt;
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;
  }
}
