
import { supabase } from "../client";
import type { Invoice, InvoiceItem, InvoiceType, PaymentMethod } from "@/types";

export async function saveInvoice(invoice: Invoice): Promise<Invoice> {
  // First, save the invoice
  const invoicePayload = {
    number: invoice.number,
    type: invoice.type,
    issue_date: invoice.issueDate,
    due_date: invoice.dueDate,
    sell_date: invoice.sellDate,
    business_profile_id: invoice.businessProfileId,
    customer_id: invoice.customerId,
    payment_method: invoice.paymentMethod,
    is_paid: invoice.isPaid,
    comments: invoice.comments || null,
    total_net_value: invoice.totalNetValue || 0,
    total_gross_value: invoice.totalGrossValue || 0,
    total_vat_value: invoice.totalVatValue || 0,
    ksef_status: invoice.ksef?.status || 'none',
    ksef_reference_number: invoice.ksef?.referenceNumber || null
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
  const itemsPayload = invoice.items.map(item => ({
    invoice_id: invoiceId,
    product_id: item.productId || null,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    vat_rate: item.vatRate,
    unit: item.unit,
    total_net_value: item.totalNetValue || item.unitPrice * item.quantity,
    total_gross_value: item.totalGrossValue || (item.unitPrice * item.quantity) * (1 + item.vatRate / 100),
    total_vat_value: item.totalVatValue || (item.unitPrice * item.quantity) * (item.vatRate / 100)
  }));

  if (itemsPayload.length > 0) {
    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(itemsPayload);

    if (itemsError) {
      console.error("Error saving invoice items:", itemsError);
      throw itemsError;
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
      *,
      business_profiles(name),
      customers(name)
    `)
    .eq("id", id)
    .single();

  if (invoiceError) {
    console.error("Error fetching invoice:", invoiceError);
    throw invoiceError;
  }

  // Fetch invoice items
  const { data: itemsData, error: itemsError } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id);

  if (itemsError) {
    console.error("Error fetching invoice items:", itemsError);
    throw itemsError;
  }

  const items: InvoiceItem[] = itemsData.map(item => ({
    id: item.id,
    productId: item.product_id || undefined,
    name: item.name,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    vatRate: item.vat_rate,
    unit: item.unit,
    totalNetValue: Number(item.total_net_value),
    totalGrossValue: Number(item.total_gross_value),
    totalVatValue: Number(item.total_vat_value)
  }));

  return {
    id: invoiceData.id,
    number: invoiceData.number,
    type: invoiceData.type as InvoiceType,
    issueDate: invoiceData.issue_date,
    dueDate: invoiceData.due_date,
    sellDate: invoiceData.sell_date,
    businessProfileId: invoiceData.business_profile_id,
    customerId: invoiceData.customer_id,
    items,
    paymentMethod: invoiceData.payment_method as PaymentMethod,
    isPaid: invoiceData.is_paid || false,
    comments: invoiceData.comments || "",
    totalNetValue: Number(invoiceData.total_net_value),
    totalGrossValue: Number(invoiceData.total_gross_value),
    totalVatValue: Number(invoiceData.total_vat_value),
    ksef: {
      status: (invoiceData.ksef_status as 'pending' | 'sent' | 'error' | 'none') || 'none',
      referenceNumber: invoiceData.ksef_reference_number || null
    },
    businessName: invoiceData.business_profiles?.name,
    customerName: invoiceData.customers?.name
  };
}

export async function getInvoices(): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      business_profiles(name),
      customers(name)
    `)
    .order("issue_date", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    number: item.number,
    type: item.type as InvoiceType,
    issueDate: item.issue_date,
    dueDate: item.due_date,
    sellDate: item.sell_date,
    businessProfileId: item.business_profile_id,
    customerId: item.customer_id,
    items: [], // Items are loaded separately when needed
    paymentMethod: item.payment_method as PaymentMethod,
    isPaid: item.is_paid || false,
    comments: item.comments || "",
    totalNetValue: Number(item.total_net_value),
    totalGrossValue: Number(item.total_gross_value),
    totalVatValue: Number(item.total_vat_value),
    ksef: {
      status: (item.ksef_status as 'pending' | 'sent' | 'error' | 'none') || 'none',
      referenceNumber: item.ksef_reference_number || null
    },
    // Additional fields for display
    businessName: item.business_profiles?.name,
    customerName: item.customers?.name
  }));
}
