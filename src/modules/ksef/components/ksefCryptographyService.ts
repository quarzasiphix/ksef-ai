/**
 * KSeF Cryptography Service
 * 
 * Handles encryption operations for KSeF authentication.
 * Implements both RSA-OAEP-SHA256 and ECDSA (ECDH-AES-GCM) encryption methods.
 * Based on official Java and C# implementations from CIRFMF.
 */

export interface KsefPublicKeys {
  ksefTokenPem: string;
  symmetricKeyPem: string;
}

/**
 * Cryptography Service for KSeF Token Encryption
 * 
 * Supports two encryption methods:
 * 1. RSA-OAEP-SHA256 (traditional, widely supported)
 * 2. ECDSA with ECDH-AES-GCM (modern, preferred by KSeF 2.0)
 */
export class KsefCryptographyService {
  private ksefPublicKey?: CryptoKey;
  private symmetricPublicKey?: CryptoKey;
  private publicKeysPem?: KsefPublicKeys;

  /**
   * Initialize with public keys from KSeF
   * 
   * @param publicKeys - PEM-encoded public keys from KSeF API
   */
  async initialize(publicKeys: KsefPublicKeys): Promise<void> {
    this.publicKeysPem = publicKeys;
    
    // Import KSeF token public key (for ECDSA)
    this.ksefPublicKey = await this.importECDSAPublicKey(publicKeys.ksefTokenPem);
    
    // Import symmetric key public key (for RSA)
    this.symmetricPublicKey = await this.importRSAPublicKey(publicKeys.symmetricKeyPem);
    
    console.log('[CryptographyService] Initialized with public keys');
  }

