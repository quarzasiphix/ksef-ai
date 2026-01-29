/**
 * KSEF Token Generator
 * 
 * Generates proper KSEF 2.0 tokens for authentication
 */

import { KsefConfig } from './types';

export interface KsefTokenRequest {
  permissions: string[];
  description: string;
}

export interface KsefTokenResponse {
  referenceNumber: string;
  token: string;
  status: string;
  dateCreated: string;
  requestedPermissions: string[];
}

export class KsefTokenGenerator {
  private config: KsefConfig;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  /**
   * Generate a new KSEF 2.0 token
   */
  async generateKsefToken(
    accessToken: string,
    permissions: string[] = ["InvoiceRead", "InvoiceWrite", "CredentialsRead", "CredentialsManage"],
    description: string = "Token generated for KsiegaI integration"
  ): Promise<KsefTokenResponse> {
    console.log('🔑 Generating KSEF 2.0 token...');
    console.log('🔑 Permissions:', permissions);
    console.log('🔑 Description:', description);

    const tokenRequest: KsefTokenRequest = {
      permissions,
      description
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'KsiegaI/1.0'
        },
        body: JSON.stringify(tokenRequest),
        mode: 'cors'
      });

      console.log('🔑 Token generation response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token generation failed:', errorText);
        throw new Error(`Token generation failed: ${response.status} ${response.statusText}`);
      }

      const tokenData = await response.json();
      console.log('🔑 KSEF token generated successfully:', {
        referenceNumber: tokenData.referenceNumber,
        tokenLength: tokenData.token?.length || 0,
        status: tokenData.status
      });

      return tokenData;
    } catch (error) {
      console.error('❌ KSEF token generation error:', error);
      throw new Error(`Failed to generate KSEF token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check token status
   */
  async getTokenStatus(referenceNumber: string, accessToken: string): Promise<any> {
    console.log('🔍 Checking token status for:', referenceNumber);

    try {
      const response = await fetch(`${this.config.baseUrl}/tokens/${referenceNumber}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'KsiegaI/1.0'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`Failed to check token status: ${response.status} ${response.statusText}`);
      }

      const statusData = await response.json();
      console.log('🔍 Token status:', statusData.status);

      return statusData;
    } catch (error) {
      console.error('❌ Token status check error:', error);
      throw error;
    }
  }
}
