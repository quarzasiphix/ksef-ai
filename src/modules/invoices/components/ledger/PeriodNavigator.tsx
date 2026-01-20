import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';

interface PeriodNavigatorProps {
  years: number[];
  selectedYear: number | null;
  onYearSelect: (year: number | null) => void;
  className?: string;
}

export function PeriodNavigator({ years, selectedYear, onYearSelect, className }: PeriodNavigatorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium text-muted-foreground">
        Okresy
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedYear === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onYearSelect(null)}
          className="min-w-[80px]"
        >
          Wszystkie
        </Button>
        {years.map(year => (
          <Button
            key={year}
            variant={selectedYear === year ? 'default' : 'outline'}
            size="sm"
            onClick={() => onYearSelect(year)}
            className="min-w-[80px]"
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  );
}
