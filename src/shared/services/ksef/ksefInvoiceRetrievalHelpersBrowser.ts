// No crypto import - using browser's built-in crypto

/**
 * KSeF Invoice Retrieval Helpers - Browser Compatible Version
 * 
 * This version uses browser-compatible alternatives for ZIP processing
 * and XML parsing to avoid Node.js dependencies.
 */

export interface EncryptionData {
  cipherKey: number[];
  cipherIv: number[];
  encryptedKey: string;
  iv: string;
}

export interface InvoicePackageMetadata {
  invoices: Array<{
    ksefNumber: string;
    invoiceNumber: string;
    issueDate: string;
    sellerNip: string;
    buyerNip?: string;
    totalGrossAmount: number;
    currency: string;
    permanentStorageDate: string;
  }>;
}

/**
 * Generate encryption data for invoice export
 * Creates AES-256 key and IV, encrypts key with KSeF public key
 */
export async function generateEncryptionData(ksefPublicKeyPem: string): Promise<EncryptionData> {
  // Generate random AES-256 key (32 bytes) and IV (16 bytes) using Web Crypto API
  const cipherKey = new Uint8Array(32);
  const cipherIv = new Uint8Array(16);
  
  // Fill with cryptographically secure random values
  crypto.getRandomValues(cipherKey);
  crypto.getRandomValues(cipherIv);

  try {
    // Import the public key from PEM format
    const publicKey = await crypto.subtle.importKey(
      'spki',
      // Convert PEM to binary (simplified - in real implementation, you'd need proper PEM parsing)
      new Uint8Array(atob(ksefPublicKeyPem.replace(/-----BEGIN[^-]+-----|-----END[^-]+-----|\s/g, '')).split('').map(c => c.charCodeAt(0))),
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      false,
      ['encrypt']
    );

    // Encrypt symmetric key with KSeF public key using RSA-OAEP
    const encryptedKeyBuffer = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP',
      },
      publicKey,
      cipherKey
    );

    return {
      cipherKey: Array.from(cipherKey),
      cipherIv: Array.from(cipherIv),
      encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKeyBuffer))),
      iv: btoa(String.fromCharCode(...cipherIv)),
    };
  } catch (error) {
    console.error('Failed to encrypt with Web Crypto API, falling back to Edge Function');
    // Fallback: call Edge Function for encryption
    const response = await fetch('https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/ksef-encrypt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuY3J6eGp5ZmZ4bWZibnhscXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MjQ5MjAsImV4cCI6MjA2MzAwMDkyMH0.stheZYA6jcCAjOi-c4NPLBe3Jxfv3Rs9LWk8JTqBS8s'
      },
      body: JSON.stringify({
        tokenWithTimestamp: btoa(String.fromCharCode(...cipherKey)),
        certificatePem: ksefPublicKeyPem
      })
    });

    if (!response.ok) {
      throw new Error('Failed to encrypt key');
    }

    const result = await response.json();
    return {
      cipherKey: Array.from(cipherKey),
      cipherIv: Array.from(cipherIv),
      encryptedKey: result.encryptedToken,
      iv: btoa(String.fromCharCode(...cipherIv)),
    };
  }
}

/**
 * Decrypt data using AES-256-CBC
 */
export async function decryptAes256(
  encrypted: number[],
  key: number[],
  iv: number[]
): Promise<number[]> {
  const encryptedArray = new Uint8Array(encrypted);
  const keyArray = new Uint8Array(key);
  const ivArray = new Uint8Array(iv);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyArray,
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-CBC',
      iv: ivArray,
    },
    cryptoKey,
    encryptedArray
  );

  return Array.from(new Uint8Array(decrypted));
}

/**
 * Download package part from URL
 */
export async function downloadPackagePart(
  url: string,
  accessToken: string
): Promise<Buffer> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download package part: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Browser-compatible ZIP processing using JSZip
 * Note: You'll need to install jszip for this to work
 */
