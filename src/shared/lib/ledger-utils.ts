import { Invoice } from '@/shared/types';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export interface MonthGroup {
  key: string;
  year: number;
  month: number;
  label: string;
  invoices: Invoice[];
  sum: number;
}

export interface YearGroup {
  year: number;
  months: MonthGroup[];
  sum: number;
}

/**
 * Groups invoices by year and month for ledger view
 * Returns groups sorted newest → oldest
 */
export function groupInvoicesByPeriod(invoices: Invoice[]): YearGroup[] {
  const monthMap = new Map<string, Invoice[]>();
  
  invoices.forEach(invoice => {
    const date = new Date(invoice.issueDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    
    if (!monthMap.has(key)) {
      monthMap.set(key, []);
    }
    monthMap.get(key)!.push(invoice);
  });
  
  const monthGroups: MonthGroup[] = Array.from(monthMap.entries()).map(([key, invoices]) => {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const date = new Date(year, month - 1, 1);
    
    const sum = invoices.reduce((total, inv) => {
      const isVatExempt = inv.fakturaBezVAT || inv.vat === false;
      const amount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      return total + amount;
    }, 0);
    
    return {
      key,
      year,
      month,
      label: format(date, 'LLLL yyyy', { locale: pl }),
      invoices: invoices.sort((a, b) => 
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
      ),
      sum,
    };
  });
  
  monthGroups.sort((a, b) => b.key.localeCompare(a.key));
  
  const yearMap = new Map<number, MonthGroup[]>();
  monthGroups.forEach(group => {
    if (!yearMap.has(group.year)) {
      yearMap.set(group.year, []);
    }
    yearMap.get(group.year)!.push(group);
  });
  
  const yearGroups: YearGroup[] = Array.from(yearMap.entries()).map(([year, months]) => ({
    year,
    months,
    sum: months.reduce((total, m) => total + m.sum, 0),
  }));
  
  yearGroups.sort((a, b) => b.year - a.year);
  
  return yearGroups;
}

/**
 * Get unique years from invoices for period navigator
 */
export function getAvailableYears(invoices: Invoice[]): number[] {
  const years = new Set<number>();
  invoices.forEach(invoice => {
    const year = new Date(invoice.issueDate).getFullYear();
    years.add(year);
  });
  return Array.from(years).sort((a, b) => b - a);
}

/**
 * Format currency for ledger display (accounting-grade typography)
 */
export function formatLedgerAmount(amount: number, currency: string = 'PLN'): string {
  const formatted = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return `${formatted} ${currency}`;
}

/**
 * Capitalize first letter of month name
 */
export function capitalizeMonth(monthLabel: string): string {
  return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
}
