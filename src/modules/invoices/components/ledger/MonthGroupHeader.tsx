import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatLedgerAmount, capitalizeMonth } from '@/shared/lib/ledger-utils';
import { cn } from '@/shared/lib/utils';

interface MonthGroupHeaderProps {
  label: string;
  sum: number;
  currency?: string;
  isExpanded: boolean;
  onToggle: () => void;
  invoiceCount: number;
}

export function MonthGroupHeader({ 
  label, 
  sum, 
  currency = 'PLN', 
  isExpanded, 
  onToggle,
  invoiceCount 
}: MonthGroupHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center justify-between px-5 py-5 mt-3 first:mt-0",
        "hover:bg-muted/80 transition-all duration-150",
        "border-y-2 border-border bg-muted/50",
        "group sticky top-0 z-10 backdrop-blur-sm shadow-sm"
      )}
    >
      <div className="flex items-center gap-3">
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-hover:text-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:text-foreground" />
        )}
        <div className="flex items-baseline gap-4">
          <span className="text-lg font-bold text-foreground">
            {capitalizeMonth(label)}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {invoiceCount} {invoiceCount === 1 ? 'dokument' : 'dokumentów'}
          </span>
        </div>
      </div>
      <div className="text-lg font-mono font-bold text-foreground tabular-nums">
        {formatLedgerAmount(sum, currency)}
      </div>
    </button>
  );
}
