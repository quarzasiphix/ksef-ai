import { Invoice } from '@/shared/types';
import { format, getQuarter } from 'date-fns';
import { pl } from 'date-fns/locale';
import { listRyczaltAccounts } from '@/modules/accounting/data/ryczaltRepository';

export type GroupingMode = 'month' | 'quarter' | 'year';
export type SubGroupingMode = 'none' | 'month' | 'quarter';

export interface MonthGroup {
  key: string;
  year: number;
  month: number;
  label: string;
  invoices: Invoice[];
  sum: number;
}

export interface QuarterGroup {
  key: string;
  year: number;
  quarter: number;
  label: string;
  invoices: Invoice[];
  sum: number;
}

export interface YearGroup {
  year: number;
  months: MonthGroup[];
  sum: number;
}

export interface YearGroupWithQuarters {
  year: number;
  quarters: QuarterGroup[];
  sum: number;
}

export interface QuarterGroupWithMonths {
  key: string;
  year: number;
  quarter: number;
  label: string;
  months: MonthGroup[];
  sum: number;
}

export interface YearGroupWithQuartersAndMonths {
  year: number;
  quarters: QuarterGroupWithMonths[];
  sum: number;
}

export interface YearOnlyGroup {
  key: string;
  year: number;
  label: string;
  invoices: Invoice[];
  sum: number;
  tax?: number;
  accountedCount?: number;
  totalCount?: number;
}

export interface AccountingPeriodInfo {
  sum: number;
  tax: number;
  accountedCount: number;
  totalCount: number;
  isFullyAccounted: boolean;
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
      const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      
      // Convert to PLN if foreign currency
      const plnValue = inv.currency === 'PLN' || !inv.exchangeRate
        ? baseAmount
        : baseAmount * inv.exchangeRate;
      
