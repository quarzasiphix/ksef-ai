/**
 * Analytics Metrics & Helpers
 */

import {
  KpiMetrics,
  TimeSeriesDataPoint,
  StatusFunnelData,
  AgingBucketData,
  PaymentMethodData,
  ComplianceHealthData,
  TopCustomerData,
} from '../types/analytics';

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function formatCurrency(amount: number, currency: string = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function calculateCollectionRate(metrics: KpiMetrics): number {
  const total = metrics.grossRevenue;
  if (total === 0) return 0;
  return (metrics.paidAmount / total) * 100;
}

export function calculateOverdueRate(metrics: KpiMetrics): number {
  const unpaid = metrics.unpaidAmount;
  if (unpaid === 0) return 0;
  return (metrics.overdueAmount / unpaid) * 100;
}

export function calculateAverageInvoiceValue(metrics: KpiMetrics): number {
  if (metrics.invoiceCount === 0) return 0;
  return metrics.grossRevenue / metrics.invoiceCount;
}

export function calculateDSO(metrics: KpiMetrics, periodDays: number): number {
  if (metrics.grossRevenue === 0) return 0;
  return (metrics.unpaidAmount / metrics.grossRevenue) * periodDays;
}

export function calculateHealthScore(metrics: KpiMetrics): number {
  let score = 100;
  const overdueRate = calculateOverdueRate(metrics);
  score -= Math.min(overdueRate, 30);
  if (metrics.invoiceCount > 0) {
    const blockedRate = (metrics.blockedFromAccounting / metrics.invoiceCount) * 100;
    score -= Math.min(blockedRate, 20);
  }
  if (metrics.invoiceCount > 0) {
    const errorRate = (metrics.ksefError / metrics.invoiceCount) * 100;
    score -= Math.min(errorRate, 20);
  }
  return Math.max(0, Math.min(100, score));
}

export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

export function transformTimeSeriesForChart(data: TimeSeriesDataPoint[]) {
  return data.map(point => ({
    date: point.date,
    'Wystawione': point.issuedGross,
    'Opłacone': point.paidGross,
    'Zaległe': point.overdueGross,
  }));
}

export function transformStatusFunnelForChart(data: StatusFunnelData[]) {
  const stageLabels: Record<string, string> = {
    draft: 'Projekt',
    issued: 'Wystawiona',
    sent: 'Wysłana',
    payment_received: 'Płatność otrzymana',
    booked: 'Zaksięgowana',
    closed: 'Zamknięta',
  };
  return data.map(stage => ({
    stage: stageLabels[stage.stage] || stage.stage,
    count: stage.count,
    value: stage.value,
  }));
}

export function transformAgingBucketsForChart(data: AgingBucketData[]) {
  const bucketLabels: Record<string, string> = {
    '0-7': '0-7 dni',
    '8-14': '8-14 dni',
    '15-30': '15-30 dni',
    '31-60': '31-60 dni',
    '60+': '60+ dni',
  };
  return data.map(bucket => ({
    bucket: bucketLabels[bucket.bucket],
    count: bucket.count,
    value: bucket.value,
  }));
}

export function transformPaymentMethodForChart(data: PaymentMethodData[]) {
  const methodLabels: Record<string, string> = {
    transfer: 'Przelew',
    cash: 'Gotówka',
    card: 'Karta',
    other: 'Inne',
  };
  return data.map(method => ({
    name: methodLabels[method.method] || method.method,
    value: method.value,
    count: method.count,
  }));
}

export function calculateComplianceScore(data: ComplianceHealthData): number {
  const total = data.readyForKsef + data.ksefSubmitted + data.ksefErrors + 
                data.exportableToAccounting + data.blockedFromExport;
  if (total === 0) return 100;
  const compliant = data.ksefSubmitted + data.exportedBooked;
  return (compliant / total) * 100;
}

export function getTopRiskCustomers(customers: TopCustomerData[], limit: number = 5): TopCustomerData[] {
  return customers
    .filter(c => c.overdueGross > 0)
    .sort((a, b) => b.overdueGross - a.overdueGross)
    .slice(0, limit);
}

export function calculateConcentrationRisk(customers: TopCustomerData[]): number {
  if (customers.length === 0) return 0;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalGross, 0);
  if (totalRevenue === 0) return 0;
  const topCustomerRevenue = customers[0]?.totalGross || 0;
  return (topCustomerRevenue / totalRevenue) * 100;
}

export function getPeriodLabel(dateFrom: string, dateTo: string, periodType: string): string {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (periodType === 'month') {
    return from.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  }
  if (periodType === 'quarter') {
    const quarter = Math.floor(from.getMonth() / 3) + 1;
    return `Q${quarter} ${from.getFullYear()}`;
  }
  return `${from.toLocaleDateString('pl-PL')} - ${to.toLocaleDateString('pl-PL')}`;
}

export function calculatePeriodDays(dateFrom: string, dateTo: string): number {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

export function generateCacheKey(
  businessProfileId: string,
  dateFrom: string,
  dateTo: string,
  filters: any
): string {
  const filterHash = JSON.stringify(filters);
  return `analytics_${businessProfileId}_${dateFrom}_${dateTo}_${filterHash}`;
}
