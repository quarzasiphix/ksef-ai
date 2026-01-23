import { createClient } from '@supabase/supabase-js';
import { KsefCredentials, KsefEnvironment } from './types';

export class KsefAuthService {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async saveToken(
    businessProfileId: string,
    token: string,
    environment: KsefEnvironment,
    expiresAt?: Date
  ): Promise<void> {
    const encryptedToken = await this.encryptToken(token);

    const { error } = await this.supabase
      .from('business_profiles')
      .update({
        ksef_token_encrypted: encryptedToken,
        ksef_environment: environment,
        ksef_token_expires_at: expiresAt?.toISOString(),
        ksef_enabled: true,
      })
      .eq('id', businessProfileId);

    if (error) {
      throw new Error(`Failed to save KSeF token: ${error.message}`);
    }
  }

  async getToken(businessProfileId: string): Promise<KsefCredentials | null> {
    const { data, error } = await this.supabase
      .from('business_profiles')
      .select('ksef_token_encrypted, ksef_environment, ksef_token_expires_at, ksef_enabled')
      .eq('id', businessProfileId)
      .single();

    if (error || !data) {
      return null;
    }

    if (!data.ksef_enabled || !data.ksef_token_encrypted) {
      return null;
    }

    const token = await this.decryptToken(data.ksef_token_encrypted);

    return {
      businessProfileId,
      token,
      environment: data.ksef_environment as KsefEnvironment,
      expiresAt: data.ksef_token_expires_at ? new Date(data.ksef_token_expires_at) : undefined,
    };
  }

  async validateToken(businessProfileId: string): Promise<boolean> {
    const credentials = await this.getToken(businessProfileId);

    if (!credentials) {
      return false;
    }

    if (credentials.expiresAt && credentials.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  async revokeToken(businessProfileId: string): Promise<void> {
    const { error } = await this.supabase
      .from('business_profiles')
      .update({
        ksef_token_encrypted: null,
        ksef_token_expires_at: null,
        ksef_enabled: false,
      })
      .eq('id', businessProfileId);

    if (error) {
      throw new Error(`Failed to revoke KSeF token: ${error.message}`);
    }
  }

  async isKsefEnabled(businessProfileId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('business_profiles')
      .select('ksef_enabled')
      .eq('id', businessProfileId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.ksef_enabled === true;
  }

  private async encryptToken(token: string): Promise<string> {
    return Buffer.from(token).toString('base64');
  }

  private async decryptToken(encryptedToken: string): Promise<string> {
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
  }
}
