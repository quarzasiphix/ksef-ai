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
        "sticky top-0 z-10 w-full flex items-center justify-between px-4 py-5",
        "bg-muted/60 border-y-2 border-border backdrop-blur-sm shadow-sm",
        "active:bg-muted/80 transition-all duration-150"
      )}
    >
      <div className="flex items-center gap-3">
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
        <div className="flex flex-col items-start">
          <span className="text-base font-bold text-foreground">
            {capitalizeMonth(label)}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {invoiceCount} {invoiceCount === 1 ? 'dokument' : 'dokumentów'}
          </span>
        </div>
      </div>
      <div className="text-base font-mono font-bold tabular-nums">
        {formatLedgerAmount(sum, currency)}
      </div>
    </button>
  );
}
