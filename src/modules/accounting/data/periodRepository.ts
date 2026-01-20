import { supabase } from '@/integrations/supabase/client';

export interface ClosePeriodResult {
  success: boolean;
  period_id?: string;
  event_id?: string;
  totals?: {
    total_revenue: number;
    total_tax: number;
    invoice_count: number;
  };
  error?: string;
  message?: string;
  unposted_count?: number;
}

export interface ReopenPeriodResult {
  success: boolean;
  period_id?: string;
  error?: string;
  message?: string;
}

/**
 * Close an accounting period
 */
export async function closeAccountingPeriod(
  businessProfileId: string,
  year: number,
  month: number,
  lockPeriod: boolean = false,
  closureNote?: string
): Promise<ClosePeriodResult> {
  const { data, error } = await supabase.rpc('close_accounting_period', {
    p_business_profile_id: businessProfileId,
    p_period_year: year,
    p_period_month: month,
    p_lock_period: lockPeriod,
    p_closure_note: closureNote,
  });

  if (error) {
    console.error('Error closing period:', error);
    throw error;
  }

  return data as ClosePeriodResult;
}

/**
 * Reopen a closed accounting period
 */
export async function reopenAccountingPeriod(
  businessProfileId: string,
  year: number,
  month: number,
  reason: string
): Promise<ReopenPeriodResult> {
  const { data, error } = await supabase.rpc('reopen_accounting_period', {
    p_business_profile_id: businessProfileId,
    p_period_year: year,
    p_period_month: month,
    p_reason: reason,
  });

  if (error) {
    console.error('Error reopening period:', error);
    throw error;
  }

  return data as ReopenPeriodResult;
}

/**
 * Get accounting events for a period
 */
export async function getAccountingEvents(
  businessProfileId: string,
  year?: number,
  month?: number,
  limit: number = 50
) {
  let query = supabase
    .from('accounting_events')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (year !== undefined) {
    query = query.eq('period_year', year);
  }

  if (month !== undefined) {
    query = query.eq('period_month', month);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching accounting events:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get closed periods for a business profile
 */
export async function getClosedPeriods(businessProfileId: string) {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('period_year, period_month, is_locked, status, closed_at')
    .eq('business_profile_id', businessProfileId)
    .eq('status', 'closed');

  if (error) {
    console.error('Error fetching closed periods:', error);
    throw error;
  }

  return (data || []).map(p => ({
    year: p.period_year,
    month: p.period_month,
    is_locked: p.is_locked || false,
    status: p.status,
    closed_at: p.closed_at,
  }));
}

/**
 * Get period statistics
 */
export async function getPeriodStatistics(
  businessProfileId: string,
  year: number,
  month: number
) {
  // Get revenue totals
  const { data: revenueData, error: revenueError } = await supabase
    .from('jdg_revenue_register_lines')
    .select('tax_base_amount, ryczalt_tax_amount')
    .eq('business_profile_id', businessProfileId)
    .eq('period_year', year)
    .eq('period_month', month);

  if (revenueError) {
    console.error('Error fetching revenue data:', revenueError);
    throw revenueError;
  }

  const totalRevenue = (revenueData || []).reduce(
    (sum, line) => sum + (parseFloat(line.tax_base_amount as any) || 0),
    0
  );

  const totalTax = (revenueData || []).reduce(
    (sum, line) => sum + (parseFloat(line.ryczalt_tax_amount as any) || 0),
    0
  );

  const invoiceCount = revenueData?.length || 0;

  // Get unposted invoice count
  const { count: unpostedCount, error: unpostedError } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('business_profile_id', businessProfileId)
    .eq('accounting_status', 'unposted')
    .gte('issue_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('issue_date', `${year}-${String(month).padStart(2, '0')}-31`);

  if (unpostedError) {
    console.error('Error fetching unposted count:', unpostedError);
  }

  return {
    totalRevenue,
    totalTax,
    invoiceCount,
    unpostedCount: unpostedCount || 0,
  };
}
