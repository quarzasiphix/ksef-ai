import { supabase } from "../client";
import { 
  InvoiceItem, 
  InvoiceType, 
  TransactionType, 
  InvoiceStatus, 
  VatExemptionReason, 
  KsefInfo, 
  Invoice, 
  Company, 
  InvoiceItem as InvoiceItemType,
  PaymentMethod
} from "@/types";
import { PaymentMethodDb } from "@/types/common";
import { toPaymentMethodUi } from "@/lib/invoice-utils";
import { useAuth } from "@/hooks/useAuth";
import { format } from 'date-fns';
import { getPeriodDates } from '@/lib/date-utils';
import { shareInvoiceWithUser } from "./invoiceShareRepository";
import { getCustomers } from "./customerRepository";


interface DatabaseInvoiceResponse {
  id: string;
  number: string;
  type: string;
  transaction_type: string;
  issue_date: string;
  due_date: string;
  sell_date: string;
  business_profile_id: string;
  customer_id: string | null;
  payment_method: PaymentMethodDb;
  is_paid: boolean;
  comments: string | null;
  total_net_value: number;
  total_gross_value: number;
  total_vat_value: number;
  ksef_status: string | null;
  ksef_reference_number: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  vat: boolean;
  vat_exemption_reason: string | null;
  status: string | null;
  business_profiles: {
    id: string;
    name: string;
    user_id: string;
    tax_id: string;
    address: string;
    city: string;
    postal_code: string;
  } | null;
  customers: {
    id: string;
    name: string;
    user_id: string;
    tax_id: string;
    address: string;
    city: string;
    postal_code: string;
  } | null;
  invoice_items: {
    id: string;
    product_id: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
    unit: string;
    total_net_value: number;
    total_gross_value: number;
    total_vat_value: number;
    vat_exempt: boolean;
  }[];
  currency: string;
  bank_account_id?: string | null;
  exchange_rate?: number | null;
}

const mapDatabaseInvoiceToInvoice = (dbInvoice: DatabaseInvoiceResponse): Invoice => {
  const businessProfile = dbInvoice.business_profiles;
  const customer = dbInvoice.customers;

  const items: InvoiceItem[] = (dbInvoice.invoice_items as any[] || []).map((item: any) => ({
    id: item.id,
    productId: item.product_id || undefined,
    name: item.name || 'Unknown Item',
    description: item.description || '',
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unit_price) || 0,
    vatRate: item.vat_exempt ? -1 : (Number(item.vat_rate) || 0),
    vatExempt: item.vat_exempt || false,
    unit: item.unit || 'szt',
    totalNetValue: Number(item.total_net_value) || 0,
    totalGrossValue: Number(item.total_gross_value) || 0,
    totalVatValue: Number(item.total_vat_value) || 0
  }));

  const invoice: Invoice = {
    id: dbInvoice.id,
    number: dbInvoice.number,
    type: dbInvoice.type as InvoiceType,
    transactionType: dbInvoice.transaction_type as TransactionType,
    issueDate: dbInvoice.issue_date,
    dueDate: dbInvoice.due_date,
    sellDate: dbInvoice.sell_date,
    date: dbInvoice.issue_date,
    businessProfileId: dbInvoice.business_profile_id,
    customerId: dbInvoice.customer_id || '',
    items,
    paymentMethod: dbInvoice.payment_method as PaymentMethodDb,
    isPaid: dbInvoice.is_paid || false,
    paid: dbInvoice.is_paid || false,
    status: dbInvoice.status as InvoiceStatus,
    comments: dbInvoice.comments || "",
    totalNetValue: Number(dbInvoice.total_net_value) || 0,
    totalGrossValue: Number(dbInvoice.total_gross_value) || 0,
    totalVatValue: Number(dbInvoice.total_vat_value) || 0,
    totalAmount: Number(dbInvoice.total_gross_value) || 0,
    ksef: {
      status: (dbInvoice.ksef_status as KsefInfo['status']) || 'none',
      referenceNumber: dbInvoice.ksef_reference_number || null
    } as KsefInfo,
    user_id: dbInvoice.user_id,
    seller: businessProfile ? {
      id: businessProfile.id,
      name: businessProfile.name,
      taxId: businessProfile.tax_id || '',
      address: businessProfile.address || '',
      city: businessProfile.city || '',
      postalCode: businessProfile.postal_code || ''
    } as Company : { name: '', taxId: '', address: '', city: '', postalCode: '' },
    buyer: customer ? {
      id: customer.id,
      name: customer.name,
      taxId: customer.tax_id || '',
      address: customer.address || '',
      city: customer.city || '',
      postalCode: customer.postal_code || ''
    } as Company : { name: '', taxId: '', address: '', city: '', postalCode: '' },
    businessName: businessProfile?.name || '',
    customerName: customer?.name || '',
    bankAccountId: dbInvoice.bank_account_id || null,
    bankAccountNumber: undefined,
    created_at: dbInvoice.created_at,
    updated_at: dbInvoice.updated_at,
    vat: typeof dbInvoice.vat === 'boolean' ? dbInvoice.vat : true,
    vatExemptionReason: (dbInvoice.vat_exemption_reason as VatExemptionReason | null) ?? undefined,
    fakturaBezVAT: dbInvoice.vat === false,
    currency: dbInvoice.currency || 'PLN',
    exchangeRate: dbInvoice.exchange_rate || null
  };

  return invoice;
};

