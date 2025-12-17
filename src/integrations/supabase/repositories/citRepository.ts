import { supabase } from '../client';

// Types
export type CITAdvanceStatus = 'calculated' | 'due' | 'paid' | 'zero' | 'overdue';
export type CITPeriodType = 'monthly' | 'quarterly';
export type CITDeclarationStatus = 'draft' | 'calculated' | 'filed' | 'paid' | 'amended';

export interface CITAdvance {
  id: string;
  business_profile_id: string;
  fiscal_year: number;
  period_type: CITPeriodType;
  period_number: number;
  period_start: string;
  period_end: string;
  revenue_ytd: number;
  costs_ytd: number;
  profit_ytd: number;
  cit_rate: number;
  tax_due_ytd: number;
  advances_paid_ytd: number;
  advance_due: number;
  payment_deadline: string;
  payment_date?: string;
  payment_amount?: number;
  payment_reference?: string;
  status: CITAdvanceStatus;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CITAnnualDeclaration {
  id: string;
  business_profile_id: string;
  fiscal_year: number;
  total_revenue: number;
  total_costs: number;
  gross_profit: number;
  non_deductible_costs: number;
  tax_exempt_revenue: number;
  taxable_income: number;
  cit_rate: number;
  cit_due: number;
  advances_paid: number;
  final_payment: number;
  filing_deadline: string;
  filed_at?: string;
  payment_deadline: string;
  paid_at?: string;
  status: CITDeclarationStatus;
  declaration_file_path?: string;
  notes?: string;
}

export interface YTDFinancials {
  revenue: number;
  costs: number;
  profit: number;
}

// ============================================
// CIT CALCULATION HELPERS
// ============================================

/**
 * Calculate CIT advance for a period based on YTD figures
 * Formula: (Revenue YTD – Costs YTD) × CIT rate = tax due YTD
 * Advance = tax due YTD – advances already paid
 */
export function calculateCITAdvance(
  revenueYTD: number,
  costsYTD: number,
  citRate: number,
  advancesPaidYTD: number
): { profitYTD: number; taxDueYTD: number; advanceDue: number } {
  const profitYTD = revenueYTD - costsYTD;
  
  // If profit is <= 0, no tax is due
  if (profitYTD <= 0) {
    return { profitYTD, taxDueYTD: 0, advanceDue: 0 };
  }
  
  const taxDueYTD = Math.round(profitYTD * (citRate / 100) * 100) / 100;
  const advanceDue = Math.max(0, taxDueYTD - advancesPaidYTD);
  
  return { profitYTD, taxDueYTD, advanceDue };
}

/**
 * Get period dates for monthly or quarterly periods
 */
export function getPeriodDates(
  year: number,
  periodType: CITPeriodType,
  periodNumber: number
): { start: string; end: string; deadline: string } {
  let startMonth: number;
  let endMonth: number;
  
  if (periodType === 'monthly') {
    startMonth = periodNumber;
    endMonth = periodNumber;
  } else {
    // Quarterly
    startMonth = (periodNumber - 1) * 3 + 1;
    endMonth = periodNumber * 3;
  }
  
  const startDate = new Date(year, startMonth - 1, 1);
  const endDate = new Date(year, endMonth, 0); // Last day of end month
  
  // Payment deadline: 20th of the month after period ends
  const deadlineDate = new Date(year, endMonth, 20);
  // Handle year overflow
  if (endMonth === 12) {
    deadlineDate.setFullYear(year + 1);
    deadlineDate.setMonth(0);
  }
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
    deadline: deadlineDate.toISOString().split('T')[0],
  };
}

/**
 * Determine the current period number based on date
 */
export function getCurrentPeriod(
  periodType: CITPeriodType,
  date: Date = new Date()
): { year: number; periodNumber: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  if (periodType === 'monthly') {
    return { year, periodNumber: month };
  } else {
    // Quarterly
    const quarter = Math.ceil(month / 3);
    return { year, periodNumber: quarter };
  }
}

// ============================================
// CIT ADVANCES CRUD
// ============================================

