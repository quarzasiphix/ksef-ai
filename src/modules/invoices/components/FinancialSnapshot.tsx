import React, { useMemo } from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { TrendingUp, AlertCircle, FileText } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { Invoice } from '@/shared/types';

interface FinancialSnapshotProps {
  invoices: Invoice[];
  transactionType: 'income' | 'expense';
}

const FinancialSnapshot: React.FC<FinancialSnapshotProps> = ({ invoices, transactionType }) => {
  const snapshot = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter invoices for current month
    const thisMonthInvoices = invoices.filter(inv => {
      const invoiceDate = new Date(inv.issueDate);
      return invoiceDate.getMonth() === currentMonth && 
             invoiceDate.getFullYear() === currentYear &&
             inv.transactionType === transactionType;
    });

    // Calculate totals
    const totalAmount = thisMonthInvoices.reduce((sum, inv) => sum + (inv.totalGrossValue || 0), 0);
    const documentCount = thisMonthInvoices.length;

    // Count documents requiring decisions (for spółki)
    const requiresDecision = thisMonthInvoices.filter(inv => {
      const invoiceAny = inv as any;
      return !inv.decisionId && !invoiceAny.booked_to_ledger;
    }).length;

    // Count unpaid
    const unpaidCount = thisMonthInvoices.filter(inv => !inv.isPaid && !inv.paid).length;

    // Count paid but not booked
    const paidNotBooked = thisMonthInvoices.filter(inv => {
      const invoiceAny = inv as any;
      const isPaid = inv.isPaid || inv.paid;
      return isPaid && !invoiceAny.booked_to_ledger;
    }).length;

    return {
      totalAmount,
      documentCount,
      requiresDecision,
      unpaidCount,
      paidNotBooked,
    };
  }, [invoices, transactionType]);

  const isIncome = transactionType === 'income';

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Main metric */}
          <div>
            <div className="text-sm text-blue-700 dark:text-blue-300 mb-1">Ten miesiąc</div>
            <div className="flex items-baseline gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <span className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {isIncome ? '+' : '-'}{formatCurrency(snapshot.totalAmount, 'PLN')}
              </span>
              <span className="text-sm text-blue-700 dark:text-blue-300">
                {isIncome ? 'przychodu' : 'wydatków'}
              </span>
            </div>
          </div>

          {/* Secondary metrics */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200">
                {snapshot.documentCount} {snapshot.documentCount === 1 ? 'dokument' : 'dokumentów'}
              </span>
            </div>

            {snapshot.requiresDecision > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-orange-800 dark:text-orange-200 font-medium">
                  {snapshot.requiresDecision} {snapshot.requiresDecision === 1 ? 'wymaga' : 'wymagają'} decyzji
                </span>
              </div>
            )}

            {snapshot.paidNotBooked > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-yellow-800 dark:text-yellow-200 font-medium">
                  {snapshot.paidNotBooked} niezaksięgowanych
                </span>
              </div>
            )}

            {snapshot.unpaidCount > 0 && (
              <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                {snapshot.unpaidCount} oczekuje na płatność
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSnapshot;