export async function saveInvoice(invoice: Omit<Invoice, 'id' | 'ksef' | 'vat' | 'vatExemptionReason' | 'date' | 'paid' | 'totalAmount' | 'seller' | 'buyer' | 'businessName' | 'customerName' | 'bankAccountId' | 'bankAccountNumber' | 'created_at' | 'updated_at'> & {
    id?: string,
    ksef?: KsefInfo,
    vat?: boolean,
    vatExemptionReason?: VatExemptionReason | null,
    items: (Omit<InvoiceItem, 'totalNetValue' | 'totalVatValue' | 'totalGrossValue'> & { id?: string, totalNetValue?: number, totalVatValue?: number, totalGrossValue?: number, vatExempt?: boolean })[],
    bankAccountId?: string | null
}): Promise<Invoice> {
  console.log('saveInvoice called with invoice:', invoice);
  
  // Validate required fields
  if (!invoice.user_id) {
    console.error('User ID is missing');
    throw new Error("User ID is required");
  }
  
  // For expenses, we validate the customer instead of business profile
  if (invoice.transactionType === TransactionType.EXPENSE) {
    console.log('Validating expense invoice customer:', invoice.customerId);
    if (!invoice.customerId) {
      console.error('Customer ID is missing for expense');
      throw new Error("Customer is required for expenses");
    }
    
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', invoice.customerId)
        .maybeSingle();
        
      if (customerError) {
        console.error('Error fetching customer for expense:', customerError);
        throw new Error(`Error validating customer: ${customerError.message}`);
      }
      
      if (!customer) {
        console.error('Customer not found:', invoice.customerId);
        throw new Error(`Customer with ID ${invoice.customerId} does not exist`);
      }
    } catch (error) {
      console.error('Customer validation error for expense:', error);
      throw new Error(`Failed to validate customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // For income, validate business profile
    console.log('Validating income invoice business profile:', invoice.businessProfileId);
    if (!invoice.businessProfileId) {
      console.error('Business profile ID is missing for income');
      throw new Error("Business profile is required for income");
    }
    
    try {
      const { data: businessProfile, error: profileError } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('id', invoice.businessProfileId)
        .maybeSingle();
        
      if (profileError) {
        console.error('Error fetching business profile:', profileError);
        throw new Error(`Error validating business profile: ${profileError.message}`);
      }
      
      if (!businessProfile) {
        console.error('Business profile not found:', invoice.businessProfileId);
        throw new Error(`Business profile with ID ${invoice.businessProfileId} does not exist`);
      }
    } catch (error) {
      console.error('Business profile validation error:', error);
      throw new Error(`Failed to validate business profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // For non-expense invoices, validate customer if provided
  if (invoice.customerId && invoice.transactionType !== TransactionType.EXPENSE) {
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', invoice.customerId)
        .maybeSingle();
        
      if (customerError) {
        console.error('Error fetching customer:', customerError);
        throw new Error(`Error validating customer: ${customerError.message}`);
      }
      
      if (!customer) {
        throw new Error(`Customer with ID ${invoice.customerId} does not exist`);
      }
    } catch (error) {
      console.error('Customer validation error:', error);
      throw new Error(`Failed to validate customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  // First, save the invoice
  // Define the database payload type
  type InvoicePayload = {
    user_id: string;
    number: string;
    type: InvoiceType;
    issue_date: string;
    due_date: string;
    sell_date: string;
    business_profile_id: string;
    customer_id: string | null;
    payment_method: PaymentMethodDb;
    is_paid: boolean;
    comments: string | null;
    total_net_value: number;
    total_gross_value: number;
    total_vat_value: number;
    ksef_status: KsefInfo['status'] | null;
    ksef_reference_number: string | null;
    transaction_type: "income" | "expense";
    vat: boolean;
    vat_exemption_reason: VatExemptionReason | null;
    currency: string;
    bank_account_id?: string | null;
    exchange_rate?: number | null;
  };

  const fakturaBezVAT = invoice.fakturaBezVAT ?? (invoice as any).fakturaBezVat ?? false;

  // Ensure payment method is in the correct format for the database
  const paymentMethod: PaymentMethodDb = (() => {
    if (!invoice.paymentMethod) return PaymentMethodDb.TRANSFER;
    const method = typeof invoice.paymentMethod === 'string'
      ? invoice.paymentMethod.toLowerCase()
      : invoice.paymentMethod;

    // Map known UI payment methods to database enum, default to OTHER if unknown string
    switch (method) {
      case PaymentMethod.TRANSFER:
      case 'transfer':
        return PaymentMethodDb.TRANSFER;
      case PaymentMethod.CASH:
      case 'cash':
        return PaymentMethodDb.CASH;
      case PaymentMethod.CARD:
      case 'card':
        return PaymentMethodDb.CARD;
      default:
        return PaymentMethodDb.OTHER;
    }
  })();

  // Create the base payload with required fields
  // Convert the invoice type to match the database's expected format (lowercase)
  const invoiceType = (() => {
    if (!invoice.type) return 'sales';
    const type = invoice.type.toLowerCase();
    if (['sales', 'receipt', 'proforma', 'correction'].includes(type)) {
      return type;
    }
    return 'sales'; // Default fallback
  })();
  
  const totalNetValue = Math.max(0, Number(invoice.totalNetValue) || 0);
  const isVatDisabled = fakturaBezVAT || invoice.vat === false;
  const rawTotalVatValue = Number(invoice.totalVatValue);
  const totalVatValue = isVatDisabled
    ? 0
    : Math.max(0, Number.isFinite(rawTotalVatValue) ? rawTotalVatValue : 0);
  const totalGrossValue = isVatDisabled
    ? totalNetValue
    : totalNetValue + totalVatValue;

  const basePayload: Omit<InvoicePayload, 'transaction_type'> = {
    user_id: invoice.user_id,
    number: invoice.number,
    type: invoiceType as any, // Type assertion needed due to type mismatch between frontend and database enums
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    sell_date: invoice.sellDate,
    business_profile_id: invoice.businessProfileId,
    customer_id: invoice.customerId || null,
    payment_method: paymentMethod,
    is_paid: invoice.isPaid,
    comments: invoice.comments || null,
    total_net_value: totalNetValue,
    total_gross_value: totalGrossValue,
    total_vat_value: totalVatValue,
    ksef_status: invoice.ksef?.status || null,
    ksef_reference_number: invoice.ksef?.referenceNumber || null,
    vat: fakturaBezVAT ? false : (invoice.vat !== undefined ? invoice.vat : true),
    vat_exemption_reason: fakturaBezVAT
      ? (invoice.vatExemptionReason || VatExemptionReason.ART_113_UST_1)
      : invoice.vatExemptionReason,
    currency: invoice.currency || 'PLN',
    bank_account_id: invoice.bankAccountId || null,
    exchange_rate: invoice.exchangeRate || null,
  };

  console.log('Prepared invoice payload:', basePayload);

  // Always include transaction_type, default to 'income' if not provided
  const transactionType = (invoice.transactionType || TransactionType.INCOME).toLowerCase() as TransactionType;
  
  const invoicePayload: InvoicePayload = {
    ...basePayload,
    transaction_type: transactionType === 'income' ? 'income' : 'expense' // Ensure lowercase values
  };

  console.log('Final invoice payload:', invoicePayload);

  let invoiceId: string;

  if (invoice.id) {
    console.log('Updating existing invoice:', invoice.id);
    
    // First, verify the invoice exists
    const { data: existingInvoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", invoice.id)
      .single();
      
    if (fetchError || !existingInvoice) {
      console.error('Invoice not found or error fetching:', invoice.id, fetchError);
      throw new Error('Invoice not found or could not be updated');
    }
    
    // Update the invoice first
    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(invoicePayload)
      .eq("id", invoice.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('Error updating invoice:', updateError);
      throw updateError;
    }
    
    // Delete existing items
    const { error: deleteError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoice.id)
      .eq("user_id", invoice.user_id);
      
    if (deleteError) {
      console.error('Error deleting old invoice items:', deleteError);
      throw deleteError;
    }
    
    invoiceId = invoice.id;
  } else {
    console.log('Creating new invoice');
    // Insert new invoice
    const { data, error } = await supabase
      .from("invoices")
      .insert(invoicePayload as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating invoice:", error);
      throw error;
    }

    console.log('New invoice created:', data);
    invoiceId = data.id;
  }

  // Then, save all invoice items
  if (invoice.items && invoice.items.length > 0) {
    if (!invoice.user_id) {
      throw new Error('User ID is required to save invoice items');
    }

    const itemsPayload = invoice.items.map(item => {
      const parsedVatRate = typeof item.vatRate === 'number' ? item.vatRate : Number(item.vatRate);
      const normalizedVatRate = Number.isFinite(parsedVatRate) ? parsedVatRate : 0;
      const isVatExempt = Boolean(item.vatExempt) || normalizedVatRate < 0;
      const vatRate = isVatExempt ? 0 : Math.max(0, normalizedVatRate);

      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const totalNetValue = quantity * unitPrice;
      const totalVatValue = isVatExempt ? 0 : totalNetValue * (vatRate / 100);
      const totalGrossValue = totalNetValue + totalVatValue;

      return {
        // NIE przekazuj id!
        invoice_id: invoiceId,
        user_id: invoice.user_id,
        product_id: item.productId || null,
        name: item.name,
        quantity: quantity,
        unit_price: unitPrice,
        vat_rate: vatRate,
        unit: item.unit || 'szt',
        total_net_value: totalNetValue,
        total_gross_value: totalGrossValue,
        total_vat_value: totalVatValue,
        vat_exempt: isVatExempt
      };
    });

    console.log('Saving invoice items with payload:', itemsPayload);

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsPayload as any);

    if (itemsError) {
      console.error("Error saving invoice items:", itemsError);
      if (!invoice.id) {
        await supabase
          .from("invoices")
          .delete()
          .eq("id", invoiceId);
      }
      throw new Error(`Error saving invoice items: ${itemsError.message}`);
    }
  }

  /* =========================================================
     Auto-share to connected buyer account (if applicable)
     -------------------------------------------------------
     When this is an INCOME invoice and the chosen customer
     belongs to another registered user (linked via NIP), we
     automatically create an invoice_share record so that the
     receiver sees it in their account (and Expenses view).
  =========================================================*/

  try {
    if (invoice.transactionType === TransactionType.INCOME && invoice.customerId) {
      // Fetch customer with linked profile information (lightweight)
      const customers = await getCustomers();
      const cust = customers.find(c => c.id === invoice.customerId);

      if (cust && cust.linkedBusinessProfile && cust.linkedBusinessProfile.user_id && cust.linkedBusinessProfile.user_id !== invoice.user_id) {
        // Create share (ignore duplicate errors)
        await shareInvoiceWithUser(invoiceId, invoice.user_id, cust.taxId || "");
      }
    }
  } catch (shareErr) {
    console.warn("Auto-share failed (non-blocking):", shareErr?.message || shareErr);
  }

  // Fetch the complete invoice with items
  return getInvoice(invoiceId);
}

export async function getInvoice(id: string): Promise<Invoice> {
  // Fetch invoice with joined tables
  const invoiceSelect = `
    id,
    number,
    type,
    transaction_type,
    issue_date,
    due_date,
    sell_date,
    business_profile_id,
    customer_id,
    payment_method,
    is_paid,
    comments,
    total_net_value,
    total_gross_value,
    total_vat_value,
    ksef_status,
    ksef_reference_number,
    user_id,
    created_at,
    updated_at,
    vat,
    vat_exemption_reason,
    currency,
    bank_account_id,
    exchange_rate,
    business_profiles!inner(id, name, user_id, tax_id, address, city, postal_code),
    customers!inner(id, name, user_id, tax_id, address, city, postal_code),
    invoice_items(id, product_id, name, quantity, unit_price, vat_rate, unit, total_net_value, total_gross_value, total_vat_value, vat_exempt)
  `;
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select(invoiceSelect)
    .eq("id", id)
    .single();

  if (invoiceError) {
    console.error("Error fetching invoice:", invoiceError);
    throw invoiceError;
  }

  if (!invoiceData) {
    throw new Error(`Invoice with ID ${id} not found.`);
  }

  // Explicitly type invoiceData after the error check
  const data = invoiceData as unknown as DatabaseInvoiceResponse;

  // Map items data to InvoiceItem[]
  const items: InvoiceItem[] = (data.invoice_items || []).map((item: any) => ({
    id: item.id,
    productId: item.product_id || undefined,
    name: item.name || 'Unknown Item',
    description: item.description || '',
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unit_price) || 0,
    vatRate: item.vat_exempt ? -1 : (Number(item.vat_rate) || 0), // Convert 0 + vat_exempt to -1 for UI
    vatExempt: item.vat_exempt || false,
    unit: item.unit || 'szt',
    totalNetValue: Number(item.total_net_value) || 0,
    totalGrossValue: Number(item.total_gross_value) || 0,
    totalVatValue: Number(item.total_vat_value) || 0
  }));

  // Map invoice data to Invoice interface
  const businessProfile = data.business_profiles;
  const customer = data.customers;

  const invoice: Invoice = {
    id: data.id,
    number: data.number,
    type: data.type as InvoiceType,
    transactionType: data.transaction_type as TransactionType,
    issueDate: data.issue_date,
    dueDate: data.due_date,
    sellDate: data.sell_date,
    date: data.issue_date,
    businessProfileId: data.business_profile_id,
    customerId: data.customer_id || '',
    items,
    paymentMethod: toPaymentMethodUi(data.payment_method),
    isPaid: data.is_paid || false,
    paid: data.is_paid || false,
    status: data.status as InvoiceStatus,
    comments: data.comments || "",
    totalNetValue: Number(data.total_net_value) || 0,
    totalGrossValue: Number(data.total_gross_value) || 0,
    totalVatValue: Number(data.total_vat_value) || 0,
    totalAmount: Number(data.total_gross_value) || 0,
    ksef: {
      status: (data.ksef_status as KsefInfo['status']) || 'none',
      referenceNumber: data.ksef_reference_number || null
    } as KsefInfo,
    user_id: data.user_id,
    seller: businessProfile ? {
      id: businessProfile.id,
      name: businessProfile.name,
      taxId: businessProfile.tax_id || '',
      address: businessProfile.address || '',
      city: businessProfile.city || '',
      postalCode: businessProfile.postal_code || ''
    } as Company : { name: '', taxId: '', address: '', city: '', postalCode: '' },
    buyer: customer ? {
      id: customer.id,
      name: customer.name,
      taxId: customer.tax_id || '',
      address: customer.address || '',
      city: customer.city || '',
      postalCode: customer.postal_code || ''
    } as Company : { name: '', taxId: '', address: '', city: '', postalCode: '' },
    businessName: businessProfile?.name || '',
    customerName: customer?.name || '',
    bankAccountId: data.bank_account_id || null,
    bankAccountNumber: undefined,
    created_at: data.created_at,
    updated_at: data.updated_at,
    vat: typeof data.vat === 'boolean' ? data.vat : true,
    vatExemptionReason: (data.vat_exemption_reason as VatExemptionReason | null) ?? undefined,
    fakturaBezVAT: data.vat === false,
    currency: data.currency || 'PLN',
    exchangeRate: data.exchange_rate || null
  };

  return invoice;
}

export async function getInvoices(userId: string, businessProfileId?: string, period?: string): Promise<Invoice[]> {
  if (!userId) {
    console.error("No user ID provided to getInvoices");
    return [];
  }

  let query = supabase
    .from("invoices")
    .select(
      `
      *,
      business_profiles ( id, name, user_id, tax_id, address, city, postal_code ),
      customers ( id, name, user_id, tax_id, address, city, postal_code ),
      invoice_items (
        id,
        product_id,
        name,
        quantity,
        unit_price,
        vat_rate,
        unit,
        total_net_value,
        total_gross_value,
        total_vat_value,
        vat_exempt
      )
    `
    )
    .eq("user_id", userId);

  if (businessProfileId) {
    query = query.eq("business_profile_id", businessProfileId);
  }

  if (period) {
    const { startDate, endDate } = getPeriodDates(period);
    query = query.gte('issue_date', startDate).lte('issue_date', endDate);
  }

  const { data, error } = await query.order("issue_date", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }

  // If no data is returned or data is not an array, return an empty array
  if (!data || !Array.isArray(data)) {
    console.error("Supabase returned data in unexpected format or no data:", data);
    return [];
  }

  // Explicitly type the data before mapping to resolve potential type inference issues
  const typedData: DatabaseInvoiceResponse[] = data as any; // Use 'any' as a temporary workaround if direct casting fails

  // Map the data to the Invoice interface
  return typedData.map(mapDatabaseInvoiceToInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  if (!id) {
    console.error("No invoice ID provided to getInvoiceById");
    return null;
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      *,
      business_profiles ( id, name, user_id, tax_id, address, city, postal_code ),
      customers ( id, name, user_id, tax_id, address, city, postal_code ),
      invoice_items (
        id,
        product_id,
        name,
        quantity,
        unit_price,
        vat_rate,
        unit,
        total_net_value,
        total_gross_value,
        total_vat_value,
        vat_exempt
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching invoice by id:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapDatabaseInvoiceToInvoice(data as DatabaseInvoiceResponse);
}

export async function deleteInvoice(id: string): Promise<void> {
  // First delete all invoice items
  const { error: itemsError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", id);

  if (itemsError) {
    console.error("Error deleting invoice items:", itemsError);
    throw new Error(`Error deleting invoice items: ${itemsError.message}`);
  }

  // Then delete the invoice
  const { error: invoiceError } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id);

  if (invoiceError) {
    console.error("Error deleting invoice:", invoiceError);
    throw new Error(`Error deleting invoice: ${invoiceError.message}`);
  }
}

export async function updateInvoicePaymentStatus(invoiceId: string, isPaid: boolean): Promise<void> {
  const { error } = await supabase
    .from('invoices')
    .update({ is_paid: isPaid })
    .eq('id', invoiceId);

  if (error) {
    console.error('Error updating invoice payment status:', error);
    throw new Error(`Error updating payment status: ${error.message}`);
  }
}
