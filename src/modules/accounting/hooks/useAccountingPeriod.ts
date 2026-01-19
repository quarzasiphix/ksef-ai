import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface PeriodKey {
  year: number;
  month: number; // 1-12
}

export interface PeriodRange {
  from: Date;
  to: Date;
}

export interface AccountingPeriod {
  key: PeriodKey;
  range: PeriodRange;
  label: string;
}

/**
 * Hook for managing accounting period context via URL params
 * Provides period selection, navigation, and formatting utilities
 */
export function useAccountingPeriod() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get current period from URL or default to current month
  const getCurrentPeriod = (): PeriodKey => {
    const urlYear = searchParams.get('year');
    const urlMonth = searchParams.get('month');
    
    if (urlYear && urlMonth) {
      const year = parseInt(urlYear, 10);
      const month = parseInt(urlMonth, 10);
      
      if (year > 2000 && year < 2100 && month >= 1 && month <= 12) {
        return { year, month };
      }
    }
    
    // Default to current month
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  };

  const [period, setPeriodState] = useState<PeriodKey>(getCurrentPeriod);

  // Sync with URL params
  useEffect(() => {
    const current = getCurrentPeriod();
    if (current.year !== period.year || current.month !== period.month) {
      setPeriodState(current);
    }
  }, [searchParams]);

  // Set period and update URL
  const setPeriod = (newPeriod: PeriodKey) => {
    setPeriodState(newPeriod);
    setSearchParams({
      year: newPeriod.year.toString(),
      month: newPeriod.month.toString()
    });
  };

  // Get period range (first day to last day of month)
  const getPeriodRange = (p: PeriodKey): PeriodRange => {
    const from = new Date(p.year, p.month - 1, 1);
    const to = new Date(p.year, p.month, 0, 23, 59, 59, 999);
    return { from, to };
  };

  // Format period label
  const getPeriodLabel = (p: PeriodKey): string => {
    const monthNames = [
      'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
      'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
    ];
    return `${monthNames[p.month - 1]} ${p.year}`;
  };

  // Navigation helpers
  const goToPreviousMonth = () => {
    const newMonth = period.month === 1 ? 12 : period.month - 1;
    const newYear = period.month === 1 ? period.year - 1 : period.year;
    setPeriod({ year: newYear, month: newMonth });
  };

  const goToNextMonth = () => {
    const newMonth = period.month === 12 ? 1 : period.month + 1;
    const newYear = period.month === 12 ? period.year + 1 : period.year;
    setPeriod({ year: newYear, month: newMonth });
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setPeriod({
      year: now.getFullYear(),
      month: now.getMonth() + 1
    });
  };

  const accountingPeriod: AccountingPeriod = {
    key: period,
    range: getPeriodRange(period),
    label: getPeriodLabel(period)
  };

  return {
    period: accountingPeriod,
    setPeriod,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    getPeriodLabel,
    getPeriodRange
  };
}
