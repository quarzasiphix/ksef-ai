/**
 * KSeF Certificate Fetcher Service
 * 
 * Dynamically fetches public keys from KSeF API.
 * Based on official C# ICertificateFetcher pattern.
 */

import type { KsefPublicKeys } from './ksefCryptographyService';

export interface CertificateInfo {
  type: 'ksef_token' | 'symmetric_key';
  certificate: string;
}

export interface CertificatesResponse {
  items: CertificateInfo[];
}

/**
 * Certificate Fetcher Service
 * 
 * Fetches and caches public keys from KSeF API.
 * Keys are cached with TTL to avoid excessive API calls.
 */
export class KsefCertificateFetcher {
  private cachedKeys?: KsefPublicKeys;
  private cacheTimestamp?: number;
  private readonly cacheTTL = 3600000; // 1 hour in milliseconds

  constructor(private baseUrl: string) {}

  /**
   * Fetch public keys from KSeF API
   * 
   * Returns cached keys if available and not expired.
   * Otherwise fetches fresh keys from API.
   * 
   * @param forceRefresh - Force refresh even if cache is valid
   * @returns Public keys for encryption
   */
  async fetchPublicKeys(forceRefresh: boolean = false): Promise<KsefPublicKeys> {
    // Check cache
    if (!forceRefresh && this.isCacheValid()) {
      console.log('[CertificateFetcher] Returning cached public keys');
      return this.cachedKeys!;
    }

    try {
      console.log('[CertificateFetcher] Fetching public keys from API...');

      const response = await fetch(`${this.baseUrl}/certificates/public-keys`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch certificates: ${response.status} ${response.statusText}`);
      }

      const data: CertificatesResponse = await response.json();

      console.log('[CertificateFetcher] Received certificates:', {
        count: data.items.length,
        types: data.items.map(c => c.type)
      });

      // Extract keys
      const ksefTokenCert = data.items.find(c => c.type === 'ksef_token');
      const symmetricKeyCert = data.items.find(c => c.type === 'symmetric_key');

      if (!ksefTokenCert || !symmetricKeyCert) {
        throw new Error('Missing required certificates from API response');
      }

      const publicKeys: KsefPublicKeys = {
        ksefTokenPem: ksefTokenCert.certificate,
        symmetricKeyPem: symmetricKeyCert.certificate
      };

      // Update cache
      this.cachedKeys = publicKeys;
      this.cacheTimestamp = Date.now();

      console.log('[CertificateFetcher] Public keys cached successfully');

      return publicKeys;

    } catch (error) {
      console.error('[CertificateFetcher] Failed to fetch public keys:', error);
      
      // If we have cached keys, return them as fallback
      if (this.cachedKeys) {
        console.warn('[CertificateFetcher] Using stale cached keys as fallback');
        return this.cachedKeys;
      }

      throw new Error(`Failed to fetch public keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if cached keys are still valid
   * 
   * @returns true if cache is valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedKeys || !this.cacheTimestamp) {
      return false;
    }

    const age = Date.now() - this.cacheTimestamp;
    return age < this.cacheTTL;
  }

  /**
   * Clear cached keys
   */
  clearCache(): void {
    this.cachedKeys = undefined;
    this.cacheTimestamp = undefined;
    console.log('[CertificateFetcher] Cache cleared');
  }

  /**
   * Get cache status
   * 
   * @returns Cache information
   */
  getCacheStatus(): { cached: boolean; age?: number; expiresIn?: number } {
    if (!this.cachedKeys || !this.cacheTimestamp) {
      return { cached: false };
    }

    const age = Date.now() - this.cacheTimestamp;
    const expiresIn = this.cacheTTL - age;

    return {
      cached: true,
      age,
      expiresIn: expiresIn > 0 ? expiresIn : 0
    };
  }
}
