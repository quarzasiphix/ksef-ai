import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Book, Calendar, Filter, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface JournalEntry {
  id: string;
  period: string;
  entry_date: string;
  description: string;
  reference_number: string;
  status: string;
  posted_at: string;
  event_id: string;
  lines: JournalLine[];
}

interface JournalLine {
  id: string;
  account_code: string;
  account_name: string;
  debit: number | null;
  credit: number | null;
  description: string;
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
  const [viewMode, setViewMode] = useState<'trial-balance' | 'journal-entries'>('trial-balance');

  // Fetch trial balance
  const { data: trialBalance = [], isLoading: isLoadingTrial } = useQuery<TrialBalanceRow[]>({
    queryKey: ['trial-balance', selectedProfileId, selectedPeriod],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      const { data, error } = await supabase.rpc('get_trial_balance', {
        p_business_profile_id: selectedProfileId,
        p_period_end: selectedPeriod || null,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProfileId && viewMode === 'trial-balance',
  });

  // Fetch journal entries
  const { data: journalEntries = [], isLoading: isLoadingJournal } = useQuery<JournalEntry[]>({
    queryKey: ['journal-entries', selectedProfileId, selectedPeriod],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      let query = supabase
        .from('gl_journal_entries')
        .select(`
          id,
          period,
          entry_date,
          description,
          reference_number,
          status,
          posted_at,
          event_id,
          gl_journal_lines (
            id,
            account_code,
            debit,
            credit,
            description
          )
        `)
        .eq('business_profile_id', selectedProfileId)
        .eq('status', 'posted')
        .order('entry_date', { ascending: false });

      if (selectedPeriod) {
        query = query.eq('period', selectedPeriod);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrich with account names
      const enriched = await Promise.all(
        (data || []).map(async (entry: any) => {
          const linesWithNames = await Promise.all(
            entry.gl_journal_lines.map(async (line: any) => {
              const { data: account } = await supabase
                .from('chart_accounts')
                .select('name')
                .eq('business_profile_id', selectedProfileId)
                .eq('code', line.account_code)
                .single();

              return {
                ...line,
                account_name: account?.name || line.account_code,
              };
            })
          );

          return {
            ...entry,
            lines: linesWithNames,
          };
        })
      );

      return enriched;
    },
    enabled: !!selectedProfileId && viewMode === 'journal-entries',
  });

  // Group trial balance by account type
  const groupedTrialBalance = trialBalance.reduce((acc, row) => {
    if (!acc[row.account_type]) {
      acc[row.account_type] = [];
    }
    acc[row.account_type].push(row);
    return acc;
  }, {} as Record<string, TrialBalanceRow[]>);

  // Calculate totals
  const totalDebits = trialBalance.reduce((sum, row) => sum + row.debit_total, 0);
  const totalCredits = trialBalance.reduce((sum, row) => sum + row.credit_total, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

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
                variant={viewMode === 'trial-balance' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('trial-balance')}
              >
                Bilans próbny
              </Button>
              <Button
                variant={viewMode === 'journal-entries' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('journal-entries')}
              >
                Zapisy księgowe
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

            {viewMode === 'trial-balance' && (
              <Badge variant={isBalanced ? 'outline' : 'destructive'} className={isBalanced ? 'bg-green-500/10 text-green-600' : ''}>
                {isBalanced ? '✓ Zbilansowane' : '⚠ Niezbalansowane'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'trial-balance' ? (
          <div className="space-y-6">
            {isLoadingTrial ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Ładowanie...</p>
              </div>
            ) : trialBalance.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Book className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Brak zapisów księgowych</p>
                <p className="text-sm text-muted-foreground">
                  Zamknij pierwsze zdarzenia, aby zobaczyć bilans próbny
                </p>
              </div>
            ) : (
              <>
                {/* Trial Balance by Account Type */}
                {Object.entries(groupedTrialBalance).map(([type, rows]) => (
                  <div key={type}>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Badge variant="outline" className={ACCOUNT_TYPE_COLORS[type]}>
                        {ACCOUNT_TYPE_LABELS[type]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ({rows.length})
                      </span>
                    </h2>

                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Konto</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Wn (Debet)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Ma (Kredyt)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Saldo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {rows.map((row) => (
                            <tr key={row.account_code} className="hover:bg-muted/30">
                              <td className="px-4 py-3">
                                <div className="font-mono text-sm font-semibold">{row.account_code}</div>
                                <div className="text-sm text-muted-foreground">{row.account_name}</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                {row.debit_total > 0 ? formatCurrency(row.debit_total, 'PLN') : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm">
                                {row.credit_total > 0 ? formatCurrency(row.credit_total, 'PLN') : '-'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-sm font-semibold">
                                {formatCurrency(row.balance, 'PLN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Suma Wn</div>
                      <div className="text-lg font-bold font-mono">{formatCurrency(totalDebits, 'PLN')}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Suma Ma</div>
                      <div className="text-lg font-bold font-mono">{formatCurrency(totalCredits, 'PLN')}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Różnica</div>
                      <div className={`text-lg font-bold font-mono ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(totalDebits - totalCredits, 'PLN')}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {isLoadingJournal ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Ładowanie...</p>
              </div>
            ) : journalEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Brak zapisów księgowych</p>
                <p className="text-sm text-muted-foreground">
                  Zamknij pierwsze zdarzenia, aby zobaczyć zapisy
                </p>
              </div>
            ) : (
              journalEntries.map((entry) => {
                const totalDebit = entry.lines.reduce((sum, line) => sum + (line.debit || 0), 0);
                const totalCredit = entry.lines.reduce((sum, line) => sum + (line.credit || 0), 0);
                const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

                return (
                  <div key={entry.id} className="rounded-lg border border-border overflow-hidden">
                    {/* Entry Header */}
                    <div className="bg-muted/30 px-4 py-3 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono">{entry.period}</Badge>
                          <span className="text-sm font-medium">{entry.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.entry_date), 'dd MMM yyyy', { locale: pl })}
                          </span>
                          <Badge variant={isBalanced ? 'outline' : 'destructive'} className={isBalanced ? 'bg-green-500/10 text-green-600' : ''}>
                            {isBalanced ? '✓' : '⚠'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Entry Lines */}
                    <div className="divide-y divide-border">
                      {entry.lines.map((line) => (
                        <div key={line.id} className="px-4 py-3 hover:bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-semibold">{line.account_code}</span>
                              <span className="text-sm text-muted-foreground">{line.account_name}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Wn</div>
                                <div className="font-mono text-sm">
                                  {line.debit ? formatCurrency(line.debit, 'PLN') : '-'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">Ma</div>
                                <div className="font-mono text-sm">
                                  {line.credit ? formatCurrency(line.credit, 'PLN') : '-'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Entry Footer */}
                    <div className="bg-muted/20 px-4 py-2 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Suma:</span>
                        <div className="flex items-center gap-6">
                          <span className="font-mono font-semibold">{formatCurrency(totalDebit, 'PLN')}</span>
                          <span className="font-mono font-semibold">{formatCurrency(totalCredit, 'PLN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GeneralLedger;
