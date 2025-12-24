/**
 * Invoice Export Service
 * 
 * Orchestrates invoice export: fetch data, map, generate XML, validate.
 */

import { supabase } from '@/integrations/supabase/client';
import { Invoice, BusinessProfile, Customer } from '@/shared/types';
import {
  InvoiceExport,
  ExportSource,
  InvoicesCollection,
  InvoiceExportRequest,
  InvoiceExportResult,
  ExportMode,
  EXPORT_NAMESPACE,
  EXPORT_VERSION,
} from '../types/invoice-export';
import { mapInvoiceToExport } from './invoice-export-mapper';
import { generateInvoiceExportXml } from './invoice-export-generator';
import { v4 as uuidv4 } from 'uuid';

/**
 * Export invoices to XML
 */
export async function exportInvoices(
  request: InvoiceExportRequest
): Promise<InvoiceExportResult> {
  const exportId = uuidv4();
  const generatedAt = new Date().toISOString();
  
  try {
    // Fetch business profile
    const businessProfile = await fetchBusinessProfile(request.businessProfileId);
    if (!businessProfile) {
      return {
        success: false,
        errors: [{
          code: 'BUSINESS_PROFILE_NOT_FOUND',
          message: `Business profile ${request.businessProfileId} not found`,
        }],
        generatedAt,
        exportId,
      };
    }
    
    // Fetch invoices
    const invoices = await fetchInvoices(request);
    if (invoices.length === 0) {
      return {
        success: false,
        errors: [{
          code: 'NO_INVOICES_FOUND',
          message: 'No invoices found matching the criteria',
        }],
        generatedAt,
        exportId,
      };
    }
    
    // Fetch customers (batch)
    const customerIds = [...new Set(invoices.map(inv => inv.customerId).filter(Boolean))];
    const customers = await fetchCustomers(customerIds);
    const customerMap = new Map(customers.map(c => [c.id, c]));
    
    // Map invoices to export structure
    const exportInvoices = invoices.map(invoice => {
      const customer = invoice.customerId ? customerMap.get(invoice.customerId) : null;
      return mapInvoiceToExport(invoice, businessProfile, customer || null, request.mode);
    });
    
    // Build export structure
    const exportData: InvoiceExport = {
      '@xmlns': EXPORT_NAMESPACE,
      '@version': EXPORT_VERSION,
      '@generatedAt': generatedAt,
      
      Source: {
        System: 'Ksiegal',
        BusinessProfileId: businessProfile.id,
        BusinessProfileName: businessProfile.name,
        ExportId: exportId,
        ExportMode: request.mode,
        PeriodFrom: request.periodFrom,
        PeriodTo: request.periodTo,
      },
      
      Invoices: {
        '@count': exportInvoices.length,
        Invoice: exportInvoices,
      },
    };
    
    // Generate XML
    const xml = generateInvoiceExportXml(exportData);
    
    // Calculate file size
    const fileSize = Buffer.byteLength(xml, 'utf8');
    
    return {
      success: true,
      xml,
      fileSize,
      invoiceCount: invoices.length,
      errors: [],
      warnings: [],
      generatedAt,
      exportId,
    };
    
  } catch (error) {
    console.error('Invoice export error:', error);
    return {
      success: false,
      errors: [{
        code: 'EXPORT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error during export',
      }],
      generatedAt,
      exportId,
    };
  }
}

/**
 * Fetch business profile
 */
async function fetchBusinessProfile(profileId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('id', profileId)
    .single();
  
  if (error || !data) {
    console.error('Error fetching business profile:', error);
    return null;
  }
  
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    taxId: data.tax_id,
    address: data.address,
    postalCode: data.postal_code,
    city: data.city,
    country: data.country,
    regon: data.regon,
    email: data.email,
    phone: data.phone,
    entityType: data.entity_type,
    is_vat_exempt: data.is_vat_exempt,
    vat_exemption_reason: data.vat_exemption_reason,
  } as BusinessProfile;
}

/**
 * Fetch invoices based on request criteria
 */
