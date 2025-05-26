import { supabase } from "../client";
import type { InvoiceItem, InvoiceType, PaymentMethod, PaymentMethodDb, Invoice } from "@/types";
import { toPaymentMethodUi } from "@/lib/invoice-utils";
import { useAuth } from "@/App";
import { TransactionType } from "@/types/common";

export async function saveInvoice(invoice: Omit<Invoice, 'id'> & { id?: string }): Promise<Invoice> {
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
    console.log('Creating new invoice');
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

    console.log('New invoice created:', data);
    invoiceId = data.id;
  }

  // Then, save all invoice items
  if (invoice.items && invoice.items.length > 0) {
    const itemsPayload = invoice.items.map(item => {
      const isVatExempt = item.vatRate === -1;
      const vatRate = isVatExempt ? -1 : Number(item.vatRate);
      const totalNetValue = item.totalNetValue || item.unitPrice * item.quantity;
      const totalVatValue = isVatExempt ? 0 : (item.totalVatValue || totalNetValue * (vatRate / 100));
      const totalGrossValue = isVatExempt ? totalNetValue : (item.totalGrossValue || totalNetValue * (1 + vatRate / 100));

      return {
        invoice_id: invoiceId,
        user_id: invoice.user_id,
        product_id: item.productId || null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        vat_rate: vatRate,
        unit: item.unit || 'szt',
        total_net_value: totalNetValue,
        total_gross_value: totalGrossValue,
        total_vat_value: totalVatValue
      };
    });

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

  // Fetch the complete invoice with items
  return getInvoice(invoiceId);
}

