import React from 'react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { cn } from '@/shared/lib/utils';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface StickyFinancialTotalsProps {
  totalNet: number;
  totalVat: number;
  totalGross: number;
  currency: string;
  isPaid: boolean;
  isOverdue: boolean;
  isVatExempt?: boolean;
  className?: string;
}

export const StickyFinancialTotals: React.FC<StickyFinancialTotalsProps> = ({
  totalNet,
  totalVat,
  totalGross,
  currency,
  isPaid,
  isOverdue,
  isVatExempt,
  className,
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Title */}
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Podsumowanie finansowe
      </div>

      {/* Totals card - soft, no heavy borders */}
      <div className="bg-white/[0.02] rounded-lg p-4 space-y-3 border border-white/5">
        {/* Net */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Netto</span>
          <span className="font-medium tabular-nums">
            {formatCurrency(totalNet, currency)}
          </span>
        </div>

        {/* VAT */}
        {!isVatExempt && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">VAT</span>
            <span className="font-medium tabular-nums">
              {formatCurrency(totalVat, currency)}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-white/5" />

        {/* Gross - emphasized */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Brutto</span>
          <span className="text-xl font-semibold tabular-nums">
            {formatCurrency(totalGross, currency)}
          </span>
        </div>

        {/* Payment status indicator */}
        <div className="pt-2">
          {isPaid ? (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>Opłacona</span>
            </div>
          ) : isOverdue ? (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Po terminie</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <Clock className="h-4 w-4" />
              <span>Oczekuje płatności</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticky note */}
      <div className="text-xs text-muted-foreground">
        Wartości przeliczone automatycznie
      </div>
    </div>
  );
};

export default StickyFinancialTotals;
