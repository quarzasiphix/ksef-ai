import { supabase } from "../client";
import { ContractInvoiceLink } from "@/shared/types";

const TABLE = "invoice_contract_links";

export async function getLinksForContract(contractId: string): Promise<ContractInvoiceLink[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("contract_id", contractId);
  if (error) throw error;
  return data.map(mapRow);
}

export async function getLinksForInvoice(invoiceId: string): Promise<ContractInvoiceLink[]> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .select("*")
    .eq("invoice_id", invoiceId);
  if (error) throw error;
  return data.map(mapRow);
}

export async function addLink(userId: string, contractId: string, invoiceId: string): Promise<ContractInvoiceLink> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({ user_id: userId, contract_id: contractId, invoice_id: invoiceId })
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function removeLink(linkId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from(TABLE)
    .delete()
    .eq("id", linkId);
  if (error) throw error;
}

function mapRow(row: any): ContractInvoiceLink {
  return {
    id: row.id,
    user_id: row.user_id,
    contractId: row.contract_id,
    invoiceId: row.invoice_id,
    created_at: row.created_at,
  };
} 