  /**
   * Encrypt content using ECDSA (ECDH-AES-GCM)
   * 
   * Modern encryption method preferred by KSeF 2.0.
   * Uses P-256 curve for ECDH key agreement and AES-GCM for encryption.
   * 
   * Based on C# implementation:
   * - Generate ephemeral ECDH key pair
   * - Derive shared secret using ECDH
   * - Encrypt with AES-GCM
   * - Combine: ephemeralPublicKey + nonce + ciphertext + tag
   * 
   * @param content - Content to encrypt (usually "{token}|{timestamp}")
   * @returns Base64-encoded encrypted data
   */
  async encryptWithECDSA(content: string): Promise<string> {
    if (!this.ksefPublicKey) {
      throw new Error('Cryptography service not initialized. Call initialize() first.');
    }

    try {
      console.log('[CryptographyService] Encrypting with ECDSA...');

      // 1. Generate ephemeral ECDH key pair (P-256 curve)
      const ephemeralKeyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true, // extractable
        ['deriveBits']
      );

      console.log('[CryptographyService] Generated ephemeral key pair');

      // 2. Derive shared secret using ECDH
      const sharedSecretBits = await crypto.subtle.deriveBits(
        {
          name: 'ECDH',
          public: this.ksefPublicKey
        },
        ephemeralKeyPair.privateKey,
        256 // 256 bits = 32 bytes for AES-256
      );

      console.log('[CryptographyService] Derived shared secret');

      // 3. Import shared secret as AES-GCM key
      const aesKey = await crypto.subtle.importKey(
        'raw',
        sharedSecretBits,
        {
          name: 'AES-GCM',
          length: 256
        },
        false, // not extractable
        ['encrypt']
      );

      // 4. Generate random nonce (12 bytes for GCM)
      const nonce = crypto.getRandomValues(new Uint8Array(12));

      console.log('[CryptographyService] Generated nonce');

      // 5. Encrypt content with AES-GCM
      const contentBytes = new TextEncoder().encode(content);
      const ciphertextWithTag = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          tagLength: 128 // 128-bit authentication tag
        },
        aesKey,
        contentBytes
      );

      console.log('[CryptographyService] Content encrypted');

      // 6. Export ephemeral public key (SPKI format)
      const ephemeralPublicKeyBytes = await crypto.subtle.exportKey(
        'spki',
        ephemeralKeyPair.publicKey
      );

      // 7. Combine all parts: ephemeralPublicKey + nonce + ciphertext+tag
      const totalLength = ephemeralPublicKeyBytes.byteLength + nonce.length + ciphertextWithTag.byteLength;
      const combined = new Uint8Array(totalLength);
      
      let offset = 0;
      combined.set(new Uint8Array(ephemeralPublicKeyBytes), offset);
      offset += ephemeralPublicKeyBytes.byteLength;
      
      combined.set(nonce, offset);
      offset += nonce.length;
      
      combined.set(new Uint8Array(ciphertextWithTag), offset);

      // 8. Convert to Base64
      const base64 = this.arrayBufferToBase64(combined);

      console.log('[CryptographyService] ECDSA encryption complete:', {
        ephemeralKeySize: ephemeralPublicKeyBytes.byteLength,
        nonceSize: nonce.length,
        ciphertextSize: ciphertextWithTag.byteLength,
        totalSize: combined.length,
        base64Length: base64.length
      });

      return base64;

    } catch (error) {
      console.error('[CryptographyService] ECDSA encryption failed:', error);
      throw new Error(`ECDSA encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt content using RSA-OAEP-SHA256
   * 
   * Traditional encryption method.
   * Uses RSA with OAEP padding and SHA-256 hash.
   * 
   * @param content - Content to encrypt
   * @returns Base64-encoded encrypted data
   */
  async encryptWithRSA(content: string): Promise<string> {
    if (!this.symmetricPublicKey) {
      throw new Error('Cryptography service not initialized. Call initialize() first.');
    }

    try {
      console.log('[CryptographyService] Encrypting with RSA-OAEP-SHA256...');

      const contentBytes = new TextEncoder().encode(content);

      // Encrypt with RSA-OAEP using SHA-256
      const ciphertext = await crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        this.symmetricPublicKey,
        contentBytes
      );

      const base64 = this.arrayBufferToBase64(new Uint8Array(ciphertext));

      console.log('[CryptographyService] RSA encryption complete:', {
        inputSize: contentBytes.length,
        ciphertextSize: ciphertext.byteLength,
        base64Length: base64.length
      });

      return base64;

    } catch (error) {
      console.error('[CryptographyService] RSA encryption failed:', error);
      throw new Error(`RSA encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import ECDSA public key from PEM
   * 
   * @param pem - PEM-encoded ECDSA public key
   * @returns CryptoKey for ECDH operations
   */
  private async importECDSAPublicKey(pem: string): Promise<CryptoKey> {
    try {
      // Extract base64 from PEM
      const pemContents = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '');

      // Convert base64 to ArrayBuffer
      const binaryDer = this.base64ToArrayBuffer(pemContents);

      // Import as ECDH public key (P-256 curve)
      const publicKey = await crypto.subtle.importKey(
        'spki',
        binaryDer,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        []
      );

      console.log('[CryptographyService] ECDSA public key imported');
      return publicKey;

    } catch (error) {
      console.error('[CryptographyService] Failed to import ECDSA public key:', error);
      throw new Error(`Failed to import ECDSA public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import RSA public key from PEM
   * 
   * @param pem - PEM-encoded RSA public key
   * @returns CryptoKey for RSA-OAEP operations
   */
  private async importRSAPublicKey(pem: string): Promise<CryptoKey> {
    try {
      // Extract base64 from PEM
      const pemContents = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, '')
        .replace(/-----END PUBLIC KEY-----/, '')
        .replace(/\s/g, '');

      // Convert base64 to ArrayBuffer
      const binaryDer = this.base64ToArrayBuffer(pemContents);

      // Import as RSA-OAEP public key with SHA-256
      const publicKey = await crypto.subtle.importKey(
        'spki',
        binaryDer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        true,
        ['encrypt']
      );

      console.log('[CryptographyService] RSA public key imported');
      return publicKey;

    } catch (error) {
      console.error('[CryptographyService] Failed to import RSA public key:', error);
      throw new Error(`Failed to import RSA public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Base64 string to ArrayBuffer
   * 
   * @param base64 - Base64 string
   * @returns ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Convert ArrayBuffer to Base64 string
   * 
   * @param buffer - ArrayBuffer or Uint8Array
   * @returns Base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Check if service is initialized
   * 
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return !!(this.ksefPublicKey && this.symmetricPublicKey);
  }
}