export async function unzipPackage(zipBuffer: Buffer): Promise<Map<string, string>> {
  // This would require jszip package
  // For now, return a simple parser for the basic case
  const files = new Map<string, string>();
  
  try {
    // Try to parse as a simple concatenated XML files
    const content = zipBuffer.toString('utf8');
    
    // Look for XML file boundaries
    const xmlMatches = content.match(/<\?xml[^>]*>.*?<\/[^>]*>/g);
    
    if (xmlMatches) {
      xmlMatches.forEach((xml, index) => {
        files.set(`invoice_${index + 1}.xml`, xml);
      });
    }
    
    // Look for _metadata.json
    const metadataMatch = content.match(/\{[^}]*_metadata\.json[^}]*\}/);
    if (metadataMatch) {
      files.set('_metadata.json', metadataMatch[0]);
    }
  } catch (error) {
    console.error('Error parsing ZIP content:', error);
  }
  
  return files;
}

/**
 * Parse _metadata.json file from invoice package
 */
export function parseMetadataJson(jsonContent: string): InvoicePackageMetadata {
  try {
    const data = JSON.parse(jsonContent);
    return {
      invoices: data.invoices || [],
    };
  } catch (error) {
    throw new Error(`Failed to parse metadata JSON: ${error}`);
  }
}

/**
 * Browser-compatible XML parser
 * Simple regex-based parser for basic invoice data
 */
export function parseInvoiceXml(xmlContent: string): any {
  try {
    const metadata: any = {};
    
    // Extract basic invoice data using regex
    const invoiceNumberMatch = xmlContent.match(/<P_2[^>]*>([^<]+)<\/P_2>/);
    if (invoiceNumberMatch) {
      metadata.invoiceNumber = invoiceNumberMatch[1].trim();
    }
    
    const issueDateMatch = xmlContent.match(/<P_1[^>]*>([^<]+)<\/P_1>/);
    if (issueDateMatch) {
      metadata.issueDate = issueDateMatch[1].trim();
    }
    
    const sellerNipMatch = xmlContent.match(/<Podmiot1[^>]*>.*?<NIP[^>]*>([^<]+)<\/NIP>/s);
    if (sellerNipMatch) {
      metadata.sellerNip = sellerNipMatch[1].trim();
    }
    
    const buyerNipMatch = xmlContent.match(/<Podmiot2[^>]*>.*?<NIP[^>]*>([^<]+)<\/NIP>/s);
    if (buyerNipMatch) {
      metadata.buyerNip = buyerNipMatch[1].trim();
    }
    
    const totalAmountMatch = xmlContent.match(/<P_15[^>]*>([^<]+)<\/P_15>/);
    if (totalAmountMatch) {
      metadata.totalGrossAmount = parseFloat(totalAmountMatch[1].replace(',', '.'));
    }
    
    const currencyMatch = xmlContent.match(/<KodWaluty[^>]*>([^<]+)<\/KodWaluty>/);
    if (currencyMatch) {
      metadata.currency = currencyMatch[1].trim();
    }
    
    const invoiceTypeMatch = xmlContent.match(/<RodzajFaktury[^>]*>([^<]+)<\/RodzajFaktury>/);
    if (invoiceTypeMatch) {
      metadata.invoiceType = invoiceTypeMatch[1].trim();
    }
    
    return metadata;
  } catch (error) {
    throw new Error(`Failed to parse invoice XML: ${error}`);
  }
}

/**
 * Calculate SHA-256 hash of data
 */
export async function calculateSha256(data: string | Buffer): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate SHA-256 hash and encode as Base64URL
 */
export async function calculateSha256Base64Url(data: string | Buffer): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = typeof data === 'string' ? encoder.encode(data) : new Uint8Array(data);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert to Base64URL
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate KSeF number format
 * Format: 10 digits (NIP) + 8 digits (date YYYYMMDD) + 16 hex chars + 1 CRC
 */
