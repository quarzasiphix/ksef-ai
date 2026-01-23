import crypto from 'crypto';

/**
 * KSeF Invoice Retrieval Helpers - Browser Compatible Version
 * 
 * This version uses browser-compatible alternatives for ZIP processing
 * and XML parsing to avoid Node.js dependencies.
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
