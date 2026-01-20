import { addMonths, isAfter, isBefore, startOfToday, endOfMonth } from 'date-fns';
import type { PeriodStatus } from '../components/PeriodControlBar';

export interface PeriodStateCalculation {
  year: number;
  month: number;
  status: PeriodStatus;
  taxDeadline: Date;
  periodStart: Date;
  periodEnd: Date;
  isClosed: boolean;
  isLocked: boolean;
}

export type TaxRegime = 'ryczalt' | 'skala' | 'liniowy';
export type VATCadence = 'monthly' | 'quarterly' | 'none';
export type SettlementCadence = 'monthly' | 'quarterly' | 'annual';

export interface DeadlineRules {
  taxRegime: TaxRegime;
  vatCadence: VATCadence;
  settlementCadence: SettlementCadence;
}

/**
 * Calculate the tax payment deadline for a given period
 * Rules vary by tax regime and cadence
 */
export function calculateTaxDeadline(
  year: number,
  month: number,
  rules: DeadlineRules = {
    taxRegime: 'ryczalt',
    vatCadence: 'monthly',
    settlementCadence: 'monthly'
  }
): Date {
  const periodEnd = new Date(year, month - 1, 1);
  
  // Ryczalt monthly: 20th of following month
  if (rules.taxRegime === 'ryczalt' && rules.settlementCadence === 'monthly') {
    const nextMonth = addMonths(periodEnd, 1);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
  }
  
  // Ryczalt quarterly: 20th of month following quarter end
  if (rules.taxRegime === 'ryczalt' && rules.settlementCadence === 'quarterly') {
    const quarter = Math.ceil(month / 3);
    const quarterEndMonth = quarter * 3;
    const nextMonth = new Date(year, quarterEndMonth, 1);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
  }
  
  // Skala/Liniowy monthly advance: 20th of following month
  if ((rules.taxRegime === 'skala' || rules.taxRegime === 'liniowy') && rules.settlementCadence === 'monthly') {
    const nextMonth = addMonths(periodEnd, 1);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
  }
  
  // Skala/Liniowy quarterly: 20th of month following quarter
  if ((rules.taxRegime === 'skala' || rules.taxRegime === 'liniowy') && rules.settlementCadence === 'quarterly') {
    const quarter = Math.ceil(month / 3);
    const quarterEndMonth = quarter * 3;
    const nextMonth = new Date(year, quarterEndMonth, 1);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
  }
  
  // Default fallback: 20th of next month
  const nextMonth = addMonths(periodEnd, 1);
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 20);
}

/**
 * Calculate VAT declaration deadline (if applicable)
 */
export function calculateVATDeadline(
  year: number,
  month: number,
  cadence: VATCadence
): Date | null {
  if (cadence === 'none') return null;
  
  const periodEnd = new Date(year, month - 1, 1);
  
  // VAT monthly: 25th of following month
  if (cadence === 'monthly') {
    const nextMonth = addMonths(periodEnd, 1);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 25);
  }
  
  // VAT quarterly: 25th of month following quarter
  if (cadence === 'quarterly') {
    const quarter = Math.ceil(month / 3);
    const quarterEndMonth = quarter * 3;
    const nextMonth = new Date(year, quarterEndMonth, 1);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 25);
  }
  
  return null;
}

/**
 * Determine the status of a period based on current date and closure state
 */
export function calculatePeriodStatus(
  year: number,
  month: number,
  isClosed: boolean,
  isLocked: boolean
): PeriodStatus {
  const today = startOfToday();
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = endOfMonth(periodStart);
  const taxDeadline = calculateTaxDeadline(year, month);

  // Locked periods have special status
  if (isLocked) {
    return 'locked';
  }

  // Closed but not locked periods
  if (isClosed) {
    return 'closed';
  }

  // Future periods
  if (isAfter(periodStart, today)) {
    return 'future';
  }

  // Current month (period is ongoing)
  if (
    isBefore(periodStart, today) && 
    (isAfter(periodEnd, today) || periodEnd.getTime() === today.getTime())
  ) {
    return 'open';
  }

  // Period ended, check if deadline passed
  if (isAfter(today, taxDeadline)) {
    return 'late';
  }

  // Period ended, deadline approaching
  return 'due';
}

/**
 * Generate period states for a full year
 */
export function generateYearPeriodStates(
  year: number,
  closedPeriods: Array<{ year: number; month: number; is_locked: boolean }> = []
): PeriodStateCalculation[] {
  const states: PeriodStateCalculation[] = [];

  for (let month = 1; month <= 12; month++) {
    const closedPeriod = closedPeriods.find(
      p => p.year === year && p.month === month
    );

    const isClosed = !!closedPeriod;
    const isLocked = closedPeriod?.is_locked || false;

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = endOfMonth(periodStart);
    const taxDeadline = calculateTaxDeadline(year, month);
    const status = calculatePeriodStatus(year, month, isClosed, isLocked);

    states.push({
      year,
      month,
      status,
      taxDeadline,
      periodStart,
      periodEnd,
      isClosed,
      isLocked,
    });
  }

  return states;
}

/**
 * Get the current period (current month)
 */
export function getCurrentPeriod(): { year: number; month: number } {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  };
}

/**
 * Check if a period can be closed
 */
export function canClosePeriod(
  year: number,
  month: number,
  unpostedInvoiceCount: number
): { canClose: boolean; reason?: string } {
  const today = startOfToday();
  const periodEnd = endOfMonth(new Date(year, month - 1, 1));

  // Can't close future periods
  if (isAfter(periodEnd, today)) {
    return {
      canClose: false,
      reason: 'Nie można zamknąć przyszłego okresu',
    };
  }

  // Can't close if there are unposted invoices
  if (unpostedInvoiceCount > 0) {
    return {
      canClose: false,
      reason: `${unpostedInvoiceCount} ${unpostedInvoiceCount === 1 ? 'faktura wymaga' : 'faktury wymagają'} zaksięgowania`,
    };
  }

  return { canClose: true };
}

/**
 * Format period name for display
 */
export function formatPeriodName(year: number, month: number, locale: 'pl' | 'en' = 'pl'): string {
  const monthNames = {
    pl: [
      'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
    ],
    en: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
  };

  return `${monthNames[locale][month - 1]} ${year}`;
}

/**
 * Get days until tax deadline
 */
export function getDaysUntilDeadline(year: number, month: number): number {
  const today = startOfToday();
  const deadline = calculateTaxDeadline(year, month);
  const diffTime = deadline.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Check if period is in warning state (deadline approaching)
 */
export function isPeriodInWarning(year: number, month: number, warningDays: number = 7): boolean {
  const daysUntil = getDaysUntilDeadline(year, month);
  return daysUntil > 0 && daysUntil <= warningDays;
}
