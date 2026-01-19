import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import {
  TrendingUp,
  FileText,
  Users,
  Package,
  Plus,
  Receipt,
  ArrowRight,
  Wallet,
  PieChart,
  Target,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Zap,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { BusinessProfile } from '@/shared/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface JDGDashboardProps {
  profile: BusinessProfile;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  taxEstimate: number | string;
  unpaidInvoices: number;
  totalInvoices: number;
  isPremium: boolean;
  monthlySummaries: any[];
  isMobile: boolean;
}

const JDGDashboard: React.FC<JDGDashboardProps> = ({
  profile,
  totalRevenue,
  totalExpenses,
  netProfit,
  taxEstimate,
  unpaidInvoices,
  totalInvoices,
  isPremium,
  monthlySummaries,
  isMobile,
}) => {
  // VAT exemption tracking
  const vatThreshold = 200000;
  const vatProgress = profile.is_vat_exempt ? (totalRevenue / vatThreshold) * 100 : 0;
  const vatRemaining = vatThreshold - totalRevenue;

  return (
    <div className="space-y-5 w-full max-w-full overflow-x-hidden">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        <Link to="/income/new">
          <Card className="hover:shadow-xl transition-all cursor-pointer border-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base">Nowa Faktura</h3>
                  <p className="text-xs text-blue-100">Wystaw fakturę sprzedaży</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/expense/new">
          <Card className="hover:shadow-xl transition-all cursor-pointer border-0 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base">Nowy Wydatek</h3>
                  <p className="text-xs text-green-100">Dodaj koszt działalności</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Przychody</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Wydatki</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <PieChart className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Zysk netto</p>
            </div>
            <p className={cn('text-2xl font-bold', netProfit >= 0 ? 'text-blue-600' : 'text-red-600')}>
              {formatCurrency(netProfit)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Szacowany podatek</p>
            </div>
            <p className="text-xl font-bold text-amber-600">
              {typeof taxEstimate === 'number' ? formatCurrency(taxEstimate) : 'Do obliczenia'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* VAT Exemption Tracker (if applicable) */}
      {profile.is_vat_exempt && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              Zwolnienie z VAT (art. 113)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Wykorzystanie limitu 200 000 zł</span>
                  <span className="text-sm font-bold text-purple-600">{vatProgress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all rounded-full',
                      vatProgress < 70 ? 'bg-green-500' : vatProgress < 90 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min(vatProgress, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Przychód roczny</p>
                  <p className="font-bold text-lg">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Do limitu pozostało</p>
                  <p className="font-bold text-lg">{formatCurrency(Math.max(0, vatRemaining))}</p>
                </div>
              </div>
              {vatProgress >= 90 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Zbliżasz się do limitu!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Przygotuj się do rejestracji jako płatnik VAT
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Revenue Chart */}
      <Card className="border-0 w-full overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Miesięczne przychody
          </CardTitle>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto">
          <div className="h-56 min-w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySummaries}
                margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
              >
                <XAxis
                  dataKey="monthLabel"
                  fontSize={11}
                  tickMargin={5}
                  stroke="#888"
                />
                <YAxis
                  fontSize={11}
                  width={50}
                  tickFormatter={(value) => value.toLocaleString('pl-PL', { notation: 'compact' })}
                  stroke="#888"
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  labelFormatter={(label) => `Miesiąc: ${label}`}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="totalGrossValue" name="Brutto" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Status */}
      <Card className="border-0 w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Status faktur
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">{totalInvoices}</span>
              </div>
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Wszystkie faktury</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="text-2xl font-bold text-amber-600">{unpaidInvoices}</span>
              </div>
              <p className="text-xs font-medium text-amber-900 dark:text-amber-300">Niezapłacone</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-green-600">{totalInvoices - unpaidInvoices}</span>
              </div>
              <p className="text-xs font-medium text-green-900 dark:text-green-300">Opłacone</p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full mt-4" size="sm">
            <Link to="/income">
              Zobacz wszystkie faktury <ArrowRight className="h-3 w-3 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Management Links - Removed to save space */}
    </div>
  );
};

export default JDGDashboard;
