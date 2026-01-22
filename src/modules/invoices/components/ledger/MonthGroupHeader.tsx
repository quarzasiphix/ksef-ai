import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { formatLedgerAmount, capitalizeMonth, formatTaxAmount } from '@/shared/lib/ledger-utils';
import { cn } from '@/shared/lib/utils';

interface MonthGroupHeaderProps {
  label: string;
  sum: number;
  currency?: string;
  isExpanded: boolean;
  onToggle: () => void;
  invoiceCount: number;
  tax?: number;
  accountedCount?: number;
  totalCount?: number;
}

export function MonthGroupHeader({ 
  label, 
  sum, 
  currency = 'PLN', 
  isExpanded, 
  onToggle,
  invoiceCount,
  tax,
  accountedCount,
  totalCount
}: MonthGroupHeaderProps) {
  const isFullyAccounted = accountedCount !== undefined && totalCount !== undefined && accountedCount === totalCount && totalCount > 0;
  const hasUnaccounted = accountedCount !== undefined && totalCount !== undefined && accountedCount < totalCount && totalCount > 0;

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
          {hasUnaccounted && (
            <div className="flex items-center gap-1 text-red-600">
              <BookOpen className="w-3 h-3" />
              <span className="text-xs font-medium">
                {totalCount - accountedCount} nierozliczonych
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="text-lg font-mono font-bold text-foreground tabular-nums">
        {formatLedgerAmount(sum, currency)}{tax !== undefined && tax > 0 ? formatTaxAmount(tax, currency) : ''}
      </div>
    </button>
  );
}
