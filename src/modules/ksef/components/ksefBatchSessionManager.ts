import { KsefConfig } from './types';
import { KsefCryptography } from './ksefCryptography';

/**
 * KSeF Batch Session Manager
 * Handles batch invoice submission with ZIP archives according to official KSeF 2.0 specification
 * 
 * Official Flow:
 * 1. Generate encryption data (AES key + IV)
 * 2. Create ZIP archive with invoice XMLs
 * 3. Split ZIP into parts (max 100 MB each before encryption)
 * 4. Encrypt each part with AES-256-CBC
 * 5. Open batch session with metadata
 * 6. Upload encrypted parts to pre-signed URLs
 * 7. Close session to trigger processing
 * 8. Poll status and retrieve UPO
 */
export class KsefBatchSessionManager {
  private config: KsefConfig;
  private cryptography: KsefCryptography;
  private accessToken: string | null = null;
  private sessionReferenceNumber: string | null = null;
  private encryptionData: {
    symmetricKey: Uint8Array;
    iv: Uint8Array;
    encryptedKey: string;
  } | null = null;

  constructor(config: KsefConfig) {
    this.config = config;
    this.cryptography = new KsefCryptography(config);
  }

  /**
   * Set access token for API calls
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Create ZIP archive from invoice XMLs
   * Uses browser-compatible ZIP library
   */
  async createZipArchive(invoices: Array<{ fileName: string; content: string }>): Promise<Uint8Array> {
    // Note: In browser environment, use a library like JSZip
    // In Node/Deno environment, use built-in or appropriate library
    
    // For now, this is a placeholder that would need proper ZIP implementation
    // based on the runtime environment (browser vs server)
    
    throw new Error('ZIP creation requires environment-specific implementation. Use JSZip for browser or appropriate library for server.');
  }

  /**
   * Split ZIP archive into parts
   * Max 100 MB per part before encryption (as per official spec)
   */
  splitZipIntoParts(zipData: Uint8Array, maxPartSize: number = 100_000_000): Uint8Array[] {
    const parts: Uint8Array[] = [];
    const totalSize = zipData.length;
    const partCount = Math.ceil(totalSize / maxPartSize);
    const actualPartSize = Math.ceil(totalSize / partCount);

    for (let i = 0; i < partCount; i++) {
      const start = i * actualPartSize;
      const end = Math.min(start + actualPartSize, totalSize);
      const part = zipData.slice(start, end);
      parts.push(part);
    }

    return parts;
  }

