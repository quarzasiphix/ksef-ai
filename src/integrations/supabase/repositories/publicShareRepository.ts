import { supabase } from "../client";

export type ShareType = "invoice" | "contract" | "combo";

export interface PublicShare {
  id: string; // uuid primary key (also acts as slug)
  slug: string; // short slug (optional, can be same as id)
  share_type: ShareType;
  invoice_id?: string | null;
  contract_id?: string | null;
  bank_account?: string | null;
  view_once: boolean;
  created_at: string;
  expires_at?: string | null;
  viewed_at?: string | null;
}

// Generates a short random slug (8 chars) – collision chances extremely low
function generateSlug(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

export async function createPublicShareLink({
  invoiceId,
  contractId,
  type,
  bankAccount,
  viewOnce = false,
}: {
  invoiceId?: string;
  contractId?: string;
  type: ShareType;
  bankAccount?: string | null;
  viewOnce?: boolean;
}): Promise<PublicShare> {
  // Decide slug – could also rely on uuid but shorter looks cleaner.
  const slug = generateSlug();

  const { data, error } = await (supabase as any)
    .from("shared")
    .insert({
      slug,
      share_type: type,
      invoice_id: invoiceId || null,
      contract_id: contractId || null,
      bank_account: bankAccount || null,
      view_once: viewOnce,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data as PublicShare;
}

export async function getPublicShare(slug: string): Promise<PublicShare | null> {
  const { data, error } = await (supabase as any)
    .from("shared")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data as PublicShare | null;
}

export async function markShareViewed(slug: string) {
  // Set viewed_at timestamp (one-time links stay locked for other devices)
  const { error } = await (supabase as any)
    .from("shared")
    .update({ viewed_at: new Date().toISOString() })
    .eq("slug", slug)
    .is("viewed_at", null); // only first viewer sets it

  if (error) {
    console.error("Error marking share viewed", error);
  }
}

// Fetch first share row for given invoice (non view_once or any)
export async function getExistingInvoiceShare(invoiceId: string): Promise<PublicShare | null> {
  const { data, error } = await (supabase as any)
    .from("shared")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PublicShare | null;
}

export async function getExistingContractShare(contractId: string): Promise<PublicShare | null> {
  const { data, error } = await (supabase as any)
    .from("shared")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PublicShare | null;
} 