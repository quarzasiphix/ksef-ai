/**
 * Accounting Analytics Module Types
 */

import type { ComponentType } from 'react';

/**
 * Analytics state driving dashboard
 */
export interface AnalyticsState {
  businessProfileId: string;
  dateFrom: string;
  dateTo: string;
  periodType: 'month' | 'quarter' | 'custom';
  groupBy: 'day' | 'week' | 'month';
  mode: 'simple' | 'accounting';
  baseCurrency: string;
  showMultiCurrency: boolean;
  filters: AnalyticsFilters;
}

export interface AnalyticsFilters {
  paymentStatus?: ('unpaid' | 'pending' | 'paid' | 'failed' | 'refunded')[];
  lifecycleStatus?: ('draft' | 'issued' | 'sent' | 'payment_received' | 'booked' | 'closed')[];
  paymentMethod?: ('transfer' | 'cash' | 'card' | 'other')[];
  vatMode?: 'all' | 'vat_active' | 'vat_exempt';
  contractIds?: string[];
  customerIds?: string[];
  accountingReadiness?: ('ready' | 'blocked' | 'exported' | 'booked')[];
  ksefStatus?: ('none' | 'pending' | 'sent' | 'error')[];
}

export interface KpiMetrics {
  grossRevenue: number;
  netRevenue: number;
  vatCollected: number;
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  blockedFromAccounting: number;
  ksefSubmitted: number;
  ksefPending: number;
  ksefError: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  unpaidInvoiceCount: number;
  overdueInvoiceCount: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  issuedGross: number;
  issuedNet: number;
  issuedVat: number;
  paidGross: number;
  paidNet: number;
  paidVat: number;
  overdueGross: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
}

export interface StatusFunnelData {
  stage: 'draft' | 'issued' | 'sent' | 'payment_received' | 'booked' | 'closed';
  count: number;
  value: number;
}

export interface AgingBucketData {
  bucket: '0-7' | '8-14' | '15-30' | '31-60' | '60+';
  count: number;
  value: number;
  customerBreakdown?: { customerId: string; customerName: string; value: number }[];
}

export interface PaymentMethodData {
  method: 'transfer' | 'cash' | 'card' | 'other';
  count: number;
  value: number;
}

export interface ContractPerformanceData {
  contractId: string;
  contractNumber: string;
  contractValue: number;
  invoicedValue: number;
  paidValue: number;
  coverage: number;
  paymentRate: number;
}

export interface ComplianceHealthData {
  readyForKsef: number;
  ksefSubmitted: number;
  ksefErrors: number;
  exportableToAccounting: number;
  exportedBooked: number;
  blockedFromExport: number;
}

export interface TopCustomerData {
  customerId: string;
  customerName: string;
  invoiceCount: number;
  totalGross: number;
  paidGross: number;
  unpaidGross: number;
  overdueGross: number;
}

export interface ActionRequiredInvoice {
  id: string;
  number: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  totalGross: number;
  actionType: 'overdue' | 'blocked_accounting' | 'ksef_error' | 'missing_decision';
  actionReason: string;
  daysOverdue?: number;
}

export interface ChartConfig {
  id: string;
  title: string;
  description?: string;
  queryKey: (string | number)[];
  component: ComponentType<any>;
  gridSpan?: 'full' | 'half' | 'third';
  height?: number;
  enabled?: (state: AnalyticsState) => boolean;
}

export interface AnalyticsQueryResult<T> {
  data: T;
  generatedAt: string;
  cacheKey: string;
}