  /**
   * Calculate metadata for ZIP file
   */
  async calculateZipMetadata(zipData: Uint8Array): Promise<{
    hash: string;
    size: number;
  }> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', zipData);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    return {
      hash,
      size: zipData.length,
    };
  }

  /**
   * Encrypt ZIP part with AES-256-CBC
   */
  async encryptPart(
    partData: Uint8Array,
    symmetricKey: Uint8Array,
    iv: Uint8Array
  ): Promise<{
    encryptedData: Uint8Array;
    hash: string;
    size: number;
  }> {
    // Import symmetric key
    const key = await crypto.subtle.importKey(
      'raw',
      symmetricKey,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );

    // Encrypt with AES-256-CBC
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-CBC',
        iv: iv,
      },
      key,
      partData
    );

    const encryptedArray = new Uint8Array(encryptedBuffer);

    // Prepend IV to encrypted data
    const encryptedWithIV = new Uint8Array(iv.length + encryptedArray.length);
    encryptedWithIV.set(new Uint8Array(iv.buffer), 0);
    encryptedWithIV.set(encryptedArray, iv.length);

    // Calculate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', encryptedWithIV);
    const hash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));

    return {
      encryptedData: encryptedWithIV,
      hash,
      size: encryptedWithIV.length,
    };
  }

  /**
   * Open batch session
   * POST /sessions/batch
   */
  async openBatchSession(
    zipMetadata: { hash: string; size: number },
    encryptedParts: Array<{
      ordinalNumber: number;
      fileName: string;
      hash: string;
      size: number;
    }>,
    formCode: string = 'FA',
    schemaVersion: string = '1-0E'
  ): Promise<{
    referenceNumber: string;
    validUntil: string;
    partUploadRequests: Array<{
      ordinalNumber: number;
      url: string;
      method: string;
      headers: Record<string, string>;
    }>;
  }> {
    if (!this.accessToken) {
      throw new Error('Access token required. Call setAccessToken first.');
    }

    // Generate encryption data
    this.encryptionData = await this.cryptography.generateEncryptionData();

    const requestBody = {
      formCode: {
        systemCode: formCode,
        schemaVersion: schemaVersion,
        value: formCode,
      },
      batchFile: {
        fileSize: zipMetadata.size,
        fileHash: zipMetadata.hash,
        fileParts: encryptedParts.map(part => ({
          ordinalNumber: part.ordinalNumber,
          fileSize: part.size,
          fileHash: part.hash,
        })),
      },
      encryptionKey: {
        encryptedSymmetricKey: this.encryptionData.encryptedKey,
        initializationVector: btoa(String.fromCharCode(...this.encryptionData.iv)),
      },
    };

    const response = await fetch(`${this.config.baseUrl}/sessions/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to open batch session: ${error.exception?.description || response.statusText}`);
    }

    const data = await response.json();
    this.sessionReferenceNumber = data.referenceNumber;

    return {
      referenceNumber: data.referenceNumber,
      validUntil: data.validUntil,
      partUploadRequests: data.partUploadRequests,
    };
  }

  /**
   * Upload encrypted part to pre-signed URL
   * IMPORTANT: Do NOT include Authorization header (pre-signed URL handles auth)
   */
  async uploadPart(
    uploadRequest: {
      ordinalNumber: number;
      url: string;
      method: string;
      headers: Record<string, string>;
    },
    encryptedData: Uint8Array
  ): Promise<void> {
    const response = await fetch(uploadRequest.url, {
      method: uploadRequest.method,
      headers: uploadRequest.headers,
      body: encryptedData,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload part ${uploadRequest.ordinalNumber}: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Close batch session
   * POST /sessions/batch/{referenceNumber}/close
   */
  async closeBatchSession(): Promise<void> {
    if (!this.sessionReferenceNumber) {
      throw new Error('No active batch session to close.');
    }

    const response = await fetch(
      `${this.config.baseUrl}/sessions/batch/${this.sessionReferenceNumber}/close`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to close batch session: ${error.exception?.description || response.statusText}`);
    }
  }

  /**
   * Get batch session status
   * GET /sessions/batch/{referenceNumber}/status
   * 
   * Note: Uses the same endpoint as online sessions (/sessions/{ref})
   */
  async getBatchSessionStatus(): Promise<{
    status: {
      code: number;
      description: string;
    };
    dateCreated: string;
    dateUpdated: string;
    invoiceCount?: number;
    successfulInvoiceCount?: number;
    failedInvoiceCount?: number;
    upo?: {
      pages: Array<{
        referenceNumber: string;
        downloadUrl: string;
        downloadUrlExpirationDate: string;
      }>;
    };
  }> {
    if (!this.sessionReferenceNumber) {
      throw new Error('No active batch session.');
    }

    const response = await fetch(
      `${this.config.baseUrl}/sessions/${this.sessionReferenceNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get batch session status: ${error.exception?.description || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Wait for batch session to complete processing
   * Polls status until session is processed (status code 200)
   */
  async waitForCompletion(maxAttempts: number = 60, delayMs: number = 5000): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getBatchSessionStatus();

      // Status codes:
      // 100 - Session opened
      // 170 - Session closed
      // 200 - Session processed successfully
      if (status.status.code === 200) {
        return;
      }

      // Check for error states
      if (status.status.code >= 400) {
        throw new Error(`Batch session processing failed: ${status.status.description}`);
      }

      // Wait before next poll (longer delay for batch sessions)
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Batch session processing timeout');
  }

  /**
   * Complete batch submission workflow
   * Handles entire flow from ZIP creation to UPO retrieval
   */
  async submitBatch(
    invoices: Array<{ fileName: string; content: string }>,
    formCode: string = 'FA',
    schemaVersion: string = '1-0E'
  ): Promise<{
    sessionReferenceNumber: string;
    invoiceCount: number;
    successfulCount: number;
    failedCount: number;
    upoPages: Array<{
      referenceNumber: string;
      downloadUrl: string;
    }>;
  }> {
    try {
      // 1. Create ZIP archive
      const zipData = await this.createZipArchive(invoices);

      // 2. Calculate ZIP metadata
      const zipMetadata = await this.calculateZipMetadata(zipData);

      // 3. Split ZIP into parts
      const parts = this.splitZipIntoParts(zipData);

      // 4. Encrypt parts and prepare metadata
      const encryptedParts: Array<{
        ordinalNumber: number;
        fileName: string;
        hash: string;
        size: number;
        data: Uint8Array;
      }> = [];

      for (let i = 0; i < parts.length; i++) {
        const encrypted = await this.encryptPart(
          parts[i],
          this.encryptionData!.symmetricKey,
          this.encryptionData!.iv
        );

        encryptedParts.push({
          ordinalNumber: i + 1,
          fileName: `part_${i + 1}.zip.aes`,
          hash: encrypted.hash,
          size: encrypted.size,
          data: encrypted.encryptedData,
        });
      }

      // 5. Open batch session
      const session = await this.openBatchSession(
        zipMetadata,
        encryptedParts.map(p => ({
          ordinalNumber: p.ordinalNumber,
          fileName: p.fileName,
          hash: p.hash,
          size: p.size,
        })),
        formCode,
        schemaVersion
      );

      // 6. Upload parts
      for (let i = 0; i < encryptedParts.length; i++) {
        const part = encryptedParts[i];
        const uploadRequest = session.partUploadRequests.find(
          r => r.ordinalNumber === part.ordinalNumber
        );

        if (!uploadRequest) {
          throw new Error(`No upload request found for part ${part.ordinalNumber}`);
        }

        await this.uploadPart(uploadRequest, part.data);
      }

      // 7. Close session
      await this.closeBatchSession();

      // 8. Wait for processing
      await this.waitForCompletion();

      // 9. Get final status
      const finalStatus = await this.getBatchSessionStatus();

      return {
        sessionReferenceNumber: session.referenceNumber,
        invoiceCount: finalStatus.invoiceCount || 0,
        successfulCount: finalStatus.successfulInvoiceCount || 0,
        failedCount: finalStatus.failedInvoiceCount || 0,
        upoPages: finalStatus.upo?.pages || [],
      };
    } finally {
      // Reset session state
      this.reset();
    }
  }

  /**
   * Get current session reference number
   */
  getSessionReferenceNumber(): string | null {
    return this.sessionReferenceNumber;
  }

  /**
   * Reset session state
   */
  reset(): void {
    this.sessionReferenceNumber = null;
    this.encryptionData = null;
  }
}