export function validateKsefNumber(ksefNumber: string): boolean {
  if (ksefNumber.length !== 35) {
    return false;
  }

  // Check format: NNNNNNNNNN-YYYYMMDD-XXXXXXXXXXXXXXXX-C
  const pattern = /^\d{10}-\d{8}-[0-9A-F]{16}-[0-9A-F]$/;
  return pattern.test(ksefNumber);
}

/**
 * Calculate CRC-8 checksum for KSeF number validation
 * Algorithm: CRC-8/MAXIM (polynomial 0x31, init 0x00, xorout 0x00)
 */
export function calculateKsefCrc8(data: string): number {
  const polynomial = 0x31;
  let crc = 0x00;

  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x80) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }

  return crc & 0xFF;
}

/**
 * Merge multiple ZIP parts into single buffer
 */
export function mergeZipParts(parts: Buffer[]): Buffer {
  return Buffer.concat(parts);
}

/**
 * Extract invoices from unzipped package
 */
export function extractInvoicesFromPackage(files: Map<string, string>): Array<{
  filename: string;
  xml: string;
  metadata?: any;
}> {
  const invoices: Array<{ filename: string; xml: string; metadata?: any }> = [];
  let packageMetadata: InvoicePackageMetadata | null = null;

  // First, find and parse _metadata.json
  for (const [filename, content] of files.entries()) {
    if (filename.toLowerCase().endsWith('_metadata.json')) {
      packageMetadata = parseMetadataJson(content);
      break;
    }
  }

  // Then, extract all XML files
  for (const [filename, content] of files.entries()) {
    if (filename.toLowerCase().endsWith('.xml')) {
      try {
        const xmlMetadata = parseInvoiceXml(content);
        
        // Try to match with package metadata if available
        let matchedMetadata = null;
        if (packageMetadata) {
          matchedMetadata = packageMetadata.invoices.find(
            inv => inv.invoiceNumber === xmlMetadata.invoiceNumber
          );
        }

        invoices.push({
          filename,
          xml: content,
          metadata: matchedMetadata || xmlMetadata,
        });
      } catch (error) {
        console.error(`Failed to parse invoice ${filename}:`, error);
      }
    }
  }

  return invoices;
}

/**
 * Deduplicate invoices by KSeF number
 */
export function deduplicateInvoices(
  invoices: Array<{ ksefNumber: string; [key: string]: any }>
): Array<{ ksefNumber: string; [key: string]: any }> {
  const seen = new Set<string>();
  const unique: Array<{ ksefNumber: string; [key: string]: any }> = [];

  for (const invoice of invoices) {
    if (!seen.has(invoice.ksefNumber)) {
      seen.add(invoice.ksefNumber);
      unique.push(invoice);
    }
  }

  return unique;
}

/**
 * Format date for KSeF API (YYYY-MM-DD)
 */
export function formatDateForKsef(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse KSeF date string to Date object
 */
export function parseKsefDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if date is within HWM (High Water Mark)
 */
export function isWithinHwm(date: Date, hwmDate: Date): boolean {
  return date <= hwmDate;
}

/**
 * Get KSeF public key for environment
 */
export function getKsefPublicKey(environment: 'test' | 'demo' | 'prod'): string {
  // These would be the actual KSeF public keys from official documentation
  // For now, returning placeholder - replace with real keys
  const keys = {
    test: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`,
    demo: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`,
    prod: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----`,
  };

  return keys[environment];
}

/**
 * Browser-compatible alternative to adm-zip
 * This provides basic functionality without Node.js dependencies
 */
export class BrowserZipReader {
  static async extractFiles(buffer: Buffer): Promise<Map<string, string>> {
    return unzipPackage(buffer);
  }
  
  static async parseXml(xmlContent: string): Promise<any> {
    return parseInvoiceXml(xmlContent);
  }
}
