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
  } as any;

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