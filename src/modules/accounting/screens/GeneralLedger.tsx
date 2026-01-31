import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Book, Calendar, Filter, ChevronRight, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getPostedInvoices, getAccountingSummary } from '@/modules/accounting/data/generalLedgerRepository';

interface JournalEntry {
  id: string;
  entry_date: string;
  document_number: string;
  description: string;
  is_posted: boolean;
  created_at: string;
  lines: JournalLine[];
  // Transformed properties for compatibility
  period: string;
  status: string;
  posted_at: string;
  // Event-based properties
  event_id?: string;
  event_type?: string;
  entity_type?: string;
  entity_id?: string;
}

interface JournalLine {
  id: string;
  account_code: string;
  debit_amount: number | null;
  credit_amount: number | null;
  description: string;
  // Transformed properties for compatibility
  side: 'debit' | 'credit';
  amount: number;
  account_name: string;
  debit: number | null;
  credit: number | null;
}

interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  balance: number;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  asset: 'Aktywa',
  liability: 'Pasywa',
  equity: 'Kapitał',
  revenue: 'Przychody',
  expense: 'Koszty',
  off_balance: 'Pozabilansowe',
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-600',
  liability: 'bg-red-500/10 text-red-600',
  equity: 'bg-purple-500/10 text-purple-600',
  revenue: 'bg-green-500/10 text-green-600',
  expense: 'bg-orange-500/10 text-orange-600',
  off_balance: 'bg-gray-500/10 text-gray-600',
};

function GeneralLedger() {
  const { selectedProfileId } = useBusinessProfile();
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'invoices'>('summary');

  // Get period dates
  const getPeriodDates = () => {
    if (!selectedPeriod) return { startDate: undefined, endDate: undefined };
    const [year, month] = selectedPeriod.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Fetch posted invoices
  const { data: postedInvoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['posted-invoices', selectedProfileId, selectedPeriod],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      const { startDate, endDate } = getPeriodDates();
      return getPostedInvoices(selectedProfileId, startDate, endDate);
    },
    enabled: !!selectedProfileId,
  });

  // Fetch accounting summary
  const { data: accountingSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['accounting-summary', selectedProfileId, selectedPeriod],
    queryFn: async () => {
      if (!selectedProfileId) return null;
      const { startDate, endDate } = getPeriodDates();
      return getAccountingSummary(selectedProfileId, startDate, endDate);
    },
    enabled: !!selectedProfileId && viewMode === 'summary',
  });

  // Separate income and expenses
  const incomeInvoices = postedInvoices.filter(inv => inv.transaction_type === 'income');
  const expenseInvoices = postedInvoices.filter(inv => inv.transaction_type === 'expense');

  const isLoading = isLoadingInvoices || isLoadingSummary;

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Book className="h-6 w-6" />
                Księga główna
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Zapisy księgowe i bilans próbny
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'summary' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('summary')}
              >
                Podsumowanie
              </Button>
              <Button
                variant={viewMode === 'invoices' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('invoices')}
              >
                Faktury
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedPeriod || ''}
                onChange={(e) => setSelectedPeriod(e.target.value || null)}
                className="px-3 py-1.5 border border-border rounded-md bg-background text-sm"
              >
                <option value="">Wszystkie okresy</option>
                <option value="2026-01">Styczeń 2026</option>
                <option value="2025-12">Grudzień 2025</option>
                <option value="2025-11">Listopad 2025</option>
              </select>
            </div>

            <Badge variant="outline" className="bg-blue-500/10 text-blue-600">
              {postedInvoices.length} zaksięgowanych dokumentów
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'summary' ? (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Ładowanie...</p>
              </div>
            ) : !accountingSummary ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Book className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Brak danych księgowych</p>
                <p className="text-sm text-muted-foreground">
                  Zaksięguj pierwsze faktury, aby zobaczyć podsumowanie
                </p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-4 bg-green-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <h3 className="text-sm font-medium text-muted-foreground">Przychody</h3>
                    </div>
                    <p className="text-2xl font-bold font-mono text-green-600">
                      {formatCurrency(accountingSummary.total_income, 'PLN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {incomeInvoices.length} faktur
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-red-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <h3 className="text-sm font-medium text-muted-foreground">Koszty</h3>
                    </div>
                    <p className="text-2xl font-bold font-mono text-red-600">
                      {formatCurrency(accountingSummary.total_expenses, 'PLN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {expenseInvoices.length} faktur
                    </p>
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-blue-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Book className="h-5 w-5 text-blue-600" />
                      <h3 className="text-sm font-medium text-muted-foreground">Wynik</h3>
                    </div>
                    <p className={`text-2xl font-bold font-mono ${accountingSummary.net_result >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(accountingSummary.net_result, 'PLN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {accountingSummary.net_result >= 0 ? 'Zysk' : 'Strata'}
                    </p>
                  </div>
                </div>

                {/* VAT Summary */}
                <div className="rounded-lg border border-border p-4">
                  <h3 className="text-lg font-semibold mb-4">Podsumowanie VAT</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">VAT należny</div>
                      <div className="text-lg font-bold font-mono">
                        {formatCurrency(accountingSummary.total_vat_collected, 'PLN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">VAT naliczony</div>
                      <div className="text-lg font-bold font-mono">
                        {formatCurrency(accountingSummary.total_vat_paid, 'PLN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Saldo VAT</div>
                      <div className={`text-lg font-bold font-mono ${accountingSummary.vat_balance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(accountingSummary.vat_balance, 'PLN')}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {accountingSummary.vat_balance >= 0 ? 'Do zapłaty' : 'Do zwrotu'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Ładowanie...</p>
              </div>
            ) : postedInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Brak zaksięgowanych faktur</p>
                <p className="text-sm text-muted-foreground">
                  Zaksięguj pierwsze faktury, aby zobaczyć je tutaj
                </p>
              </div>
            ) : (
              <>
                {/* Income Invoices */}
                {incomeInvoices.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">
                        Przychody
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({incomeInvoices.length})
                      </span>
                    </h2>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Numer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kontrahent</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Netto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">VAT</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Brutto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {incomeInvoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 text-sm">
                                {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-sm font-semibold">{invoice.number}</span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {invoice.customer_name || 'Brak nazwy'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                {formatCurrency(invoice.total_net_value, invoice.currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                {formatCurrency(invoice.total_vat_value, invoice.currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                                {formatCurrency(invoice.total_gross_value, invoice.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Expense Invoices */}
                {expenseInvoices.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="bg-red-500/10 text-red-600">
                        Koszty
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({expenseInvoices.length})
                      </span>
                    </h2>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Data</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Numer</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Kontrahent</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Netto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">VAT</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Brutto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {expenseInvoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-muted/30">
                              <td className="px-4 py-3 text-sm">
                                {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-sm font-semibold">{invoice.number}</span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {invoice.customer_name || 'Brak nazwy'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                {formatCurrency(invoice.total_net_value, invoice.currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                {formatCurrency(invoice.total_vat_value, invoice.currency)}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                                {formatCurrency(invoice.total_gross_value, invoice.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneralLedger;
