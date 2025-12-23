import { supabase } from "../client";
import { BankTransaction } from "@/modules/banking/bank";

/**
 * Save bank transactions to the database
 */
export async function saveBankTransactions(transactions: BankTransaction[]): Promise<void> {
  if (transactions.length === 0) return;

  // Transform the data to use snake_case column names
  const transformedTransactions = transactions.map(tx => ({
    id: tx.id,
    account_id: tx.accountId,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    currency: tx.currency,
    counterparty: tx.counterparty,
    category: tx.category,
  }));

  const { error } = await supabase
    .from('bank_transactions')
    .upsert(transformedTransactions, { onConflict: 'id' });

  if (error) throw error;
}

/**
 * Get bank transactions for a specific account
 */
export async function getBankTransactions(accountId: string): Promise<BankTransaction[]> {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('date', { ascending: false });

  if (error) throw error;
  
  // Transform back to camelCase for the frontend
  return (data || []).map(tx => ({
    id: tx.id,
    accountId: tx.account_id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    currency: tx.currency,
    counterparty: tx.counterparty,
    category: tx.category,
  }));
}

/**
 * Get all bank transactions for a business profile
 */
export async function getBankTransactionsForProfile(businessProfileId: string): Promise<BankTransaction[]> {
  const { data, error } = await supabase
    .from('bank_transactions')
    .select(`
      *,
      bank_accounts!inner(business_profile_id)
    `)
    .eq('bank_accounts.business_profile_id', businessProfileId)
    .order('date', { ascending: false });

  if (error) throw error;
  
  // Transform back to camelCase for the frontend
  return (data || []).map(tx => ({
    id: tx.id,
    accountId: tx.account_id,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    currency: tx.currency,
    counterparty: tx.counterparty,
    category: tx.category,
  }));
}

/**
 * Delete bank transactions for an account
 */
export async function deleteBankTransactions(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('bank_transactions')
    .delete()
    .eq('account_id', accountId);

  if (error) throw error;
} 