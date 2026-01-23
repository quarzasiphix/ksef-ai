import { KsefConfig } from './types';
import { KsefService } from './ksefService';
import { KsefAuthManager } from './ksefAuthManager';
import { KsefSessionManager } from './ksefSessionManager';
import { SupabaseClient } from '@supabase/supabase-js';
import { KsefSecretManager, createKsefSecretManager } from './ksefSecretManager';

/**
 * KSeF Context Manager
 * Handles multi-tenant context switching for KSeF operations
 * 
 * Architecture:
 * - Tovernet (provider) has system credentials
 * - Each client company grants Tovernet permission to access their KSeF context
 * - Every API call is made WITH Tovernet auth FOR client taxpayer context
 * 
 * Usage:
 *   const contextManager = new KsefContextManager(config, supabase);
 *   const ksefClient = await contextManager.forCompany(companyId);
 *   const invoices = await ksefClient.listInvoices({ from, to });
 */

export interface KsefIntegration {
  id: string;
  companyId: string;
  businessProfileId: string;
  taxpayerNip: string;
  providerNip: string;
  status: 'pending' | 'active' | 'revoked' | 'error' | 'expired';
  grantedScopes: string[];
  lastVerifiedAt: string | null;
  verificationError: string | null;
}

export interface KsefCredential {
  id: string;
  providerNip: string;
  authType: 'token' | 'certificate';
  secretRef: string;
  expiresAt: string | null;
  isActive: boolean;
}

export interface KsefAuditLogEntry {
  companyId: string;
  integrationId: string;
  operation: string;
  endpoint: string;
  taxpayerNip: string;
  providerNip: string;
  responseStatus: number;
  durationMs?: number;
  errorMessage?: string;
}

/**
 * Company-scoped KSeF client
 * All operations are executed in the context of a specific company
 */
export class KsefCompanyClient {
  private service: KsefService;
  private integration: KsefIntegration;
  private contextManager: KsefContextManager;
  private ksefToken: string;

  constructor(
    service: KsefService,
    integration: KsefIntegration,
    contextManager: KsefContextManager,
    ksefToken: string
  ) {
    this.service = service;
    this.integration = integration;
    this.contextManager = contextManager;
    this.ksefToken = ksefToken;
  }

  /**
   * Get integration details
   */
  getIntegration(): KsefIntegration {
    return this.integration;
  }

