import { supabase } from "../../../integrations/supabase/client";

export type AgreementStatus = 
  | 'draft' 
  | 'sent' 
  | 'received' 
  | 'under_discussion' 
  | 'correction_needed' 
  | 'approved' 
  | 'ready_for_ksef' 
  | 'rejected' 
  | 'cancelled';

export interface AgreementHistoryEntry {
  id: string;
  invoice_id: string;
  user_id: string;
  previous_status: AgreementStatus | null;
  new_status: AgreementStatus;
  action: string;
  comment: string | null;
  created_at: string;
}

/**
 * Update invoice agreement status
 * This function uses the database function to ensure proper audit trail
 */
export async function updateInvoiceAgreementStatus(
  invoiceId: string,
  newStatus: AgreementStatus,
  userId: string,
  action: string,
  comment?: string
): Promise<void> {
  const { error } = await supabase.rpc('update_invoice_agreement_status', {
    p_invoice_id: invoiceId,
    p_new_status: newStatus,
    p_user_id: userId,
    p_action: action,
    p_comment: comment || null
  });

  if (error) {
    console.error('Error updating invoice agreement status:', error);
    throw error;
  }
}

/**
 * Get agreement history for an invoice
 */
export async function getInvoiceAgreementHistory(
  invoiceId: string
): Promise<AgreementHistoryEntry[]> {
  const { data, error } = await supabase
    .from('invoice_agreement_history')
    .select(`
      *,
      profiles:user_id(full_name)
    `)
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching agreement history:', error);
    throw error;
  }

  return (data || []).map(entry => ({
    ...entry,
    user_name: entry.profiles?.full_name || 'Unknown User'
  }));
}

/**
 * Get agreement summary for an invoice
 */
export async function getInvoiceAgreementSummary(invoiceId: string): Promise<{
  invoice_id: string;
  current_status: AgreementStatus;
  sent_at: string | null;
  received_at: string | null;
  approved_at: string | null;
  ready_for_ksef_at: string | null;
  history_count: number;
  discussion_count: number;
}> {
  const { data, error } = await supabase.rpc('get_invoice_agreement_summary', {
    p_invoice_id: invoiceId
  });

  if (error) {
    console.error('Error fetching agreement summary:', error);
    throw error;
  }

  return data?.[0] || null;
}

/**
 * Get invoices pending agreement for a business profile
 */
export async function getInvoicesPendingAgreement(
  businessProfileId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('invoices_pending_agreement')
    .select('*')
    .eq('business_profile_id', businessProfileId);

  if (error) {
    console.error('Error fetching pending agreements:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get invoices ready for KSeF (approved and locked)
 */
export async function getInvoicesReadyForKSeF(
  businessProfileId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('invoices_ready_for_ksef')
    .select('*')
    .eq('business_profile_id', businessProfileId);

  if (error) {
    console.error('Error fetching invoices ready for KSeF:', error);
    throw error;
  }

  return data || [];
}

/**
 * Check if invoice is already synced to ERP (idempotency check)
 */
export async function isInvoiceSyncedToERP(
  invoiceId: string,
  provider: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_invoice_synced_to_erp', {
    p_invoice_id: invoiceId,
    p_provider: provider
  });

  if (error) {
    console.error('Error checking ERP sync status:', error);
    throw error;
  }

  return data || false;
}
