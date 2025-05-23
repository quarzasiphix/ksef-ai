import { supabase } from "../client";
import type { InvoiceItem, InvoiceType, PaymentMethod, Invoice, VatExemptionReason, VatType } from "@/types";
import { toPaymentMethodUi } from "@/lib/invoice-utils";
import { useAuth } from "@/App";
import { TransactionType } from "@/types/common";

// Define types for database responses
interface DatabaseInvoiceItemResponse {
  id: string;
  invoice_id: string;
  product_id: string | null;
  name: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  unit: string;
  total_net_value: number;
  total_gross_value: number;
  total_vat_value: number;
  created_at: string;
  updated_at: string;
}

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
  payment_method: string;
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
  business_profiles: {
    id: string;
    name: string;
  } | null;
  customers: {
    id: string;
    name: string;
  } | null;
}

type PaymentMethodDb = 'cash' | 'transfer' | 'card' | 'other';

interface DatabaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  name: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_type?: VatType;
  vat_exemption_reason?: VatExemptionReason;
  unit: string;
  total_net_value: number;
  total_gross_value: number;
  total_vat_value: number;
  created_at: string;
  updated_at: string;
  products?: {
    name: string;
    unit: string;
    unit_price: number;
    vat_rate: number;
  } | null;
}

interface DatabaseInvoice {
  id: string;
  number: string;
  type: string;
  transaction_type: string;
  issue_date: string;
  due_date: string;
  sell_date: string;
  business_profile_id: string;
  customer_id: string | null;
  payment_method: string;
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
  business_profiles: {
    id: string;
    name: string;
    user_id: string;
  } | null;
  customers: {
    id: string;
    name: string;
    user_id: string;
  } | null;
}

