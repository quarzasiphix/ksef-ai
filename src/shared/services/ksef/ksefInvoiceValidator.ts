import { Invoice, BusinessProfile, Customer } from '../../types';
import { KsefDuplicateDetection } from './ksefDuplicateDetection';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * KSeF Invoice Validator
 * Validates invoices according to official KSeF 2.0 requirements
 */
export class KsefInvoiceValidator {
  private environment: 'test' | 'production';
  private duplicateDetection?: KsefDuplicateDetection;

  constructor(environment: 'test' | 'production' = 'test', supabase?: SupabaseClient) {
    this.environment = environment;
    if (supabase) {
      this.duplicateDetection = new KsefDuplicateDetection(supabase);
    }
  }

  /**
   * Validate invoice before submission
   */
  validate(
    invoice: Invoice,
    businessProfile: BusinessProfile,
    customer: Customer
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate seller NIP
    if (!businessProfile.taxId) {
      errors.push('Seller NIP is required (Podmiot1:NIP)');
    } else if (this.environment === 'production' && !this.validateNIP(businessProfile.taxId)) {
      errors.push(`Invalid seller NIP checksum: ${businessProfile.taxId}`);
    }

    // 2. Validate buyer NIP (if provided)
    if (customer.taxId) {
      if (this.environment === 'production' && !this.validateNIP(customer.taxId)) {
        errors.push(`Invalid buyer NIP checksum: ${customer.taxId}`);
      }
    }

    // 3. Validate invoice number
    if (!invoice.number || invoice.number.trim() === '') {
      errors.push('Invoice number is required (P_2)');
    }

    // 4. Validate dates
    const issueDate = new Date(invoice.issueDate);
    const now = new Date();
    
    if (issueDate > now) {
      errors.push('Invoice issue date (P_1) cannot be in the future');
    }

    // 5. Validate invoice items
    if (!invoice.items || invoice.items.length === 0) {
      errors.push('Invoice must have at least one item');
    }

    // 6. Validate totals
    const calculatedNet = invoice.items.reduce((sum, item) => 
      sum + (item.quantity || 0) * (item.unitPrice || 0), 0
    );

    const tolerance = 0.01; // 1 cent tolerance for rounding
    if (Math.abs(calculatedNet - (invoice.totalNetValue || 0)) > tolerance) {
      errors.push(`Total net value mismatch. Calculated: ${calculatedNet.toFixed(2)}, Declared: ${(invoice.totalNetValue || 0).toFixed(2)}`);
    }

    // 7. Validate size (will be checked after XML generation)
    // Max 1 MB without attachments, 3 MB with attachments
    // This is a warning since we can't check before XML generation
    warnings.push('Invoice size will be validated after XML generation (max 1 MB)');

    // 8. Validate business profile data
    if (!businessProfile.name) {
      errors.push('Seller name is required');
    }

    if (!businessProfile.address && !businessProfile.city) {
      warnings.push('Seller address is incomplete');
    }

    // 9. Validate customer data
    if (!customer.name) {
      errors.push('Buyer name is required');
    }

    // 10. Check for duplicate prevention data
    if (!invoice.number || !businessProfile.taxId) {
      errors.push('Cannot check for duplicates: missing invoice number or seller NIP');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate NIP checksum
   * Algorithm: weights [6,5,7,2,3,4,5,6,7]
   * Checksum = (sum of digit[i] * weight[i]) % 11
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

  /**
   * Validate XML size
   */
  validateXmlSize(xmlContent: string, hasAttachments: boolean = false): {
    valid: boolean;
    size: number;
    maxSize: number;
    error?: string;
  } {
    const encoder = new TextEncoder();
    const size = encoder.encode(xmlContent).length;
    const maxSize = hasAttachments ? 3_000_000 : 1_000_000; // 3 MB or 1 MB

    return {
      valid: size <= maxSize,
      size,
      maxSize,
      error: size > maxSize 
        ? `Invoice XML size (${size} bytes) exceeds limit (${maxSize} bytes)`
        : undefined,
    };
  }

  /**
   * Check if invoice might be a duplicate
   * Based on: Podmiot1:NIP + RodzajFaktury + P_2
   */
  async checkDuplicate(
    sellerNip: string,
    invoiceType: string,
    invoiceNumber: string,
    supabaseClient: any
  ): Promise<{
    isDuplicate: boolean;
    existingInvoiceId?: string;
  }> {
    try {
      const { data, error } = await supabaseClient
        .from('invoices')
        .select('id, ksef_reference_number')
        .eq('businessProfileId', sellerNip) // Assuming this maps to seller
        .eq('number', invoiceNumber)
        .eq('type', invoiceType)
        .not('ksef_reference_number', 'is', null)
        .limit(1);

      if (error) {
        console.error('Error checking for duplicates:', error);
        return { isDuplicate: false };
      }

      if (data && data.length > 0) {
        return {
          isDuplicate: true,
          existingInvoiceId: data[0].id,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Validate UTF-8 encoding without BOM
   */
  validateEncoding(xmlContent: string): {
    valid: boolean;
    error?: string;
  } {
    // Check for BOM (0xEF 0xBB 0xBF)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(xmlContent);

    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return {
        valid: false,
        error: 'XML must not contain UTF-8 BOM (Byte Order Mark)',
      };
    }

    return { valid: true };
  }

  /**
   * Comprehensive pre-submission validation
   */
  async validateForSubmission(
    invoice: Invoice,
    businessProfile: BusinessProfile,
    customer: Customer,
    xmlContent: string,
    supabaseClient?: any
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Basic invoice validation
    const basicValidation = this.validate(invoice, businessProfile, customer);
    errors.push(...basicValidation.errors);
    warnings.push(...basicValidation.warnings);

    // 2. XML size validation
    const sizeValidation = this.validateXmlSize(xmlContent, false);
    if (!sizeValidation.valid) {
      errors.push(sizeValidation.error!);
    }

    // 3. Duplicate detection (using new service)
    if (this.duplicateDetection && businessProfile.id) {
      try {
        const duplicateResult = await this.duplicateDetection.checkDuplicate({
          sellerNip: businessProfile.taxId || '',
          invoiceType: invoice.type || 'VAT',
          invoiceNumber: invoice.number,
          businessProfileId: businessProfile.id,
        });

        if (duplicateResult.isDuplicate) {
          errors.push(duplicateResult.errorMessage || 'Duplicate invoice detected');
        }
      } catch (error) {
        console.error('Error checking duplicates:', error);
        warnings.push('Could not verify duplicate status');
      }
    }

    // 4. Encoding validation
    const encodingValidation = this.validateEncoding(xmlContent);
    if (!encodingValidation.valid) {
      errors.push(encodingValidation.error!);
    }

    // 4. Duplicate check (if supabase client provided)
    if (supabaseClient && businessProfile.taxId && invoice.number) {
      const duplicateCheck = await this.checkDuplicate(
        businessProfile.taxId,
        invoice.type || 'VAT',
        invoice.number,
        supabaseClient
      );

      if (duplicateCheck.isDuplicate) {
        errors.push(`Duplicate invoice detected. Invoice with same NIP, type, and number already exists in KSeF (ID: ${duplicateCheck.existingInvoiceId})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
