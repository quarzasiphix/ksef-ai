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
        "w-full flex items-center justify-between px-4 py-3",
        "hover:bg-muted/50 transition-colors",
        "border-b border-border",
        "group"
      )}
    >
      <div className="flex items-center gap-3">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
        )}
        <div className="flex items-baseline gap-3">
          <span className="text-base font-semibold">
            {capitalizeMonth(label)}
          </span>
          <span className="text-xs text-muted-foreground">
            {invoiceCount} {invoiceCount === 1 ? 'dokument' : 'dokumentów'}
          </span>
        </div>
      </div>
      <div className="text-base font-mono font-medium text-muted-foreground tabular-nums">
        {formatLedgerAmount(sum, currency)}
      </div>
    </button>
  );
}
