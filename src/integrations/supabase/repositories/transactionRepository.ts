import { supabase } from "../client";
import type { Database } from "../types";

export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type InsertTransaction = Database["public"]["Tables"]["transactions"]["Insert"];

export async function getTransactionsForUser(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data || [];
}

export async function insertTransaction(transaction: InsertTransaction): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from("transactions")
    .insert([transaction])
    .select()
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
} 