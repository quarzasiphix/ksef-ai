import { supabase } from '@/integrations/supabase/client';

export interface RyczaltAccount {
  id: string;
  business_profile_id: string;
  ryczalt_category_id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  account_class: number;
  parent_account_id?: string;
  is_active: boolean;
  description?: string;
  current_balance: number;
  period_balance: number;
  year_balance: number;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
  category_rate?: number;
  category_description?: string;
}

/**
 * List all ryczałt accounts for a business profile
 */
export async function listRyczaltAccounts(
  businessProfileId: string
): Promise<RyczaltAccount[]> {
  const { data, error } = await supabase
    .from('ryczalt_accounts_view')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('is_active', true)
    .order('account_number');

  if (error) {
    console.error('Error fetching ryczałt accounts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific ryczałt account by ID
 */
export async function getRyczaltAccount(
  accountId: string
): Promise<RyczaltAccount | null> {
  const { data, error } = await supabase
    .from('ryczalt_accounts_view')
    .select('*')
    .eq('id', accountId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching ryczałt account:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new ryczałt account
 */
export async function createRyczaltAccount(
  account: Omit<RyczaltAccount, 'id' | 'created_at' | 'updated_at' | 'category_name' | 'category_rate' | 'category_description'>
): Promise<RyczaltAccount> {
  const { data, error } = await supabase
    .from('ryczalt_accounts')
    .insert(account)
    .select()
    .single();

  if (error) {
    console.error('Error creating ryczałt account:', error);
    throw error;
  }

  // Fetch with category info
  const result = await getRyczaltAccount(data.id);
  if (!result) {
    throw new Error('Failed to fetch created account');
  }
  return result;
}

/**
 * Update a ryczałt account
 */
export async function updateRyczaltAccount(
  accountId: string,
  updates: Partial<Omit<RyczaltAccount, 'id' | 'business_profile_id' | 'created_at' | 'updated_at' | 'category_name' | 'category_rate' | 'category_description'>>
): Promise<RyczaltAccount> {
  const { data, error } = await supabase
    .from('ryczalt_accounts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .select()
    .single();

  if (error) {
    console.error('Error updating ryczałt account:', error);
    throw error;
  }

  // Fetch with category info
  const result = await getRyczaltAccount(data.id);
  if (!result) {
    throw new Error('Failed to fetch updated account');
  }
  return result;
}

/**
 * Delete (deactivate) a ryczałt account
 */
export async function deleteRyczaltAccount(
  accountId: string
): Promise<void> {
  const { error } = await supabase
    .from('ryczalt_accounts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', accountId);

  if (error) {
    console.error('Error deleting ryczałt account:', error);
    throw error;
  }
}

/**
 * Create default ryczałt accounts for a business profile
 */
export async function createDefaultRyczaltAccounts(
  businessProfileId: string
): Promise<RyczaltAccount[]> {
  const { data, error } = await supabase.rpc('create_default_ryczalt_accounts', {
    p_business_profile_id: businessProfileId
  });

  if (error) {
    console.error('Error creating default ryczałt accounts:', error);
    throw error;
  }

  // Wait a moment for the accounts to be created
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return the created accounts
  return await listRyczaltAccounts(businessProfileId);
}

/**
 * Get ryczałt accounts grouped by category with balances
 */
export async function getRyczaltAccountsSummary(
  businessProfileId: string
): Promise<{
  totalBalance: number;
  periodBalance: number;
  yearBalance: number;
  accountsByCategory: Array<{
    category_id: string;
    category_name: string;
    category_rate: number;
    account: RyczaltAccount;
  }>;
}> {
  const accounts = await listRyczaltAccounts(businessProfileId);
  
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const periodBalance = accounts.reduce((sum, acc) => sum + (acc.period_balance || 0), 0);
  const yearBalance = accounts.reduce((sum, acc) => sum + (acc.year_balance || 0), 0);

  const accountsByCategory = accounts.map(account => ({
    category_id: account.ryczalt_category_id,
    category_name: account.category_name || 'Nieznana kategoria',
    category_rate: account.category_rate || 0,
    account
  }));

  return {
    totalBalance,
    periodBalance,
    yearBalance,
    accountsByCategory
  };
}
