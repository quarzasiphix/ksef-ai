import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Clock, Circle, Calendar, Lock, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, differenceInDays, isAfter, isBefore } from 'date-fns';
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
  unpostedCount?: number;
  revenue?: number;
  expenses?: number;
}

interface UnifiedPeriodControlProps {
  currentPeriod: Date;
  onPeriodChange: (date: Date) => void;
  periodStates: PeriodState[];
  onClosePeriod?: (year: number, month: number) => void;
  showTaxInfo?: boolean;
  showFinancials?: boolean;
  compact?: boolean;
}

export function UnifiedPeriodControl({
  currentPeriod,
  onPeriodChange,
  periodStates,
  onClosePeriod,
  showTaxInfo = true,
  showFinancials = true,
  compact = false
}: UnifiedPeriodControlProps) {
  const currentYear = currentPeriod.getFullYear();
  const currentMonth = currentPeriod.getMonth() + 1;
  const today = new Date();

  // Find current period state
  const currentState = periodStates.find(
    p => p.year === currentYear && p.month === currentMonth
  );

  // Calculate days until tax deadline (20th of next month)
  const getTaxDeadlineInfo = (year: number, month: number) => {
    const deadline = new Date(year, month, 20); // 20th of next month
    const daysUntil = differenceInDays(deadline, today);
    const isOverdue = today > deadline;
    
    return {
      deadline,
      daysUntil,
      isOverdue,
      urgency: daysUntil <= 3 ? 'critical' : daysUntil <= 7 ? 'warning' : 'normal'
    };
  };

  const currentDeadlineInfo = getTaxDeadlineInfo(currentYear, currentMonth);

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
      case 'locked':
        return <Lock className="h-4 w-4 text-green-600" />;
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
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Zablokowany
        </Badge>;
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'warning': return 'text-amber-600 bg-amber-50 border-amber-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-background border rounded-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="font-semibold">
              {format(currentPeriod, 'LLL yyyy', { locale: pl })}
            </div>
            {currentState && getStatusBadge(currentState.status)}
          </div>
          
          {showTaxInfo && currentDeadlineInfo && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded border ${getUrgencyColor(currentDeadlineInfo.urgency)}`}>
              <Calendar className="h-3 w-3" />
              <span className="text-xs font-medium">
                {currentDeadlineInfo.isOverdue 
                  ? `Po terminie ${Math.abs(currentDeadlineInfo.daysUntil)} dni`
                  : `${currentDeadlineInfo.daysUntil} dni do terminu`
                }
              </span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Period Control */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
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
                <h2 className="text-2xl font-bold">
                  {format(currentPeriod, 'LLLL yyyy', { locale: pl })}
                </h2>
                {currentState && getStatusBadge(currentState.status)}
              </div>

              {currentState && (
                <div className="text-sm text-muted-foreground">
                  Status: <span className="font-medium">{getStatusBadge(currentState.status).props.children}</span>
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
        </CardHeader>

        {showTaxInfo && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tax Deadline */}
              <div className={`p-3 rounded-lg border ${getUrgencyColor(currentDeadlineInfo.urgency)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Termin podatku</span>
                </div>
                <div className="text-lg font-bold">
                  {format(currentDeadlineInfo.deadline, 'dd MMMM', { locale: pl })}
                </div>
                <div className="text-xs">
                  {currentDeadlineInfo.isOverdue 
                    ? `⚠️ Po terminie ${Math.abs(currentDeadlineInfo.daysUntil)} dni`
                    : `${currentDeadlineInfo.daysUntil} dni pozostało`
                  }
                </div>
              </div>

              {/* Tax Amount */}
              {currentState?.taxAmount !== undefined && (
                <div className="p-3 rounded-lg border bg-red-50 border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    <span className="font-medium">Podatek do zapłaty</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">
                    {currentState.taxAmount.toFixed(2)} PLN
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ryczałt za okres
                  </div>
                </div>
              )}

              {/* Document Count */}
              {currentState && (
                <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Dokumenty</span>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {currentState.postedCount || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Zaksięgowane faktury
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Period Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Przegląd okresów</CardTitle>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-green-600" />
                <span>Zamknięty</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600" />
                <span>Do rozliczenia</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <span>Po terminie</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {periodStates.map((period) => {
              const isSelected = period.year === currentYear && period.month === currentMonth;
              const deadlineInfo = getTaxDeadlineInfo(period.year, period.month);
              const monthName = format(new Date(period.year, period.month - 1, 1), 'MMM', { locale: pl });

              return (
                <button
                  key={`${period.year}-${period.month}`}
                  onClick={() => handlePeriodClick(period.year, period.month)}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-md transition-all
                    ${isSelected 
                      ? 'bg-blue-100 border-2 border-blue-500 shadow-sm' 
                      : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }
                    ${period.status === 'closed' || period.status === 'locked' ? 'opacity-75' : ''}
                  `}
                  title={`${monthName} ${period.year} - ${getStatusBadge(period.status).props.children}`}
                >
                  {getStatusIcon(period.status)}
                  <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                    {monthName}
                  </span>
                  {deadlineInfo.isOverdue && (
                    <span className="text-xs text-red-600 font-bold">!</span>
                  )}
                  {period.unpostedCount && period.unpostedCount > 0 && (
                    <span className="text-xs text-amber-600 font-bold">•</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Year Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePeriodClick(currentYear - 1, currentMonth)}
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              {currentYear - 1}
            </Button>
            
            <div className="text-sm font-semibold text-foreground">{currentYear}</div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePeriodClick(currentYear + 1, currentMonth)}
            >
              {currentYear + 1}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
