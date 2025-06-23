import { supabase } from "../client";

export interface FiledTaxForm {
  id: string;
  business_profile_id: string;
  user_id: string;
  month: string; // YYYY-MM
  form_type: string;
  file_url: string;
  status: "generated" | "filed" | "zalegly";
  generated_at?: string;
  filed_at?: string | null;
}

export async function listFiledTaxForms(businessProfileId: string): Promise<FiledTaxForm[]> {
  const { data, error } = await (supabase as any)
    .from("filed_tax_forms")
    .select("*")
    .eq("business_profile_id", businessProfileId)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as FiledTaxForm[];
}

export async function updateFiledTaxFormStatus(id: string, status: "generated" | "filed" | "zalegly", filedAt: string | null = null) {
  const { error } = await (supabase as any)
    .from("filed_tax_forms")
    .update({ status, filed_at: filedAt })
    .eq("id", id);
  if (error) throw error;
} 