import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * KSeF Duplicate Detection Service
 * 
 * According to KSeF 2.0 specification (weryfikacja-faktury.md):
 * - Duplicate detection based on: Seller NIP + Invoice Type + Invoice Number
 * - Global detection across all invoices in KSeF
 * - Error code 440 returned for duplicates
 * - Uniqueness maintained for 10 full years from end of issue year
 */

export interface DuplicateCheckParams {
  sellerNip: string;
  invoiceType: string;
  invoiceNumber: string;
  businessProfileId: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingInvoiceId?: string;
  existingKsefNumber?: string;
  submittedAt?: string;
  errorCode?: number;
  errorMessage?: string;
}

export class KsefDuplicateDetection {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if invoice is a duplicate before submission to KSeF
   * 
   * Checks against:
   * 1. Local ksef_documents_raw table (previously submitted)
   * 2. Local invoices table (if linked to KSeF)
   * 
   * Duplicate criteria (per KSeF spec):
   * - Same Seller NIP (Podmiot1:NIP)
   * - Same Invoice Type (RodzajFaktury)
   * - Same Invoice Number (P_2)
   */
  async checkDuplicate(params: DuplicateCheckParams): Promise<DuplicateCheckResult> {
    const { sellerNip, invoiceType, invoiceNumber, businessProfileId } = params;

    // Check in ksef_documents_raw (submitted invoices)
    const { data: existingDoc, error: docError } = await this.supabase
      .from('ksef_documents_raw')
      .select('id, ksef_reference_number, submitted_at, invoice_number')
      .eq('business_profile_id', businessProfileId)
      .eq('seller_nip', sellerNip)
      .eq('invoice_type', invoiceType)
      .eq('invoice_number', invoiceNumber)
      .limit(1)
      .maybeSingle();

    if (docError && docError.code !== 'PGRST116') {
      throw new Error(`Error checking duplicates: ${docError.message}`);
    }

    if (existingDoc) {
      return {
        isDuplicate: true,
        existingInvoiceId: existingDoc.id,
        existingKsefNumber: existingDoc.ksef_reference_number,
        submittedAt: existingDoc.submitted_at,
        errorCode: 440,
        errorMessage: `Duplicate invoice detected. Invoice ${invoiceNumber} (type: ${invoiceType}) for seller NIP ${sellerNip} was already submitted to KSeF on ${existingDoc.submitted_at}. KSeF reference: ${existingDoc.ksef_reference_number}`,
      };
    }

    // Check in invoices table (if invoice has KSeF reference)
    const { data: existingInvoice, error: invError } = await this.supabase
      .from('invoices')
      .select('id, number, ksef')
      .eq('businessProfileId', businessProfileId)
      .eq('number', invoiceNumber)
      .not('ksef', 'is', null)
      .limit(1)
      .maybeSingle();

    if (invError && invError.code !== 'PGRST116') {
      throw new Error(`Error checking invoice duplicates: ${invError.message}`);
    }

    if (existingInvoice && existingInvoice.ksef) {
      const ksefInfo = existingInvoice.ksef as any;
      if (ksefInfo.referenceNumber) {
        return {
          isDuplicate: true,
          existingInvoiceId: existingInvoice.id,
          existingKsefNumber: ksefInfo.referenceNumber,
          errorCode: 440,
          errorMessage: `Duplicate invoice detected. Invoice ${invoiceNumber} already has KSeF reference: ${ksefInfo.referenceNumber}`,
        };
      }
    }

    return {
      isDuplicate: false,
    };
  }

  /**
   * Check multiple invoices for duplicates (batch check)
   */
  async checkBatchDuplicates(
    invoices: DuplicateCheckParams[]
  ): Promise<Map<string, DuplicateCheckResult>> {
    const results = new Map<string, DuplicateCheckResult>();

    for (const invoice of invoices) {
      const key = `${invoice.sellerNip}-${invoice.invoiceType}-${invoice.invoiceNumber}`;
      const result = await this.checkDuplicate(invoice);
      results.set(key, result);
    }

    return results;
  }

