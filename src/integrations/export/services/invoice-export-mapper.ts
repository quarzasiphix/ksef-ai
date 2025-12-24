/**
 * Invoice Export Mapper
 * 
 * Maps internal invoice data model to canonical export XML structure.
 * Keeps internal DB changes isolated from export contract.
 */

import { Invoice, BusinessProfile, Customer } from '@/shared/types';
import {
  ExportInvoice,
  ExportInvoiceType,
  ExportTransactionType,
  ExportPaymentStatus,
  ExportLifecycleStatus,
  ExportKsefStatus,
  ExportPaymentMethod,
  InvoiceDates,
  InvoiceStatusInfo,
  InvoiceParties,
  Party,
  PaymentInfo,
  InvoiceTotals,
  VatInformation,
  ItemsCollection,
  ExportItem,
  ExternalIntegrations,
  AuditInformation,
  ExportMode,
} from '../types/invoice-export';

/**
 * Map internal invoice to export structure
 */
export function mapInvoiceToExport(
  invoice: Invoice,
  businessProfile: BusinessProfile,
  customer: Customer | null,
  mode: ExportMode = 'portable'
): ExportInvoice {
  const exportInvoice: ExportInvoice = {
    '@id': invoice.id,
    '@number': invoice.number,
    '@type': mapInvoiceType(invoice.type),
    '@transactionType': mapTransactionType(invoice.transactionType),
    
    Dates: mapDates(invoice, mode),
    Status: mapStatus(invoice),
    Parties: mapParties(invoice, businessProfile, customer, mode),
    Payment: mapPayment(invoice),
    Totals: mapTotals(invoice),
    VatInfo: mapVatInfo(invoice),
    Items: mapItems(invoice),
  };
  
  // Optional fields
  if (invoice.comments) {
    exportInvoice.Notes = invoice.comments;
  }
  
  // External integrations
  const external = mapExternalIntegrations(invoice);
  if (external) {
    exportInvoice.External = external;
  }
  
  // Forensic mode: audit trail
  if (mode === 'forensic') {
    exportInvoice.Audit = mapAuditInfo(invoice);
  }
  
  return exportInvoice;
}

/**
 * Map invoice type to stable export enum
 */
function mapInvoiceType(type: string): ExportInvoiceType {
  const typeMap: Record<string, ExportInvoiceType> = {
    'sales': 'sales',
    'receipt': 'receipt',
    'proforma': 'proforma',
    'correction': 'correction',
  };
  return typeMap[type] || 'sales';
}

/**
 * Map transaction type to stable export enum
 */
function mapTransactionType(type: string): ExportTransactionType {
  return type === 'income' ? 'income' : 'expense';
}

/**
 * Map dates
 */
function mapDates(invoice: Invoice, mode: ExportMode): InvoiceDates {
  const dates: InvoiceDates = {
    '@issue': invoice.issueDate,
    '@sell': invoice.sellDate,
    '@due': invoice.dueDate,
  };
  
  if (mode === 'forensic') {
    if (invoice.created_at) dates['@created'] = invoice.created_at;
    if (invoice.updated_at) dates['@updated'] = invoice.updated_at;
  }
  
  return dates;
}

/**
 * Map status information
 */
function mapStatus(invoice: Invoice): InvoiceStatusInfo {
  // Determine lifecycle status
  let lifecycle: ExportLifecycleStatus = 'issued';
  const invoiceAny = invoice as any;
  
  if (invoiceAny.lifecycle_status) {
    lifecycle = invoiceAny.lifecycle_status as ExportLifecycleStatus;
  } else if (invoice.status === 'draft') {
    lifecycle = 'draft';
  } else if (invoice.isPaid) {
    lifecycle = invoiceAny.booked_to_ledger ? 'booked' : 'payment_received';
  }
  
  // Determine payment status
  let paymentStatus: ExportPaymentStatus = 'unpaid';
  if (invoice.isPaid) {
    paymentStatus = 'paid';
  } else if (invoice.status === 'overdue') {
    paymentStatus = 'unpaid'; // Still unpaid, just overdue
  }
  
  // KSeF status
  const ksefStatus: ExportKsefStatus = 
    invoice.ksef?.status === 'sent' ? 'sent' :
    invoice.ksef?.status === 'pending' ? 'pending' :
    invoice.ksef?.status === 'error' ? 'error' :
    'none';
  
  // Check if overdue
  const isOverdue = new Date(invoice.dueDate) < new Date() && !invoice.isPaid;
  
  return {
    '@lifecycle': lifecycle,
    '@payment': paymentStatus,
    '@isPaid': invoice.isPaid,
    '@ksef': ksefStatus,
    '@isOverdue': isOverdue,
  };
}

