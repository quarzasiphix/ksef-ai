import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { FileText, TrendingUp, Calendar, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { listRyczaltAccounts, type RyczaltAccount } from '../data/ryczaltRepository';
import { supabase } from '@/integrations/supabase/client';

export default function PitPage() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [pitCalculations, setPitCalculations] = useState<any>(null);

  // Tax type based on profile
  const taxType = selectedProfile?.taxType || selectedProfile?.tax_type;
  const isLiniowy = taxType === 'liniowy';
  const isSkala = taxType === 'skala';
  const isRyczalt = taxType === 'ryczalt';

  useEffect(() => {
    if (selectedProfile?.id && isRyczalt) {
      loadPitData();
    }
  }, [selectedProfile?.id, isRyczalt]);

  const loadPitData = async () => {
    if (!selectedProfile?.id) return;
    
    setIsLoading(true);
    try {
      // Get ryczalt accounts
      const accountsData = await listRyczaltAccounts(selectedProfile.id);
      setAccounts(accountsData);

      // Get all register lines with invoice data including exchange rates
      const { data: registerLines } = await supabase
        .from('jdg_revenue_register_lines')
        .select(`
          *,
          invoices!inner(
            number,
            total_gross_value,
            currency,
            exchange_rate,
            customers!inner(name)
            sell_date
          )
        `)
        .eq('business_profile_id', selectedProfile.id)
        .order('occurred_at', { ascending: false });

      // Calculate PIT by account with currency conversion
      const calculations = await calculatePitByAccount(accountsData, registerLines || []);
      setPitCalculations(calculations);
    } catch (error) {
      console.error('Failed to load PIT data:', error);
      toast.error('Błąd podczas ładowania danych PIT');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePitByAccount = async (accounts: RyczaltAccount[], registerLines: any[]) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Group register lines by account
    const accountGroups = registerLines.reduce((groups, line) => {
      if (!line.ryczalt_account_id) return groups;
      
      if (!groups[line.ryczalt_account_id]) {
        groups[line.ryczalt_account_id] = {
          account: accounts.find(acc => acc.id === line.ryczalt_account_id),
          lines: []
        };
      }
      groups[line.ryczalt_account_id].lines.push(line);
      return groups;
    }, {} as Record<string, any>);

    // Calculate for each account
    const results = Object.values(accountGroups).map((group: any) => {
      const account = group.account;
      if (!account) return null;

      // Filter for current year
      const currentYearLines = group.lines.filter((line: any) => {
        const lineDate = new Date(line.occurred_at);
        return lineDate.getFullYear() === currentYear;
      });

      // Calculate total with currency conversion
      let totalPLN = 0;
      currentYearLines.forEach((line: any) => {
        const amount = parseFloat(line.tax_base_amount) || 0;
        const exchangeRate = line.invoices?.exchange_rate || 1;
        const currency = line.invoices?.currency || 'PLN';
        
        if (currency === 'PLN' || exchangeRate === 1) {
          totalPLN += amount;
        } else {
          totalPLN += amount * exchangeRate;
        }
      });

      const taxAmount = totalPLN * (account.category_rate / 100);
      
      return {
        accountId: account.id,
        accountName: account.account_name,
        accountNumber: account.account_number,
        categoryRate: account.category_rate,
        categoryName: account.category_name,
        totalRevenue: totalPLN,
        taxAmount: taxAmount,
        invoiceCount: currentYearLines.length,
        year: currentYear,
        deadlineDate: new Date(currentYear, 11, 20) // 20th December for yearly PIT
      };
    }).filter(Boolean);

    // Calculate totals
    const totals = results.reduce((acc, result) => ({
      totalRevenue: acc.totalRevenue + result.totalRevenue,
      totalTax: acc.totalTax + result.taxAmount,
      totalInvoices: acc.totalInvoices + result.invoiceCount
    }), { totalRevenue: 0, totalTax: 0, totalInvoices: 0 });

    return {
      byAccount: results,
      totals,
      year: currentYear,
      deadlineDate: new Date(currentYear, 11, 20)
    };
  };

  // Mock data for now - will be replaced with real data later
  const pitData = {
    currentYear: {
      year: 2024,
      income: 240000,
      costs: 48000,
      taxBase: 192000,
      taxDue: 34560,
      advancesPaid: 17280,
      remainingDue: 17280,
      quarterlyPayments: [
        { quarter: 'Q1', amount: 8640, paid: true, dueDate: '2024-04-20' },
        { quarter: 'Q2', amount: 8640, paid: true, dueDate: '2024-07-20' },
        { quarter: 'Q3', amount: 8640, paid: false, dueDate: '2024-10-20' },
        { quarter: 'Q4', amount: 8640, paid: false, dueDate: '2025-04-20' }
      ]
    },
    lastYear: {
      year: 2023,
      income: 180000,
      costs: 36000,
      taxBase: 144000,
      taxDue: 25920,
      advancesPaid: 25920,
      remainingDue: 0
    }
  };

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

  const getTaxRate = () => {
    if (isLiniowy) return 19;
    if (isSkala) {
      // Progressive tax rates for 2024
      const income = pitData.currentYear.income;
      if (income <= 30000) return 12;
      if (income <= 60000) return 12;
      if (income <= 120000) return 32;
      if (income <= 360000) return 32;
      if (income <= 600000) return 32;
      if (income <= 1000000) return 32;
      return 32;
    }
    return 19; // Default
  };

  const getTaxRateLabel = () => {
    if (isLiniowy) return '19%';
    if (isSkala) return 'Skala podatkowa';
    return '19%';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PIT</h1>
          <p className="text-muted-foreground">
            Podatek dochodowy od osób fizycznych dla {selectedProfile.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Złożenie PIT-37
          </Button>
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Oblicz podatek
          </Button>
        </div>
      </div>

      {/* Tax Type Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Forma opodatkowania
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isLiniowy && (
                <Badge variant="default">Liniowy {getTaxRateLabel()}</Badge>
              )}
              {isSkala && (
                <Badge variant="default">Skala podatkowa</Badge>
              )}
              {isRyczalt && (
                <Badge variant="default">Ryczałt</Badge>
              )}
              {!taxType && (
                <Badge variant="outline">Nie ustawiono</Badge>
              )}
            </div>
            <div className="text-sm text-muted-text-foreground">
              {isLiniowy && "Podatek liniowy 19% - stała stawka"}
              {isSkala && "Podatek progresywny - stawki skali podatkowej"}
              {isRyczalt && "Podatek ryczałtowy - zryczałtowane stawki"}
              {!taxType && "Nie ustawiono formy opodatkowania"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isRyczalt && pitCalculations ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Przychody ryczałt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(pitCalculations.totals.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pitCalculations.year} • {pitCalculations.totals.totalInvoices} faktur
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-red-600" />
                  Podatek ryczałtowy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(pitCalculations.totals.totalTax)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Suma z wszystkich kont
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Termin płatności
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {format(pitCalculations.deadlineDate, 'dd MMM', { locale: pl })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(pitCalculations.deadlineDate, 'MMMM yyyy', { locale: pl })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Liczba kont
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {pitCalculations.byAccount.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aktywne konta ryczałtowe
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Przychody
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(pitData.currentYear.income)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pitData.currentYear.year}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  Koszty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(pitData.currentYear.costs)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pitData.currentYear.year}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Podstawa opodatkowa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(pitData.currentYear.taxBase)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {pitData.currentYear.year}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Podatek do zapłaty
            </CardTitle>
          </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(pitData.currentYear.taxDue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {pitData.currentYear.year}
              </p>
            </CardContent>
          </Card>
          </>
        )}
      </div>

      {/* Ryczałt Account Breakdown */}
      {isRyczalt && pitCalculations && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Rozliczenie według kont ryczałtowych</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pitCalculations.byAccount.map((account: any) => (
              <Card key={account.accountId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{account.accountName}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {account.accountNumber}
                        </Badge>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {account.categoryName} ({account.categoryRate}%)
                        </Badge>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(account.totalRevenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {account.invoiceCount} faktur
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-muted-foreground">Podatek ({account.categoryRate}%):</div>
                        <div className="font-medium text-red-600">
                          {formatCurrency(account.taxAmount)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Waluta:</div>
                        <div className="font-medium">PLN</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quarterly Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Zaliczki PIT
          </CardTitle>
          <CardDescription>
            Terminy płatności zaliczek na podatek dochodowy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pitData.currentYear.quarterlyPayments.map((payment, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={payment.paid ? "default" : "secondary"}>
                      {payment.quarter}
                    </Badge>
                    {payment.paid && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{formatCurrency(payment.amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      Termin: {format(new Date(payment.dueDate), 'dd.MM.yyyy', { locale: pl })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={payment.paid ? "default" : "secondary"}>
                    {payment.paid ? "Zapłacone" : "Do zapłaty"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between font-medium">
              <span>Łącznie zapłacone:</span>
              <span className="text-green-600">
                {formatCurrency(pitData.currentYear.advancesPaid)}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Pozostało do zapłaty:</span>
              <span className="text-blue-600">
                {formatCurrency(pitData.currentYear.remainingDue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Year Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{pitData.currentYear.year} - Podsumowanie</CardTitle>
            <CardDescription>
              Obliczenia podatkowe za bieżący rok
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Przychody:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(pitData.currentYear.income)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Koszty:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(pitData.currentYear.costs)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Podstawa opodatkowa:</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(pitData.currentYear.taxBase)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Podatek {getTaxRateLabel()}:</span>
                  <span className="text-purple-600">
                    {formatCurrency(pitData.currentYear.taxDue)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{pitData.lastYear.year} - Porównanie</CardTitle>
            <CardDescription>
              Dane z poprzedniego roku dla porównania
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Przychody:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(pitData.lastYear.income)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Koszty:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(pitData.lastYear.costs)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Podstawa opodatkowa:</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(pitData.lastYear.taxBase)}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between font-medium">
                  <span>Podatek:</span>
                  <span className="text-purple-600">
                    {formatCurrency(pitData.lastYear.taxDue)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for future features */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Funkcje w rozwoju</h3>
          <p className="text-muted-foreground mb-4">
            Zaawansowane funkcje PIT będą dodane w przyszłości
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Automatyczne generowanie zeznań PIT-37</p>
            <p>• Integracja z systemem e-PIT</p>
            <p>• Analiza optymalizacji podatkowej</p>
            <p>• Przypomnienia o terminach płatności</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
