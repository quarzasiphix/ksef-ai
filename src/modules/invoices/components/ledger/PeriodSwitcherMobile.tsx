import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { Calendar } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import { cn } from '@/shared/lib/utils';

interface PeriodSwitcherMobileProps {
  years: number[];
  selectedYear: number | null;
  selectedMonth: number | null;
  onPeriodSelect: (year: number | null, month?: number | null) => void;
  className?: string;
}

const MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

export function PeriodSwitcherMobile({ 
  years, 
  selectedYear, 
  selectedMonth,
  onPeriodSelect, 
  className 
}: PeriodSwitcherMobileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedYear, setExpandedYear] = useState<number | null>(selectedYear);

  const getDisplayText = () => {
    if (selectedYear === null) return 'Wszystkie okresy';
    if (selectedMonth === null) return `${selectedYear}`;
    return `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  };

  const handlePeriodSelect = (year: number | null, month?: number | null) => {
    onPeriodSelect(year, month);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-between", className)}>
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {getDisplayText()}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Wybierz okres</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2 overflow-y-auto max-h-[calc(70vh-100px)]">
          {/* Quick jumps */}
          <div className="pb-4 border-b space-y-2">
            <Button
              variant={selectedYear === null ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => handlePeriodSelect(null)}
            >
              Wszystkie okresy
            </Button>
            <Button
              variant={selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() + 1 ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => {
                const now = new Date();
                handlePeriodSelect(now.getFullYear(), now.getMonth() + 1);
              }}
            >
              Bieżący miesiąc
            </Button>
          </div>

          {/* Years with expandable months */}
          <div className="space-y-1">
            {years.map(year => {
              const isExpanded = expandedYear === year;
              const isYearSelected = selectedYear === year && selectedMonth === null;
              
              return (
                <div key={year}>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={isYearSelected ? 'default' : 'ghost'}
                      className="flex-1 justify-start"
                      onClick={() => {
                        if (isExpanded) {
                          handlePeriodSelect(year);
                        } else {
                          setExpandedYear(isExpanded ? null : year);
                        }
                      }}
                    >
                      {year}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedYear(isExpanded ? null : year)}
                    >
                      {isExpanded ? '−' : '+'}
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1">
                      {MONTHS.map((month, index) => {
                        const monthNum = index + 1;
                        const isMonthSelected = selectedYear === year && selectedMonth === monthNum;
                        
                        return (
                          <Button
                            key={monthNum}
                            variant={isMonthSelected ? 'default' : 'ghost'}
                            className="w-full justify-start text-sm"
                            onClick={() => handlePeriodSelect(year, monthNum)}
                          >
                            {month}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