/**
 * Map parties (seller/buyer)
 */
function mapParties(
  invoice: Invoice,
  businessProfile: BusinessProfile,
  customer: Customer | null,
  mode: ExportMode
): InvoiceParties {
  const isIncome = invoice.transactionType === 'income';
  
  const seller: Party = isIncome
    ? mapBusinessProfileToParty(businessProfile, mode)
    : customer 
      ? mapCustomerToParty(customer, mode)
      : mapCompanyToParty(invoice.seller, mode);
  
  const buyer: Party = isIncome
    ? customer
      ? mapCustomerToParty(customer, mode)
      : mapCompanyToParty(invoice.buyer, mode)
    : mapBusinessProfileToParty(businessProfile, mode);
  
  return { Seller: seller, Buyer: buyer };
}

function mapBusinessProfileToParty(profile: BusinessProfile, mode: ExportMode): Party {
  const party: Party = {
    Name: profile.name,
    NIP: profile.taxId,
  };
  
  if (mode === 'forensic') {
    party['@id'] = profile.id;
  }
  
  if (profile.regon) {
    party.REGON = profile.regon;
  }
  
  party.Address = {
    Street: profile.address,
    PostalCode: profile.postalCode,
    City: profile.city,
    Country: profile.country || 'PL',
  };
  
  if (profile.email || profile.phone) {
    party.Contact = {
      Email: profile.email,
      Phone: profile.phone,
    };
  }
  
  return party;
}

function mapCustomerToParty(customer: Customer, mode: ExportMode): Party {
  const party: Party = {
    Name: customer.name,
  };
  
  if (mode === 'forensic') {
    party['@id'] = customer.id;
  }
  
  if (customer.taxId) {
    party.NIP = customer.taxId;
  }
  
  party.Address = {
    Street: customer.address,
    PostalCode: customer.postalCode,
    City: customer.city,
    Country: customer.country || 'PL',
  };
  
  if (customer.email || customer.phone) {
    party.Contact = {
      Email: customer.email,
      Phone: customer.phone,
    };
  }
  
  return party;
}

function mapCompanyToParty(company: any, mode: ExportMode): Party {
  const party: Party = {
    Name: company.name || '',
  };
  
  if (mode === 'forensic' && company.id) {
    party['@id'] = company.id;
  }
  
  if (company.taxId) {
    party.NIP = company.taxId;
  }
  
  if (company.address || company.city || company.postalCode) {
    party.Address = {
      Street: company.address,
      PostalCode: company.postalCode,
      City: company.city,
      Country: 'PL',
    };
  }
  
  return party;
}

/**
 * Map payment information
 */
function mapPayment(invoice: Invoice): PaymentInfo {
  // Map payment method to stable export enum
  const methodMap: Record<string, ExportPaymentMethod> = {
    'transfer': 'transfer',
    'cash': 'cash',
    'card': 'card',
    'other': 'other',
  };
  
  const method = methodMap[invoice.paymentMethod] || 'transfer';
  
  const payment: PaymentInfo = {
    '@method': method,
    '@methodType': invoice.paymentMethod, // Original DB value
    '@currency': invoice.currency || 'PLN',
  };
  
  if (invoice.exchangeRate) {
    payment['@exchangeRate'] = formatDecimal(invoice.exchangeRate);
  }
  
  if (invoice.bankAccountId) {
    payment.BankAccountId = invoice.bankAccountId;
  }
  
  if (invoice.bankAccountNumber) {
    payment.BankAccountNumber = invoice.bankAccountNumber;
  }
  
  const invoiceAny = invoice as any;
  if (invoiceAny.payment_received_at) {
    payment.PaymentReceivedAt = invoiceAny.payment_received_at;
  }
  
  return payment;
}

