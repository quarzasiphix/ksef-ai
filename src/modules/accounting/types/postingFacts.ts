/**
 * Posting Facts Bundle
 * 
 * Normalized invoice data for posting rules engine.
 * This abstraction makes posting rules "document aware" and future-proof
 * for corrections, advances, multi-currency, etc.
 */

export interface VatRateBreakdown {
  rate: number;
  net_amount: number;
  vat_amount: number;
}

export type InvoiceKind = 'income' | 'expense';
export type VatStatus = 'vat' | 'no_vat' | 'reverse_charge' | 'exempt' | 'margin';
export type PaymentMethod = 'bank' | 'cash' | 'card' | 'other';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type DocumentType = 'invoice' | 'correction' | 'advance' | 'final' | 'proforma';

export interface PostingFacts {
  // Core invoice identification
  invoice_id: string;
  invoice_number: string;
  invoice_kind: InvoiceKind;
  issue_date: string;
  
  // Financial data (in minor units - grosze)
  total_net_minor: number;
  total_vat_minor: number;
  total_gross_minor: number;
  
  // Currency and FX
  currency: string;
  fx_rate?: number;
  fx_date?: string;
  
  // VAT breakdown
  vat_status: VatStatus;
  vat_rates: VatRateBreakdown[];
  
  // Payment information
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_term_days?: number;
  payment_date?: string;
  
  // Contractor information
  contractor_id?: string;
  contractor_nip?: string;
  contractor_name?: string;
  contractor_country?: string;
  contractor_is_eu?: boolean;
  
  // KSeF tracking (independent from accounting)
  ksef_submitted: boolean;
  ksef_reference_number?: string;
  ksef_session_reference_number?: string;
  ksef_upo_url?: string;
  ksef_status?: string;
  
  // Document type (future-proof)
  document_type: DocumentType;
  corrects_invoice_id?: string;
  advance_invoice_id?: string;
  
  // Business context
  business_profile_id: string;
  accounting_period_id?: string;
  
  // Additional metadata
  category?: string;
  project_id?: string;
  department_id?: string;
  cost_center?: string;
  tags?: string[];
  notes?: string;
}

/**
 * Convert invoice database record to PostingFacts
 */
export function invoiceToPostingFacts(invoice: any): PostingFacts {
  return {
    // Core
    invoice_id: invoice.id,
    invoice_number: invoice.number,
    invoice_kind: invoice.transaction_type as InvoiceKind,
    issue_date: invoice.issue_date,
    
    // Financial (convert to minor units if needed)
    total_net_minor: Math.round((invoice.total_net_value || 0) * 100),
    total_vat_minor: Math.round((invoice.total_vat_value || 0) * 100),
    total_gross_minor: Math.round((invoice.total_gross_value || 0) * 100),
    
    // Currency
    currency: invoice.currency || 'PLN',
    fx_rate: invoice.fx_rate,
    fx_date: invoice.fx_date,
    
    // VAT
    vat_status: determineVatStatus(invoice),
    vat_rates: extractVatRates(invoice),
    
    // Payment
    payment_method: invoice.payment_method || 'bank',
    payment_status: invoice.payment_status || 'unpaid',
    payment_term_days: invoice.payment_term_days,
    payment_date: invoice.payment_date,
    
    // Contractor
    contractor_id: invoice.customer_id,
    contractor_nip: invoice.customer_nip,
    contractor_name: invoice.customer_name,
    contractor_country: invoice.customer_country,
    contractor_is_eu: invoice.customer_is_eu,
    
    // KSeF
    ksef_submitted: invoice.ksef_status === 'submitted',
    ksef_reference_number: invoice.ksef_reference_number,
    ksef_session_reference_number: invoice.ksef_session_reference_number,
    ksef_upo_url: invoice.ksef_upo,
    ksef_status: invoice.ksef_status,
    
    // Document type
    document_type: invoice.document_type || 'invoice',
    corrects_invoice_id: invoice.corrects_invoice_id,
    advance_invoice_id: invoice.advance_invoice_id,
    
    // Business context
    business_profile_id: invoice.business_profile_id,
    accounting_period_id: invoice.accounting_period_id,
    
    // Metadata
    category: invoice.category,
    project_id: invoice.project_id,
    department_id: invoice.department_id,
    cost_center: invoice.cost_center,
    tags: invoice.tags,
    notes: invoice.notes,
  };
}

/**
 * Determine VAT status from invoice data
 */
function determineVatStatus(invoice: any): VatStatus {
  if (invoice.vat_status) return invoice.vat_status;
  if (invoice.total_vat_value === 0 || invoice.total_vat_value === null) return 'no_vat';
  if (invoice.reverse_charge) return 'reverse_charge';
  if (invoice.vat_exempt) return 'exempt';
  return 'vat';
}

/**
 * Extract VAT rate breakdown from invoice
 */
function extractVatRates(invoice: any): VatRateBreakdown[] {
  // If invoice has line items with VAT rates
  if (invoice.items && Array.isArray(invoice.items)) {
    const rateMap = new Map<number, VatRateBreakdown>();
    
    invoice.items.forEach((item: any) => {
      const rate = item.vat_rate || 0;
      const existing = rateMap.get(rate);
      
      if (existing) {
        existing.net_amount += item.net_value || 0;
        existing.vat_amount += item.vat_value || 0;
      } else {
        rateMap.set(rate, {
          rate,
          net_amount: item.net_value || 0,
          vat_amount: item.vat_value || 0,
        });
      }
    });
    
    return Array.from(rateMap.values());
  }
  
  // Fallback: single rate from totals
  const vatRate = invoice.vat_rate || 23;
  return [{
    rate: vatRate,
    net_amount: invoice.total_net_value || 0,
    vat_amount: invoice.total_vat_value || 0,
  }];
}

/**
 * Validate posting facts for completeness
 */
export function validatePostingFacts(facts: PostingFacts): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!facts.invoice_id) errors.push('Missing invoice_id');
  if (!facts.invoice_number) errors.push('Missing invoice_number');
  if (!facts.invoice_kind) errors.push('Missing invoice_kind');
  if (!facts.issue_date) errors.push('Missing issue_date');
  if (!facts.business_profile_id) errors.push('Missing business_profile_id');
  
  // Financial validation
  if (facts.total_gross_minor <= 0) {
    errors.push('Total gross amount must be greater than zero');
  }
  
  // VAT validation
  if (facts.vat_status === 'vat' && facts.vat_rates.length === 0) {
    warnings.push('VAT status is "vat" but no VAT rates provided');
  }
  
  // Currency validation
  if (facts.currency !== 'PLN' && !facts.fx_rate) {
    warnings.push('Foreign currency invoice without FX rate');
  }
  
  // KSeF validation
  if (facts.ksef_submitted && !facts.ksef_reference_number) {
    warnings.push('KSeF submitted but no reference number');
  }
  
  // Contractor validation
  if (facts.invoice_kind === 'expense' && !facts.contractor_id) {
    warnings.push('Expense invoice without contractor');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