export async function getInvoice(id: string): Promise<Invoice> {
  // Fetch invoice
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
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
      created_at,
      updated_at,
      vat,
      vat_exemption_reason,
      business_profiles(name),
      customers(name)
    `)
    .eq("id", id)
    .single();

  if (invoiceError) {
    console.error("Error fetching invoice:", invoiceError);
    throw invoiceError;
  }

  // Fetch invoice items with product details if available
  const { data: itemsData, error: itemsError } = await supabase
    .from("invoice_items")
    .select(`
      *,
      products!left(name, unit, unit_price, vat_rate)
    `)
    .eq("invoice_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("Error fetching invoice items:", itemsError);
    throw itemsError;
  }

  const items: InvoiceItem[] = itemsData.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    name: item.name || item.products?.name,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price) || 0,
    vatRate: Number(item.vat_rate),
    unit: item.unit || 'szt',
    totalNetValue: Number(item.total_net_value) || 0,
    totalGrossValue: Number(item.total_gross_value) || 0,
    totalVatValue: Number(item.total_vat_value) || 0
  }));

  // Define the shape of the database response with joined tables
  interface DatabaseInvoice {
    id: string;
    number: string;
    type: string;
    transaction_type?: string;
    issue_date: string;
    due_date: string;
    sell_date: string;
    business_profile_id: string;
    customer_id: string;
    payment_method: string;
    is_paid: boolean;
    comments: string | null;
    total_net_value: number;
    total_gross_value: number;
    total_vat_value: number;
    ksef_status: string | null;
    ksef_reference_number: string | null;
    user_id?: string;
    business_profiles?: {
      user_id: string;
      name: string;
    } | null;
    customers?: {
      name: string;
    } | null;
    vat: boolean;
    vat_exemption_reason: string | null;
  }

  // Safely cast the invoice data
  const dbInvoice: DatabaseInvoice = {
    ...invoiceData,
    business_profiles: (invoiceData as any).business_profiles || null,
    customers: (invoiceData as any).customers || null,
    vat: invoiceData.vat || true,
    vat_exemption_reason: invoiceData.vat_exemption_reason as string | null
  };
  const invoice: Invoice = {
    id: dbInvoice.id,
    number: dbInvoice.number,
    type: dbInvoice.type as InvoiceType,
    transactionType: (dbInvoice.transaction_type as TransactionType) || TransactionType.INCOME,
    issueDate: dbInvoice.issue_date,
    dueDate: dbInvoice.due_date,
    sellDate: dbInvoice.sell_date,
    businessProfileId: dbInvoice.business_profile_id,
    customerId: dbInvoice.customer_id,
    items,
    paymentMethod: (['transfer', 'cash', 'card', 'other'].includes(dbInvoice.payment_method?.toLowerCase())
      ? dbInvoice.payment_method.toLowerCase() 
      : 'transfer') as PaymentMethodDb,
    isPaid: dbInvoice.is_paid || false,
    comments: dbInvoice.comments || "",
    totalNetValue: Number(dbInvoice.total_net_value) || 0,
    totalGrossValue: Number(dbInvoice.total_gross_value) || 0,
    totalVatValue: Number(dbInvoice.total_vat_value) || 0,
    ksef: {
      status: (dbInvoice.ksef_status as 'pending' | 'sent' | 'error' | 'none') || 'none',
      referenceNumber: dbInvoice.ksef_reference_number || undefined
    },
    user_id: dbInvoice.user_id || dbInvoice.business_profiles?.user_id || '',
    businessName: dbInvoice.business_profiles?.name || '',
    customerName: dbInvoice.customers?.name || '',
    vat: dbInvoice.vat || true,
    vatExemptionReason: dbInvoice.vat_exemption_reason as VatExemptionReason || undefined
  };

  return invoice;
}

interface DatabaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  name: string | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
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
  transaction_type?: string;
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

export async function getInvoices(userId: string): Promise<Invoice[]> {
  if (!userId) {
    console.error("No user ID provided to getInvoices");
    return [];
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      business_profiles!inner(*),
      customers!inner(*),
      invoice_items(*)
    `)
    .eq('user_id', userId)
    .order("issue_date", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }

  if (!data) return [];

  // Map the data to the Invoice interface, including transaction_type
  return data.map((item) => {
    const dbItem = item as unknown as DatabaseInvoice;
    const paymentMethod = (() => {
      const method = dbItem.payment_method?.toLowerCase();
      return (['transfer', 'cash', 'card', 'other'].includes(method || '') 
        ? method 
        : 'transfer') as PaymentMethodDb;
    })();
    
    const invoice: Invoice = {
      id: dbItem.id,
      number: dbItem.number,
      type: dbItem.type as InvoiceType,
      transactionType: (dbItem.transaction_type?.toLowerCase() as TransactionType) || TransactionType.INCOME,
      issueDate: dbItem.issue_date,
      dueDate: dbItem.due_date,
      sellDate: dbItem.sell_date,
      businessProfileId: dbItem.business_profile_id,
      customerId: dbItem.customer_id || '',
      items: (dbItem.invoice_items || []).map(item => ({
        id: item.id,
        productId: item.product_id || undefined,
        name: item.name || '',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        vatRate: Number(item.vat_rate),
        unit: item.unit || 'szt',
        totalNetValue: Number(item.total_net_value),
        totalGrossValue: Number(item.total_gross_value),
        totalVatValue: Number(item.total_vat_value)
      })),
      paymentMethod,
      isPaid: dbItem.is_paid || false,
      comments: dbItem.comments || "",
      totalNetValue: Number(dbItem.total_net_value) || 0,
      totalGrossValue: Number(dbItem.total_gross_value) || 0,
      totalVatValue: Number(dbItem.total_vat_value) || 0,
      ksef: {
        status: (dbItem.ksef_status as 'pending' | 'sent' | 'error' | 'none') || 'none',
        referenceNumber: dbItem.ksef_reference_number || null
      },
      user_id: dbItem.user_id,
      businessName: dbItem.business_profiles?.name || '',
      customerName: dbItem.customers?.name || '',
      vat: dbItem.vat || true,
      vatExemptionReason: dbItem.vat_exemption_reason as VatExemptionReason || undefined
    };
    
    return invoice;
  });
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
