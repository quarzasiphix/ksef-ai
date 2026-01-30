import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useAccountingPeriod } from '../hooks/useAccountingPeriod';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';

export default function ProfitLoss() {
  const { selectedProfileId } = useBusinessProfile();
  const { period } = useAccountingPeriod();

  // Mock data - replace with actual data fetching
  const [data] = useState({
    revenue: {
      sales: 150000,
      services: 75000,
      other: 5000,
      total: 230000,
    },
    expenses: {
      cogs: 80000,
      salaries: 45000,
      rent: 12000,
      utilities: 3000,
      marketing: 8000,
      other: 7000,
      total: 155000,
    },
    grossProfit: 150000,
    operatingProfit: 75000,
    netProfit: 75000,
  });

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
