import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { TrendingUp, TrendingDown, Receipt, Calendar } from 'lucide-react';

interface CompactFinancialImpactProps {
  totalGross: number;
  totalVat: number;
  currency: string;
  transactionType: 'income' | 'expense';
  isVatExempt: boolean;
  isPaid: boolean;
  isBooked: boolean;
  accountingPeriod?: string;
}

const CompactFinancialImpact: React.FC<CompactFinancialImpactProps> = ({
  totalGross,
  totalVat,
  currency,
  transactionType,
  isVatExempt,
  isPaid,
  isBooked,
  accountingPeriod,
}) => {
  const isIncome = transactionType === 'income';
  
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* Cashflow Impact */}
          <div className="flex items-start gap-2">
            {isIncome ? (
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600 mt-0.5" />
            )}
            <div>
              <div className="text-xs text-muted-foreground">Cashflow</div>
              <div className="font-medium">
                {isPaid ? 'Zrealizowany' : 'Oczekiwany'}
              </div>
            </div>
          </div>

          {/* VAT Impact */}
          {!isVatExempt && (
            <div className="flex items-start gap-2">
              <Receipt className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">VAT</div>
                <div className="font-medium">
                  {formatCurrency(totalVat, currency)}
                </div>
              </div>
            </div>
          )}

          {/* Result Impact */}
          <div className="flex items-start gap-2">
            {isIncome ? (
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-600 mt-0.5" />
            )}
            <div>
              <div className="text-xs text-muted-foreground">Wynik</div>
              <div className="font-medium">
                {isBooked ? 'Ujęty' : 'Nieujęty'}
              </div>
            </div>
          </div>

          {/* Accounting Period */}
          {accountingPeriod && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-xs text-muted-foreground">Okres</div>
                <div className="font-medium">{accountingPeriod}</div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CompactFinancialImpact;
