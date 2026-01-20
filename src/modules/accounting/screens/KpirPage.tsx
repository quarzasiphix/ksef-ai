import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Calendar, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { PeriodTimelineStrip } from '../components/PeriodTimelineStrip';
import { useAccountingPeriod } from '../hooks/useAccountingPeriod';
import { supabase } from '@/integrations/supabase/client';

interface KpirLine {
  id: string;
  occurred_at: string;
  document_number: string;
  counterparty_name: string;
  revenue_amount: number;
  expense_amount: number;
  description?: string;
  category?: string;
}

interface MonthlySummary {
  month: number;
  year: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  lineCount: number;
}

export default function KpirPage() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  
  const accountingPeriod = useAccountingPeriod();
  const period = accountingPeriod.period;
  const [kpirLines, setKpirLines] = useState<KpirLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProfileId) return;
    loadKpirData();
  }, [selectedProfileId, period.key.year, period.key.month]);

  const loadKpirData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get period boundaries
      const periodStart = new Date(period.key.year, period.key.month - 1, 1);
      const periodEnd = new Date(period.key.year, period.key.month, 0, 23, 59, 59);

      // Fetch invoices for revenue (income)
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, number, issue_date, total_gross_value, customers!inner(name)')
        .eq('business_profile_id', selectedProfileId)
        .eq('transaction_type', 'income')
        .eq('is_paid', true) // Only paid invoices
        .gte('issue_date', periodStart.toISOString())
        .lte('issue_date', periodEnd.toISOString())
        .order('issue_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, number, issue_date, customer_name, amount')
        .eq('business_profile_id', selectedProfileId)
        .gte('issue_date', periodStart.toISOString())
        .lte('issue_date', periodEnd.toISOString())
        .order('issue_date', { ascending: false });

      if (expensesError) throw expensesError;

      // Transform to KPiR lines
      const revenueLines: KpirLine[] = (invoices || []).map(inv => ({
        id: inv.id,
        occurred_at: inv.issue_date,
        document_number: inv.number,
        counterparty_name: (inv.customers as any)?.[0]?.name || 'Nieznany',
        revenue_amount: inv.total_gross_value || 0,
        expense_amount: 0,
        description: 'Przychód ze sprzedaży',
        category: 'Przychody'
      }));

      const expenseLines: KpirLine[] = (expenses || []).map(exp => ({
        id: exp.id,
        occurred_at: exp.issue_date,
        document_number: exp.number || `WYD/${exp.id}`,
        counterparty_name: exp.customer_name || 'Nieznany',
        revenue_amount: 0,
        expense_amount: exp.amount || 0,
        description: 'Wydatek',
        category: 'Koszty'
      }));

      // Combine and sort
      const allLines = [...revenueLines, ...expenseLines].sort((a, b) => 
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      );

      setKpirLines(allLines);
    } catch (err) {
      console.error('Error loading KPiR data:', err);
      setError('Nie udało się załadować danych KPiR');
    } finally {
      setLoading(false);
    }
  };

  // Calculate monthly summary
  const monthlySummary = useMemo((): MonthlySummary => {
    const periodLines = kpirLines.filter(line => {
      const lineDate = new Date(line.occurred_at);
      return lineDate.getMonth() + 1 === period.key.month && 
             lineDate.getFullYear() === period.key.year;
    });

    const totalRevenue = periodLines.reduce((sum, line) => sum + line.revenue_amount, 0);
    const totalExpenses = periodLines.reduce((sum, line) => sum + line.expense_amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      month: period.key.month,
      year: period.key.year,
      totalRevenue,
      totalExpenses,
      netIncome,
      lineCount: periodLines.length
    };
  }, [kpirLines, period.key]);

  // Calculate month states for PeriodTimelineStrip
  const monthStates = useMemo(() => {
    const states = [];
    for (let month = 1; month <= 12; month++) {
      const monthLines = kpirLines.filter(line => {
        const lineDate = new Date(line.occurred_at);
        return lineDate.getMonth() + 1 === month && 
               lineDate.getFullYear() === period.key.year;
      });

      const totalRevenue = monthLines.reduce((sum, line) => sum + line.revenue_amount, 0);
      const totalExpenses = monthLines.reduce((sum, line) => sum + line.expense_amount, 0);

      states.push({
        month,
        year: period.key.year,
        hasActivity: monthLines.length > 0,
        isLocked: false, // TODO: Implement period locking
        hasErrors: false,
        unpostedCount: 0,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses
      });
    }
    return states;
  }, [kpirLines, period.key.year]);

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Wybierz profil firmy</h3>
          <p className="text-muted-foreground">Nie wybrano profilu działalności gospodarczej</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Ładowanie danych KPiR...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-600">Błąd</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={loadKpirData} className="mt-4">
            Spróbuj ponownie
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Navigation */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Księga Przychodów i Rozchodów</h1>
          <p className="text-muted-foreground">
            Podatkowa księga przychodów i rozchodów dla wybranego okresu
          </p>
        </div>

        {/* Period Timeline Strip */}
        <PeriodTimelineStrip
          currentPeriod={period.key}
          currentYear={period.key.year}
          monthStates={monthStates}
          onPeriodChange={accountingPeriod.setPeriod}
          onYearChange={(year) => accountingPeriod.setPeriod({ year, month: period.key.month })}
          accountingStartDate={new Date(selectedProfile.establishment_date || '2024-01-01')}
        />
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Przychody miesiąca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(monthlySummary.totalRevenue, 'PLN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(period.key.year, period.key.month - 1, 1), 'MMMM yyyy', { locale: pl })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Koszty miesiąca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(monthlySummary.totalExpenses, 'PLN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {monthlySummary.lineCount} operacji
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Dochód netto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${monthlySummary.netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(monthlySummary.netIncome, 'PLN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Przychody - Koszty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-purple-600" />
              Status okresu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              Otwarty
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Okres nie jest zamknięty
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPiR Lines */}
      <Card>
        <CardHeader>
          <CardTitle>Operacje KPiR</CardTitle>
          <CardDescription>
            Wszystkie przychody i koszty za {format(new Date(period.key.year, period.key.month - 1, 1), 'MMMM yyyy', { locale: pl })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {kpirLines.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Brak operacji</h3>
              <p className="text-muted-foreground">
                Nie znaleziono żadnych przychodów ani kosztów dla wybranego okresu
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {kpirLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{line.document_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {line.category}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {line.counterparty_name}
                    </div>
                    {line.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {line.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {line.revenue_amount > 0 && (
                      <div className="text-green-600 font-medium">
                        +{formatCurrency(line.revenue_amount, 'PLN')}
                      </div>
                    )}
                    {line.expense_amount > 0 && (
                      <div className="text-red-600 font-medium">
                        -{formatCurrency(line.expense_amount, 'PLN')}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(line.occurred_at), 'dd.MM.yyyy', { locale: pl })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
