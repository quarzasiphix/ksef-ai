import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatLedgerAmount } from '@/shared/lib/ledger-utils';
import { cn } from '@/shared/lib/utils';

interface YearGroupHeaderProps {
  label: string;
  sum: number;
  currency?: string;
  isExpanded: boolean;
  onToggle: () => void;
  invoiceCount: number;
}

export function YearGroupHeader({ 
  label, 
  sum, 
  currency = 'PLN', 
  isExpanded, 
  onToggle,
  invoiceCount 
}: YearGroupHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center justify-between px-6 py-6 mt-4 first:mt-0",
        "hover:bg-primary/10 transition-all duration-150",
        "border-y-4 border-primary/30 bg-primary/5",
        "group sticky top-0 z-10 backdrop-blur-sm shadow-md"
      )}
    >
      <div className="flex items-center gap-4">
        {isExpanded ? (
          <ChevronDown className="h-6 w-6 text-primary transition-transform group-hover:text-primary/80" />
        ) : (
          <ChevronRight className="h-6 w-6 text-primary transition-transform group-hover:text-primary/80" />
        )}
        <div className="flex items-baseline gap-5">
          <span className="text-2xl font-bold text-foreground">
            {label}
          </span>
          <span className="text-sm text-muted-foreground font-semibold">
            {invoiceCount} {invoiceCount === 1 ? 'dokument' : 'dokumentów'}
          </span>
        </div>
      </div>
      <div className="text-2xl font-mono font-bold text-foreground tabular-nums">
        {formatLedgerAmount(sum, currency)}
      </div>
    </button>
  );
}
