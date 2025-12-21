import { supabase } from "../client";

export interface ReceivedInvoiceWithSender {
  invoice_id: string;
  invoice_number: string;
  invoice_type: string;
  issue_date: string;
  due_date: string;
  sell_date: string;
  total_net_value: number;
  total_gross_value: number;
  total_vat_value: number;
  is_paid: boolean;
  payment_method: string;
  currency: string;
  transaction_type: string;
  comments: string | null;
  sender_id: string;
  sender_name: string;
  sender_tax_id: string;
  sender_address: string;
  sender_city: string;
  sender_postal_code: string;
  buyer_id: string;
  buyer_name: string;
  buyer_tax_id: string;
  buyer_address: string;
  buyer_city: string;
  buyer_postal_code: string;
}

/**
 * Efficiently fetches all received invoices with sender information in a single RPC call.
 * This bypasses RLS issues by using a security definer function.
 */
export async function getReceivedInvoicesWithSenders(): Promise<ReceivedInvoiceWithSender[]> {
  const { data, error } = await supabase.rpc('get_received_invoices_with_senders');

  if (error) {
    console.error('Error fetching received invoices with senders:', error);
    throw error;
  }

  return data || [];
}

/**
 * Efficiently fetches a single received invoice with sender information.
 * This bypasses RLS issues by using a security definer function.
 */
export async function getReceivedInvoiceWithSender(invoiceId: string): Promise<ReceivedInvoiceWithSender | null> {
  const { data, error } = await supabase.rpc('get_received_invoice_with_sender', { p_invoice_id: invoiceId });

  if (error) {
    console.error('Error fetching received invoice with sender:', error);
    throw error;
  }

  // RPC returns an array, but we expect a single result or empty
  return data && data.length > 0 ? (data[0] as ReceivedInvoiceWithSender) : null;
}