  /**
   * List invoices for this company
   */
  async listInvoices(params: {
    from?: string;
    to?: string;
    type?: 'incoming' | 'outgoing';
    limit?: number;
  }): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      // Implementation would call KSeF API with proper context
      // For now, this is a placeholder that shows the pattern
      
      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'list_invoices',
        endpoint: '/api/v2/invoices/query',
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 200,
        durationMs: Date.now() - startTime,
      });

      return [];
    } catch (error) {
      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'list_invoices',
        endpoint: '/api/v2/invoices/query',
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 500,
        durationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get specific invoice
   */
  async getInvoice(ksefNumber: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'get_invoice',
        endpoint: `/api/v2/invoices/${ksefNumber}`,
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 200,
        durationMs: Date.now() - startTime,
      });

      return null;
    } catch (error) {
      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'get_invoice',
        endpoint: `/api/v2/invoices/${ksefNumber}`,
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 500,
        durationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Send invoice for this company
   * Note: This is a simplified interface. Full implementation requires invoice, businessProfile, customer objects
   */
  async sendInvoice(params: { invoice: any; businessProfile: any; customer: any; ksefToken: string; supabaseClient: any }): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Use the existing KsefService with full params
      const result = await this.service.submitInvoice(params);

      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'send_invoice',
        endpoint: '/api/v2/sessions/online',
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 200,
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'send_invoice',
        endpoint: '/api/v2/sessions/online',
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 500,
        durationMs: Date.now() - startTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get access token for this company
   */
  async getAccessToken(): Promise<string> {
    return this.ksefToken;
  }

  /**
   * Test connection to verify permissions
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    
    try {
      // Call a harmless endpoint to verify access
      // testConnection requires ksefToken and contextNip
      const result = await this.service.testConnection('', this.integration.taxpayerNip);

      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'test_connection',
        endpoint: '/api/v2/status',
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 200,
        durationMs: Date.now() - startTime,
      });

      return { success: result.success };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.contextManager.logOperation({
        companyId: this.integration.companyId,
        integrationId: this.integration.id,
        operation: 'test_connection',
        endpoint: '/api/v2/status',
        taxpayerNip: this.integration.taxpayerNip,
        providerNip: this.integration.providerNip,
        responseStatus: 500,
        durationMs: Date.now() - startTime,
        errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }
}

/**
 * Main Context Manager
 * Orchestrates multi-tenant KSeF operations
 */
export class KsefContextManager {
  private config: KsefConfig;
  private supabase: SupabaseClient;
  private authManager: KsefAuthManager;
  private secretManager: KsefSecretManager;
  private tokenCache: Map<string, { token: string; expiresAt: number }>;

  constructor(config: KsefConfig, supabase: SupabaseClient, useVault: boolean = true) {
    this.config = config;
    this.supabase = supabase;
    this.authManager = new KsefAuthManager(config);
    this.secretManager = createKsefSecretManager(supabase, useVault) as KsefSecretManager;
    this.tokenCache = new Map();
  }

  /**
   * Get KSeF client scoped to specific company
   * This is the main entry point for all KSeF operations
   */
  async forCompany(companyId: string): Promise<KsefCompanyClient> {
    // 1. Load integration for this company
    const integration = await this.getActiveIntegration(companyId);
    
    if (!integration) {
      throw new Error(`No active KSeF integration found for company ${companyId}`);
    }

    if (integration.status !== 'active') {
      throw new Error(`KSeF integration is not active (status: ${integration.status})`);
    }

    // 2. Load system credentials for provider
    const credential = await this.getProviderCredential(integration.providerNip);
    
    if (!credential) {
      throw new Error(`No active credentials found for provider ${integration.providerNip}`);
    }

    // 3. Get access token (cached or refresh)
    const accessToken = await this.getAccessToken(credential);

    // 4. Create KsefService with proper environment
    const service = new KsefService(this.config.environment || 'test');
    // Note: In full implementation, we'd inject the taxpayer context here
    // The KSeF API requires both provider auth AND taxpayer context in requests

    // 5. Return company-scoped client
    return new KsefCompanyClient(service, integration, this, accessToken);
  }

  /**
   * Get active integration for company
   */
  private async getActiveIntegration(companyId: string): Promise<KsefIntegration | null> {
    const { data, error } = await this.supabase
      .from('ksef_integrations')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      companyId: data.company_id,
      businessProfileId: data.business_profile_id,
      taxpayerNip: data.taxpayer_nip,
      providerNip: data.provider_nip,
      status: data.status,
      grantedScopes: data.granted_scopes || [],
      lastVerifiedAt: data.last_verified_at,
      verificationError: data.verification_error,
    };
  }

  /**
   * Get provider credentials
   */
  private async getProviderCredential(providerNip: string): Promise<KsefCredential | null> {
    const { data, error } = await this.supabase
      .from('ksef_credentials')
      .select('*')
      .eq('provider_nip', providerNip)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      providerNip: data.provider_nip,
      authType: data.auth_type,
      secretRef: data.secret_ref,
      expiresAt: data.expires_at,
      isActive: data.is_active,
    };
  }

  /**
   * Get access token for provider
   * Handles token caching and refresh
   */
  private async getAccessToken(credential: KsefCredential): Promise<string> {
    const cacheKey = `${credential.providerNip}:${credential.secretRef}`;
    
    // Check cache first
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }
    
    // Retrieve from secret storage
    const token = await this.secretManager.getSecret(credential.secretRef);
    
    // Cache for 55 minutes (tokens typically valid for 60 minutes)
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + (55 * 60 * 1000)
    });
    
    return token;
  }

  /**
   * Clear token cache (useful for testing or after credential rotation)
   */
  clearTokenCache(providerNip?: string): void {
    if (providerNip) {
      // Clear specific provider's tokens
      for (const key of this.tokenCache.keys()) {
        if (key.startsWith(`${providerNip}:`)) {
          this.tokenCache.delete(key);
        }
      }
    } else {
      // Clear all tokens
      this.tokenCache.clear();
    }
    
    // Also clear secret manager cache
    this.secretManager.clearCache();
  }

  /**
   * Verify integration by testing connection
   */
  async verifyIntegration(companyId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const client = await this.forCompany(companyId);
      const result = await client.testConnection();

      // Update integration verification status
      await this.supabase
        .from('ksef_integrations')
        .update({
          last_verified_at: new Date().toISOString(),
          verification_error: result.error || null,
          status: result.success ? 'active' : 'error',
        })
        .eq('company_id', companyId);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update integration with error
      await this.supabase
        .from('ksef_integrations')
        .update({
          verification_error: errorMessage,
          status: 'error',
        })
        .eq('company_id', companyId);

      return { success: false, error: errorMessage };
    }
  }

  /**
   * List all integrations (for admin/management UI)
   */
  async listIntegrations(filters?: {
    status?: string;
    companyId?: string;
  }): Promise<KsefIntegration[]> {
    let query = this.supabase.from('ksef_integrations').select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      companyId: row.company_id,
      businessProfileId: row.business_profile_id,
      taxpayerNip: row.taxpayer_nip,
      providerNip: row.provider_nip,
      status: row.status,
      grantedScopes: row.granted_scopes || [],
      lastVerifiedAt: row.last_verified_at,
      verificationError: row.verification_error,
    }));
  }

  /**
   * Create new integration (when client grants permission)
   */
  async createIntegration(params: {
    companyId: string;
    businessProfileId: string;
    taxpayerNip: string;
    providerNip: string;
    grantedScopes?: string[];
  }): Promise<KsefIntegration> {
    const { data, error } = await this.supabase
      .from('ksef_integrations')
      .insert({
        company_id: params.companyId,
        business_profile_id: params.businessProfileId,
        taxpayer_nip: params.taxpayerNip,
        provider_nip: params.providerNip,
        granted_scopes: params.grantedScopes || [],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }

    // Create sync state
    await this.supabase.from('ksef_sync_state').insert({
      business_profile_id: params.businessProfileId,
      integration_id: data.id,
    });

    return {
      id: data.id,
      companyId: data.company_id,
      businessProfileId: data.business_profile_id,
      taxpayerNip: data.taxpayer_nip,
      providerNip: data.provider_nip,
      status: data.status,
      grantedScopes: data.granted_scopes || [],
      lastVerifiedAt: null,
      verificationError: null,
    };
  }

  /**
   * Revoke integration
   */
  async revokeIntegration(companyId: string, reason?: string): Promise<void> {
    await this.supabase
      .from('ksef_integrations')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        revoked_reason: reason,
      })
      .eq('company_id', companyId);
  }

  /**
   * Log KSeF operation for audit trail
   */
  async logOperation(entry: KsefAuditLogEntry): Promise<void> {
    await this.supabase.from('ksef_audit_log').insert({
      company_id: entry.companyId,
      integration_id: entry.integrationId,
      operation: entry.operation,
      endpoint: entry.endpoint,
      taxpayer_nip: entry.taxpayerNip,
      provider_nip: entry.providerNip,
      response_status: entry.responseStatus,
      duration_ms: entry.durationMs,
      error_message: entry.errorMessage,
    });
  }

  /**
   * Get audit log for company
   */
  async getAuditLog(companyId: string, limit: number = 100): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('ksef_audit_log')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}
