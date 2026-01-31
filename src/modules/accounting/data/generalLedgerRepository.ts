import { supabase } from '@/integrations/supabase/client';

export interface PostedInvoice {
  id: string;
  number: string;
  issue_date: string;
  transaction_type: 'income' | 'expense';
  total_gross_value: number;
  total_net_value: number;
  total_vat_value: number;
  currency: string;
  accounting_status: string;
  posted_at: string;
  customer_name?: string;
  business_profile_name?: string;
  ryczalt_account_id?: string;
  payment_method?: string;
}

/**
 * Get all posted (accounted) invoices for Księga główna
 * This replaces the old journal_entries approach
 */
export async function getPostedInvoices(
  businessProfileId: string,
  startDate?: string,
  endDate?: string
): Promise<PostedInvoice[]> {
  let query = supabase
    .from('invoices')
    .select(`
      id,
      number,
      issue_date,
      transaction_type,
      total_gross_value,
      total_net_value,
      total_vat_value,
      currency,
      accounting_status,
      posted_at,
      ryczalt_account_id,
      payment_method,
      customers(name),
      business_profiles(name)
    `)
    .eq('business_profile_id', businessProfileId)
    .eq('accounting_status', 'posted')
    .order('issue_date', { ascending: false });

  if (startDate) {
    query = query.gte('issue_date', startDate);
  }
  if (endDate) {
    query = query.lte('issue_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Map the data to include customer/business names
  return (data || []).map((invoice: any) => ({
    id: invoice.id,
    number: invoice.number,
    issue_date: invoice.issue_date,
    transaction_type: invoice.transaction_type,
    total_gross_value: Number(invoice.total_gross_value) || 0,
    total_net_value: Number(invoice.total_net_value) || 0,
    total_vat_value: Number(invoice.total_vat_value) || 0,
    currency: invoice.currency || 'PLN',
    accounting_status: invoice.accounting_status,
    posted_at: invoice.posted_at,
    customer_name: invoice.customers?.name || null,
    business_profile_name: invoice.business_profiles?.name || null,
    ryczalt_account_id: invoice.ryczalt_account_id,
    payment_method: invoice.payment_method,
  }));
}

/**
 * Get accounting summary for a period
 */
export async function getAccountingSummary(
  businessProfileId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  total_income: number;
  total_expenses: number;
  net_result: number;
  total_vat_collected: number;
  total_vat_paid: number;
  vat_balance: number;
}> {
  const invoices = await getPostedInvoices(businessProfileId, startDate, endDate);

  const income = invoices.filter(inv => inv.transaction_type === 'income');
  const expenses = invoices.filter(inv => inv.transaction_type === 'expense');

  const total_income = income.reduce((sum, inv) => sum + inv.total_net_value, 0);
  const total_expenses = expenses.reduce((sum, inv) => sum + inv.total_net_value, 0);
  const total_vat_collected = income.reduce((sum, inv) => sum + inv.total_vat_value, 0);
  const total_vat_paid = expenses.reduce((sum, inv) => sum + inv.total_vat_value, 0);

  return {
    total_income,
    total_expenses,
    net_result: total_income - total_expenses,
    total_vat_collected,
    total_vat_paid,
    vat_balance: total_vat_collected - total_vat_paid,
  };
}

/**
 * Get unposted invoices count
 */
export async function getUnpostedInvoicesCount(businessProfileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('business_profile_id', businessProfileId)
    .eq('accounting_status', 'unposted');

  if (error) throw error;
  return count || 0;
}