export async function getCITAdvances(
  businessProfileId: string,
  fiscalYear?: number
): Promise<CITAdvance[]> {
  let query = supabase
    .from('cit_advances')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('fiscal_year', { ascending: false })
    .order('period_number', { ascending: true });
  
  if (fiscalYear) {
    query = query.eq('fiscal_year', fiscalYear);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data || [];
}

export async function saveCITAdvance(
  advance: Omit<CITAdvance, 'id' | 'created_at' | 'updated_at'>
): Promise<CITAdvance> {
  const { data, error } = await supabase
    .from('cit_advances')
    .upsert({
      ...advance,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'business_profile_id,fiscal_year,period_type,period_number'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function markCITAdvancePaid(
  id: string,
  paymentDate: string,
  paymentAmount: number,
  paymentReference?: string
): Promise<void> {
  const { error } = await supabase
    .from('cit_advances')
    .update({
      status: 'paid',
      payment_date: paymentDate,
      payment_amount: paymentAmount,
      payment_reference: paymentReference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================
// CIT ANNUAL DECLARATIONS CRUD
// ============================================

export async function getCITDeclarations(
  businessProfileId: string
): Promise<CITAnnualDeclaration[]> {
  const { data, error } = await supabase
    .from('cit_annual_declarations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .order('fiscal_year', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getCITDeclaration(
  businessProfileId: string,
  fiscalYear: number
): Promise<CITAnnualDeclaration | null> {
  const { data, error } = await supabase
    .from('cit_annual_declarations')
    .select('*')
    .eq('business_profile_id', businessProfileId)
    .eq('fiscal_year', fiscalYear)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function saveCITDeclaration(
  declaration: Omit<CITAnnualDeclaration, 'id'>
): Promise<CITAnnualDeclaration> {
  const { data, error } = await supabase
    .from('cit_annual_declarations')
    .upsert({
      ...declaration,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'business_profile_id,fiscal_year'
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// YTD FINANCIALS CALCULATION
// ============================================

/**
 * Calculate YTD financials from invoices and expenses
 */
export async function calculateYTDFinancials(
  businessProfileId: string,
  year: number,
  upToDate: string
): Promise<YTDFinancials> {
  const startOfYear = `${year}-01-01`;
  
  // Get income invoices
  const { data: incomeData, error: incomeError } = await supabase
    .from('invoices')
    .select('total_gross, total_net, currency, exchange_rate')
    .eq('business_profile_id', businessProfileId)
    .eq('transaction_type', 'income')
    .gte('issue_date', startOfYear)
    .lte('issue_date', upToDate);
  
  if (incomeError) throw incomeError;
  
  // Get expenses
  const { data: expenseData, error: expenseError } = await supabase
    .from('expenses')
    .select('total_gross, total_net, currency')
    .eq('business_profile_id', businessProfileId)
    .gte('date', startOfYear)
    .lte('date', upToDate);
  
  if (expenseError) throw expenseError;
  
  // Calculate revenue (net amounts in PLN)
  const revenue = (incomeData || []).reduce((sum, inv) => {
    const amount = inv.total_net || inv.total_gross || 0;
    const rate = inv.exchange_rate || 1;
    return sum + (amount * rate);
  }, 0);
  
  // Calculate costs (net amounts in PLN)
  const costs = (expenseData || []).reduce((sum, exp) => {
    return sum + (exp.total_net || exp.total_gross || 0);
  }, 0);
  
  return {
    revenue: Math.round(revenue * 100) / 100,
    costs: Math.round(costs * 100) / 100,
    profit: Math.round((revenue - costs) * 100) / 100,
  };
}

/**
 * Generate or update CIT advances for a fiscal year
 */
export async function generateCITAdvances(
  businessProfileId: string,
  fiscalYear: number,
  periodType: CITPeriodType,
  citRate: number
): Promise<CITAdvance[]> {
  const periodsCount = periodType === 'monthly' ? 12 : 4;
  const advances: CITAdvance[] = [];
  let advancesPaidYTD = 0;
  
  for (let period = 1; period <= periodsCount; period++) {
    const { start, end, deadline } = getPeriodDates(fiscalYear, periodType, period);
    
    // Check if this period is in the future
    const today = new Date().toISOString().split('T')[0];
    if (start > today) break;
    
    // Calculate YTD financials up to this period's end
    const ytd = await calculateYTDFinancials(businessProfileId, fiscalYear, end);
    
    // Get previously paid advances
    const { data: prevAdvances } = await supabase
      .from('cit_advances')
      .select('payment_amount')
      .eq('business_profile_id', businessProfileId)
      .eq('fiscal_year', fiscalYear)
      .lt('period_number', period)
      .eq('status', 'paid');
    
    advancesPaidYTD = (prevAdvances || []).reduce(
      (sum, a) => sum + (a.payment_amount || 0),
      0
    );
    
    // Calculate this period's advance
    const calc = calculateCITAdvance(ytd.revenue, ytd.costs, citRate, advancesPaidYTD);
    
    // Determine status
    let status: CITAdvanceStatus = 'calculated';
    if (calc.advanceDue <= 0) {
      status = 'zero';
    } else if (deadline < today) {
      status = 'overdue';
    } else if (deadline <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) {
      status = 'due';
    }
    
    // Check if already paid
    const { data: existing } = await supabase
      .from('cit_advances')
      .select('status, payment_amount')
      .eq('business_profile_id', businessProfileId)
      .eq('fiscal_year', fiscalYear)
      .eq('period_number', period)
      .maybeSingle();
    
    if (existing?.status === 'paid') {
      status = 'paid';
    }
    
    const advance = await saveCITAdvance({
      business_profile_id: businessProfileId,
      fiscal_year: fiscalYear,
      period_type: periodType,
      period_number: period,
      period_start: start,
      period_end: end,
      revenue_ytd: ytd.revenue,
      costs_ytd: ytd.costs,
      profit_ytd: ytd.profit,
      cit_rate: citRate,
      tax_due_ytd: calc.taxDueYTD,
      advances_paid_ytd: advancesPaidYTD,
      advance_due: calc.advanceDue,
      payment_deadline: deadline,
      status: existing?.status === 'paid' ? 'paid' : status,
      payment_amount: existing?.payment_amount,
    });
    
    advances.push(advance);
  }
  
  return advances;
}
