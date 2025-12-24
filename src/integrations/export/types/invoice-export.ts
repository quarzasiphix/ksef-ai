/**
 * Canonical Invoice Export Schema v1.0
 * 
 * Stable XML contract for invoice data portability.
 * Used for: backups, audits, ERP integration, migrations.
 * 
 * Design principles:
 * - Stable enums (never change export values)
 * - Always include IDs (UUIDs) + human keys (invoice numbers)
 * - Money as decimal strings with dot separator (0.00)
 * - Currency always present
 * - Versioned namespace
 */

export const EXPORT_NAMESPACE = 'https://ksiegai.pl/schema/invoice-export';
export const EXPORT_VERSION = '1.0';

/**
 * Export modes
 */
export type ExportMode = 'portable' | 'forensic';

/**
 * Root export structure
 */
export interface InvoiceExport {
  '@xmlns': string;
  '@version': string;
  '@generatedAt': string;
  
  Source: ExportSource;
  Invoices: InvoicesCollection;
}

export interface ExportSource {
  System: string; // 'Ksiegal'
  BusinessProfileId: string;
  BusinessProfileName: string;
  ExportId: string; // UUID for this export
  ExportMode: ExportMode;
  PeriodFrom?: string; // YYYY-MM-DD
  PeriodTo?: string; // YYYY-MM-DD
}

export interface InvoicesCollection {
  '@count': number;
  Invoice: ExportInvoice[];
}

/**
 * Exported invoice structure
 */
export interface ExportInvoice {
  '@id': string; // UUID
  '@number': string; // Human-readable invoice number
  '@type': ExportInvoiceType;
  '@transactionType': ExportTransactionType;
  
  Dates: InvoiceDates;
  Status: InvoiceStatusInfo;
  Parties: InvoiceParties;
  Payment: PaymentInfo;
  Totals: InvoiceTotals;
  VatInfo: VatInformation;
  Items: ItemsCollection;
  Notes?: string;
  External?: ExternalIntegrations;
  
  // Forensic mode only
  Audit?: AuditInformation;
}

/**
 * Stable export enums (NEVER CHANGE)
 */
export type ExportInvoiceType = 
  | 'sales'        // Faktura VAT
  | 'receipt'      // Rachunek
  | 'proforma'     // Faktura proforma
  | 'correction';  // Faktura korygująca

export type ExportTransactionType = 
  | 'income'       // Przychód
  | 'expense';     // Wydatek

export type ExportPaymentStatus = 
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export type ExportLifecycleStatus = 
  | 'draft'
  | 'issued'
  | 'sent'
  | 'payment_received'
  | 'booked'
  | 'closed';

export type ExportKsefStatus = 
  | 'none'
  | 'pending'
  | 'sent'
  | 'error';

export type ExportPaymentMethod = 
  | 'transfer'
  | 'cash'
  | 'card'
  | 'other';

/**
 * Invoice dates
 */
export interface InvoiceDates {
  '@issue': string;      // YYYY-MM-DD
  '@sell': string;       // YYYY-MM-DD
  '@due': string;        // YYYY-MM-DD
  '@created'?: string;   // ISO datetime (forensic)
  '@updated'?: string;   // ISO datetime (forensic)
}

/**
 * Invoice status
 */
export interface InvoiceStatusInfo {
  '@lifecycle': ExportLifecycleStatus;
  '@payment': ExportPaymentStatus;
  '@isPaid': boolean;
  '@ksef': ExportKsefStatus;
  '@isOverdue'?: boolean;
}

/**
 * Parties (seller/buyer)
 */
export interface InvoiceParties {
  Seller: Party;
  Buyer: Party;
}

export interface Party {
  '@id'?: string; // UUID (forensic)
  Name: string;
  NIP?: string;
  REGON?: string;
  Address?: PartyAddress;
  Contact?: PartyContact;
}

export interface PartyAddress {
  Street?: string;
  BuildingNumber?: string;
  ApartmentNumber?: string;
  PostalCode?: string;
  City?: string;
  Country?: string; // ISO code
}

export interface PartyContact {
  Email?: string;
  Phone?: string;
}

/**
 * Payment information
 */
export interface PaymentInfo {
  '@method': ExportPaymentMethod;
  '@methodType'?: string; // Original DB value
  '@currency': string; // ISO code (PLN, EUR, USD)
  '@exchangeRate'?: string; // Decimal string
  
  BankAccountId?: string;
  BankAccountNumber?: string;
  PaidAt?: string; // ISO datetime
  PaymentReceivedAt?: string; // ISO datetime (forensic)
}

/**
 * Invoice totals
 */
export interface InvoiceTotals {
  '@currency': string;
  Net: string;    // Decimal string: 1234.56
  Vat: string;    // Decimal string: 283.95
  Gross: string;  // Decimal string: 1518.51
}

/**
 * VAT information
 */
export interface VatInformation {
  '@enabled': boolean;
  '@exemptionReason'?: string; // Art. reference or code
  '@exemptionReasonCode'?: string; // Stable code
}

/**
 * Items collection
 */
export interface ItemsCollection {
  '@count': number;
  Item: ExportItem[];
}

export interface ExportItem {
  '@id': string; // UUID
  '@productId'?: string; // UUID
  '@name': string;
  '@unit': string;
  '@quantity': string; // Decimal string: 1.000
  
  Description?: string;
  UnitPrice: string; // Decimal string (net)
  VatRate: string; // Decimal string: 23.00 or -1 for exempt
  VatExempt?: boolean;
  
  LineTotals: ItemTotals;
}

export interface ItemTotals {
  Net: string;
  Vat: string;
  Gross: string;
}

/**
 * External integrations (optional)
 */
export interface ExternalIntegrations {
  KSeF?: KsefIntegration;
  ERP?: ErpIntegration;
  Stripe?: StripeIntegration;
  Contract?: ContractLink;
}

export interface KsefIntegration {
  '@reference'?: string;
  '@upo'?: string;
  '@submittedAt'?: string;
  '@signedXmlIncluded'?: boolean; // If true, signed XML in separate file
}

export interface ErpIntegration {
  '@provider'?: string;
  '@entityId'?: string;
  '@syncedAt'?: string;
  '@status'?: string;
}

export interface StripeIntegration {
  '@checkoutSessionId'?: string;
  '@paymentIntentId'?: string;
}

export interface ContractLink {
  '@contractId'?: string;
  '@contractNumber'?: string;
}

/**
 * Audit information (forensic mode only)
 */
export interface AuditInformation {
  CreatedBy: string; // User ID
  UpdatedBy?: string;
  LastEventId?: string;
  DecisionId?: string;
  DecisionReference?: string;
  SourceInvoiceId?: string; // For corrections
  LinkedAccountingEntries?: string[]; // KP entry IDs
}

/**
 * Export request
 */
export interface InvoiceExportRequest {
  businessProfileId: string;
  mode: ExportMode;
  periodFrom?: string; // YYYY-MM-DD
  periodTo?: string; // YYYY-MM-DD
  invoiceIds?: string[]; // Specific invoices
  includeKsefXml?: boolean; // Include signed XML files
}

/**
 * Export result
 */
export interface InvoiceExportResult {
  success: boolean;
  xml?: string;
  fileSize?: number;
  invoiceCount?: number;
  errors?: ExportError[];
  warnings?: ExportWarning[];
  generatedAt: string;
  exportId: string;
}

export interface ExportError {
  code: string;
  message: string;
  invoiceId?: string;
  field?: string;
}

export interface ExportWarning {
  code: string;
  message: string;
  invoiceId?: string;
}