export async function saveInvoice(invoice: Omit<Invoice, 'id'> & { id?: string }): Promise<Invoice> {
  // Validate required fields
  if (!invoice.user_id) {
    throw new Error("User ID is required");
  }
  
  // For expenses, we validate the customer instead of business profile
  if (invoice.transactionType === TransactionType.EXPENSE) {
    if (!invoice.customerId) {
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
        throw new Error(`Customer with ID ${invoice.customerId} does not exist`);
      }
    } catch (error) {
      console.error('Customer validation error for expense:', error);
      throw new Error(`Failed to validate customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    // For income, validate business profile
    if (!invoice.businessProfileId) {
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
    type: string;
    issue_date: string;
    due_date: string;
    sell_date: string;
    business_profile_id: string;
    customer_id: string | null;
    payment_method: string;
    is_paid: boolean;
    comments: string | null;
    total_net_value: number;
    total_gross_value: number;
    total_vat_value: number;
    ksef_status: string;
    ksef_reference_number: string | null;
    transaction_type?: string;
    vat: boolean;
    vat_exemption_reason?: string;
  };

  // Ensure payment method is in the correct format for the database
  const paymentMethod = (() => {
    if (!invoice.paymentMethod) return 'transfer';
    const method = invoice.paymentMethod.toLowerCase();
    return (['transfer', 'cash', 'card', 'other'].includes(method) 
      ? method 
      : 'transfer') as PaymentMethodDb;
  })();

  // Create the base payload with required fields
  const basePayload: Omit<InvoicePayload, 'transaction_type'> = {
    user_id: invoice.user_id,
    number: invoice.number,
    type: invoice.type,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    sell_date: invoice.sellDate,
    business_profile_id: invoice.businessProfileId,
    customer_id: invoice.customerId || null,
    payment_method: paymentMethod,
    is_paid: invoice.isPaid,
    comments: invoice.comments || null,
    total_net_value: invoice.totalNetValue,
    total_gross_value: invoice.totalGrossValue,
    total_vat_value: invoice.totalVatValue,
    ksef_status: invoice.ksef?.status || 'none',
    ksef_reference_number: invoice.ksef?.referenceNumber || null,
    vat: invoice.vat,
    vat_exemption_reason: invoice.vatExemptionReason
  };

  // Always include transaction_type, default to 'income' if not provided
  const transactionType = (invoice.transactionType || TransactionType.INCOME).toLowerCase() as TransactionType;
  
  const invoicePayload: InvoicePayload = {
    ...basePayload,
    transaction_type: transactionType === 'income' ? 'income' : 'expense' // Ensure lowercase values
  };

  let invoiceId: string;

  if (invoice.id) {
    // Update existing invoice
    const { data, error } = await supabase
      .from("invoices")
      .update(invoicePayload)
      .eq("id", invoice.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating invoice:", error);
      throw error;
    }

    invoiceId = data.id;

    // Delete existing items to replace with new ones
    const { error: deleteError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", invoiceId);

    if (deleteError) {
      console.error("Error deleting invoice items:", deleteError);
      throw deleteError;
    }
  } else {
    // Insert new invoice
    const { data, error } = await supabase
      .from("invoices")
      .insert(invoicePayload)
      .select()
      .single();

    if (error) {
      console.error("Error creating invoice:", error);
      throw error;
    }

    invoiceId = data.id;
  }

  // Then, save all invoice items
  if (invoice.items && invoice.items.length > 0) {
    const itemsPayload = invoice.items.map(item => ({
      invoice_id: invoiceId,
      user_id: invoice.user_id, // Include user_id for RLS
      product_id: item.productId || null,
      name: item.name,
      description: item.description || '',
      quantity: item.quantity,
      unit_price: item.unitPrice,
      vat_rate: item.vatRate,
      unit: item.unit || 'szt',
      total_net_value: item.totalNetValue || item.unitPrice * item.quantity,
      total_gross_value: item.totalGrossValue || (item.unitPrice * item.quantity) * (1 + (item.vatRate || 0) / 100),
      total_vat_value: item.totalVatValue || (item.unitPrice * item.quantity) * ((item.vatRate || 0) / 100)
    }));

    console.log('Saving invoice items with payload:', itemsPayload);

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("Error saving invoice items:", itemsError);
      // If there's an error with items, we should also clean up the invoice we just created
      if (!invoice.id) {
        await supabase
          .from("invoices")
          .delete()
          .eq("id", invoiceId);
      }
      throw new Error(`Error saving invoice items: ${itemsError.message}`);
    }
  }

  // Return the saved invoice
  return getInvoice(invoiceId);
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      business_profiles!inner(*),
      customers!left(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching invoice:', error);
    throw new Error(`Error fetching invoice: ${error.message}`);
  }

  if (!data) {
    throw new Error('Invoice not found');
  }

  // Fetch invoice items
  const { data: itemsData, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id);

  if (itemsError) {
    console.error('Error fetching invoice items:', itemsError);
    throw new Error(`Error fetching invoice items: ${itemsError.message}`);
  }

  // Convert database invoice to app invoice format
  const invoice: Invoice = {
    id: data.id,
    number: data.number,
    type: data.type as InvoiceType,
    transactionType: (data.transaction_type as TransactionType) || TransactionType.INCOME,
    issueDate: data.issue_date,
    dueDate: data.due_date,
    sellDate: data.sell_date,
    businessProfileId: data.business_profile_id,
    customerId: data.customer_id || '',
    paymentMethod: toPaymentMethodUi(data.payment_method as PaymentMethodDb),
    isPaid: data.is_paid || false,
    comments: data.comments || '',
    totalNetValue: data.total_net_value || 0,
    totalGrossValue: data.total_gross_value || 0,
    totalVatValue: data.total_vat_value || 0,
    ksef: {
      status: (data.ksef_status as 'pending' | 'sent' | 'error' | 'none') || 'none',
      referenceNumber: data.ksef_reference_number || undefined
    },
    user_id: data.user_id,
    businessName: data.business_profiles?.name || '',
    customerName: data.customers?.name || '',
    vat: data.vat !== undefined ? data.vat : true,
    vatExemptionReason: (data.vat_exemption_reason as VatExemptionReason) || undefined,
    items: (itemsData || []).map(item => ({
      id: item.id,
      productId: item.product_id || undefined,
      name: item.name || '',
      description: '', // Add default empty string for description
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unit_price) || 0,
      vatRate: Number(item.vat_rate) || 0,
      unit: item.unit || 'szt',
      totalNetValue: Number(item.total_net_value) || 0,
      totalGrossValue: Number(item.total_gross_value) || 0,
      totalVatValue: Number(item.total_vat_value) || 0
    }));

    return invoice;
  } catch (error) {
    console.error('Error in getInvoice:', error);
    throw error;
  }
}

 * Fetches multiple invoices with optional filtering
 * @param options - Filtering and pagination options
 * @returns Array of invoices
 */
export async function getInvoices(options: {
  userId: string;
  limit?: number;
  offset?: number;
  type?: InvoiceType;
  transactionType?: TransactionType;
  isPaid?: boolean;
  search?: string;
}): Promise<Invoice[]> {
  const {
    userId,
    limit = 50,
    offset = 0,
    type,
    transactionType,
    isPaid,
    search
  } = options;

  try {
    let query = supabase
      .from('invoices')
      .select(`
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
        vat,
        vat_exemption_reason,
        business_profiles:business_profile_id (
          id,
          name
        ),
        customers:customer_id (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .order('issue_date', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (type) {
      query = query.eq('type', type);
    }
    
    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }
    
    if (typeof isPaid === 'boolean') {
      query = query.eq('is_paid', isPaid);
    }
    
    if (search) {
      query = query.or(`number.ilike.%${search}%,customers.name.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      throw new Error(`Error fetching invoices: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Fetch all invoice items in a single query
    const invoiceIds = data.map(invoice => invoice.id);
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .in('invoice_id', invoiceIds);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      throw new Error(`Error fetching invoice items: ${itemsError.message}`);
    }

    // Group items by invoice ID
    const itemsByInvoiceId = (itemsData || []).reduce((acc, item) => {
      if (!acc[item.invoice_id]) {
        acc[item.invoice_id] = [];
      }
      acc[item.invoice_id].push(item);
      return acc;
    }, {} as Record<string, typeof itemsData>);

    // Map database invoices to app invoices
    return data.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      type: invoice.type as InvoiceType,
      transactionType: (invoice.transaction_type as TransactionType) || TransactionType.INCOME,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,
      sellDate: invoice.sell_date,
      businessProfileId: invoice.business_profile_id,
      customerId: invoice.customer_id || '',
      paymentMethod: toPaymentMethodUi(invoice.payment_method as PaymentMethodDb),
      isPaid: invoice.is_paid || false,
      comments: invoice.comments || '',
      totalNetValue: invoice.total_net_value || 0,
      totalGrossValue: invoice.total_gross_value || 0,
      totalVatValue: invoice.total_vat_value || 0,
      ksef: {
        status: (invoice.ksef_status as 'pending' | 'sent' | 'error' | 'none') || 'none',
        referenceNumber: invoice.ksef_reference_number || undefined
      },
      user_id: invoice.user_id,
      businessName: invoice.business_profiles?.name || '',
      customerName: invoice.customers?.name || '',
      vat: invoice.vat ?? true,
      vatExemptionReason: invoice.vat_exemption_reason as VatExemptionReason || undefined,
      items: (itemsByInvoiceId[invoice.id] || []).map(item => ({
        id: item.id,
        productId: item.product_id || undefined,
        name: item.name || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unit_price) || 0,
        vatRate: Number(item.vat_rate) || 0,
        unit: item.unit || 'szt',
        totalNetValue: Number(item.total_net_value) || 0,
        totalGrossValue: Number(item.total_gross_value) || 0,
        totalVatValue: Number(item.total_vat_value) || 0
      } as InvoiceItem))
    }));
  } catch (error) {
    console.error('Error in getInvoices:', error);
    throw error;
  }
}

