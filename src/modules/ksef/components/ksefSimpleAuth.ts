/**
 * Simple KSEF Authentication Test
 * 
 * Tests different approaches to KSEF authentication
 */

export interface SimpleKsefConfig {
  baseUrl: string;
}

export class KsefSimpleAuth {
  private config: SimpleKsefConfig;

  constructor(config: SimpleKsefConfig) {
    this.config = config;
  }

  /**
   * Test authentication without encryption
   * This will help us understand if the issue is with encryption
   */
  async testWithoutEncryption(token: string, nip: string): Promise<any> {
    console.log('🔐 Testing KSEF auth without encryption...');
    
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/ksef-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        },
        body: JSON.stringify({
          challenge: 'test-challenge-12345',
          contextIdentifier: {
            type: 'nip',
            value: nip
          },
          encryptedToken: token // Try without encryption
        }),
        mode: 'cors'
      });

      console.log('🔐 Response status:', response.status);
      const data = await response.json();
      console.log('🔐 Response data:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }

  /**
   * Test with a simple base64 encoded token
   */
  async testWithBase64Token(token: string, nip: string): Promise<any> {
    console.log('🔐 Testing KSEF auth with base64 token...');
    
    try {
      const base64Token = btoa(token);
      console.log('🔐 Base64 token:', base64Token);
      
      const response = await fetch(`${this.config.baseUrl}/auth/ksef-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        },
        body: JSON.stringify({
          challenge: 'test-challenge-12345',
          contextIdentifier: {
            type: 'nip',
            value: nip
          },
          encryptedToken: base64Token
        }),
        mode: 'cors'
      });

      console.log('🔐 Response status:', response.status);
      const data = await response.json();
      console.log('🔐 Response data:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }

  /**
   * Test with just the token identifier
   */
  async testWithTokenIdentifier(token: string, nip: string): Promise<any> {
    console.log('🔐 Testing KSEF auth with token identifier...');
    
    try {
      const tokenParts = token.split('|');
      const tokenIdentifier = tokenParts[0];
      console.log('🔐 Token identifier:', tokenIdentifier);
      
      const response = await fetch(`${this.config.baseUrl}/auth/ksef-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'KsiegaI/1.0'
        },
        body: JSON.stringify({
          challenge: 'test-challenge-12345',
          contextIdentifier: {
            type: 'nip',
            value: nip
          },
          encryptedToken: tokenIdentifier
        }),
        mode: 'cors'
      });

      console.log('🔐 Response status:', response.status);
      const data = await response.json();
      console.log('🔐 Response data:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }
}
