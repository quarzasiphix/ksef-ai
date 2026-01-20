import { supabase } from '@/integrations/supabase/client';

export interface PostingRule {
  id: string;
  business_profile_id: string;
  name: string;
  description?: string;
  rule_code?: string;
  document_type: string;
  transaction_type?: string;
  payment_method?: string;
  vat_scheme?: string;
  vat_rate?: number;
  project_id?: string;
  department_id?: string;
  currency?: string;
  is_active: boolean;
  is_system: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
}

export interface PostingRuleLine {
  id: string;
  posting_rule_id: string;
  line_order: number;
  side: 'debit' | 'credit';
  account_code: string;
  amount_type: 'gross' | 'net' | 'vat' | 'fixed' | 'formula';
  amount_formula?: string;
  fixed_amount?: number;
  description?: string;
  created_at?: string;
}

export interface PostingRuleWithLines extends PostingRule {
  lines: PostingRuleLine[];
}

export interface AccountingPeriod {
  id: string;
  business_profile_id: string;
  period_year: number;
  period_month: number;
  period_start: string;
  period_end: string;
  status: 'open' | 'closing' | 'locked';
  locked_at?: string;
  locked_by?: string;
  lock_reason?: string;
  auto_lock_enabled: boolean;
  auto_lock_day: number;
  total_revenue?: number;
  total_expenses?: number;
  net_result?: number;
  total_vat_due?: number;
  total_vat_deductible?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// POSTING RULES
// ============================================

export async function getPostingRules(businessProfileId: string): Promise<PostingRule[]> {
  const { data, error } = await supabase
    .from('posting_rules')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('priority', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPostingRuleWithLines(ruleId: string): Promise<PostingRuleWithLines | null> {
  const { data: rule, error: ruleError } = await supabase
    .from('posting_rules')
    .select('*')
    .eq('id', ruleId)
    .single();

  if (ruleError) throw ruleError;
  if (!rule) return null;

  const { data: lines, error: linesError } = await supabase
    .from('posting_rule_lines')
    .select('*')
    .eq('posting_rule_id', ruleId)
    .order('line_order', { ascending: true });

  if (linesError) throw linesError;

  return {
    ...rule,
    lines: lines || []
  };
}

export async function findPostingRule(
  businessProfileId: string,
  documentType: string,
  transactionType?: string,
  paymentMethod?: string,
  vatScheme?: string,
  vatRate?: number
): Promise<any> {
  const { data, error } = await supabase.rpc('find_posting_rule', {
    p_business_profile_id: businessProfileId,
    p_document_type: documentType,
    p_transaction_type: transactionType,
    p_payment_method: paymentMethod,
    p_vat_scheme: vatScheme,
    p_vat_rate: vatRate
  });

  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

export async function seedBasicSpzooPostingRules(businessProfileId: string): Promise<any> {
  const { data, error } = await supabase.rpc('seed_basic_spolka_posting_rules', {
    p_business_profile_id: businessProfileId
  });

  if (error) throw error;
  return data;
}

// ============================================
// AUTO-POSTING
// ============================================

export async function autoPostInvoice(invoiceId: string): Promise<any> {
  const { data, error } = await supabase.rpc('auto_post_invoice', {
    p_invoice_id: invoiceId
  });

  if (error) throw error;
  return data;
}

export async function autoPostPendingInvoices(
  businessProfileId: string,
  limit: number = 100,
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  const { data, error } = await supabase.rpc('auto_post_pending_invoices', {
    p_business_profile_id: businessProfileId,
    p_limit: limit,
    p_start_date: startDate?.toISOString().split('T')[0], // Format as YYYY-MM-DD
    p_end_date: endDate?.toISOString().split('T')[0]
  });

  if (error) throw error;
  return data;
}

// ============================================
// EXPENSE ACCEPTANCE
// ============================================

export async function acceptExpense(invoiceId: string, userId: string): Promise<any> {
  const { data, error } = await supabase.rpc('accept_expense', {
    p_invoice_id: invoiceId,
    p_user_id: userId
  });

  if (error) throw error;
  return data;
}

export async function rejectExpense(
  invoiceId: string,
  userId: string,
  reason: string
): Promise<any> {
  const { data, error } = await supabase.rpc('reject_expense', {
    p_invoice_id: invoiceId,
    p_user_id: userId,
    p_reason: reason
  });

  if (error) throw error;
  return data;
}

export async function getPendingExpenses(businessProfileId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('pending_expenses')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('invoice_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getUnpostedTransactions(businessProfileId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('unposted_transactions')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================
// ACCOUNTING PERIODS
// ============================================

export async function getAccountingPeriods(businessProfileId: string): Promise<AccountingPeriod[]> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getCurrentPeriod(businessProfileId: string): Promise<AccountingPeriod | null> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('period_year', year)
    .eq('period_month', month)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function lockAccountingPeriod(
  periodId: string,
  userId: string,
  reason?: string
): Promise<any> {
  const { data, error } = await supabase.rpc('lock_accounting_period', {
    p_period_id: periodId,
    p_user_id: userId,
    p_reason: reason
  });

  if (error) throw error;
  return data;
}

export async function unlockAccountingPeriod(
  periodId: string,
  userId: string,
  reason: string
): Promise<any> {
  const { data, error } = await supabase.rpc('unlock_accounting_period', {
    p_period_id: periodId,
    p_user_id: userId,
    p_reason: reason
  });

  if (error) throw error;
  return data;
}

export async function autoLockPreviousMonth(): Promise<any> {
  const { data, error } = await supabase.rpc('auto_lock_previous_month');

  if (error) throw error;
  return data;
}

export async function createAccountingPeriod(
  businessProfileId: string,
  year: number,
  month: number
): Promise<AccountingPeriod> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const { data, error } = await supabase
    .from('accounting_periods')
    .insert({
      business_profile_id: businessProfileId,
      period_year: year,
      period_month: month,
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      status: 'open',
      auto_lock_enabled: true,
      auto_lock_day: 20
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
