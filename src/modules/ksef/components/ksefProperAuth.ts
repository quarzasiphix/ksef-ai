import { KsefConfig } from './types';

/**
 * Proper KSeF Authentication Service
 * Based on official KSeF client implementations (Java and C#)
 */
export class KsefProperAuth {
  private config: KsefConfig;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  /**
   * Get Supabase anonymous key for Edge Function authentication
   */
  private getSupabaseAnonKey(): string {
    // Try to get the key from the environment first (for Deno/Edge Runtime)
    try {
      // @ts-ignore - Deno might not be available in all environments
      if (typeof Deno !== 'undefined' && Deno.env.get('SUPABASE_ANON_KEY')) {
        // @ts-ignore
        return Deno.env.get('SUPABASE_ANON_KEY');
      }
    } catch (e) {
      // Deno not available, use fallback
    }
    
    // Fallback to hardcoded key for browser environment
    return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY3J6eGp5ZmZ4bWZibnhscXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MjQ5MjAsImV4cCI6MjA2MzAwMDkyMH0.stheZYA6jcCAjOi-c4NPLBe3Jxfv3Rs9LWk8JTqBS8s';
  }

/**
   * Complete KSeF authentication flow using token
   * Follows the official pattern from KSeF client implementations
   */
  async authenticateWithKsefToken(
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
    console.log('🔐 Starting KSeF authentication flow...');

    try {
      // Step 1: Get challenge
      const challenge = await this.getChallenge();
      console.log('📋 Got challenge:', challenge.challenge);
      console.log('📋 Challenge timestamp:', challenge.timestamp);

      // Step 2: Add timestamp to token (use challenge timestamp with detailed logging)
      let timestampMs: number;
      
      if (!challenge.timestamp) {
        console.error('❌ Challenge timestamp is undefined');
        throw new Error('Challenge timestamp is undefined');
      }
      
      console.log('📋 Raw challenge timestamp:', challenge.timestamp);
      console.log('📋 Challenge timestamp type:', typeof challenge.timestamp);
      console.log('📋 Challenge timestamp length:', challenge.timestamp?.length);
      
      try {
        // Try parsing as ISO string first
        const challengeDate = new Date(challenge.timestamp);
        console.log('📋 Parsed date object:', challengeDate);
        console.log('📋 Date is valid:', !isNaN(challengeDate.getTime()));
        console.log('📋 Date getTime():', challengeDate.getTime());
        
        if (!isNaN(challengeDate.getTime())) {
          timestampMs = challengeDate.getTime();
          console.log('✅ Using challenge timestamp (ms):', timestampMs);
          console.log('✅ Timestamp as string:', String(timestampMs));
          console.log('✅ Timestamp length:', String(timestampMs).length);
        } else {
          // Try parsing as Unix timestamp (seconds)
          const timestampNum = parseInt(challenge.timestamp, 10);
          console.log('📋 Parsed as number:', timestampNum);
          if (!isNaN(timestampNum)) {
            timestampMs = timestampNum * 1000; // Convert to milliseconds
            console.log('✅ Using challenge timestamp (seconds converted to ms):', timestampMs);
            console.log('✅ Timestamp as string:', String(timestampMs));
            console.log('✅ Timestamp length:', String(timestampMs).length);
          } else {
            throw new Error('Unable to parse challenge timestamp');
          }
        }
      } catch (dateError) {
        console.error('❌ Failed to parse timestamp:', dateError);
        throw new Error(`Failed to parse timestamp: ${challenge.timestamp}`);
      }
      
      const tokenWithTimestamp = `${ksefToken}|${timestampMs}`;
      console.log('📋 Token with timestamp:', tokenWithTimestamp);
      console.log('📋 Token with timestamp length:', tokenWithTimestamp.length);
      console.log('📋 Token with timestamp bytes:', new TextEncoder().encode(tokenWithTimestamp).length);

      // Step 3: Encrypt token with KSeF public key
      const encryptedToken = await this.encryptToken(tokenWithTimestamp);
      console.log('🔐 Token encrypted successfully');

      // Step 4: Submit authentication request
      const authRequest = {
        challenge: challenge.challenge,
        contextIdentifier: {
          type: 'nip',  // KSEF 2.0 uses lowercase 'nip'
          value: contextNip
        },
        encryptedToken: encryptedToken
      };

      console.log('📤 Submitting auth request:', {
        challenge: authRequest.challenge,
        contextIdentifier: authRequest.contextIdentifier,
        encryptedTokenLength: authRequest.encryptedToken.length
      });

      const authResponse = await this.submitAuthRequest(authRequest);
      console.log('📤 Auth request submitted:', authResponse.referenceNumber);

      // Step 5: Poll authentication status until success
      await this.pollAuthStatus(
        authResponse.referenceNumber,
        authResponse.authenticationToken.token,
        maxStatusChecks,
        statusCheckDelayMs
      );

      console.log('✅ Authentication completed successfully');

      // Step 6: Redeem tokens
      const tokens = await this.redeemToken(authResponse.authenticationToken.token);
      console.log('🎫 Tokens redeemed successfully');

      return tokens;
    } catch (error) {
      console.error('❌ KSeF authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get authentication challenge from KSeF
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
      throw new Error(`Failed to get challenge: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Encrypt token with KSeF public key using Edge Function
   */
  async encryptToken(tokenWithTimestamp: string): Promise<string> {
    console.log('🔐 Starting token encryption via Edge Function...');
    console.log('🔐 Token length:', tokenWithTimestamp.length);
    
    try {
      // Get KSeF public key certificates
      const certsResponse = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-certificates/security/public-key-certificates');
      
      if (!certsResponse.ok) {
        throw new Error('Failed to fetch KSeF public key certificates');
      }

      const certificates = await certsResponse.json();
      console.log('🔑 Certificates response:', certificates);
      console.log('🔑 Certificates count:', certificates.length);
      
      // Find certificate for token encryption
      const cert = certificates.find((c: any) =>
        c.usage?.includes('KsefTokenEncryption')
      );

      if (!cert) {
        throw new Error('No certificate found for KSeF token encryption');
      }
      
      console.log('🔑 Found certificate for encryption:', cert.usage);
      console.log('🔐 Token with timestamp to encrypt:', tokenWithTimestamp.substring(0, 50) + '...');
      console.log('🔐 Token length:', tokenWithTimestamp.length, 'bytes');
      
      // Call Edge Function for encryption
      const encryptResponse = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-encrypt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getSupabaseAnonKey()}`
        },
        body: JSON.stringify({
          tokenWithTimestamp: tokenWithTimestamp,
          certificatePem: cert.certificate
        })
      });
      
      if (!encryptResponse.ok) {
        const error = await encryptResponse.json();
        throw new Error(`Edge Function encryption failed: ${error.message}`);
      }
      
      const result = await encryptResponse.json();
      console.log('🔐 Token encrypted successfully via Edge Function');
      console.log('🔐 Encrypted token length:', result.encryptedToken.length);
      
      return result.encryptedToken;
      
    } catch (error) {
      console.error('❌ Token encryption failed:', error);
      throw new Error(`Failed to encrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit authentication request to KSeF
   */
  async submitAuthRequest(authRequest: any): Promise<{
    referenceNumber: string;
    authenticationToken: {
      token: string;
    };
  }> {
    console.log('📤 Submitting to KSeF endpoint:', `${this.config.baseUrl}/auth/ksef-token`);
    
    const response = await fetch(`${this.config.baseUrl}/auth/ksef-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'KsiegaI/1.0',
      },
      body: JSON.stringify(authRequest),
      mode: 'cors',
    });

    console.log('📤 Auth request response status:', response.status);
    console.log('📤 Auth request response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Auth request failed:', errorText);
      
      let error;
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: errorText };
      }
      
      throw new Error(`Auth request failed: ${error.exception?.description || error.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('📤 Auth request response data:', data);

    return {
      referenceNumber: data.referenceNumber,
      authenticationToken: {
        token: data.authenticationToken.token,
      },
    };
  }

  /**
   * Poll authentication status until success
   */
  async pollAuthStatus(
    referenceNumber: string,
    authenticationToken: string,
    maxChecks: number,
    delayMs: number
  ): Promise<void> {
    console.log(`⏳ Polling auth status for ${referenceNumber}...`);

    for (let i = 0; i < maxChecks; i++) {
      const status = await this.checkAuthStatus(referenceNumber, authenticationToken);
      
      console.log(`📊 Status check ${i + 1}/${maxChecks}:`, status.status.code, status.status.description);

      // Status codes:
      // 100 - Authentication in progress
      // 200 - Authentication successful
      if (status.status.code === 200) {
        console.log('✅ Authentication successful');
        return;
      }

      if (status.status.code >= 400) {
        console.error('❌ KSEF Authentication Error Details:');
        console.error('❌ Status Code:', status.status.code);
        console.error('❌ Description:', status.status.description);
        console.error('❌ Details:', (status.status as any).details || 'No details provided');
        console.error('❌ Full Status Object:', JSON.stringify(status, null, 2));
        throw new Error(`Authentication failed: ${status.status.description}`);
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Authentication timeout');
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus(
    referenceNumber: string,
    authenticationToken: string
  ): Promise<{
    status: {
      code: number;
      description: string;
    };
  }> {
    const response = await fetch(`${this.config.baseUrl}/auth/${referenceNumber}`, {
      headers: {
        'Authorization': `Bearer ${authenticationToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check auth status: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Redeem authentication token for access/refresh tokens
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
    console.log('🎫 Redeeming authentication token...');

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
    console.log('🔍 Token redemption response:', data);

    // Handle different response structures with defensive checks
    let accessToken, refreshToken;
    
    console.log('🔍 Full response data:', JSON.stringify(data, null, 2));
    console.log('🔍 Response keys:', Object.keys(data));
    
    if (data && typeof data === 'object') {
      if (data.accessToken && typeof data.accessToken === 'object' && data.accessToken.token) {
        // Expected structure
        console.log('✅ Using expected structure');
        accessToken = data.accessToken;
        refreshToken = data.refreshToken;
      } else if (data.access_token && data.refresh_token) {
        // Alternative structure
        console.log('✅ Using alternative structure');
        accessToken = {
          token: data.access_token,
          validUntil: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : data.valid_until
        };
        refreshToken = {
          token: data.refresh_token,
          expires_in: data.refresh_expires_in || 86400
        };
      } else {
        console.log('❌ No matching structure found');
        console.log('❌ data.accessToken:', data.accessToken);
        console.log('❌ data.access_token:', data.access_token);
        console.log('❌ data.refreshToken:', data.refreshToken);
        console.log('❌ data.refresh_token:', data.refresh_token);
        throw new Error(`Unexpected token response structure: ${JSON.stringify(data)}`);
      }
    } else {
      throw new Error(`Invalid response data: ${JSON.stringify(data)}`);
    }

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
   * Extract public key from X.509 certificate
   */
  private extractPublicKeyFromCertificate(certPem: string): ArrayBuffer {
    console.log('🔑 Extracting public key from X.509 certificate...');
    console.log('🔑 Original PEM length:', certPem.length);
    
    // Remove PEM headers and footers
    const cleaned = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    console.log('🔑 Cleaned PEM length:', cleaned.length);
    console.log('🔑 Cleaned PEM preview:', cleaned.substring(0, 50) + '...');

    try {
      const binary = atob(cleaned);
      console.log('🔑 Decoded binary length:', binary.length);
      
      const certBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        certBytes[i] = binary.charCodeAt(i);
      }
      
      console.log('🔑 Certificate ArrayBuffer created successfully');
      console.log('🔑 Certificate first 32 bytes:', Array.from(certBytes.slice(0, 32)));
      
      // Parse X.509 certificate to extract SubjectPublicKeyInfo
      // X.509 structure: SEQUENCE { ... SubjectPublicKeyInfo ... }
      const publicKeyBytes = this.extractSubjectPublicKeyInfo(certBytes);
      
      console.log('🔑 Public key extracted successfully');
      console.log('🔑 Public key length:', publicKeyBytes.byteLength);
      console.log('🔑 Public key first 32 bytes:', Array.from(new Uint8Array(publicKeyBytes.slice(0, 32))));
      
      return publicKeyBytes;
    } catch (error) {
      console.error('❌ Failed to extract public key:', error);
      throw new Error(`Failed to extract public key from certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract SubjectPublicKeyInfo from X.509 certificate
   */
  private extractSubjectPublicKeyInfo(certBytes: Uint8Array): ArrayBuffer {
    console.log('🔑 Parsing X.509 certificate structure...');
    
    // X.509 Certificate Structure:
    // Certificate ::= SEQUENCE {
    //   tbsCertificate              TBSCertificate,
    //   signatureAlgorithm          AlgorithmIdentifier,
    //   signatureValue              BIT STRING
    // }
    //
    // TBSCertificate ::= SEQUENCE {
    //   version         [0]  EXPLICIT Version DEFAULT v1,
    //   serialNumber    CertificateSerialNumber,
    //   signature       AlgorithmIdentifier,
    //   issuer          Name,
    //   validity         Validity,
    //   subject         Name,
    //   subjectPublicKeyInfo SubjectPublicKeyInfo,  <-- This is what we need
    //   extensions      [3]  Extensions OPTIONAL
    // }
    
    // Simple ASN.1 parsing to find SubjectPublicKeyInfo
    // We need to find the SubjectPublicKeyInfo sequence within the certificate
    
    try {
      // Look for SubjectPublicKeyInfo sequence
      // It starts after the subject field in the TBSCertificate
      
      // For now, let's try a simplified approach:
      // Find the start of SubjectPublicKeyInfo (typically around byte 400-600 in a 1628-byte cert)
      
      const spkiStart = this.findSubjectPublicKeyInfoStart(certBytes);
      if (spkiStart === -1) {
        throw new Error('Could not find SubjectPublicKeyInfo in certificate');
      }
      
      console.log('🔑 Found SubjectPublicKeyInfo at position:', spkiStart);
      
      // Extract the SubjectPublicKeyInfo sequence
      const spkiBytes = this.extractAsn1Sequence(certBytes, spkiStart);
      
      console.log('🔑 Extracted SubjectPublicKeyInfo length:', spkiBytes.length);
      console.log('🔑 SubjectPublicKeyInfo first 32 bytes:', Array.from(spkiBytes.slice(0, 32)));
      
      const spkiBuffer = new ArrayBuffer(spkiBytes.length);
      const spkiView = new Uint8Array(spkiBuffer);
      spkiView.set(spkiBytes);
      return spkiBuffer;
      
    } catch (error) {
      console.error('❌ Failed to parse X.509 certificate:', error);
      
      // Fallback: try to use the certificate as-is (might work in some browsers)
      console.log('🔑 Fallback: using full certificate as SPKI...');
      const publicKeyBuffer = new ArrayBuffer(certBytes.length);
      const publicKeyView = new Uint8Array(publicKeyBuffer);
      publicKeyView.set(certBytes);
      return publicKeyBuffer;
    }
  }

  /**
   * Find the start of SubjectPublicKeyInfo in certificate
   */
  private findSubjectPublicKeyInfoStart(certBytes: Uint8Array): number {
    // Look for the SubjectPublicKeyInfo sequence
    // SubjectPublicKeyInfo ::= SEQUENCE {
    //   algorithm        AlgorithmIdentifier,
    //   subjectPublicKey BIT STRING
    // }
    
    // Simplified search: look for SEQUENCE tag (0x30) followed by algorithm identifier
    for (let i = 400; i < certBytes.length - 100; i++) {
      // Look for SEQUENCE tag (0x30) with length
      if (certBytes[i] === 0x30) {
        // Check if this could be SubjectPublicKeyInfo
        // SubjectPublicKeyInfo typically starts with SEQUENCE and contains algorithm identifier
        const length = this.readAsn1Length(certBytes, i);
        if (length > 50 && length < 500) { // Reasonable size for SPKI
          // Check if next bytes look like an algorithm identifier
          const nextTag = certBytes[i + 1 + this.getLengthBytes(certBytes[i + 1])];
          if (nextTag === 0x30) { // Another SEQUENCE (algorithm identifier)
            console.log('🔑 Potential SubjectPublicKeyInfo found at position:', i);
            return i;
          }
        }
      }
    }
    
    return -1;
  }

  /**
   * Extract an ASN.1 sequence from the given start position
   */
  private extractAsn1Sequence(certBytes: Uint8Array, start: number): Uint8Array {
    const length = this.readAsn1Length(certBytes, start);
    const totalLength = 1 + this.getLengthBytes(certBytes[start]) + length;
    
    return certBytes.slice(start, start + totalLength);
  }

  /**
   * Read ASN.1 length from the given position
   */
  private readAsn1Length(bytes: Uint8Array, start: number): number {
    if (start >= bytes.length) return 0;
    
    const firstByte = bytes[start];
    if (firstByte < 0x80) {
      return firstByte;
    } else {
      const lengthBytes = firstByte & 0x7F;
      let length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = (length << 8) | bytes[start + 1 + i];
      }
      return length;
    }
  }

  /**
   * Get the number of bytes used to encode the length
   */
  private getLengthBytes(firstByte: number): number {
    if (firstByte < 0x80) return 0;
    return firstByte & 0x7F;
  }
}
