import { KsefConfig } from './types';

/**
 * KSeF Cryptography Service
 * Handles AES-256-CBC encryption for invoices and RSA-OAEP for key encryption
 * Based on official KSeF 2.0 specification
 */
export class KsefCryptography {
  private config: KsefConfig;
  private publicKey: CryptoKey | null = null;

  constructor(config: KsefConfig) {
    this.config = config;
  }

  /**
   * Generate encryption data for a new session
   * Returns: symmetric key, IV, and RSA-encrypted key
   */
  async generateEncryptionData(): Promise<{
    symmetricKey: Uint8Array;
    iv: Uint8Array;
    encryptedKey: string;
  }> {
    // Generate 256-bit AES key
    const symmetricKey = crypto.getRandomValues(new Uint8Array(32));
    
    // Generate 128-bit IV
    const iv = crypto.getRandomValues(new Uint8Array(16));

    // Get KSeF public key
    if (!this.publicKey) {
      await this.loadPublicKey();
    }

    // Encrypt symmetric key with RSA-OAEP
    const encryptedKeyBuffer = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      this.publicKey!,
      symmetricKey
    );

    const encryptedKey = btoa(String.fromCharCode(...new Uint8Array(encryptedKeyBuffer)));

    return {
      symmetricKey,
      iv,
      encryptedKey,
    };
  }

  /**
   * Encrypt invoice XML with AES-256-CBC
   */
  async encryptInvoice(
    xmlContent: string,
    symmetricKey: Uint8Array,
    iv: Uint8Array
  ): Promise<{
    encryptedContent: string;
    hash: string;
    size: number;
  }> {
    // Convert XML to bytes
    const encoder = new TextEncoder();
    const xmlBytes = encoder.encode(xmlContent);

    // Import symmetric key
    const key = await crypto.subtle.importKey(
      'raw',
      symmetricKey,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );

    // Encrypt with AES-256-CBC and PKCS#7 padding
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: iv as Uint8Array,
      },
      key,
      xmlBytes as Uint8Array
    );

    // Prepend IV to encrypted data (as per KSeF spec)
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const encryptedWithIV = new Uint8Array(iv.length + encryptedArray.length);
    encryptedWithIV.set(new Uint8Array(iv.buffer), 0);
    encryptedWithIV.set(encryptedArray, iv.length);

    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', encryptedWithIV);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    // Convert to Base64
    const encryptedContent = btoa(String.fromCharCode(...encryptedWithIV));

    return {
      encryptedContent,
      hash,
      size: encryptedWithIV.length,
    };
  }

  /**
   * Calculate metadata for original invoice
   */
  async calculateInvoiceMetadata(xmlContent: string): Promise<{
    hash: string;
    size: number;
  }> {
    const encoder = new TextEncoder();
    const xmlBytes = encoder.encode(xmlContent);

    const hashBuffer = await crypto.subtle.digest('SHA-256', xmlBytes);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    return {
      hash,
      size: xmlBytes.length,
    };
  }

  /**
   * Load KSeF public key from API
   */
  private async loadPublicKey(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/security/public-key-certificates`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch KSeF public key');
      }

      const certificates = await response.json();
      
      // Find certificate for symmetric key encryption
      const cert = certificates.find((c: any) => 
        c.usage?.includes('SymmetricKeyEncryption')
      );

      if (!cert) {
        throw new Error('No certificate found for symmetric key encryption');
      }

      // Parse certificate and extract public key
      const certPem = cert.certificate;
      const certDer = this.pemToDer(certPem);

      // Import RSA-OAEP public key
      this.publicKey = await crypto.subtle.importKey(
        'spki',
        certDer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );
    } catch (error) {
      console.error('Failed to load KSeF public key:', error);
      throw error;
    }
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
   * Validate NIP checksum (production only)
   */
  validateNIP(nip: string): boolean {
    // Remove any non-digit characters
    const cleanNip = nip.replace(/\D/g, '');

    if (cleanNip.length !== 10) {
      return false;
    }

    // NIP checksum algorithm
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanNip[i]) * weights[i];
    }

    const checksum = sum % 11;
    const lastDigit = parseInt(cleanNip[9]);

    return checksum === lastDigit;
  }
}