      return total + plnValue;
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

/**
 * Groups invoices by quarter
 */
export function groupInvoicesByQuarter(invoices: Invoice[]): YearGroupWithQuarters[] {
  const quarterMap = new Map<string, Invoice[]>();
  
  invoices.forEach(invoice => {
    const date = new Date(invoice.issueDate);
    const year = date.getFullYear();
    const quarter = getQuarter(date);
    const key = `${year}-Q${quarter}`;
    
    if (!quarterMap.has(key)) {
      quarterMap.set(key, []);
    }
    quarterMap.get(key)!.push(invoice);
  });
  
  const quarterGroups: QuarterGroup[] = Array.from(quarterMap.entries()).map(([key, invoices]) => {
    const [yearStr, quarterStr] = key.split('-Q');
    const year = parseInt(yearStr);
    const quarter = parseInt(quarterStr);
    
    const quarterMonths: Record<number, string> = {
      1: 'styczeń–marzec',
      2: 'kwiecień–czerwiec',
      3: 'lipiec–wrzesień',
      4: 'październik–grudzień',
    };
    
    const sum = invoices.reduce((total, inv) => {
      const isVatExempt = inv.fakturaBezVAT || inv.vat === false;
      const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      
      const plnValue = inv.currency === 'PLN' || !inv.exchangeRate
        ? baseAmount
        : baseAmount * inv.exchangeRate;
      
      return total + plnValue;
    }, 0);
    
    return {
      key,
      year,
      quarter,
      label: `Q${quarter} ${year} (${quarterMonths[quarter]})`,
      invoices: invoices.sort((a, b) => 
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
      ),
      sum,
    };
  });
  
  quarterGroups.sort((a, b) => b.key.localeCompare(a.key));
  
  const yearMap = new Map<number, QuarterGroup[]>();
  quarterGroups.forEach(group => {
    if (!yearMap.has(group.year)) {
      yearMap.set(group.year, []);
    }
    yearMap.get(group.year)!.push(group);
  });
  
  const yearGroups: YearGroupWithQuarters[] = Array.from(yearMap.entries()).map(([year, quarters]) => ({
    year,
    quarters,
    sum: quarters.reduce((total, q) => total + q.sum, 0),
  }));
  
  yearGroups.sort((a, b) => b.year - a.year);
  
  return yearGroups;
}

/**
 * Groups invoices by year only
 */
export function groupInvoicesByYear(invoices: Invoice[]): YearOnlyGroup[] {
  const yearMap = new Map<number, Invoice[]>();
  
  invoices.forEach(invoice => {
    const date = new Date(invoice.issueDate);
    const year = date.getFullYear();
    
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(invoice);
  });
  
  const yearGroups: YearOnlyGroup[] = Array.from(yearMap.entries()).map(([year, invoices]) => {
    const sum = invoices.reduce((total, inv) => {
      const isVatExempt = inv.fakturaBezVAT || inv.vat === false;
      const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      
      const plnValue = inv.currency === 'PLN' || !inv.exchangeRate
        ? baseAmount
        : baseAmount * inv.exchangeRate;
      
      return total + plnValue;
    }, 0);
    
    return {
      key: `${year}`,
      year,
      label: `${year}`,
      invoices: invoices.sort((a, b) => 
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
      ),
      sum,
    };
  });
  
  yearGroups.sort((a, b) => b.year - a.year);
  
  return yearGroups;
}

/**
 * Groups invoices by year with quarter subgroups, each containing months
 */
export function groupInvoicesByYearQuarterMonth(invoices: Invoice[]): YearGroupWithQuartersAndMonths[] {
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
      const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      const plnValue = inv.currency === 'PLN' || !inv.exchangeRate ? baseAmount : baseAmount * inv.exchangeRate;
      return total + plnValue;
    }, 0);
    
    return {
      key,
      year,
      month,
      label: format(date, 'LLLL yyyy', { locale: pl }),
      invoices: invoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()),
      sum,
    };
  });
  
  monthGroups.sort((a, b) => b.key.localeCompare(a.key));
  
  const quarterMap = new Map<string, MonthGroup[]>();
  monthGroups.forEach(month => {
    const quarter = getQuarter(new Date(month.year, month.month - 1, 1));
    const quarterKey = `${month.year}-Q${quarter}`;
    if (!quarterMap.has(quarterKey)) {
      quarterMap.set(quarterKey, []);
    }
    quarterMap.get(quarterKey)!.push(month);
  });
  
  const quarterMonths: Record<number, string> = {
    1: 'styczeń–marzec',
    2: 'kwiecień–czerwiec',
    3: 'lipiec–wrzesień',
    4: 'październik–grudzień',
  };
  
  const quarterGroups: QuarterGroupWithMonths[] = Array.from(quarterMap.entries()).map(([key, months]) => {
    const [yearStr, quarterStr] = key.split('-Q');
    const year = parseInt(yearStr);
    const quarter = parseInt(quarterStr);
    
    return {
      key,
      year,
      quarter,
      label: `Q${quarter} ${year} (${quarterMonths[quarter]})`,
      months,
      sum: months.reduce((total, m) => total + m.sum, 0),
    };
  });
  
  quarterGroups.sort((a, b) => b.key.localeCompare(a.key));
  
  const yearMap = new Map<number, QuarterGroupWithMonths[]>();
  quarterGroups.forEach(quarter => {
    if (!yearMap.has(quarter.year)) {
      yearMap.set(quarter.year, []);
    }
    yearMap.get(quarter.year)!.push(quarter);
  });
  
  const yearGroupsResult: YearGroupWithQuartersAndMonths[] = Array.from(yearMap.entries()).map(([year, quarters]) => ({
    year,
    quarters,
    sum: quarters.reduce((total, q) => total + q.sum, 0),
  }));
  
  yearGroupsResult.sort((a, b) => b.year - a.year);
  
  return yearGroupsResult;
}

/**
 * Groups invoices by quarter with month subgroups
 */