/**
 * Map totals
 */
function mapTotals(invoice: Invoice): InvoiceTotals {
  return {
    '@currency': invoice.currency || 'PLN',
    Net: formatDecimal(invoice.totalNetValue),
    Vat: formatDecimal(invoice.totalVatValue),
    Gross: formatDecimal(invoice.totalGrossValue),
  };
}

/**
 * Map VAT information
 */
function mapVatInfo(invoice: Invoice): VatInformation {
  const vatEnabled = invoice.vat !== false && !invoice.fakturaBezVAT;
  
  const vatInfo: VatInformation = {
    '@enabled': vatEnabled,
  };
  
  if (!vatEnabled && invoice.vatExemptionReason) {
    vatInfo['@exemptionReason'] = invoice.vatExemptionReason;
    vatInfo['@exemptionReasonCode'] = invoice.vatExemptionReason; // Stable code
  }
  
  if (invoice.vat_exemption_reason) {
    vatInfo['@exemptionReason'] = invoice.vat_exemption_reason;
  }
  
  return vatInfo;
}

/**
 * Map items
 */
function mapItems(invoice: Invoice): ItemsCollection {
  const items: ExportItem[] = invoice.items.map(item => {
    const exportItem: ExportItem = {
      '@id': item.id,
      '@name': item.name,
      '@unit': item.unit,
      '@quantity': formatDecimal(item.quantity, 3),
      
      UnitPrice: formatDecimal(item.unitPrice),
      VatRate: formatDecimal(item.vatRate),
      
      LineTotals: {
        Net: formatDecimal(item.totalNetValue),
        Vat: formatDecimal(item.totalVatValue),
        Gross: formatDecimal(item.totalGrossValue),
      },
    };
    
    if (item.productId) {
      exportItem['@productId'] = item.productId;
    }
    
    if (item.description) {
      exportItem.Description = item.description;
    }
    
    if (item.vatExempt) {
      exportItem.VatExempt = true;
    }
    
    return exportItem;
  });
  
  return {
    '@count': items.length,
    Item: items,
  };
}

/**
 * Map external integrations
 */
function mapExternalIntegrations(invoice: Invoice): ExternalIntegrations | undefined {
  const external: ExternalIntegrations = {};
  let hasAny = false;
  
  // KSeF
  if (invoice.ksef && invoice.ksef.status !== 'none') {
    external.KSeF = {
      '@reference': invoice.ksef.referenceNumber || undefined,
      '@submittedAt': undefined, // TODO: add submitted_at field
    };
    hasAny = true;
  }
  
  // ERP (if fields exist)
  const invoiceAny = invoice as any;
  if (invoiceAny.erp_provider) {
    external.ERP = {
      '@provider': invoiceAny.erp_provider,
      '@entityId': invoiceAny.erp_entity_id,
      '@syncedAt': invoiceAny.erp_synced_at,
      '@status': invoiceAny.erp_sync_status,
    };
    hasAny = true;
  }
  
  // Contract link
  if (invoice.decisionId) {
    external.Contract = {
      '@contractId': invoice.decisionId,
      '@contractNumber': invoice.decisionReference,
    };
    hasAny = true;
  }
  
  return hasAny ? external : undefined;
}

/**
 * Map audit information (forensic mode)
 */
function mapAuditInfo(invoice: Invoice): AuditInformation {
  const invoiceAny = invoice as any;
  
  const audit: AuditInformation = {
    CreatedBy: invoice.user_id,
  };
  
  if (invoiceAny.updated_by) {
    audit.UpdatedBy = invoiceAny.updated_by;
  }
  
  if (invoiceAny.last_event_id) {
    audit.LastEventId = invoiceAny.last_event_id;
  }
  
  if (invoice.decisionId) {
    audit.DecisionId = invoice.decisionId;
    audit.DecisionReference = invoice.decisionReference;
  }
  
  if (invoiceAny.source_invoice_id) {
    audit.SourceInvoiceId = invoiceAny.source_invoice_id;
  }
  
  return audit;
}

/**
 * Format number as decimal string
 */
function formatDecimal(value: number | undefined | null, decimals: number = 2): string {
  if (value === undefined || value === null) return '0.00';
  return value.toFixed(decimals);
}
