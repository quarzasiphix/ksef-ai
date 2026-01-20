import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatLedgerAmount, capitalizeMonth } from '@/shared/lib/ledger-utils';
import { cn } from '@/shared/lib/utils';

interface MonthGroupHeaderMobileProps {
  label: string;
  sum: number;
  currency?: string;
  isExpanded: boolean;
  onToggle: () => void;
  invoiceCount: number;
}

export function MonthGroupHeaderMobile({ 
  label, 
  sum, 
  currency = 'PLN', 
  isExpanded, 
  onToggle,
  invoiceCount 
}: MonthGroupHeaderMobileProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "sticky top-0 z-10 w-full flex items-center justify-between px-4 py-3",
        "bg-background border-b-2 border-border",
        "active:bg-muted/50 transition-colors"
      )}
    >
      <div className="flex items-center gap-2">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold">
            {capitalizeMonth(label)}
          </span>
          <span className="text-xs text-muted-foreground">
            {invoiceCount} {invoiceCount === 1 ? 'dokument' : 'dokumentów'}
          </span>
        </div>
      </div>
      <div className="text-sm font-mono font-semibold tabular-nums">
        {formatLedgerAmount(sum, currency)}
      </div>
    </button>
  );
}
