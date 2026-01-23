import { KsefService } from './ksefService';
import { KsefContextManager } from './ksefContextManager';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  generateEncryptionData,
  decryptAes256,
  downloadPackagePart,
  unzipPackage,
  extractInvoicesFromPackage,
  parseInvoiceXml,
  getKsefPublicKey,
} from './ksefInvoiceRetrievalHelpersBrowser';

export interface InvoiceMetadata {
  ksefNumber: string;
  invoiceNumber: string;
  issueDate: string;
  sellerNip: string;
  buyerNip?: string;
  totalGrossAmount: number;
  currency: string;
  subjectType: SubjectType;
  permanentStorageDate: string;
}

export interface InvoiceQueryFilters {
  subjectType: SubjectType;
  dateRange: {
    from: Date;
    to?: Date;
    dateType: 'Issue' | 'Invoicing' | 'PermanentStorage';
    restrictToPermanentStorageHwmDate?: boolean;
  };
  invoiceTypes?: string[];
  pageSize?: number;
  pageOffset?: number;
}

export interface InvoiceExportFilters {
  subjectType: SubjectType;
  dateRange: {
    from: Date;
    to?: Date;
    dateType: 'PermanentStorage';
    restrictToPermanentStorageHwmDate: boolean;
  };
  encryption: {
    encryptedSymmetricKey: string;
    initializationVector: string;
  };
}

export interface ExportStatus {
  referenceNumber: string;
  status: 'Processing' | 'Completed' | 'Failed';
  packageParts?: PackagePart[];
  permanentStorageHwmDate?: string;
  lastPermanentStorageDate?: string;
  isTruncated?: boolean;
  invoiceCount?: number;
  errorMessage?: string;
}

export interface PackagePart {
  partNumber: number;
  downloadUrl: string;
}

export interface SyncResult {
  invoicesSynced: number;
  newHwmDate?: string;
  lastStorageDate?: string;
  isTruncated: boolean;
  errors: string[];
}

export type SubjectType = 'subject1' | 'subject2' | 'subject3' | 'subjectAuthorized';

export class KsefInvoiceRetrievalService {
  constructor(
    private businessProfileId: string,
    private ksefService: KsefService,
    private contextManager: KsefContextManager,
    private supabase: SupabaseClient
  ) {}

