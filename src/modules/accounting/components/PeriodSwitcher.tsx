import React from 'react';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { pl } from 'date-fns/locale';

interface PeriodSwitcherProps {
  currentPeriod: Date;
  onPeriodChange: (period: Date) => void;
  availableYears: number[];
}

export function PeriodSwitcher({ currentPeriod, onPeriodChange, availableYears }: PeriodSwitcherProps) {
  const currentYear = currentPeriod.getFullYear();
  const currentMonth = currentPeriod.getMonth();

  const handlePrevMonth = () => {
    onPeriodChange(subMonths(currentPeriod, 1));
  };

  const handleNextMonth = () => {
    onPeriodChange(addMonths(currentPeriod, 1));
  };

  const handleCurrentPeriod = () => {
    onPeriodChange(new Date());
  };

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(currentYear, parseInt(monthIndex), 1);
    onPeriodChange(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(parseInt(year), currentMonth, 1);
    onPeriodChange(newDate);
  };

  const isCurrentPeriod = () => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() === currentMonth;
  };

  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ];

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevMonth}
        className="h-9 w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <Select value={currentMonth.toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month, index) => (
              <SelectItem key={index} value={index.toString()}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentYear.toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        className="h-9 w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentPeriod() && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCurrentPeriod}
          className="gap-2"
        >
          <Calendar className="h-4 w-4" />
          Bieżący okres
        </Button>
      )}
    </div>
  );
}
