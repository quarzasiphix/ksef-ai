import { supabase } from "../client";
import type { Contract } from "@/types";

// Helper to map DB row to Contract interface
function mapRowToContract(row: any): Contract {
  return {
    id: row.id,
    user_id: row.user_id,
    businessProfileId: row.business_profile_id,
    customerId: row.customer_id,
    number: row.number,
    issueDate: row.issue_date,
    validFrom: row.valid_from ?? undefined,
    validTo: row.valid_to ?? undefined,
    subject: row.subject ?? undefined,
    content: row.content ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    isActive: row.is_active ?? true,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,

    document_category: row.document_category ?? undefined,
    is_transactional: row.is_transactional ?? undefined,
    contract_type: row.contract_type ?? undefined,
    is_template: row.is_template ?? undefined,
    folder_id: row.folder_id ?? undefined,
    signing_parties: row.signing_parties ?? undefined,
    board_member_id: row.board_member_id ?? undefined,

    decision_id: row.decision_id ?? undefined,
    decision_reference: row.decision_reference ?? undefined,

    payment_account_id: row.payment_account_id ?? undefined,
    expected_amount: row.expected_amount ?? undefined,
    payment_frequency: row.payment_frequency ?? undefined,
    next_payment_date: row.next_payment_date ?? undefined,
    auto_generate_invoices: row.auto_generate_invoices ?? undefined,
    currency: row.currency ?? undefined,
  };
}

export async function getContracts(userId: string): Promise<Contract[]> {
  if (!userId) return [];

  const { data, error } = await (supabase as any)
    .from("contracts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching contracts:", error);
    throw error;
  }
  return (data || []).map(mapRowToContract);
}

export async function getContractsByBusinessProfile(businessProfileId: string): Promise<Contract[]> {
  if (!businessProfileId) return [];
  const { data, error } = await (supabase as any)
    .from('contracts')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contracts by business profile:', error);
    throw error;
  }
  return (data || []).map(mapRowToContract);
}

export async function getContract(id: string): Promise<Contract | null> {
  const { data, error } = await (supabase as any)
    .from("contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapRowToContract(data);
}

export async function saveContract(contract: Partial<Contract> & { user_id: string }): Promise<Contract> {
  const payload = {
    user_id: contract.user_id,
    business_profile_id: contract.businessProfileId,
    customer_id: contract.customerId,
    number: contract.number,
    issue_date: contract.issueDate,
    valid_from: contract.validFrom ?? null,
    valid_to: contract.validTo ?? null,
    subject: contract.subject ?? null,
    content: contract.content ?? null,
    pdf_url: contract.pdfUrl ?? null,
    is_active: contract.isActive ?? true,

    document_category: contract.document_category ?? null,
    is_transactional: contract.is_transactional ?? null,
    contract_type: contract.contract_type ?? null,
    is_template: contract.is_template ?? null,
    folder_id: contract.folder_id ?? null,
    signing_parties: contract.signing_parties ?? null,
    board_member_id: contract.board_member_id ?? null,

    decision_id: contract.decision_id ?? null,
  };

  let row;
  if (contract.id) {
    const { data, error } = await (supabase as any)
      .from("contracts")
      .update(payload)
      .eq("id", contract.id)
      .select()
      .single();
    if (error) throw error;
    row = data;
  } else {
    const { data, error } = await (supabase as any)
      .from("contracts")
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    row = data;
  }
  return mapRowToContract(row);
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("contracts")
    .delete()
    .eq("id", id);
  if (error) throw error;
} 