  /**
   * Fetch a single invoice by KSeF number
   * GET /invoices/ksef/{ksefNumber}
   */
  async getInvoice(ksefNumber: string, ksefToken: string): Promise<string> {
    try {
      const response = await this.ksefService.getInvoice(ksefNumber, ksefToken);
      
      // Store in database
      await this.storeReceivedInvoice({
        ksefNumber,
        invoiceXml: response,
        businessProfileId: this.businessProfileId,
      });

      return response;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  /**
   * Query invoice metadata with filters
   * POST /invoices/query/metadata
   */
  async queryMetadata(
    filters: InvoiceQueryFilters,
    ksefToken: string
  ): Promise<InvoiceMetadata[]> {
    try {
      const response = await this.ksefService.queryInvoiceMetadata(filters, ksefToken);
      return response;
    } catch (error) {
      console.error('Error querying invoice metadata:', error);
      throw error;
    }
  }

  /**
   * Initiate async invoice export
   * POST /invoices/exports
   */
  async initiateExport(
    filters: InvoiceExportFilters,
    ksefToken: string
  ): Promise<string> {
    try {
      const response = await this.ksefService.initiateInvoiceExport(filters, ksefToken);
      return response.referenceNumber;
    } catch (error) {
      console.error('Error initiating export:', error);
      throw error;
    }
  }

  /**
   * Check export status
   * GET /invoices/exports/{referenceNumber}
   */
  async checkExportStatus(
    referenceNumber: string,
    ksefToken: string
  ): Promise<ExportStatus> {
    try {
      const response = await this.ksefService.getExportStatus(referenceNumber, ksefToken);
      return response;
    } catch (error) {
      console.error('Error checking export status:', error);
      throw error;
    }
  }

  /**
   * Download and process export package
   * Downloads all parts, decrypts, unzips, and stores invoices
   */
  async downloadExportPackage(
    referenceNumber: string,
    ksefToken: string,
    encryptionData: { cipherKey: Buffer; cipherIv: Buffer }
  ): Promise<SyncResult> {
    try {
      const status = await this.checkExportStatus(referenceNumber, ksefToken);

      if (status.status !== 'Completed') {
        throw new Error(`Export not completed. Status: ${status.status}`);
      }

      if (!status.packageParts || status.packageParts.length === 0) {
        return {
          invoicesSynced: 0,
          isTruncated: false,
          errors: [],
        };
      }

      // Download all parts
      const parts = await Promise.all(
        status.packageParts.map(part =>
          this.downloadPackagePart(part.downloadUrl, ksefToken)
        )
      );

      // Merge parts into single buffer
      const mergedBuffer = Buffer.concat(parts);

      // Decrypt
      const decryptedBuffer = this.decryptAes256(
        mergedBuffer,
        encryptionData.cipherKey,
        encryptionData.cipherIv
      );

      // Unzip and process
      const invoices = await this.unzipAndProcessInvoices(decryptedBuffer);

      // Store invoices
      let syncedCount = 0;
      const errors: string[] = [];

      for (const invoice of invoices) {
        try {
          await this.storeReceivedInvoice({
            ksefNumber: invoice.ksefNumber,
            invoiceXml: invoice.xml,
            metadata: invoice.metadata,
            businessProfileId: this.businessProfileId,
          });
          syncedCount++;
        } catch (error) {
          errors.push(`Failed to store invoice ${invoice.ksefNumber}: ${error}`);
        }
      }

      return {
        invoicesSynced: syncedCount,
        newHwmDate: status.permanentStorageHwmDate,
        lastStorageDate: status.lastPermanentStorageDate,
        isTruncated: status.isTruncated || false,
        errors,
      };
    } catch (error) {
      console.error('Error downloading export package:', error);
      throw error;
    }
  }

  /**
   * Incremental sync with HWM (High Water Mark)
   * Recommended approach for continuous synchronization
   */
  async syncInvoices(params: {
    subjectType: SubjectType;
    fromDate?: Date;
    useHwm?: boolean;
  }): Promise<SyncResult> {
    try {
      // Get last sync state
      const lastSync = await this.getLastSyncState(params.subjectType);
      const fromDate = params.fromDate || lastSync?.permanentStorageHwmDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago

      // Get KSeF token
      const companyClient = await this.contextManager.forCompany(this.businessProfileId);
      const ksefToken = await companyClient.getAccessToken();

      // Generate encryption data
      const encryptionData = this.generateEncryptionData();

      // Initiate export with HWM
      const filters: InvoiceExportFilters = {
        subjectType: params.subjectType,
        dateRange: {
          from: fromDate,
          dateType: 'PermanentStorage',
          restrictToPermanentStorageHwmDate: params.useHwm !== false,
        },
        encryption: {
          encryptedSymmetricKey: encryptionData.encryptedKey,
          initializationVector: encryptionData.iv,
        },
      };

      const referenceNumber = await this.initiateExport(filters, ksefToken);

      // Poll for completion
      let status: ExportStatus;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5-second intervals

      do {
        await this.sleep(5000); // Wait 5 seconds
        status = await this.checkExportStatus(referenceNumber, ksefToken);
        attempts++;
      } while (status.status === 'Processing' && attempts < maxAttempts);

      if (status.status !== 'Completed') {
        throw new Error(`Export failed or timed out. Status: ${status.status}`);
      }

      // Download and process
      const result = await this.downloadExportPackage(
        referenceNumber,
        ksefToken,
        encryptionData
      );

      // Update sync state
      await this.updateSyncState(params.subjectType, {
        lastSyncAt: new Date(),
        permanentStorageHwmDate: result.newHwmDate,
        lastPermanentStorageDate: result.lastStorageDate,
        invoicesSynced: result.invoicesSynced,
      });

      return result;
    } catch (error) {
      console.error('Error syncing invoices:', error);
      throw error;
    }
  }

  /**
   * Store received invoice in database
   */
  private async storeReceivedInvoice(params: {
    ksefNumber: string;
    invoiceXml: string;
    metadata?: any;
    businessProfileId: string;
  }): Promise<void> {
    // Parse invoice XML to extract metadata
    const metadata = params.metadata || this.parseInvoiceMetadata(params.invoiceXml);

    const { error } = await this.supabase.from('ksef_invoices_received').upsert(
      {
        business_profile_id: params.businessProfileId,
        ksef_number: params.ksefNumber,
        invoice_xml: params.invoiceXml,
        invoice_metadata: metadata,
        subject_type: metadata.subjectType,
        permanent_storage_date: metadata.permanentStorageDate,
        issue_date: metadata.issueDate,
        seller_nip: metadata.sellerNip,
        buyer_nip: metadata.buyerNip,
        total_gross_amount: metadata.totalGrossAmount,
        currency: metadata.currency || 'PLN',
        received_at: new Date().toISOString(),
      },
      { onConflict: 'ksef_number' }
    );

    if (error) {
      throw error;
    }
  }

  /**
   * Get last sync state for subject type
   */
  private async getLastSyncState(subjectType: SubjectType): Promise<any> {
    const { data } = await this.supabase
      .from('ksef_sync_state')
      .select('*')
      .eq('business_profile_id', this.businessProfileId)
      .eq('subject_type', subjectType)
      .single();

    return data;
  }

  /**
   * Update sync state
   */
  private async updateSyncState(
    subjectType: SubjectType,
    state: {
      lastSyncAt: Date;
      permanentStorageHwmDate?: string;
      lastPermanentStorageDate?: string;
      invoicesSynced: number;
    }
  ): Promise<void> {
    await this.supabase.from('ksef_sync_state').upsert({
      business_profile_id: this.businessProfileId,
      subject_type: subjectType,
      last_sync_at: state.lastSyncAt.toISOString(),
      permanent_storage_hwm_date: state.permanentStorageHwmDate,
      last_permanent_storage_date: state.lastPermanentStorageDate,
      invoices_synced: state.invoicesSynced,
    });
  }

  /**
   * Helper methods
   */
  private async downloadPackagePart(url: string, ksefToken: string): Promise<Buffer> {
    return downloadPackagePart(url, ksefToken);
  }

  private decryptAes256(encrypted: Buffer, key: Buffer, iv: Buffer): Buffer {
    return decryptAes256(encrypted, key, iv);
  }

  private async unzipAndProcessInvoices(buffer: Buffer): Promise<any[]> {
    const files = await unzipPackage(buffer);
    const invoices = extractInvoicesFromPackage(files);
    return invoices;
  }

  private parseInvoiceMetadata(xml: string): any {
    return parseInvoiceXml(xml);
  }

  private generateEncryptionData(): any {
    // Use test environment by default since KsefService doesn't expose getEnvironment
    const environment = 'test';
    const publicKey = getKsefPublicKey(environment as 'test' | 'demo' | 'prod');
    return generateEncryptionData(publicKey);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