export function groupInvoicesByQuarterMonth(invoices: Invoice[]): QuarterGroupWithMonths[] {
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
      const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      const plnValue = inv.currency === 'PLN' || !inv.exchangeRate ? baseAmount : baseAmount * inv.exchangeRate;
      return total + plnValue;
    }, 0);
    
    return {
      key,
      year,
      month,
      label: format(date, 'LLLL yyyy', { locale: pl }),
      invoices: invoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()),
      sum,
    };
  });
  
  monthGroups.sort((a, b) => b.key.localeCompare(a.key));
  
  const quarterMap = new Map<string, MonthGroup[]>();
  monthGroups.forEach(month => {
    const quarter = getQuarter(new Date(month.year, month.month - 1, 1));
    const quarterKey = `${month.year}-Q${quarter}`;
    if (!quarterMap.has(quarterKey)) {
      quarterMap.set(quarterKey, []);
    }
    quarterMap.get(quarterKey)!.push(month);
  });
  
  const quarterMonths: Record<number, string> = {
    1: 'styczeń–marzec',
    2: 'kwiecień–czerwiec',
    3: 'lipiec–wrzesień',
    4: 'październik–grudzień',
  };
  
  const quarterGroupsResult: QuarterGroupWithMonths[] = Array.from(quarterMap.entries()).map(([key, months]) => {
    const [yearStr, quarterStr] = key.split('-Q');
    const year = parseInt(yearStr);
    const quarter = parseInt(quarterStr);
    
    return {
      key,
      year,
      quarter,
      label: `Q${quarter} ${year} (${quarterMonths[quarter]})`,
      months,
      sum: months.reduce((total, m) => total + m.sum, 0),
    };
  });
  
  quarterGroupsResult.sort((a, b) => b.key.localeCompare(a.key));
  
  return quarterGroupsResult;
}

/**
 * Calculate tax for invoices based on their linked ryczalt accounts
 */
export async function calculateTaxForInvoices(invoices: Invoice[], businessProfileId: string): Promise<AccountingPeriodInfo> {
  try {
    // Fetch all ryczalt accounts for the business profile
    const ryczaltAccounts = await listRyczaltAccounts(businessProfileId);
    const accountMap = new Map(ryczaltAccounts.map(acc => [acc.id, acc]));
    
    let totalSum = 0;
    let totalTax = 0;
    let accountedCount = 0;
    
    invoices.forEach(invoice => {
      const isVatExempt = invoice.fakturaBezVAT || invoice.vat === false;
      const baseAmount = isVatExempt ? (invoice.totalNetValue || 0) : (invoice.totalGrossValue || invoice.totalAmount || 0);
      
      const plnValue = invoice.currency === 'PLN' || !invoice.exchangeRate
        ? baseAmount
        : baseAmount * invoice.exchangeRate;
      
      totalSum += plnValue;
      
      // Calculate tax if invoice has a linked ryczalt account
      if (invoice.ryczalt_account_id) {
        const account = accountMap.get(invoice.ryczalt_account_id);
        if (account && account.category_rate) {
          totalTax += plnValue * (account.category_rate / 100);
          accountedCount++;
        }
      }
    });
    
    return {
      sum: totalSum,
      tax: totalTax,
      accountedCount,
      totalCount: invoices.length,
      isFullyAccounted: accountedCount === invoices.length && invoices.length > 0
    };
  } catch (error) {
    console.error('Error calculating tax for invoices:', error);
    return {
      sum: 0,
      tax: 0,
      accountedCount: 0,
      totalCount: invoices.length,
      isFullyAccounted: false
    };
  }
}

/**
 * Format tax amount with currency
 */
export function formatTaxAmount(tax: number, currency: string = 'PLN'): string {
  if (tax === 0) return '';
  
  const formatted = tax.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return ` (podatek: ${formatted} ${currency})`;
}
