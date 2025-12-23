import { supabase } from '../../../integrations/supabase/client';
import { BankAccount } from '@/modules/banking/bank';

// Pobierz wszystkie konta bankowe dla danego profilu firmy
export async function getBankAccountsForProfile(businessProfileId: string): Promise<BankAccount[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbToBankAccount);
}

// Dodaj nowe konto bankowe
export async function addBankAccount(account: Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({
      business_profile_id: account.businessProfileId,
      bank_name: account.bankName,
      account_number: account.accountNumber,
      account_name: account.accountName,
      currency: account.currency,
      type: account.type,
      balance: account.balance,
      connected_at: account.connectedAt,
    })
    .select()
    .single();
  if (error) throw error;
  return mapDbToBankAccount(data);
}

// Edytuj konto bankowe
export async function updateBankAccount(id: string, updates: Partial<Omit<BankAccount, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BankAccount> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .update({
      ...mapBankAccountToDb(updates)
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapDbToBankAccount(data);
}

// Usuń konto bankowe
export async function deleteBankAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from('bank_accounts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// Mapowanie z bazy na typ aplikacji
function mapDbToBankAccount(row: any): BankAccount {
  return {
    id: row.id,
    businessProfileId: row.business_profile_id,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountName: row.account_name,
    currency: row.currency,
    type: row.type,
    balance: Number(row.balance) || 0,
    connectedAt: row.connected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Mapowanie z aplikacji na bazę (do update)
function mapBankAccountToDb(account: Partial<BankAccount>): any {
  const out: any = {};
  if (account.businessProfileId) out.business_profile_id = account.businessProfileId;
  if (account.bankName) out.bank_name = account.bankName;
  if (account.accountNumber) out.account_number = account.accountNumber;
  if (account.accountName !== undefined) out.account_name = account.accountName;
  if (account.currency) out.currency = account.currency;
  if (account.type) out.type = account.type;
  if (account.balance !== undefined) out.balance = account.balance;
  if (account.connectedAt) out.connected_at = account.connectedAt;
  return out;
} 