import { KsefConfig, SessionResponse } from './types';
import { KsefCryptography } from './ksefCryptography';

/**
 * KSeF Session Manager
 * Manages online session lifecycle according to official KSeF 2.0 specification
 */
export class KsefSessionManager {
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
   * Open a new online session
   * POST /sessions/online
   */
  async openSession(formCode: string = 'FA', schemaVersion: string = '1-0E'): Promise<{
    referenceNumber: string;
    validUntil: string;
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
      encryptionKey: {
        encryptedSymmetricKey: this.encryptionData.encryptedKey,
        initializationVector: btoa(String.fromCharCode(...this.encryptionData.iv)),
      },
    };

    const response = await fetch(`${this.config.baseUrl}/sessions/online`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to open session: ${error.exception?.description || response.statusText}`);
    }

    const data = await response.json();
    this.sessionReferenceNumber = data.referenceNumber;

    return {
      referenceNumber: data.referenceNumber,
      validUntil: data.validUntil,
    };
  }

  /**
   * Send encrypted invoice to session
   * POST /sessions/online/{referenceNumber}/invoices
   */
  async sendInvoice(invoiceXml: string): Promise<{
    invoiceReferenceNumber: string;
  }> {
    if (!this.sessionReferenceNumber) {
      throw new Error('No active session. Call openSession first.');
    }

    if (!this.encryptionData) {
      throw new Error('No encryption data available.');
    }

    // Calculate original invoice metadata
    const originalMetadata = await this.cryptography.calculateInvoiceMetadata(invoiceXml);

    // Encrypt invoice
    const encryptedData = await this.cryptography.encryptInvoice(
      invoiceXml,
      this.encryptionData.symmetricKey,
      this.encryptionData.iv
    );

    const requestBody = {
      invoiceHash: originalMetadata.hash,
      invoiceSize: originalMetadata.size,
      encryptedInvoiceHash: encryptedData.hash,
      encryptedInvoiceSize: encryptedData.size,
      encryptedInvoiceContent: encryptedData.encryptedContent,
    };

    const response = await fetch(
      `${this.config.baseUrl}/sessions/online/${this.sessionReferenceNumber}/invoices`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to send invoice: ${error.exception?.description || response.statusText}`);
    }

    const data = await response.json();

    return {
      invoiceReferenceNumber: data.referenceNumber,
    };
  }

  /**
   * Close the session
   * POST /sessions/online/{referenceNumber}/close
   */
  async closeSession(): Promise<void> {
    if (!this.sessionReferenceNumber) {
      throw new Error('No active session to close.');
    }

    const response = await fetch(
      `${this.config.baseUrl}/sessions/online/${this.sessionReferenceNumber}/close`,
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
      throw new Error(`Failed to close session: ${error.exception?.description || response.statusText}`);
    }
  }

  /**
   * Get session status and UPO
   * GET /sessions/online/{referenceNumber}/status
   */
  async getSessionStatus(): Promise<{
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
      throw new Error('No active session.');
    }

    const response = await fetch(
      `${this.config.baseUrl}/sessions/online/${this.sessionReferenceNumber}/status`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get session status: ${error.exception?.description || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get list of invoices in session
   * GET /sessions/online/{referenceNumber}/invoices
   */
  async getSessionInvoices(pageSize: number = 10, continuationToken?: string): Promise<{
    invoices: Array<{
      referenceNumber: string;
      invoiceNumber?: string;
      ksefNumber?: string;
      status: {
        code: number;
        description: string;
      };
    }>;
    continuationToken?: string;
  }> {
    if (!this.sessionReferenceNumber) {
      throw new Error('No active session.');
    }

    const params = new URLSearchParams({
      pageSize: pageSize.toString(),
    });

    if (continuationToken) {
      params.append('continuationToken', continuationToken);
    }

    const response = await fetch(
      `${this.config.baseUrl}/sessions/online/${this.sessionReferenceNumber}/invoices?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get session invoices: ${error.exception?.description || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Wait for session to complete processing
   * Polls status until session is processed (status code 200)
   */
  async waitForCompletion(maxAttempts: number = 30, delayMs: number = 2000): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getSessionStatus();

      // Status codes:
      // 100 - Session opened
      // 170 - Session closed
      // 200 - Session processed successfully
      if (status.status.code === 200) {
        return;
      }

      // Check for error states
      if (status.status.code >= 400) {
        throw new Error(`Session processing failed: ${status.status.description}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Session processing timeout');
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
