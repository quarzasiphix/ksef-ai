import { supabase } from "../client";

export interface ReceivedContract {
  contract_id: string;
  contract_number: string;
  contract_subject: string;
  contract_type: string;
  valid_from: string;
  valid_to: string;
  agreement_status: string;
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
  delivery_id: string;
  delivery_status: string;
  sent_at: string;
  received_at: string;
  attached_invoice_count: number;
}

export interface ContractAgreementHistoryEntry {
  id: string;
  contract_id: string;
  user_id: string;
  previous_status: string | null;
  new_status: string;
  action: string;
  comment: string | null;
  created_at: string;
}

/**
 * Get received contracts with sender information
 */
export async function getReceivedContracts(): Promise<ReceivedContract[]> {
  const { data, error } = await supabase.rpc('get_received_contracts_with_senders');

  if (error) {
    console.error('Error fetching received contracts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single received contract with full details
 */
export async function getReceivedContractWithSender(contractId: string): Promise<ReceivedContract | null> {
  const { data, error } = await supabase.rpc('get_received_contracts_with_senders');

  if (error) {
    console.error('Error fetching received contract:', error);
    throw error;
  }

  const contracts = data || [];
  return contracts.find((c: ReceivedContract) => c.contract_id === contractId) || null;
}

/**
 * Update contract agreement status
 */
export async function updateContractAgreementStatus(
  contractId: string,
  newStatus: string,
  userId: string,
  action: string,
  comment?: string
): Promise<void> {
  const { error } = await supabase.rpc('update_contract_agreement_status', {
    p_contract_id: contractId,
    p_new_status: newStatus,
    p_user_id: userId,
    p_action: action,
    p_comment: comment || null
  });

  if (error) {
    console.error('Error updating contract agreement status:', error);
    throw error;
  }
}

/**
 * Get agreement history for a contract
 */
export async function getContractAgreementHistory(
  contractId: string
): Promise<ContractAgreementHistoryEntry[]> {
  const { data, error } = await supabase
    .from('contract_agreement_history')
    .select(`
      *,
      profiles:user_id(full_name)
    `)
    .eq('contract_id', contractId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contract agreement history:', error);
    throw error;
  }

  return (data || []).map(entry => ({
    ...entry,
    user_name: entry.profiles?.full_name || 'Unknown User'
  }));
}

/**
 * Send contract with optional invoice attachments
 */
export async function sendContractDelivery(
  contractId: string,
  senderBusinessProfileId: string,
  recipientBusinessProfileId: string,
  attachedInvoiceIds: string[] = [],
  message?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('send_contract_delivery', {
    p_contract_id: contractId,
    p_sender_business_profile_id: senderBusinessProfileId,
    p_recipient_business_profile_id: recipientBusinessProfileId,
    p_attached_invoice_ids: attachedInvoiceIds,
    p_message: message || null
  });

  if (error) {
    console.error('Error sending contract delivery:', error);
    throw error;
  }

  return data;
}

/**
 * Get contracts pending agreement (for current user)
 */
export async function getContractsPendingAgreement(): Promise<any[]> {
  const { data, error } = await supabase
    .from('contracts_pending_agreement')
    .select('*');

  if (error) {
    console.error('Error fetching contracts pending agreement:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get signed contracts ready for execution
 */
export async function getContractsReadyForExecution(): Promise<any[]> {
  const { data, error } = await supabase
    .from('contracts_ready_for_execution')
    .select('*');

  if (error) {
    console.error('Error fetching contracts ready for execution:', error);
    throw error;
  }

  return data || [];
}
