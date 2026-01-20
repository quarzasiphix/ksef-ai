import React from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Clock, Circle, Lock } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { format, addMonths, subMonths, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';

export type PeriodStatus = 'open' | 'due' | 'late' | 'closed' | 'future' | 'locked';

interface PeriodState {
  year: number;
  month: number;
  status: PeriodStatus;
  taxDeadline: Date;
  taxAmount?: number;
  invoiceCount?: number;
  postedCount?: number;
}

interface PeriodControlBarProps {
  currentPeriod: Date;
  onPeriodChange: (date: Date) => void;
  periodStates: PeriodState[];
  onClosePeriod?: (year: number, month: number) => void;
}

export function PeriodControlBar({
  currentPeriod,
  onPeriodChange,
  periodStates,
  onClosePeriod,
}: PeriodControlBarProps) {
  const currentYear = currentPeriod.getFullYear();
  const currentMonth = currentPeriod.getMonth() + 1;

  // Find current period state
  const currentState = periodStates.find(
    p => p.year === currentYear && p.month === currentMonth
  );

  const handlePrevious = () => {
    onPeriodChange(subMonths(currentPeriod, 1));
  };

  const handleNext = () => {
    onPeriodChange(addMonths(currentPeriod, 1));
  };

  const handlePeriodClick = (year: number, month: number) => {
    const newDate = new Date(year, month - 1, 1);
    onPeriodChange(newDate);
  };

  const getStatusIcon = (status: PeriodStatus) => {
    switch (status) {
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'locked':
        return <Lock className="h-4 w-4 text-emerald-600" />;
      case 'due':
        return <Clock className="h-4 w-4 text-amber-600" />;
      case 'late':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'future':
        return <Circle className="h-4 w-4 text-gray-400" />;
      case 'open':
        return <Circle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: PeriodStatus) => {
    switch (status) {
      case 'closed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Zamknięty</Badge>;
      case 'locked':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Zablokowany</Badge>;
      case 'due':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Do rozliczenia</Badge>;
      case 'late':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Po terminie</Badge>;
      case 'future':
        return <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Przyszły</Badge>;
      case 'open':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Bieżący</Badge>;
    }
  };

  const getStatusText = (status: PeriodStatus) => {
    switch (status) {
      case 'closed': return 'Zamknięty';
      case 'locked': return 'Zablokowany';
      case 'due': return 'Do rozliczenia';
      case 'late': return 'Po terminie';
      case 'future': return 'Przyszły';
      case 'open': return 'Bieżący';
    }
  };

  return (
    <div className="space-y-4">
      {/* Layer One: Primary Control - "Where Am I?" */}
      <div className="bg-background border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <h2 className="text-3xl font-bold">
                {format(currentPeriod, 'LLLL yyyy', { locale: pl })}
              </h2>
              {currentState && getStatusBadge(currentState.status)}
            </div>

            {currentState && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>
                  Status: <span className="font-medium">{getStatusText(currentState.status)}</span>
                </div>
                <div>
                  Termin rozliczenia: <span className="font-medium">
                    {format(currentState.taxDeadline, 'dd MMMM yyyy', { locale: pl })}
                  </span>
                </div>
                {currentState.taxAmount !== undefined && (
                  <div>
                    Podatek do zapłaty: <span className="font-medium">
                      {currentState.taxAmount.toFixed(2)} PLN
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-10 w-10"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Layer Two: Period Status Rail - Visual State Overview */}
      <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Przegląd okresów</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span>Zamknięty</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-emerald-600" />
              <span>Zablokowany</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-600" />
              <span>Do rozliczenia</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <span>Po terminie</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-gray-400" />
              <span>Przyszły</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
          {periodStates.map((period) => {
            const isSelected = period.year === currentYear && period.month === currentMonth;
            const monthName = format(new Date(period.year, period.month - 1, 1), 'MMM', { locale: pl });

            return (
              <button
                key={`${period.year}-${period.month}`}
                onClick={() => handlePeriodClick(period.year, period.month)}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-md transition-colors
                  ${isSelected 
                    ? 'bg-blue-100 border-2 border-blue-500' 
                    : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                  }
                  ${period.status === 'closed' ? 'opacity-75' : ''}
                `}
                title={`${monthName} ${period.year} - ${getStatusText(period.status)}`}
              >
                {getStatusIcon(period.status)}
                <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                  {monthName}
                </span>
                {period.status === 'late' && (
                  <span className="text-xs text-red-600 font-bold">!</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Year indicator */}
        <div className="mt-3 text-center">
          <span className="text-sm font-semibold text-foreground">{currentYear}</span>
        </div>
      </div>
    </div>
  );
}
