import { supabase } from "../client";
import type { ZusPayment, ZusType } from "@/types/zus";

const TABLE = "zus_payments";

export async function getZusPayments(userId: string, month?: string, businessProfileId?: string): Promise<ZusPayment[]> {
  let query = (supabase as any).from(TABLE).select("*").eq("user_id", userId);
  if (month) query = query.eq("month", month);
  if (businessProfileId) query = query.eq("business_profile_id", businessProfileId);
  const { data, error } = await query.order("month", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRowToZusPayment);
}

export async function addZusPayment(payment: Omit<ZusPayment, "id" | "createdAt" | "updatedAt">): Promise<ZusPayment> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .insert({
      user_id: payment.userId,
      business_profile_id: payment.businessProfileId || null,
      month: payment.month,
      zus_type: payment.zusType,
      amount: payment.amount,
      is_paid: payment.isPaid,
      paid_at: payment.paidAt || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRowToZusPayment(data);
}

export async function updateZusPayment(id: string, updates: Partial<Omit<ZusPayment, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<ZusPayment> {
  const { data, error } = await (supabase as any)
    .from(TABLE)
    .update({
      ...updates,
      paid_at: updates.paidAt || null,
      business_profile_id: updates.businessProfileId || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return mapRowToZusPayment(data);
}

export async function deleteZusPayment(id: string): Promise<void> {
  const { error } = await (supabase as any).from(TABLE).delete().eq("id", id);
  if (error) throw error;
}

function mapRowToZusPayment(row: any): ZusPayment {
  return {
    id: row.id,
    userId: row.user_id,
    businessProfileId: row.business_profile_id || undefined,
    month: row.month,
    zusType: row.zus_type,
    amount: Number(row.amount),
    isPaid: row.is_paid,
    paidAt: row.paid_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
} 