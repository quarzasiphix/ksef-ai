/**
 * Period Data Source - Enforces immutability for closed periods
 * 
 * CRITICAL RULE: Closed periods MUST read from immutable register lines,
 * NOT from invoices (which can be edited).
 */

import { supabase } from '@/integrations/supabase/client';

export interface PeriodTotals {
  totalRevenue: number;
  totalTax: number;
  invoiceCount: number;
  source: 'live' | 'snapshot';
  snapshotDate?: string;
}

/**
 * Get period totals - uses snapshot if period is closed, live data if open
 */
export async function getPeriodTotals(
  businessProfileId: string,
  year: number,
  month: number
): Promise<PeriodTotals> {
  // Check if period is closed
  const { data: period } = await supabase
    .from('accounting_periods')
    .select('status, is_locked, closed_at, total_revenue')
    .eq('business_profile_id', businessProfileId)
    .eq('period_year', year)
    .eq('period_month', month)
    .single();

  // If closed, use snapshot from accounting_events
  if (period && (period.status === 'closed' || period.is_locked)) {
    const { data: closureEvent } = await supabase
      .from('accounting_events')
      .select('totals_snapshot, created_at')
      .eq('business_profile_id', businessProfileId)
      .eq('event_type', 'PERIOD_CLOSED')
      .eq('period_year', year)
      .eq('period_month', month)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (closureEvent?.totals_snapshot) {
      const snapshot = closureEvent.totals_snapshot as any;
      return {
        totalRevenue: snapshot.total_revenue || 0,
        totalTax: snapshot.total_tax || 0,
        invoiceCount: snapshot.invoice_count || 0,
        source: 'snapshot',
        snapshotDate: closureEvent.created_at,
      };
    }
  }

  // Otherwise, calculate from live register lines
  const { data: registerLines } = await supabase
    .from('jdg_revenue_register_lines')
    .select('tax_base_amount, ryczalt_tax_amount')
    .eq('business_profile_id', businessProfileId)
    .eq('period_year', year)
    .eq('period_month', month);

  const totalRevenue = (registerLines || []).reduce(
    (sum, line) => sum + (parseFloat(line.tax_base_amount as any) || 0),
    0
  );

  const totalTax = (registerLines || []).reduce(
    (sum, line) => sum + (parseFloat(line.ryczalt_tax_amount as any) || 0),
    0
  );

  return {
    totalRevenue,
    totalTax,
    invoiceCount: registerLines?.length || 0,
    source: 'live',
  };
}

/**
 * Get period invoices - returns different data based on period state
 */
export async function getPeriodInvoices(
  businessProfileId: string,
  year: number,
  month: number,
  includeClosed: boolean = false
) {
  // Check if period is closed
  const { data: period } = await supabase
    .from('accounting_periods')
    .select('status, is_locked')
    .eq('business_profile_id', businessProfileId)
    .eq('period_year', year)
    .eq('period_month', month)
    .single();

  const isClosed = period && (period.status === 'closed' || period.is_locked);

  if (isClosed && !includeClosed) {
    // For closed periods, return register lines (immutable)
    const { data: registerLines } = await supabase
      .from('jdg_revenue_register_lines')
      .select(`
        *,
        invoices!inner(
          number,
          issue_date,
          customers!inner(name)
        )
      `)
      .eq('business_profile_id', businessProfileId)
      .eq('period_year', year)
      .eq('period_month', month)
      .order('occurred_at', { ascending: false });

    return {
      data: registerLines || [],
      source: 'register' as const,
      isClosed: true,
    };
  }

  // For open periods, return live invoice data
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      customers!inner(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .gte('issue_date', `${year}-${String(month).padStart(2, '0')}-01`)
    .lte('issue_date', `${year}-${String(month).padStart(2, '0')}-31`)
    .order('issue_date', { ascending: false });

  return {
    data: invoices || [],
    source: 'invoices' as const,
    isClosed: false,
  };
}

/**
 * Validate period can be viewed (not just closed)
 */
export function canViewPeriod(year: number, month: number): boolean {
  const periodDate = new Date(year, month - 1, 1);
  const now = new Date();
  
  // Can view up to 2 years in the past
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), 1);
  
  // Can view up to 1 year in the future
  const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth(), 1);
  
  return periodDate >= twoYearsAgo && periodDate <= oneYearAhead;
}
