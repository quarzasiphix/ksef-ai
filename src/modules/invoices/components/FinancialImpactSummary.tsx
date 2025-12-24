import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';

interface FinancialImpactSummaryProps {
  totalNet: number;
  totalVat: number;
  totalGross: number;
  currency: string;
  transactionType: 'income' | 'expense';
  isVatExempt?: boolean;
  vatExemptionReason?: string;
  issueDate: string;
  isPaid?: boolean;
  bookedToLedger?: boolean;
}

const FinancialImpactSummary: React.FC<FinancialImpactSummaryProps> = ({
  totalNet,
  totalVat,
  totalGross,
  currency,
  transactionType,
  isVatExempt,
  vatExemptionReason,
  issueDate,
  isPaid,
  bookedToLedger,
}) => {
  const isIncome = transactionType === 'income';
  const period = new Date(issueDate).toLocaleDateString('pl-PL', { month: '2-digit', year: 'numeric' });

  // Determine cashflow impact
  const getCashflowImpact = () => {
    if (!isPaid) {
      return {
        label: 'Wpływ na cashflow',
        value: 'oczekiwany',
        icon: Minus,
        color: 'text-gray-600',
      };
    }

    return {
      label: 'Wpływ na cashflow',
      value: `${isIncome ? '+' : '-'}${formatCurrency(totalGross, currency)}`,
      icon: isIncome ? TrendingUp : TrendingDown,
      color: isIncome ? 'text-green-600' : 'text-red-600',
    };
  };

  // Determine VAT impact
  const getVatImpact = () => {
    if (isVatExempt || totalVat === 0) {
      return {
        label: 'VAT',
        value: 'nie dotyczy',
        detail: isVatExempt ? 'Faktura bez VAT' : 'Brak VAT',
        color: 'text-gray-600',
      };
    }

    return {
      label: isIncome ? 'VAT należny' : 'VAT do odliczenia',
      value: formatCurrency(totalVat, currency),
      detail: isIncome ? 'Do odprowadzenia do US' : 'Zmniejsza zobowiązanie VAT',
      color: isIncome ? 'text-orange-600' : 'text-green-600',
    };
  };

  // Determine result impact
  const getResultImpact = () => {
    if (!bookedToLedger) {
      return {
        label: 'Wpływ na wynik',
        value: 'niezaksięgowany',
        detail: 'Dokument nie został jeszcze ujęty w księgach',
        color: 'text-gray-600',
      };
    }

    if (totalNet === 0) {
      return {
        label: 'Wpływ na wynik',
        value: 'neutralny',
        detail: 'Brak wpływu na wynik finansowy',
        color: 'text-gray-600',
      };
    }

    return {
      label: 'Wpływ na wynik finansowy',
      value: `${isIncome ? '+' : '-'}${formatCurrency(totalNet, currency)}`,
      detail: isIncome ? 'Zwiększa przychód' : 'Zwiększa koszt',
      color: isIncome ? 'text-green-600' : 'text-red-600',
    };
  };

  const cashflow = getCashflowImpact();
  const vat = getVatImpact();
  const result = getResultImpact();
  const CashflowIcon = cashflow.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Wpływ finansowy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cashflow Impact */}
        <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">{cashflow.label}</div>
            <div className={`text-2xl font-bold ${cashflow.color} flex items-center gap-2`}>
              <CashflowIcon className="h-5 w-5" />
              {cashflow.value}
            </div>
          </div>
          {isPaid && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Zrealizowany
            </Badge>
          )}
        </div>

        {/* VAT Impact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{vat.label}</span>
            <span className={`text-lg font-semibold ${vat.color}`}>
              {vat.value}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{vat.detail}</p>
        </div>

        {/* Result Impact */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{result.label}</span>
            <span className={`text-lg font-semibold ${result.color}`}>
              {result.value}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{result.detail}</p>
        </div>

        {/* Accounting Period */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ujęcie w okresie:</span>
            <span className="font-medium">{period}</span>
          </div>
        </div>

        {/* Tax Impact Notice */}
        {bookedToLedger && (
          <div className="pt-2 border-t">
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Ten dokument wpływa na rozliczenia podatkowe (VAT, CIT) za okres {period}.
                {!isPaid && ' Płatność nie wpływa na moment ujęcia w kosztach/przychodach.'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialImpactSummary;
