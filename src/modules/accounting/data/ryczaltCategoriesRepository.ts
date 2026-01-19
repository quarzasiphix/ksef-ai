import { supabase } from '@/integrations/supabase/client';

export interface RyczaltRevenueCategory {
  id: string;
  name: string;
  rate: number;
  pkd_codes?: string[];
  description?: string;
  is_active: boolean;
  business_profile_id?: string | null;
  created_at?: string;
}

/**
 * List all active ryczałt revenue categories
 * Categories can be:
 * - Global (business_profile_id IS NULL) - system defaults
 * - Profile-specific (business_profile_id = specific ID)
 */
export async function listRyczaltRevenueCategories(
  businessProfileId: string
): Promise<RyczaltRevenueCategory[]> {
  const { data, error } = await supabase
    .from('ryczalt_revenue_categories')
    .select('*')
    .eq('is_active', true)
    .or(`business_profile_id.is.null,business_profile_id.eq.${businessProfileId}`)
    .order('rate', { ascending: true });

  if (error) {
    console.error('Error fetching ryczałt categories:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a specific ryczałt category by ID
 */
export async function getRyczaltCategory(
  categoryId: string
): Promise<RyczaltRevenueCategory | null> {
  const { data, error } = await supabase
    .from('ryczalt_revenue_categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching ryczałt category:', error);
    throw error;
  }

  return data;
}

/**
 * Create a custom ryczałt category for a business profile
 */
export async function createRyczaltCategory(
  category: Omit<RyczaltRevenueCategory, 'id' | 'created_at'>
): Promise<RyczaltRevenueCategory> {
  const { data, error } = await supabase
    .from('ryczalt_revenue_categories')
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error('Error creating ryczałt category:', error);
    throw error;
  }

  return data;
}
