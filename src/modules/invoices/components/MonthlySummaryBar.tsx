import React, { useMemo } from 'react';
import { formatCurrency, getInvoiceValueInPLN } from '@/shared/lib/invoice-utils';
import { Invoice } from '@/shared/types';
import { AlertCircle, Clock, FileText, TrendingUp } from 'lucide-react';

export type MonthlySummaryFilter = 'all' | 'unpaid_issued' | 'overdue';

interface MonthlySummaryBarProps {
  invoices: Invoice[];
  transactionType: 'income' | 'expense';
  cta: React.ReactNode;
  onFilter?: (filter: MonthlySummaryFilter) => void;
}

const MonthlySummaryBar: React.FC<MonthlySummaryBarProps> = ({
  invoices,
  transactionType,
  cta,
  onFilter,
}) => {
  const snapshot = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyInvoices = invoices.filter((inv) => {
      const invoiceDate = new Date(inv.issueDate);
      return (
        invoiceDate.getMonth() === currentMonth &&
        invoiceDate.getFullYear() === currentYear &&
        inv.transactionType === transactionType
      );
    });

    const totalAmount = monthlyInvoices.reduce((sum, inv) => {
      // Check if VAT exempt
      const isVatExempt = inv.fakturaBezVAT || inv.vat === false;
      // Use totalNetValue for VAT-exempt invoices, totalGrossValue otherwise
      const baseAmount = isVatExempt ? (inv.totalNetValue || 0) : (inv.totalGrossValue || inv.totalAmount || 0);
      // Convert to PLN if foreign currency
      const plnValue = inv.currency === 'PLN' ? baseAmount : getInvoiceValueInPLN(inv);
      return sum + plnValue;
    }, 0);

    const documentCount = monthlyInvoices.length;
    const unpaidCount = monthlyInvoices.filter((inv) => !(inv.isPaid || inv.paid)).length;
    const overdueCount = monthlyInvoices.filter((inv) => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
      return !!dueDate && dueDate < new Date() && !(inv.isPaid || inv.paid);
    }).length;

    return {
      totalAmount,
      documentCount,
      unpaidCount,
      overdueCount,
    };
  }, [invoices, transactionType]);

  const kpis = [
    {
      label: 'Przychód miesiąca',
      value: `+${formatCurrency(snapshot.totalAmount, 'PLN')}`,
      icon: TrendingUp,
    },
    {
      label: 'Faktur w miesiącu',
      value: `${snapshot.documentCount}`,
      icon: FileText,
    },
    {
      label: 'Oczekuje na płatność',
      value: `${snapshot.unpaidCount}`,
      icon: Clock,
      filter: 'unpaid_issued' as MonthlySummaryFilter,
    },
    {
      label: 'Po terminie',
      value: `${snapshot.overdueCount}`,
      icon: AlertCircle,
      filter: 'overdue' as MonthlySummaryFilter,
    },
  ];

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-slate-900/70 shadow-sm shadow-slate-900/40">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3">
        <div className="flex flex-1 flex-wrap items-center gap-4 min-w-0">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const interactive = Boolean(kpi.filter && onFilter);

            const handleClick = () => {
              if (interactive && kpi.filter) {
                onFilter?.(kpi.filter);
              }
            };

            return (
              <div key={kpi.label} className="flex items-center gap-4">
                {index > 0 && (
                  <div className="hidden md:block h-10 w-px bg-white/10" aria-hidden />
                )}
                <button
                  type="button"
                  tabIndex={interactive ? 0 : -1}
                  aria-disabled={!interactive}
                  onClick={handleClick}
                  className={`flex min-w-[150px] flex-col items-start gap-1 rounded px-2 py-1 text-left transition-colors ${
                    interactive
                      ? 'cursor-pointer hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50'
                      : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Icon className="h-5 w-5 text-blue-400" />
                    <span>{kpi.value}</span>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-white/60">{kpi.label}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex-shrink-0">{cta}</div>
      </div>
    </div>
  );
};

export default MonthlySummaryBar;
