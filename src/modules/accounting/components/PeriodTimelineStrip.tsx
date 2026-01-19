import React from 'react';
import { Button } from '@/shared/ui/button';
import { ChevronLeft, ChevronRight, Lock, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { PeriodKey } from '../hooks/useAccountingPeriod';

interface MonthState {
  month: number;
  hasActivity: boolean;
  isLocked: boolean;
  hasErrors: boolean;
  unpostedCount?: number;
}

interface PeriodTimelineStripProps {
  currentPeriod: PeriodKey;
  currentYear: number;
  monthStates: MonthState[];
  onPeriodChange: (period: PeriodKey) => void;
  onYearChange: (year: number) => void;
  accountingStartDate?: Date;
}

const MONTH_NAMES_SHORT = [
  'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
  'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'
];

export function PeriodTimelineStrip({
  currentPeriod,
  currentYear,
  monthStates,
  onPeriodChange,
  onYearChange,
  accountingStartDate
}: PeriodTimelineStripProps) {
  
  const isMonthBeforeAccountingStart = (month: number) => {
    if (!accountingStartDate) return false;
    const monthDate = new Date(currentYear, month - 1, 1);
    return monthDate < accountingStartDate;
  };

  const getMonthState = (month: number): MonthState | undefined => {
    return monthStates.find(s => s.month === month);
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-card border rounded-lg">
      {/* Year Switcher */}
      <div className="flex items-center gap-2 mr-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onYearChange(currentYear - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-lg min-w-[4rem] text-center">
          {currentYear}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onYearChange(currentYear + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Month Strip */}
      <div className="flex-1 flex gap-1 overflow-x-auto">
        {MONTH_NAMES_SHORT.map((monthName, index) => {
          const month = index + 1;
          const state = getMonthState(month);
          const isSelected = currentPeriod.month === month && currentPeriod.year === currentYear;
          const isBeforeStart = isMonthBeforeAccountingStart(month);
          const isFuture = new Date(currentYear, month - 1, 1) > new Date();

          return (
            <Button
              key={month}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'relative min-w-[3rem] h-12 flex flex-col items-center justify-center gap-0.5',
                isBeforeStart && 'opacity-40 cursor-not-allowed',
                isFuture && 'opacity-60'
              )}
              onClick={() => !isBeforeStart && onPeriodChange({ year: currentYear, month })}
              disabled={isBeforeStart}
            >
              <span className="text-xs font-medium">{monthName}</span>
              
              {/* State Indicators */}
              <div className="flex items-center gap-1">
                {state?.isLocked && (
                  <Lock className="h-3 w-3 text-orange-500" />
                )}
                {state?.hasErrors && (
                  <AlertCircle className="h-3 w-3 text-red-500" />
                )}
                {state?.hasActivity && !state?.hasErrors && (
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                )}
              </div>

              {/* Unposted Count Badge */}
              {state?.unpostedCount && state.unpostedCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {state.unpostedCount > 9 ? '9+' : state.unpostedCount}
                </div>
              )}
            </Button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 ml-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const now = new Date();
            onPeriodChange({
              year: now.getFullYear(),
              month: now.getMonth() + 1
            });
            onYearChange(now.getFullYear());
          }}
        >
          Ten miesiąc
        </Button>
      </div>
    </div>
  );
}