/**
 * Fetches an invoice by ID
 * @param id - The ID of the invoice to fetch
 * @returns The invoice
 */
export async function getInvoice(id: string): Promise<Invoice> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
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
        vat,
        vat_exemption_reason,
        business_profiles:business_profile_id (
          id,
          name
        ),
        customers:customer_id (
          id,
          name
        )
      `)
      .eq('id', id)
      .single<DatabaseInvoiceResponse>();

    if (error) {
      console.error('Error fetching invoice:', error);
      throw new Error(`Error fetching invoice: ${error.message}`);
    }

    if (!data) {
      throw new Error('Invoice not found');
    }

    // Fetch invoice items
    const { data: itemsData, error: itemsError } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id);

    if (itemsError) {
      console.error('Error fetching invoice items:', itemsError);
      throw new Error(`Error fetching invoice items: ${itemsError.message}`);
    }

    // Convert database invoice to app invoice format
    const invoice: Invoice = {
      id: data.id,
      number: data.number,
      type: data.type as InvoiceType,
      transactionType: (data.transaction_type as TransactionType) || TransactionType.INCOME,
      issueDate: data.issue_date,
      dueDate: data.due_date,
      sellDate: data.sell_date,
      businessProfileId: data.business_profile_id,
      customerId: data.customer_id || '',
      paymentMethod: toPaymentMethodUi(data.payment_method as PaymentMethodDb),
      isPaid: data.is_paid || false,
      comments: data.comments || '',
      totalNetValue: data.total_net_value || 0,
      totalGrossValue: data.total_gross_value || 0,
      totalVatValue: data.total_vat_value || 0,
      ksef: {
        status: (data.ksef_status as 'pending' | 'sent' | 'error' | 'none') || 'none',
        referenceNumber: data.ksef_reference_number || undefined
      },
      user_id: data.user_id,
      businessName: data.business_profiles?.name || '',
      customerName: data.customers?.name || '',
      vat: data.vat ?? true,
      vatExemptionReason: (data.vat_exemption_reason as VatExemptionReason) || undefined,
      items: (itemsData || []).map(item => ({
        id: item.id,
        productId: item.product_id || undefined,
        name: item.name || '',
        description: item.description || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unit_price) || 0,
        vatRate: Number(item.vat_rate) || 0,
        unit: item.unit || 'szt',
        totalNetValue: Number(item.total_net_value) || 0,
        totalGrossValue: Number(item.total_gross_value) || 0,
        totalVatValue: Number(item.total_vat_value) || 0
      } as InvoiceItem))
    };

    return invoice;
  } catch (error) {
    console.error('Error in getInvoice:', error);
    throw error;
  }
}

/**
 * Deletes an invoice and its associated items
 * @param id - The ID of the invoice to delete
 */
export async function deleteInvoice(id: string): Promise<void> {
  // First delete the invoice items
  const { error: itemsError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', id);

  if (itemsError) {
    console.error('Error deleting invoice items:', itemsError);
    throw new Error(`Error deleting invoice items: ${itemsError.message}`);
  }

  // Then delete the invoice
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting invoice:', error);
    throw new Error(`Error deleting invoice: ${error.message}`);
  }
}
