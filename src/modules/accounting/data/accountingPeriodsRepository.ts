import { supabase } from '../../../integrations/supabase/client';
import type { 
  AccountingPeriod, 
  ShareholderLoan, 
  ShareholderReimbursement,
  ComplianceDeadline,
  AuditLogEntry 
} from '@/modules/accounting/accounting';

// ============================================================================
// ACCOUNTING PERIODS (Year-end closing)
// ============================================================================

export async function getAccountingPeriods(businessProfileId: string): Promise<AccountingPeriod[]> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('fiscal_year', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAccountingPeriod(id: string): Promise<AccountingPeriod | null> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getCurrentPeriod(businessProfileId: string): Promise<AccountingPeriod | null> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('status', 'open')
    .order('fiscal_year', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function createAccountingPeriod(
  period: Omit<AccountingPeriod, 'id' | 'created_at' | 'updated_at'>
): Promise<AccountingPeriod> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .insert(period)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccountingPeriod(
  id: string,
  updates: Partial<AccountingPeriod>
): Promise<AccountingPeriod> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function closePeriod(
  id: string,
  closingData: {
    net_profit_loss: number;
    total_revenue: number;
    total_expenses: number;
    cit_liability: number;
    cit_rate: number;
  }
): Promise<AccountingPeriod> {
  const { data, error } = await supabase
    .from('accounting_periods')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      ...closingData,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// SHAREHOLDER LOANS (Pożyczka wspólnika)
// ============================================================================

export async function getShareholderLoans(businessProfileId: string): Promise<ShareholderLoan[]> {
  const { data, error } = await supabase
    .from('shareholder_loans')
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('loan_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getShareholderLoansByShareholder(
  shareholderId: string
): Promise<ShareholderLoan[]> {
  const { data, error } = await supabase
    .from('shareholder_loans')
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .eq('shareholder_id', shareholderId)
    .order('loan_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createShareholderLoan(
  loan: Omit<ShareholderLoan, 'id' | 'created_at' | 'updated_at' | 'version' | 'locked'>
): Promise<ShareholderLoan> {
  const { data, error } = await supabase
    .from('shareholder_loans')
    .insert(loan)
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateShareholderLoan(
  id: string,
  updates: Partial<ShareholderLoan>
): Promise<ShareholderLoan> {
  const { data, error } = await supabase
    .from('shareholder_loans')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function lockShareholderLoan(id: string): Promise<ShareholderLoan> {
  const { data, error } = await supabase
    .from('shareholder_loans')
    .update({
      locked: true,
      locked_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// SHAREHOLDER REIMBURSEMENTS (Zwroty kosztów)
// ============================================================================

export async function getShareholderReimbursements(
  businessProfileId: string
): Promise<ShareholderReimbursement[]> {
  const { data, error } = await supabase
    .from('shareholder_reimbursements')
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .eq('business_profile_id', businessProfileId)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getShareholderReimbursementsByShareholder(
  shareholderId: string
): Promise<ShareholderReimbursement[]> {
  const { data, error } = await supabase
    .from('shareholder_reimbursements')
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .eq('shareholder_id', shareholderId)
    .order('expense_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createShareholderReimbursement(
  reimbursement: Omit<ShareholderReimbursement, 'id' | 'created_at' | 'updated_at' | 'version'>
): Promise<ShareholderReimbursement> {
  const { data, error } = await supabase
    .from('shareholder_reimbursements')
    .insert(reimbursement)
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateShareholderReimbursement(
  id: string,
  updates: Partial<ShareholderReimbursement>
): Promise<ShareholderReimbursement> {
  const { data, error } = await supabase
    .from('shareholder_reimbursements')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function approveReimbursement(id: string): Promise<ShareholderReimbursement> {
  const { data, error } = await supabase
    .from('shareholder_reimbursements')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      shareholder:shareholders(*)
    `)
    .single();

  if (error) throw error;
  return data;
}

// ============================================================================
// COMPLIANCE DEADLINES
// ============================================================================

export async function getComplianceDeadlines(
  businessProfileId: string,
  fiscalYear?: number
): Promise<ComplianceDeadline[]> {
  let query = supabase
    .from('compliance_deadlines')
    .select('*')
    .eq('business_profile_id', businessProfileId);

  if (fiscalYear) {
    query = query.eq('fiscal_year', fiscalYear);
  }

  const { data, error } = await query.order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getUpcomingDeadlines(
  businessProfileId: string,
  daysAhead: number = 90
): Promise<ComplianceDeadline[]> {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('compliance_deadlines')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .in('status', ['pending', 'in_progress'])
    .gte('due_date', today.toISOString().split('T')[0])
    .lte('due_date', futureDate.toISOString().split('T')[0])
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getOverdueDeadlines(
  businessProfileId: string
): Promise<ComplianceDeadline[]> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('compliance_deadlines')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .in('status', ['pending', 'in_progress'])
    .lt('due_date', today)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createComplianceDeadline(
  deadline: Omit<ComplianceDeadline, 'id' | 'created_at' | 'updated_at'>
): Promise<ComplianceDeadline> {
  const { data, error } = await supabase
    .from('compliance_deadlines')
    .insert(deadline)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateComplianceDeadline(
  id: string,
  updates: Partial<ComplianceDeadline>
): Promise<ComplianceDeadline> {
  const { data, error } = await supabase
    .from('compliance_deadlines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function completeDeadline(
  id: string,
  documentId?: string,
  filingNumber?: string
): Promise<ComplianceDeadline> {
  const { data, error } = await supabase
    .from('compliance_deadlines')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      document_id: documentId,
      filing_number: filingNumber,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function generateComplianceDeadlines(
  businessProfileId: string,
  fiscalYear: number
): Promise<void> {
  const { error } = await supabase.rpc('generate_compliance_deadlines', {
    p_business_profile_id: businessProfileId,
    p_fiscal_year: fiscalYear,
  });

  if (error) throw error;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export async function getAuditLog(
  businessProfileId: string,
  filters?: {
    tableName?: string;
    recordId?: string;
    userId?: string;
    limit?: number;
  }
): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .eq('business_profile_id', businessProfileId);

  if (filters?.tableName) {
    query = query.eq('table_name', filters.tableName);
  }
  if (filters?.recordId) {
    query = query.eq('record_id', filters.recordId);
  }
  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  query = query.order('timestamp', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getRecordHistory(
  tableName: string,
  recordId: string
): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .eq('table_name', tableName)
    .eq('record_id', recordId)
    .order('timestamp', { ascending: false });

  if (error) throw error;
  return data || [];
}