  /**
   * Mark invoice as submitted to prevent future duplicates
   */
  async markAsSubmitted(params: {
    businessProfileId: string;
    sellerNip: string;
    invoiceType: string;
    invoiceNumber: string;
    ksefReferenceNumber: string;
    invoiceXml: string;
  }): Promise<void> {
    const { error } = await this.supabase.from('ksef_documents_raw').insert({
      business_profile_id: params.businessProfileId,
      seller_nip: params.sellerNip,
      invoice_type: params.invoiceType,
      invoice_number: params.invoiceNumber,
      ksef_reference_number: params.ksefReferenceNumber,
      document_xml: params.invoiceXml,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
    });

    if (error) {
      throw new Error(`Failed to mark invoice as submitted: ${error.message}`);
    }
  }

  /**
   * Get duplicate statistics for business profile
   */
  async getDuplicateStats(businessProfileId: string): Promise<{
    totalSubmitted: number;
    duplicateAttempts: number;
    lastDuplicateAt?: string;
  }> {
    // Count total submitted invoices
    const { count: totalSubmitted } = await this.supabase
      .from('ksef_documents_raw')
      .select('id', { count: 'exact', head: true })
      .eq('business_profile_id', businessProfileId);

    // This would require an audit log of duplicate attempts
    // For now, return basic stats
    return {
      totalSubmitted: totalSubmitted || 0,
      duplicateAttempts: 0,
    };
  }

  /**
   * Clean up old duplicate records (older than 10 years per KSeF spec)
   */
  async cleanupOldRecords(businessProfileId: string): Promise<number> {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    tenYearsAgo.setMonth(11, 31); // End of year

    const { data, error } = await this.supabase
      .from('ksef_documents_raw')
      .delete()
      .eq('business_profile_id', businessProfileId)
      .lt('submitted_at', tenYearsAgo.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to cleanup old records: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Validate invoice number format
   * Basic validation - can be extended based on business rules
   */
  validateInvoiceNumber(invoiceNumber: string): boolean {
    if (!invoiceNumber || invoiceNumber.trim().length === 0) {
      return false;
    }

    // Basic format check - adjust based on your numbering scheme
    // Example: FV/2026/001, 2026/01/001, etc.
    const pattern = /^[A-Z0-9\/\-]+$/i;
    return pattern.test(invoiceNumber);
  }

  /**
   * Validate NIP format (10 digits)
   */
  validateNip(nip: string): boolean {
    if (!nip || nip.length !== 10) {
      return false;
    }

    // Check if all characters are digits
    if (!/^\d{10}$/.test(nip)) {
      return false;
    }

    // Validate NIP checksum
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += parseInt(nip[i]) * weights[i];
    }

    const checksum = sum % 11;
    const lastDigit = parseInt(nip[9]);

    return checksum === lastDigit;
  }

  /**
   * Get invoice types from KSeF specification
   */
  getValidInvoiceTypes(): string[] {
    return [
      'VAT',
      'VAT_MP',
      'VAT_RR',
      'VAT_WEW',
      'KOREKTA',
      'ZALICZKOWA',
      'ROZLICZENIOWA',
      'UPROSZCZONA',
      'MARZA',
      'PROCEDURA_MARZY',
      'SAMOFAKTUROWANIE',
      'ODWROTNE_OBCIAZENIE',
      'EKSPORT',
      'IMPORT',
      'WDT',
      'WNT',
    ];
  }

  /**
   * Validate invoice type
   */
  validateInvoiceType(invoiceType: string): boolean {
    return this.getValidInvoiceTypes().includes(invoiceType);
  }
}

/**
 * Create duplicate detection service instance
 */
export function createDuplicateDetection(supabase: SupabaseClient): KsefDuplicateDetection {
  return new KsefDuplicateDetection(supabase);
}