async function fetchInvoices(request: InvoiceExportRequest): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      business_profiles!inner(id, name, tax_id, address, city, postal_code, country, regon, email, phone),
      customers(id, name, tax_id, address, city, postal_code, country, email, phone),
      invoice_items(*)
    `)
    .eq('business_profile_id', request.businessProfileId);
  
  // Filter by specific invoice IDs
  if (request.invoiceIds && request.invoiceIds.length > 0) {
    query = query.in('id', request.invoiceIds);
  }
  
  // Filter by period
  if (request.periodFrom) {
    query = query.gte('issue_date', request.periodFrom);
  }
  if (request.periodTo) {
    query = query.lte('issue_date', request.periodTo);
  }
  
  // Order by issue date
  query = query.order('issue_date', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching invoices:', error);
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }
  
  if (!data || data.length === 0) {
    return [];
  }
  
  // Map database response to Invoice type
  return data.map(mapDatabaseInvoiceToInvoice);
}

/**
 * Fetch customers by IDs
 */
async function fetchCustomers(customerIds: string[]): Promise<Customer[]> {
  if (customerIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .in('id', customerIds);
  
  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  
  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    taxId: c.tax_id,
    address: c.address,
    postalCode: c.postal_code,
    city: c.city,
    country: c.country,
    email: c.email,
    phone: c.phone,
    user_id: c.user_id,
    business_profile_id: c.business_profile_id,
    customerType: c.customer_type,
  } as Customer));
}

/**
 * Map database invoice to Invoice type
 * (Simplified version - reuse from invoiceRepository if available)
 */
function mapDatabaseInvoiceToInvoice(dbInvoice: any): Invoice {
  const businessProfile = dbInvoice.business_profiles;
  const customer = dbInvoice.customers;
  
  const items = (dbInvoice.invoice_items || []).map((item: any) => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    vatRate: item.vat_exempt ? -1 : Number(item.vat_rate),
    vatExempt: item.vat_exempt,
    unit: item.unit,
    totalNetValue: Number(item.total_net_value),
    totalGrossValue: Number(item.total_gross_value),
    totalVatValue: Number(item.total_vat_value),
  }));
  
  return {
    id: dbInvoice.id,
    number: dbInvoice.number,
    type: dbInvoice.type,
    transactionType: dbInvoice.transaction_type,
    issueDate: dbInvoice.issue_date,
    dueDate: dbInvoice.due_date,
    sellDate: dbInvoice.sell_date,
    date: dbInvoice.issue_date,
    businessProfileId: dbInvoice.business_profile_id,
    customerId: dbInvoice.customer_id,
    items,
    paymentMethod: dbInvoice.payment_method,
    isPaid: dbInvoice.is_paid,
    paid: dbInvoice.is_paid,
    status: dbInvoice.status,
    comments: dbInvoice.comments,
    totalNetValue: Number(dbInvoice.total_net_value),
    totalGrossValue: Number(dbInvoice.total_gross_value),
    totalVatValue: Number(dbInvoice.total_vat_value),
    totalAmount: Number(dbInvoice.total_gross_value),
    ksef: {
      status: dbInvoice.ksef_status || 'none',
      referenceNumber: dbInvoice.ksef_reference_number,
    },
    user_id: dbInvoice.user_id,
    seller: businessProfile ? {
      id: businessProfile.id,
      name: businessProfile.name,
      taxId: businessProfile.tax_id,
      address: businessProfile.address,
      city: businessProfile.city,
      postalCode: businessProfile.postal_code,
    } : { name: '', taxId: '', address: '', city: '', postalCode: '' },
    buyer: customer ? {
      id: customer.id,
      name: customer.name,
      taxId: customer.tax_id,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postal_code,
    } : { name: '', taxId: '', address: '', city: '', postalCode: '' },
    businessName: businessProfile?.name,
    customerName: customer?.name,
    bankAccountId: dbInvoice.bank_account_id,
    decisionId: dbInvoice.decision_id,
    decisionReference: dbInvoice.decision_reference,
    currency: dbInvoice.currency || 'PLN',
    created_at: dbInvoice.created_at,
    updated_at: dbInvoice.updated_at,
    vat: dbInvoice.vat,
    vatExemptionReason: dbInvoice.vat_exemption_reason,
    fakturaBezVAT: dbInvoice.vat === false,
    exchangeRate: dbInvoice.exchange_rate,
  } as Invoice;
}
