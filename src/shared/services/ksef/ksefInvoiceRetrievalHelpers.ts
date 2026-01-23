import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';

/**
 * Helper functions for KSeF invoice retrieval
 * Handles encryption, decryption, ZIP processing, and XML parsing
 */

export interface EncryptionData {
  cipherKey: Buffer;
  cipherIv: Buffer;
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
export function generateEncryptionData(ksefPublicKeyPem: string): EncryptionData {
  // Generate random AES-256 key (32 bytes) and IV (16 bytes)
  const cipherKey = crypto.randomBytes(32);
  const cipherIv = crypto.randomBytes(16);

  // Encrypt symmetric key with KSeF public key using RSA-OAEP
  const encryptedKeyBuffer = crypto.publicEncrypt(
    {
      key: ksefPublicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    cipherKey
  );

  return {
    cipherKey,
    cipherIv,
    encryptedKey: encryptedKeyBuffer.toString('base64'),
    iv: cipherIv.toString('base64'),
  };
}

/**
 * Decrypt data using AES-256-CBC
 */
export function decryptAes256(
  encrypted: Buffer,
  key: Buffer,
  iv: Buffer
): Buffer {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
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
 * Unzip and process invoice package
 * Returns map of filename -> content
 */
export function unzipPackage(zipBuffer: Buffer): Map<string, string> {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();
  const files = new Map<string, string>();

  for (const entry of zipEntries) {
    if (!entry.isDirectory) {
      const content = entry.getData().toString('utf8');
      files.set(entry.entryName, content);
    }
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
 * Parse invoice XML to extract metadata
 */
export function parseInvoiceXml(xmlContent: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  try {
    const parsed = parser.parse(xmlContent);
    
    // Navigate to invoice data (structure depends on FA(2) vs FA(3))
    const invoice = parsed.Faktura || parsed.Invoice;
    
    if (!invoice) {
      throw new Error('Invalid invoice XML structure');
    }

    // Extract key fields
    const metadata = {
      invoiceNumber: invoice.P_2 || invoice.InvoiceNumber,
      issueDate: invoice.P_1 || invoice.IssueDate,
      sellerNip: invoice.Podmiot1?.NIP || invoice.Seller?.NIP,
      buyerNip: invoice.Podmiot2?.NIP || invoice.Buyer?.NIP,
      totalGrossAmount: parseFloat(invoice.P_15 || invoice.TotalGrossAmount || '0'),
      currency: invoice.KodWaluty || invoice.Currency || 'PLN',
      invoiceType: invoice.RodzajFaktury || invoice.InvoiceType,
    };

    return metadata;
  } catch (error) {
    throw new Error(`Failed to parse invoice XML: ${error}`);
  }
}

/**
 * Calculate SHA-256 hash of data
 */
export function calculateSha256(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Calculate SHA-256 hash and encode as Base64URL
 */
export function calculateSha256Base64Url(data: string | Buffer): string {
  const hash = crypto.createHash('sha256').update(data).digest();
  return hash
    .toString('base64')
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
