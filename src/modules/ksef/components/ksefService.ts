import { Invoice, BusinessProfile, Customer } from '../../../shared/types';
import { KsefAuthManager } from './ksefAuthManager';
import { KsefSessionManager } from './ksefSessionManager';
import { KsefInvoiceValidator } from './ksefInvoiceValidator';
import { KsefXmlGenerator } from './ksefXmlGenerator';
import { getKsefConfig } from './config';
import { KsefEnvironment } from './types';
import { ksefQrCodeService } from './ksefQrCodeService';

export interface SubmitInvoiceParams {
  invoice: Invoice;
  businessProfile: BusinessProfile;
  customer: Customer;
  ksefToken: string;
  supabaseClient: any;
  offlineMode?: boolean;
}

export interface SubmitInvoiceResult {
  success: boolean;
  referenceNumber?: string;
  sessionReferenceNumber?: string;
  upo?: string;
  warnings?: string[];
  error?: string;
  qrCode?: {
    dataUrl: string;
    url: string;
    label: string;
  };
}

export class KsefService {
  private authManager: KsefAuthManager;
  private sessionManager: KsefSessionManager;
  private validator: KsefInvoiceValidator;
  private xmlGenerator: KsefXmlGenerator;
  private environment: KsefEnvironment;

  constructor(environment: KsefEnvironment = 'test') {
    this.environment = environment;
    const config = getKsefConfig(environment);
    
    this.authManager = new KsefAuthManager(config);
    this.sessionManager = new KsefSessionManager(config);
    this.validator = new KsefInvoiceValidator(environment);
    this.xmlGenerator = new KsefXmlGenerator(config);
  }

  /**
   * Complete invoice submission flow using official KSeF 2.0 specification
   */
  async submitInvoice(params: SubmitInvoiceParams): Promise<SubmitInvoiceResult> {
    const { invoice, businessProfile, customer, ksefToken, supabaseClient } = params;

    try {
      // 1. Generate XML
      const xml = this.xmlGenerator.generateInvoiceXml(invoice, businessProfile, customer);

      // 2. Validate invoice (including XML size, encoding, duplicates)
      const validation = await this.validator.validateForSubmission(
        invoice,
        businessProfile,
        customer,
        xml,
        supabaseClient
      );

      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join('; '),
          warnings: validation.warnings,
        };
      }

      // 3. Authenticate and get access token
      if (!ksefToken) {
        return {
          success: false,
          error: 'KSeF token is required',
        };
      }

      const authResult = await this.authManager.authenticateComplete(
        ksefToken,
        businessProfile.taxId || ''
      );

      // 4. Set access token for session manager
      this.sessionManager.setAccessToken(authResult.accessToken);

      // 5. Open session
      const session = await this.sessionManager.openSession('FA', '1-0E');

      // 6. Send encrypted invoice
      const invoiceResult = await this.sessionManager.sendInvoice(xml);

      // 7. Close session
      await this.sessionManager.closeSession();

      // 8. Wait for processing and get UPO
      await this.sessionManager.waitForCompletion();
      const status = await this.sessionManager.getSessionStatus();

      // 9. Extract UPO download URL
      let upoUrl: string | undefined;
      if (status.upo && status.upo.pages && status.upo.pages.length > 0) {
        upoUrl = status.upo.pages[0].downloadUrl;
      }

      // 10. Generate QR code (CODE I - required for all invoices)
      let qrCodeResult;
      try {
        qrCodeResult = await ksefQrCodeService.generateInvoiceQr({
          sellerNip: businessProfile.taxId || '',
          issueDate: new Date(invoice.issueDate),
          invoiceXml: xml,
          ksefNumber: invoiceResult.invoiceReferenceNumber,
          environment: this.environment === 'production' ? 'prod' : 'test',
        });

        // Store QR code in invoice record
        if (supabaseClient && invoice.id) {
          await supabaseClient
            .from('invoices')
            .update({
              ksef_qr_code: qrCodeResult.qrCodeDataUrl,
              ksef_qr_label: qrCodeResult.label,
              ksef_qr_url: qrCodeResult.url,
            })
            .eq('id', invoice.id);
        }
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        // Don't fail the whole submission if QR generation fails
      }

      return {
        success: true,
        referenceNumber: invoiceResult.invoiceReferenceNumber,
        sessionReferenceNumber: session.referenceNumber,
        upo: upoUrl,
        warnings: validation.warnings,
        qrCode: qrCodeResult ? {
          dataUrl: qrCodeResult.qrCodeDataUrl,
          url: qrCodeResult.url,
          label: qrCodeResult.label,
        } : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      // Reset session state
      this.sessionManager.reset();
    }
  }

  /**
   * Test KSeF connection with authentication
   */
  async testConnection(ksefToken: string, contextNip: string): Promise<{
    success: boolean;
    error?: string;
    accessToken?: string;
  }> {
    try {
      const authResult = await this.authManager.authenticateComplete(ksefToken, contextNip);

      return { 
        success: true,
        accessToken: authResult.accessToken,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Get authentication manager
   */
  getAuthManager(): KsefAuthManager {
    return this.authManager;
  }

  /**
   * Get session manager
   */
  getSessionManager(): KsefSessionManager {
    return this.sessionManager;
  }

  /**
   * Get validator
   */
  getValidator(): KsefInvoiceValidator {
    return this.validator;
  }

  /**
   * Get single invoice by KSeF number
   * GET /invoices/ksef/{ksefNumber}
   */
  async getInvoice(ksefNumber: string, accessToken: string): Promise<string> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/invoices/ksef/${ksefNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch invoice: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Query invoice metadata
   * POST /invoices/query/metadata
   */
  async queryInvoiceMetadata(filters: any, accessToken: string): Promise<any[]> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/invoices/query/metadata`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      throw new Error(`Failed to query metadata: ${response.statusText}`);
    }

    const data = await response.json();
    return data.invoices || [];
  }

  /**
   * Initiate async invoice export
   * POST /invoices/exports
   */
  async initiateInvoiceExport(filters: any, accessToken: string): Promise<{ referenceNumber: string }> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/invoices/exports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filters),
    });

    if (!response.ok) {
      throw new Error(`Failed to initiate export: ${response.statusText}`);
    }

    const data = await response.json();
    return { referenceNumber: data.referenceNumber };
  }

  /**
   * Get export status
   * GET /invoices/exports/{referenceNumber}
   */
  async getExportStatus(referenceNumber: string, accessToken: string): Promise<any> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/invoices/exports/${referenceNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get export status: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get session status
   * GET /sessions/{referenceNumber}
   */
  async getSessionStatus(referenceNumber: string, accessToken: string): Promise<any> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/sessions/${referenceNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get session status: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get session invoices
   * GET /sessions/{referenceNumber}/invoices
   */
  async getSessionInvoices(referenceNumber: string, accessToken: string): Promise<any[]> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/sessions/${referenceNumber}/invoices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get session invoices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.invoices || [];
  }

  /**
   * Get failed invoices from session
   * GET /sessions/{referenceNumber}/invoices/failed
   */
  async getFailedInvoices(referenceNumber: string, accessToken: string): Promise<any[]> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/sessions/${referenceNumber}/invoices/failed`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get failed invoices: ${response.statusText}`);
    }

    const data = await response.json();
    return data.invoices || [];
  }

  /**
   * Download UPO (confirmation)
   * GET /sessions/{referenceNumber}/upo
   */
  async downloadUpo(referenceNumber: string, accessToken: string): Promise<Buffer> {
    const config = getKsefConfig(this.environment);
    const response = await fetch(`${config.apiUrl}/sessions/${referenceNumber}/upo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download UPO: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
