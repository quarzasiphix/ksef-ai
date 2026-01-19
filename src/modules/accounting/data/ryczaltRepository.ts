import { supabase } from '@/integrations/supabase/client';

export interface RyczaltCategory {
  id: string;
  name: string;
  rate: number;
  description?: string;
  pkd_codes?: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RyczaltAccount {
  id: string;
  business_profile_id: string;
  ryczalt_category_id: string;
  account_number: string;
  account_name: string;
  description?: string;
  is_active: boolean;
  current_balance: number;
  period_balance: number;
  year_balance: number;
  created_at?: string;
  updated_at?: string;
  category_name?: string;
  category_rate?: number;
  category_description?: string;
  pkd_codes?: string[];
  business_profile_name?: string;
}

/**
 * List all global ryczałt categories (system-wide)
 */
export async function listRyczaltCategories(): Promise<RyczaltCategory[]> {
  const { data, error } = await supabase
    .from('ryczalt_categories')
    .select('*')
    .eq('is_active', true)
    .order('rate', { ascending: true });

  if (error) {
    console.error('Error fetching ryczałt categories:', error);
    throw error;
  }

  return data || [];
}

/**
 * List ryczałt accounts for a business profile with category info
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
  account: Omit<RyczaltAccount, 'id' | 'created_at' | 'updated_at' | 'category_name' | 'category_rate' | 'category_description' | 'pkd_codes' | 'business_profile_name'>
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
  updates: Partial<Omit<RyczaltAccount, 'id' | 'business_profile_id' | 'ryczalt_category_id' | 'created_at' | 'updated_at' | 'category_name' | 'category_rate' | 'category_description' | 'pkd_codes' | 'business_profile_name'>>
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
 * Get ryczałt accounts summary for a business profile
 */
export async function getRyczaltAccountsSummary(
  businessProfileId: string
): Promise<{
  totalBalance: number;
  periodBalance: number;
  yearBalance: number;
  accounts: RyczaltAccount[];
}> {
  const accounts = await listRyczaltAccounts(businessProfileId);
  
  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  const periodBalance = accounts.reduce((sum, acc) => sum + (acc.period_balance || 0), 0);
  const yearBalance = accounts.reduce((sum, acc) => sum + (acc.year_balance || 0), 0);

  return {
    totalBalance,
    periodBalance,
    yearBalance,
    accounts
  };
}

/**
 * Get next available account number for a business profile
 */
export async function getNextAccountNumber(
  businessProfileId: string
): Promise<string> {
  const { data } = await supabase
    .from('ryczalt_accounts')
    .select('account_number')
    .eq('business_profile_id', businessProfileId)
    .order('account_number', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    // Get the highest number and increment
    const highestNumber = parseInt(data[0].account_number.replace(/\D/g, ''));
    return String(highestNumber + 1).padStart(3, '0');
  }

  // No accounts yet, start with 701
  return '701';
}
