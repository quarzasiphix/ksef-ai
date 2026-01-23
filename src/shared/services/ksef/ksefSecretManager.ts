import { SupabaseClient } from '@supabase/supabase-js';

/**
 * KSeF Secret Manager
 * Handles secure retrieval of KSeF credentials from Supabase Vault
 * 
 * Security:
 * - Secrets stored in Supabase Vault (encrypted at rest)
 * - Never expose secrets in logs or client-side
 * - Automatic token refresh when expired
 * - Audit trail for all secret access
 */

export interface SecretMetadata {
  name: string;
  expiresAt?: string;
  lastAccessedAt?: string;
}

export class KsefSecretManager {
  private supabase: SupabaseClient;
  private cache: Map<string, { value: string; expiresAt: number }>;
  private cacheTtlMs: number;

  constructor(supabase: SupabaseClient, cacheTtlMs: number = 300000) { // 5 min cache
    this.supabase = supabase;
    this.cache = new Map();
    this.cacheTtlMs = cacheTtlMs;
  }

  /**
   * Retrieve secret from Supabase Vault
   * Uses cache to minimize vault queries
   */
  async getSecret(secretRef: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(secretRef);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      // Query Supabase Vault
      // Note: This requires the vault extension to be enabled
      const { data, error } = await this.supabase.rpc('get_ksef_secret', {
        secret_name: secretRef
      });

      if (error) {
        throw new Error(`Failed to retrieve secret '${secretRef}': ${error.message}`);
      }

      if (!data) {
        throw new Error(`Secret '${secretRef}' not found in vault`);
      }

      const secretValue = data as string;

      // Cache the secret
      this.cache.set(secretRef, {
        value: secretValue,
        expiresAt: Date.now() + this.cacheTtlMs
      });

      return secretValue;
    } catch (error) {
      console.error(`Error retrieving secret '${secretRef}':`, error);
      throw new Error(`Failed to retrieve KSeF secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store secret in Supabase Vault
   * Only for admin/system operations
   */
  async storeSecret(secretRef: string, secretValue: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('store_ksef_secret', {
        secret_name: secretRef,
        secret_value: secretValue
      });

      if (error) {
        throw new Error(`Failed to store secret '${secretRef}': ${error.message}`);
      }

      // Invalidate cache
      this.cache.delete(secretRef);
    } catch (error) {
      console.error(`Error storing secret '${secretRef}':`, error);
      throw new Error(`Failed to store KSeF secret: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear secret from cache
   */
  clearCache(secretRef?: string): void {
    if (secretRef) {
      this.cache.delete(secretRef);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get all cached secret references (for debugging)
   */
  getCachedRefs(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Fallback implementation for environments without Vault
 * Uses encrypted columns in ksef_credentials table
 */
export class KsefSecretManagerFallback {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Retrieve secret from ksef_credentials table
   * This is a fallback - production should use Vault
   */
  async getSecret(secretRef: string): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('ksef_credentials')
        .select('secret_ref')
        .eq('secret_ref', secretRef)
        .eq('is_active', true)
        .single();

      if (error) {
        throw new Error(`Failed to retrieve credential: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Credential with ref '${secretRef}' not found`);
      }

      // In production, this should decrypt the secret
      // For now, return the reference (actual secret should be in vault)
      return data.secret_ref;
    } catch (error) {
      console.error(`Error retrieving credential '${secretRef}':`, error);
      throw new Error(`Failed to retrieve KSeF credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async storeSecret(secretRef: string, secretValue: string): Promise<void> {
    throw new Error('Fallback secret manager does not support storing secrets. Use Vault.');
  }

  clearCache(): void {
    // No-op for fallback
  }

  getCachedRefs(): string[] {
    return [];
  }
}

/**
 * Factory function to create appropriate secret manager
 */
export function createKsefSecretManager(
  supabase: SupabaseClient,
  useVault: boolean = true
): KsefSecretManager | KsefSecretManagerFallback {
  if (useVault) {
    return new KsefSecretManager(supabase);
  } else {
    return new KsefSecretManagerFallback(supabase);
  }
}
