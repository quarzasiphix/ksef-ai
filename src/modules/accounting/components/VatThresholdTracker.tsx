import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { AlertTriangle, TrendingUp, Info } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { BusinessProfile } from '@/shared/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";

interface VatThresholdTrackerProps {
  profile: BusinessProfile;
  consumedAmount: number;
  invoiceCount: number;
}

export const VatThresholdTracker: React.FC<VatThresholdTrackerProps> = ({
  profile,
  consumedAmount,
  invoiceCount,
}) => {
  const threshold = profile.vat_threshold_pln || 200000;
  const percentageUsed = Math.min((consumedAmount / threshold) * 100, 100);
  const remaining = Math.max(threshold - consumedAmount, 0);
  const year = profile.vat_threshold_year || new Date().getFullYear();

  // Determine status
  const isWarning = percentageUsed >= 80 && percentageUsed < 95;
  const isCritical = percentageUsed >= 95;

  return (
    <Card className={`${isCritical ? 'border-red-500' : isWarning ? 'border-amber-500' : ''}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Limit zwolnienia z VAT ({year})
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Zgodnie z art. 113 ustawy o VAT, zwolnienie przysługuje do osiągnięcia 
                  {formatCurrency(threshold, 'PLN')} przychodu w roku kalendarzowym.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Wykorzystano</span>
            <span className="font-semibold">
              {formatCurrency(consumedAmount, 'PLN')} / {formatCurrency(threshold, 'PLN')}
            </span>
          </div>
          <Progress 
            value={percentageUsed} 
            className={`h-3 ${isCritical ? 'bg-red-100' : isWarning ? 'bg-amber-100' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentageUsed.toFixed(1)}% wykorzystane</span>
            <span>Pozostało: {formatCurrency(remaining, 'PLN')}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Liczba faktur</div>
            <div className="text-lg font-semibold">{invoiceCount}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Średnia wartość</div>
            <div className="text-lg font-semibold">
              {invoiceCount > 0 ? formatCurrency(consumedAmount / invoiceCount, 'PLN') : formatCurrency(0, 'PLN')}
            </div>
          </div>
        </div>

        {/* Warning messages */}
        {isCritical && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-red-900 dark:text-red-100">Przekroczono 95% limitu!</p>
              <p className="text-red-700 dark:text-red-300 mt-1">
                Zbliżasz się do progu zwolnienia z VAT. Rozważ rejestrację jako płatnik VAT (VAT-R).
              </p>
            </div>
          </div>
        )}

        {isWarning && !isCritical && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-md">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-100">Uwaga: Wykorzystano ponad 80% limitu</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Monitoruj przychody, aby nie przekroczyć progu {formatCurrency(threshold, 'PLN')}.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
