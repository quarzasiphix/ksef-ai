import { supabase } from "@/integrations/supabase/client";
import { ClientGroup, ClientGroupFormData } from "../types/clientGroup";

export async function getClientGroups(businessProfileId?: string): Promise<ClientGroup[]> {
  let query = supabase
    .from("client_groups")
    .select("*")
    .order("name", { ascending: true });

  if (businessProfileId) {
    query = query.eq("business_profile_id", businessProfileId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching client groups:", error);
    throw error;
  }

  return (data || []) as ClientGroup[];
}

export async function getClientGroup(id: string): Promise<ClientGroup | null> {
  const { data, error } = await supabase
    .from("client_groups")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching client group:", error);
    return null;
  }

  return data as ClientGroup;
}

export async function createClientGroup(
  formData: ClientGroupFormData,
  businessProfileId: string,
  userId: string
): Promise<ClientGroup> {
  const { data, error } = await supabase
    .from("client_groups")
    .insert({
      business_profile_id: businessProfileId,
      user_id: userId,
      name: formData.name,
      description: formData.description,
      type: formData.type,
      invoice_prefix: formData.invoice_prefix,
      default_payment_terms: formData.default_payment_terms,
      default_notes: formData.default_notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating client group:", error);
    throw error;
  }

  return data as ClientGroup;
}

export async function updateClientGroup(
  id: string,
  formData: Partial<ClientGroupFormData>
): Promise<ClientGroup> {
  const { data, error } = await supabase
    .from("client_groups")
    .update({
      name: formData.name,
      description: formData.description,
      type: formData.type,
      invoice_prefix: formData.invoice_prefix,
      default_payment_terms: formData.default_payment_terms,
      default_notes: formData.default_notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating client group:", error);
    throw error;
  }

  return data as ClientGroup;
}

export async function deleteClientGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from("client_groups")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting client group:", error);
    throw error;
  }
}

export async function getNextInvoiceNumberForGroup(
  clientGroupId: string,
  year: number,
  month: number
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_next_invoice_number_for_group", {
    p_client_group_id: clientGroupId,
    p_year: year,
    p_month: month,
  });

  if (error) {
    console.error("Error getting next invoice number:", error);
    return null;
  }

  return data as string;
}

export async function getCustomerCountByGroup(clientGroupId: string): Promise<number> {
  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("client_group_id", clientGroupId);

  if (error) {
    console.error("Error counting customers in group:", error);
    return 0;
  }

  return count || 0;
}
