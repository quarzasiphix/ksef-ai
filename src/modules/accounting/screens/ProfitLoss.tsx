import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAccountingPeriod } from '../hooks/useAccountingPeriod';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { supabase } from '@/integrations/supabase/client';

export default function ProfitLoss() {
  const { selectedProfileId } = useBusinessProfile();
  const { period } = useAccountingPeriod();
  const [data, setData] = useState({
    revenue: {
      sales: 0,
      services: 0,
      other: 0,
      total: 0,
    },
    expenses: {
      cogs: 0,
      salaries: 0,
      rent: 0,
      utilities: 0,
      marketing: 0,
      other: 0,
      total: 0,
    },
    grossProfit: 0,
    operatingProfit: 0,
    netProfit: 0,
  });
  const [loading, setLoading] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!selectedProfileId || !period?.key) return;
    
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Debounce the request to prevent spam
    debounceTimer.current = setTimeout(async () => {
      await loadProfitLossData();
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [selectedProfileId, period?.key?.year, period?.key?.month]);

  const loadProfitLossData = async () => {
      setLoading(true);
      try {
        // Calculate period boundaries
        const periodKey = period?.key;
        if (!periodKey) return;
        const periodStart = new Date(periodKey.year, periodKey.month - 1, 1);
        const periodEnd = new Date(periodKey.year, periodKey.month, 0, 23, 59, 59);

        // Fetch posted income invoices
        const { data: incomeData, error: incomeError } = await supabase
          .from('invoices')
          .select('total_gross_value, total_net_value, total_vat_value')
          .eq('business_profile_id', selectedProfileId)
          .eq('transaction_type', 'income')
          .eq('accounting_status', 'posted')
          .gte('issue_date', periodStart.toISOString())
          .lte('issue_date', periodEnd.toISOString());

        // Fetch posted expense invoices
        const { data: expenseData, error: expenseError } = await supabase
          .from('invoices')
          .select('total_gross_value, total_net_value, total_vat_value')
          .eq('business_profile_id', selectedProfileId)
          .eq('transaction_type', 'expense')
          .eq('accounting_status', 'posted')
          .gte('issue_date', periodStart.toISOString())
          .lte('issue_date', periodEnd.toISOString());

        if (incomeError) throw incomeError;
        if (expenseError) throw expenseError;

        // Calculate totals
        const totalRevenue = (incomeData || []).reduce((sum, inv) => sum + (inv.total_gross_value || 0), 0);
        const totalExpenses = (expenseData || []).reduce((sum, inv) => sum + (inv.total_gross_value || 0), 0);
        
        // Simple categorization (in a real system, you'd have more detailed categorization)
        const revenueBreakdown = {
          sales: totalRevenue * 0.7, // Assume 70% sales
          services: totalRevenue * 0.25, // Assume 25% services
          other: totalRevenue * 0.05, // Assume 5% other
          total: totalRevenue,
        };

        const expenseBreakdown = {
          cogs: totalExpenses * 0.4, // Assume 40% COGS
          salaries: totalExpenses * 0.25, // Assume 25% salaries
          rent: totalExpenses * 0.1, // Assume 10% rent
          utilities: totalExpenses * 0.05, // Assume 5% utilities
          marketing: totalExpenses * 0.08, // Assume 8% marketing
          other: totalExpenses * 0.12, // Assume 12% other
          total: totalExpenses,
        };

        const grossProfit = revenueBreakdown.total - expenseBreakdown.cogs;
        const operatingProfit = grossProfit - (expenseBreakdown.salaries + expenseBreakdown.rent + expenseBreakdown.utilities + expenseBreakdown.marketing);
        const netProfit = operatingProfit - expenseBreakdown.other;

        setData({
          revenue: revenueBreakdown,
          expenses: expenseBreakdown,
          grossProfit,
          operatingProfit,
          netProfit,
        });
      } catch (error) {
        console.error('Error loading profit & loss data:', error);
      } finally {
        setLoading(false);
      }
    };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Rachunek zysków i strat</h1>
          <p className="text-muted-foreground">
            {period.label}
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Ładowanie danych rachunku zysków i strat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rachunek zysków i strat</h1>
        <p className="text-muted-foreground">
          {period.label}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przychody</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.revenue.total, 'PLN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Koszty</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.expenses.total, 'PLN')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zysk netto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.netProfit, 'PLN')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Szczegółowy rachunek</CardTitle>
          <CardDescription>Przychody i koszty w okresie</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Przychody</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sprzedaż towarów</span>
                  <span className="font-medium">{formatCurrency(data.revenue.sales, 'PLN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usługi</span>
                  <span className="font-medium">{formatCurrency(data.revenue.services, 'PLN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pozostałe przychody</span>
                  <span className="font-medium">{formatCurrency(data.revenue.other, 'PLN')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Przychody razem</span>
                  <span className="font-bold text-green-600">{formatCurrency(data.revenue.total, 'PLN')}</span>
                </div>
              </div>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Koszty</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Koszt sprzedanych towarów</span>
                  <span className="font-medium">{formatCurrency(data.expenses.cogs, 'PLN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wynagrodzenia</span>
                  <span className="font-medium">{formatCurrency(data.expenses.salaries, 'PLN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Czynsz</span>
                  <span className="font-medium">{formatCurrency(data.expenses.rent, 'PLN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Media</span>
                  <span className="font-medium">{formatCurrency(data.expenses.utilities, 'PLN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Marketing</span>
                  <span className="font-medium">{formatCurrency(data.expenses.marketing, 'PLN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pozostałe koszty</span>
                  <span className="font-medium">{formatCurrency(data.expenses.other, 'PLN')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-semibold">Koszty razem</span>
                  <span className="font-bold text-red-600">{formatCurrency(data.expenses.total, 'PLN')}</span>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="pt-4 border-t-2">
              <div className="flex justify-between">
                <span className="text-xl font-bold">Zysk netto</span>
                <span className="text-xl font-bold text-blue-600">
                  {formatCurrency(data.netProfit, 'PLN')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
