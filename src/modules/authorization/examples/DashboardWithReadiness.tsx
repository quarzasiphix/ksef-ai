/**
 * Example: Dashboard with Company Readiness Score
 * 
 * This example shows how to integrate the CompanyReadinessScore widget
 * into your main dashboard alongside other metrics.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { CompanyReadinessScore } from '@/modules/authorization';
import { TrendingUp, DollarSign, FileText, Users } from 'lucide-react';

interface DashboardMetrics {
  revenue: number;
  expenses: number;
  invoices_count: number;
  customers_count: number;
}

export function DashboardWithReadinessExample() {
  const { data: metrics } = useQuery<DashboardMetrics>({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      // Your metrics fetch logic
      return {
        revenue: 125000,
        expenses: 45000,
        invoices_count: 23,
        customers_count: 15,
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Przegląd działalności i zgodności firmy
        </p>
      </div>

      {/* Top Row: Readiness Score + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Company Readiness Score - Takes 1 column */}
        <CompanyReadinessScore className="lg:col-span-1" />

        {/* Revenue Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przychody</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.revenue.toLocaleString('pl-PL')} PLN
            </div>
            <p className="text-xs text-muted-foreground">
              +12% vs poprzedni miesiąc
            </p>
          </CardContent>
        </Card>

        {/* Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wydatki</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.expenses.toLocaleString('pl-PL')} PLN
            </div>
            <p className="text-xs text-muted-foreground">
              +5% vs poprzedni miesiąc
            </p>
          </CardContent>
        </Card>

        {/* Invoices Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faktury</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.invoices_count}</div>
            <p className="text-xs text-muted-foreground">
              W tym miesiącu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Charts and other content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Przychody vs Wydatki</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your chart component */}
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Wykres przychodów i wydatków
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ostatnie faktury</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Your recent invoices list */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Lista ostatnich faktur...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Additional widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Klienci</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.customers_count}</div>
            <p className="text-sm text-muted-foreground">Aktywnych klientów</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zaległe płatności</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">3</div>
            <p className="text-sm text-muted-foreground">Faktury po terminie</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nadchodzące terminy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">5</div>
            <p className="text-sm text-muted-foreground">W tym tygodniu</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
