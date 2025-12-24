/**
 * Accounting Analytics Queries
 *
 * Supabase fetches for accounting analytics dashboard.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  AnalyticsState,
  KpiMetrics,
  TimeSeriesDataPoint,
  StatusFunnelData,
  AgingBucketData,
  PaymentMethodData,
  ComplianceHealthData,
  TopCustomerData,
  ActionRequiredInvoice,
} from '../types/analytics';

function matchesFilters(invoice: any, filters: AnalyticsState['filters']): boolean {
  if (filters.paymentStatus && filters.paymentStatus.length > 0) {
    const status = invoice.is_paid ? 'paid' : 'unpaid';
    if (!filters.paymentStatus.includes(status as any)) return false;
  }
  if (filters.lifecycleStatus && filters.lifecycleStatus.length > 0) {
    const status = invoice.lifecycle_status || 'issued';
    if (!filters.lifecycleStatus.includes(status)) return false;
  }
  if (filters.paymentMethod && filters.paymentMethod.length > 0) {
    if (!filters.paymentMethod.includes(invoice.payment_method)) return false;
  }
  if (filters.vatMode) {
    if (filters.vatMode === 'vat_active' && invoice.vat === false) return false;
    if (filters.vatMode === 'vat_exempt' && invoice.vat !== false) return false;
  }
  if (filters.customerIds && filters.customerIds.length > 0) {
    if (!invoice.customer_id || !filters.customerIds.includes(invoice.customer_id)) return false;
  }
  if (filters.contractIds && filters.contractIds.length > 0) {
    if (!invoice.decision_id || !filters.contractIds.includes(invoice.decision_id)) return false;
  }
  if (filters.ksefStatus && filters.ksefStatus.length > 0) {
    const status = invoice.ksef_status || 'none';
    if (!filters.ksefStatus.includes(status)) return false;
  }
  return true;
}

function getDateKey(dateStr: string, groupBy: 'day' | 'week' | 'month'): string {
  const date = new Date(dateStr);
  if (groupBy === 'day') return dateStr;
  if (groupBy === 'week') {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    return monday.toISOString().split('T')[0];
  }
  if (groupBy === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }
  return dateStr;
}

export async function fetchKpiMetrics(state: AnalyticsState): Promise<KpiMetrics> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      total_gross_value,
      total_net_value,
      total_vat_value,
      is_paid,
      due_date,
      decision_id,
      ksef_status,
      vat
    `)
    .eq('business_profile_id', state.businessProfileId)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo);

  if (error) throw error;

  const now = new Date();
  let grossRevenue = 0;
  let netRevenue = 0;
  let vatCollected = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;
  let overdueAmount = 0;
  let blockedFromAccounting = 0;
  let ksefSubmitted = 0;
  let ksefPending = 0;
  let ksefError = 0;
  let invoiceCount = 0;
  let paidInvoiceCount = 0;
  let unpaidInvoiceCount = 0;
  let overdueInvoiceCount = 0;

  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    invoiceCount++;
    grossRevenue += inv.total_gross_value || 0;
    netRevenue += inv.total_net_value || 0;
    vatCollected += inv.total_vat_value || 0;
    if (inv.is_paid) {
      paidAmount += inv.total_gross_value || 0;
      paidInvoiceCount++;
    } else {
      unpaidAmount += inv.total_gross_value || 0;
      unpaidInvoiceCount++;
      const dueDate = new Date(inv.due_date);
      if (dueDate < now) {
        overdueAmount += inv.total_gross_value || 0;
        overdueInvoiceCount++;
      }
    }
    if (!inv.decision_id) blockedFromAccounting++;
    if (inv.ksef_status === 'sent') ksefSubmitted++;
    else if (inv.ksef_status === 'pending') ksefPending++;
    else if (inv.ksef_status === 'error') ksefError++;
  });

  return {
    grossRevenue,
    netRevenue,
    vatCollected,
    paidAmount,
    unpaidAmount,
    overdueAmount,
    blockedFromAccounting,
    ksefSubmitted,
    ksefPending,
    ksefError,
    invoiceCount,
    paidInvoiceCount,
    unpaidInvoiceCount,
    overdueInvoiceCount,
  };
}

export async function fetchTimeSeries(state: AnalyticsState): Promise<TimeSeriesDataPoint[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`issue_date,total_gross_value,total_net_value,total_vat_value,is_paid,due_date`)
    .eq('business_profile_id', state.businessProfileId)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo)
    .order('issue_date');

  if (error) throw error;

  const grouped = new Map<string, TimeSeriesDataPoint>();
  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    const key = getDateKey(inv.issue_date, state.groupBy);
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: key,
        issuedGross: 0,
        issuedNet: 0,
        issuedVat: 0,
        paidGross: 0,
        paidNet: 0,
        paidVat: 0,
        overdueGross: 0,
        invoiceCount: 0,
        paidCount: 0,
        overdueCount: 0,
      });
    }
    const point = grouped.get(key)!;
    point.issuedGross += inv.total_gross_value || 0;
    point.issuedNet += inv.total_net_value || 0;
    point.issuedVat += inv.total_vat_value || 0;
    point.invoiceCount++;
    if (inv.is_paid) {
      point.paidGross += inv.total_gross_value || 0;
      point.paidNet += inv.total_net_value || 0;
      point.paidVat += inv.total_vat_value || 0;
      point.paidCount++;
    } else {
      const now = new Date();
      const dueDate = new Date(inv.due_date);
      if (dueDate < now) {
        point.overdueGross += inv.total_gross_value || 0;
        point.overdueCount++;
      }
    }
  });

  return Array.from(grouped.values()).sort((a,b) => a.date.localeCompare(b.date));
}

export async function fetchStatusFunnel(state: AnalyticsState): Promise<StatusFunnelData[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`lifecycle_status,total_gross_value`)
    .eq('business_profile_id', state.businessProfileId)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo);

  if (error) throw error;

  const stages: StatusFunnelData[] = [
    { stage: 'draft', count:0, value:0 },
    { stage: 'issued', count:0, value:0 },
    { stage: 'sent', count:0, value:0 },
    { stage: 'payment_received', count:0, value:0 },
    { stage: 'booked', count:0, value:0 },
    { stage: 'closed', count:0, value:0 },
  ];

  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    const status = inv.lifecycle_status || 'issued';
    const stage = stages.find(s => s.stage === status);
    if (stage) {
      stage.count++;
      stage.value += inv.total_gross_value || 0;
    }
  });

  return stages.filter(s => s.count > 0);
}

export async function fetchAgingBuckets(state: AnalyticsState): Promise<AgingBucketData[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`id,due_date,total_gross_value,is_paid,customer_id,customers(name)`)
    .eq('business_profile_id', state.businessProfileId)
    .eq('is_paid', false)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo);

  if (error) throw error;

  const now = new Date();
  const buckets: AgingBucketData[] = [
    { bucket: '0-7', count:0, value:0, customerBreakdown:[] },
    { bucket: '8-14', count:0, value:0, customerBreakdown:[] },
    { bucket: '15-30', count:0, value:0, customerBreakdown:[] },
    { bucket: '31-60', count:0, value:0, customerBreakdown:[] },
    { bucket: '60+', count:0, value:0, customerBreakdown:[] },
  ];

  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000*60*60*24));
    if (daysOverdue < 0) return;
    let bucket: AgingBucketData;
    if (daysOverdue <= 7) bucket = buckets[0];
    else if (daysOverdue <= 14) bucket = buckets[1];
    else if (daysOverdue <= 30) bucket = buckets[2];
    else if (daysOverdue <= 60) bucket = buckets[3];
    else bucket = buckets[4];
    bucket.count++;
    bucket.value += inv.total_gross_value || 0;
  });

  return buckets.filter(b => b.count > 0);
}

export async function fetchPaymentMethodBreakdown(state: AnalyticsState): Promise<PaymentMethodData[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`payment_method,total_gross_value`)
    .eq('business_profile_id', state.businessProfileId)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo);

  if (error) throw error;

  const methods = new Map<string, PaymentMethodData>();
  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    const method = inv.payment_method;
    if (!methods.has(method)) methods.set(method, { method, count:0, value:0 });
    const data = methods.get(method)!;
    data.count++;
    data.value += inv.total_gross_value || 0;
  });

  return Array.from(methods.values());
}

export async function fetchComplianceHealth(state: AnalyticsState): Promise<ComplianceHealthData> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`ksef_status,decision_id,booked_to_ledger`)
    .eq('business_profile_id', state.businessProfileId)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo);

  if (error) throw error;

  let readyForKsef=0, ksefSubmitted=0, ksefErrors=0, exportableToAccounting=0, exportedBooked=0, blockedFromExport=0;
  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    if (inv.ksef_status === 'sent') ksefSubmitted++;
    else if (inv.ksef_status === 'error') ksefErrors++;
    else if (inv.ksef_status === 'none') readyForKsef++;
    if (inv.decision_id) {
      exportableToAccounting++;
      if (inv.booked_to_ledger) exportedBooked++;
    } else blockedFromExport++;
  });

  return { readyForKsef,ksefSubmitted,ksefErrors,exportableToAccounting,exportedBooked,blockedFromExport };
}

export async function fetchTopCustomers(state: AnalyticsState, limit: number = 10): Promise<TopCustomerData[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`customer_id,total_gross_value,is_paid,due_date,customers(name)`)
    .eq('business_profile_id', state.businessProfileId)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo);

  if (error) throw error;

  const now = new Date();
  const customerMap = new Map<string, TopCustomerData>();
  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    if (!inv.customer_id) return;
    if (!customerMap.has(inv.customer_id)) {
      customerMap.set(inv.customer_id, {
        customerId: inv.customer_id,
        customerName: inv.customers?.name || 'Unknown',
        invoiceCount: 0,
        totalGross: 0,
        paidGross: 0,
        unpaidGross: 0,
        overdueGross: 0,
      });
    }
    const customer = customerMap.get(inv.customer_id)!;
    customer.invoiceCount++;
    customer.totalGross += inv.total_gross_value || 0;
    if (inv.is_paid) customer.paidGross += inv.total_gross_value || 0;
    else {
      customer.unpaidGross += inv.total_gross_value || 0;
      const daysOverdue = Math.floor((now.getTime()-new Date(inv.due_date).getTime())/(1000*60*60*24));
      if (daysOverdue > 0) customer.overdueGross += inv.total_gross_value || 0;
    }
  });

  return Array.from(customerMap.values())
    .sort((a,b)=>b.totalGross-a.totalGross)
    .slice(0, limit);
}

export async function fetchActionRequiredInvoices(state: AnalyticsState): Promise<ActionRequiredInvoice[]> {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`id,number,issue_date,due_date,total_gross_value,is_paid,decision_id,ksef_status,customers(name)`)
    .eq('business_profile_id', state.businessProfileId)
    .gte('issue_date', state.dateFrom)
    .lte('issue_date', state.dateTo);

  if (error) throw error;

  const now = new Date();
  const result: ActionRequiredInvoice[] = [];
  (invoices || []).forEach(inv => {
    if (!matchesFilters(inv, state.filters)) return;
    const daysOverdue = Math.floor((now.getTime()-new Date(inv.due_date).getTime())/(1000*60*60*24));
    if (!inv.is_paid && daysOverdue > 0) result.push({
      id: inv.id,
      number: inv.number,
      customerName: inv.customers?.name || 'Unknown',
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      totalGross: inv.total_gross_value || 0,
      actionType: 'overdue',
      actionReason: `Zaległość ${daysOverdue} dni`,
      daysOverdue,
    });
    if (!inv.decision_id) result.push({
      id: inv.id,
      number: inv.number,
      customerName: inv.customers?.name || 'Unknown',
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      totalGross: inv.total_gross_value || 0,
      actionType: 'blocked_accounting',
      actionReason: 'Brak decyzji',
    });
    if (inv.ksef_status === 'error') result.push({
      id: inv.id,
      number: inv.number,
      customerName: inv.customers?.name || 'Unknown',
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      totalGross: inv.total_gross_value || 0,
      actionType: 'ksef_error',
      actionReason: 'Błąd KSeF',
    });
  });

  const priority = { overdue:0, ksef_error:1, blocked_accounting:2, missing_decision:3 };
  return result.sort((a,b)=> priority[a.actionType]-priority[b.actionType]);
}
