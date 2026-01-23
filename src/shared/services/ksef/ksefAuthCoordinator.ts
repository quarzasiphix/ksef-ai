import { KsefAuthManager } from './ksefAuthManager';
import { KsefCryptographyService } from './ksefCryptographyService';
import { KsefCertificateFetcher } from './ksefCertificateFetcher';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * KSeF Authentication Coordinator
 * 
 * High-level orchestration service for KSeF authentication flows.
 * Based on official C# implementation pattern from CIRFMF.
 * 
 * Simplifies complex multi-step authentication by providing single-method entry points.
 */

export interface AuthTokens {
  accessToken: {
    token: string;
    expiresIn: number;
    expiresAt: Date;
  };
  refreshToken: {
    token: string;
    expiresIn: number;
    expiresAt: Date;
  };
}

export interface AuthStatus {
  code: number;
  description: string;
  details?: string[];
}

export type ContextIdentifierType = 'nip' | 'pesel' | 'krs' | 'onip';
export type EncryptionMethod = 'rsa' | 'ecdsa';

export interface AuthorizationPolicy {
  onClientIpChange?: 'terminate' | 'continue';
  allowedIps?: {
    ip4Addresses?: string[];
    ip4Ranges?: string[];
    ip4Masks?: string[];
  };
}

/**
 * Authentication Coordinator Service
 * 
 * Orchestrates the complete KSeF authentication flow:
 * 1. Get challenge
 * 2. Encrypt token
 * 3. Submit request
 * 4. Poll for completion
 * 5. Redeem access token
 */
export class KsefAuthCoordinator {
  private authManager: KsefAuthManager;
  private cryptoService: KsefCryptographyService;
  private certificateFetcher: KsefCertificateFetcher;
  private baseUrl: string;

  constructor(
    baseUrl: string,
    private supabase: SupabaseClient
  ) {
    this.baseUrl = baseUrl;
    
    // Determine environment from URL
    const environment = baseUrl.includes('test') ? 'test' : 'production';
    
    // Create KsefConfig
    const config = {
      environment: environment as 'test' | 'production',
      baseUrl,
      apiUrl: baseUrl,
      systemInfo: 'KSeF Client v2.0',
      namespace: 'http://ksef.mf.gov.pl/schema/gtw/svc/online/types/2021/10/01/0001',
      schemaVersion: '2.0'
    };
    
    this.authManager = new KsefAuthManager(config);
    this.cryptoService = new KsefCryptographyService();
    this.certificateFetcher = new KsefCertificateFetcher(baseUrl);
  }

  /**
   * Initialize cryptography service with public keys
   * 
   * Fetches public keys from KSeF API and initializes crypto service.
   * Call this before using encryption methods.
   */
  async initialize(): Promise<void> {
    const publicKeys = await this.certificateFetcher.fetchPublicKeys();
    await this.cryptoService.initialize(publicKeys);
    console.log('[AuthCoordinator] Initialized with public keys');
  }

  /**
   * Authenticate using KSeF token
   * 
   * Complete authentication flow in a single method call.
   * Based on C# AuthCoordinator.AuthKsefTokenAsync implementation.
   * 
   * @param contextType - Type of context identifier (nip, pesel, krs, onip)
   * @param contextValue - Value of context identifier (e.g., "1234567890")
   * @param ksefToken - KSeF token to authenticate with
   * @param encryptionMethod - Encryption method to use (ecdsa recommended)
   * @param authorizationPolicy - Optional IP restrictions
   * @returns Access and refresh tokens
   */
  async authenticateWithKsefToken(
    contextType: ContextIdentifierType,
    contextValue: string,
    ksefToken: string,
    encryptionMethod: EncryptionMethod = 'ecdsa',
    authorizationPolicy?: AuthorizationPolicy
  ): Promise<AuthTokens> {
    try {
      // Validate context
      this.validateContext(contextType, contextValue);

      // 1. Get challenge and timestamp
      console.log('[AuthCoordinator] Step 1: Getting challenge...');
      const challengeResponse = await this.authManager.getAuthChallenge();
      const challenge = challengeResponse.challenge;
      const timestampMs = new Date(challengeResponse.timestamp).getTime();

      console.log('[AuthCoordinator] Challenge received:', {
        challengeLength: challenge.length,
        timestamp: timestampMs
      });

      // 2. Create token|timestamp string
      const tokenWithTimestamp = `${ksefToken}|${timestampMs}`;
      console.log('[AuthCoordinator] Step 2: Created token with timestamp');

      // 3. Encrypt with selected method
      console.log(`[AuthCoordinator] Step 3: Encrypting with ${encryptionMethod.toUpperCase()}...`);
      const encryptedToken = encryptionMethod === 'ecdsa'
        ? await this.cryptoService.encryptWithECDSA(tokenWithTimestamp)
        : await this.cryptoService.encryptWithRSA(tokenWithTimestamp);

      console.log('[AuthCoordinator] Token encrypted successfully');

      // 4. Build request
      const authRequest = {
        challenge,
        contextIdentifier: {
          type: contextType,
          value: contextValue
        },
        encryptedToken,
        authorizationPolicy
      };

      // 5. Submit to KSeF
      console.log('[AuthCoordinator] Step 4: Submitting auth request...');
      const submissionResponse = await this.authManager.authenticateWithKsefToken(authRequest);

      console.log('[AuthCoordinator] Auth request submitted:', {
        referenceNumber: submissionResponse.referenceNumber,
        hasAuthToken: !!submissionResponse.authenticationToken
      });

      // 6. Poll for completion (1 second intervals, 2 minute timeout)
      console.log('[AuthCoordinator] Step 5: Polling for completion...');
      await this.pollForAuthCompletion(
        submissionResponse.referenceNumber,
        submissionResponse.authenticationToken,
        120000 // 2 minutes
      );

      console.log('[AuthCoordinator] Authentication completed successfully');

      // 7. Redeem access token
      console.log('[AuthCoordinator] Step 6: Redeeming access token...');
      const tokensResponse = await this.authManager.redeemToken(
        submissionResponse.authenticationToken
      );

      console.log('[AuthCoordinator] Tokens redeemed successfully');

      // 8. Return tokens in standardized format
      return {
        accessToken: {
          token: tokensResponse.accessToken.token,
          expiresIn: tokensResponse.accessToken.expiresIn,
          expiresAt: new Date(Date.now() + tokensResponse.accessToken.expiresIn * 1000)
        },
        refreshToken: {
          token: tokensResponse.refreshToken.token,
          expiresIn: tokensResponse.refreshToken.expiresIn,
          expiresAt: new Date(Date.now() + tokensResponse.refreshToken.expiresIn * 1000)
        }
      };

    } catch (error) {
      console.error('[AuthCoordinator] Authentication failed:', error);
      throw new Error(`KSeF authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate using XAdES signature
   * 
   * Production authentication method using qualified certificate.
   * Based on C# AuthCoordinator.AuthAsync implementation.
   * 
   * @param contextType - Type of context identifier
   * @param contextValue - Value of context identifier
   * @param identifierType - Subject identifier type
   * @param xmlSigner - Function to sign XML with XAdES
   * @param authorizationPolicy - Optional IP restrictions
   * @returns Access and refresh tokens
   */
  async authenticateWithXAdES(
    contextType: ContextIdentifierType,
    contextValue: string,
    identifierType: 'onip' | 'nip',
    xmlSigner: (unsignedXml: string) => Promise<string>,
    authorizationPolicy?: AuthorizationPolicy
  ): Promise<AuthTokens> {
    try {
      // Validate context
      this.validateContext(contextType, contextValue);

      // 1. Get challenge
      console.log('[AuthCoordinator] Step 1: Getting challenge...');
      const challengeResponse = await this.authManager.getAuthChallenge();
      const challenge = challengeResponse.challenge;

      // 2. Build AuthenticationTokenRequest XML
      const unsignedXml = this.buildAuthTokenRequestXml(
        challenge,
        contextType,
        contextValue,
        identifierType,
        authorizationPolicy
      );

      console.log('[AuthCoordinator] Step 2: Built unsigned XML');

      // 3. Sign XML with XAdES
      console.log('[AuthCoordinator] Step 3: Signing XML with XAdES...');
      const signedXml = await xmlSigner(unsignedXml);

      console.log('[AuthCoordinator] XML signed successfully');

      // 4. Submit signed XML
      console.log('[AuthCoordinator] Step 4: Submitting signed XML...');
      const submissionResponse = await this.authManager.submitSignedAuthRequest(
        signedXml,
        false // verifyCertificateChain
      );

      console.log('[AuthCoordinator] Signed XML submitted:', {
        referenceNumber: submissionResponse.referenceNumber
      });

      // 5. Poll for completion
      console.log('[AuthCoordinator] Step 5: Polling for completion...');
      await this.pollForAuthCompletion(
        submissionResponse.referenceNumber,
        submissionResponse.authenticationToken,
        120000
      );

      // 6. Redeem tokens
      console.log('[AuthCoordinator] Step 6: Redeeming tokens...');
      const tokensResponse = await this.authManager.redeemToken(
        submissionResponse.authenticationToken
      );

      return {
        accessToken: {
          token: tokensResponse.accessToken.token,
          expiresIn: tokensResponse.accessToken.expiresIn,
          expiresAt: new Date(Date.now() + tokensResponse.accessToken.expiresIn * 1000)
        },
        refreshToken: {
          token: tokensResponse.refreshToken.token,
          expiresIn: tokensResponse.refreshToken.expiresIn,
          expiresAt: new Date(Date.now() + tokensResponse.refreshToken.expiresIn * 1000)
        }
      };

    } catch (error) {
      console.error('[AuthCoordinator] XAdES authentication failed:', error);
      throw new Error(`KSeF XAdES authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * 
   * @param refreshToken - Refresh token
   * @returns New access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens['accessToken']> {
    try {
      console.log('[AuthCoordinator] Refreshing access token...');
      
      const response = await this.authManager.refreshAccessToken(refreshToken);

      console.log('[AuthCoordinator] Access token refreshed successfully');

      return {
        token: response.accessToken.token,
        expiresIn: response.accessToken.expiresIn,
        expiresAt: new Date(Date.now() + response.accessToken.expiresIn * 1000)
      };

    } catch (error) {
      console.error('[AuthCoordinator] Token refresh failed:', error);
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll for authentication completion
   * 
   * Checks auth status every 1 second until success or timeout.
   * Based on C# WaitForAuthCompletionAsync implementation.
   * 
   * @param referenceNumber - Auth operation reference number
   * @param authToken - Authentication token
   * @param timeoutMs - Timeout in milliseconds (default: 2 minutes)
   */
  private async pollForAuthCompletion(
    referenceNumber: string,
    authToken: string,
    timeoutMs: number = 120000
  ): Promise<void> {
    const startTime = Date.now();
    let attempts = 0;

    while (Date.now() - startTime < timeoutMs) {
      attempts++;
      
      try {
        const status = await this.authManager.getAuthStatus(referenceNumber, authToken);

        console.log(`[AuthCoordinator] Poll attempt ${attempts}:`, {
          code: status.code,
          description: status.description
        });

        // Success (200)
        if (status.code === 200) {
          console.log('[AuthCoordinator] Authentication successful');
          return;
        }

        // Client error (4xx) - stop immediately
        if (status.code >= 400 && status.code < 500) {
          const details = status.details?.join(', ') || 'no details';
          throw new Error(
            `KSeF auth error. Status: ${status.code}, ` +
            `Description: ${status.description}, Details: ${details}`
          );
        }

        // Processing (100) or other - wait and retry
        console.log(`[AuthCoordinator] Status ${status.code}, waiting 1 second...`);
        await this.sleep(1000);

      } catch (error) {
        // If it's our thrown error, re-throw
        if (error instanceof Error && error.message.includes('KSeF auth error')) {
          throw error;
        }
        
        // Network error - log and retry
        console.warn(`[AuthCoordinator] Poll error (attempt ${attempts}):`, error);
        await this.sleep(1000);
      }
    }

    // Timeout
    throw new Error(
      `Authentication timeout after ${timeoutMs / 1000} seconds. ` +
      `Reference: ${referenceNumber}`
    );
  }

  /**
   * Validate context identifier
   * 
   * @param type - Context type
   * @param value - Context value
   */
  private validateContext(type: ContextIdentifierType, value: string): void {
    const validators: Record<ContextIdentifierType, RegExp> = {
      nip: /^\d{10}$/,
      onip: /^\d{10}$/,
      pesel: /^\d{11}$/,
      krs: /^\d{10}$/
    };

    const validator = validators[type];
    if (!validator) {
      throw new Error(`Unknown context type: ${type}`);
    }

    if (!validator.test(value)) {
      throw new Error(
        `Invalid ${type.toUpperCase()}: ${value}. ` +
        `Expected format: ${validator.source}`
      );
    }
  }

  /**
   * Build AuthenticationTokenRequest XML
   * 
   * @param challenge - Challenge from KSeF
   * @param contextType - Context identifier type
   * @param contextValue - Context identifier value
   * @param identifierType - Subject identifier type
   * @param authorizationPolicy - Optional authorization policy
   * @returns Unsigned XML string
   */
  private buildAuthTokenRequestXml(
    challenge: string,
    contextType: ContextIdentifierType,
    contextValue: string,
    identifierType: 'onip' | 'nip',
    authorizationPolicy?: AuthorizationPolicy
  ): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuthenticationTokenRequest xmlns="http://ksef.mf.gov.pl/schema/gtw/svc/online/auth/request/2021/10/01/0001">
  <Challenge>${challenge}</Challenge>
  <ContextIdentifier>
    <Type>${contextType}</Type>
    <Identifier>${contextValue}</Identifier>
  </ContextIdentifier>
  <SubjectIdentifierType>${identifierType}</SubjectIdentifierType>`;

    if (authorizationPolicy) {
      xml += '\n  <AuthorizationPolicy>';
      
      if (authorizationPolicy.onClientIpChange) {
        xml += `\n    <OnClientIpChange>${authorizationPolicy.onClientIpChange}</OnClientIpChange>`;
      }
      
      if (authorizationPolicy.allowedIps) {
        xml += '\n    <AllowedIps>';
        
        if (authorizationPolicy.allowedIps.ip4Addresses) {
          authorizationPolicy.allowedIps.ip4Addresses.forEach(ip => {
            xml += `\n      <Ip4Address>${ip}</Ip4Address>`;
          });
        }
        
        if (authorizationPolicy.allowedIps.ip4Ranges) {
          authorizationPolicy.allowedIps.ip4Ranges.forEach(range => {
            xml += `\n      <Ip4Range>${range}</Ip4Range>`;
          });
        }
        
        if (authorizationPolicy.allowedIps.ip4Masks) {
          authorizationPolicy.allowedIps.ip4Masks.forEach(mask => {
            xml += `\n      <Ip4Mask>${mask}</Ip4Mask>`;
          });
        }
        
        xml += '\n    </AllowedIps>';
      }
      
      xml += '\n  </AuthorizationPolicy>';
    }

    xml += '\n</AuthenticationTokenRequest>';

    return xml;
  }

  /**
   * Sleep for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
