import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Receipt, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { PeriodStatusStrip } from '../components/PeriodStatusStrip';
import { RyczaltRateChip } from '../components/RyczaltRateChip';
import { listRyczaltAccounts, type RyczaltAccount } from '../data/ryczaltRepository';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  total_gross_value: number;
  currency: string;
  is_paid: boolean;
  ryczalt_account_id: string | null;
  accounting_status: 'unposted' | 'booked' | 'reconciled';
}

interface RegisterLine {
  id: string;
  invoice_id: string;
  register_number: string;
  register_date: string;
  invoice_number: string;
  customer_name: string;
  amount: number;
  category_name: string;
  category_rate: number;
  account_number: string;
  is_paid: boolean;
}

interface RateGroup {
  rate: number;
  categoryName: string;
  accountNumber: string;
  totalRevenue: number;
  totalTax: number;
  items: RegisterLine[];
}

export default function EwidencjaPrzychodowWorkbench() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(new Date());
  const [unpostedInvoices, setUnpostedInvoices] = useState<Invoice[]>([]);
  const [postedLines, setPostedLines] = useState<RegisterLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProfile?.id) return;
    loadData();
  }, [selectedProfile?.id, currentPeriod]);

  const loadData = async () => {
    if (!selectedProfile?.id) return;
    
    setIsLoading(true);
    try {
      const periodStart = startOfMonth(currentPeriod);
      const periodEnd = endOfMonth(currentPeriod);

      const [accountsData, invoicesData, registerData] = await Promise.all([
        listRyczaltAccounts(selectedProfile.id),
        getUnpostedInvoices(selectedProfile.id, periodStart, periodEnd),
        getPostedRegisterLines(selectedProfile.id, periodStart, periodEnd)
      ]);
      
      setAccounts(accountsData);
      setUnpostedInvoices(invoicesData);
      setPostedLines(registerData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setIsLoading(false);
    }
  };

  const getUnpostedInvoices = async (
    businessProfileId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('business_profile_id', businessProfileId)
      .eq('type', 'income')
      .gte('issue_date', periodStart.toISOString())
      .lte('issue_date', periodEnd.toISOString())
      .is('ryczalt_account_id', null)
      .order('issue_date', { ascending: false });

    if (error) {
      console.error('Error fetching unposted invoices:', error);
      return [];
    }

    return (data || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      issue_date: inv.issue_date,
      customer_name: inv.customer_name,
      total_gross_value: parseFloat(inv.total_gross_value) || 0,
      currency: inv.currency || 'PLN',
      is_paid: inv.is_paid || false,
      ryczalt_account_id: inv.ryczalt_account_id,
      accounting_status: inv.accounting_status || 'unposted'
    }));
  };

  const getPostedRegisterLines = async (
    businessProfileId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<RegisterLine[]> => {
    const { data, error } = await supabase
      .from('jdg_revenue_register_lines')
      .select('*')
      .eq('business_profile_id', businessProfileId)
      .gte('occurred_at', periodStart.toISOString())
      .lte('occurred_at', periodEnd.toISOString())
      .order('occurred_at', { ascending: false });

    if (error) {
      console.error('Error fetching register lines:', error);
      return [];
    }

    return (data || []).map((line: any) => ({
      id: line.id,
      invoice_id: line.invoice_id,
      register_number: line.document_number,
      register_date: line.occurred_at,
      invoice_number: line.document_number,
      customer_name: line.counterparty_name,
      amount: parseFloat(line.tax_base_amount) || 0,
      category_name: line.category_name || 'Nieznane',
      category_rate: parseFloat(line.ryczalt_rate) || 0,
      account_number: line.ryczalt_account_number || '',
      is_paid: line.is_paid || false
    }));
  };

  const rateGroups = useMemo(() => {
    const groups = new Map<string, RateGroup>();

    postedLines.forEach(line => {
      const key = `${line.category_rate}-${line.category_name}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          rate: line.category_rate,
          categoryName: line.category_name,
          accountNumber: line.account_number,
          totalRevenue: 0,
          totalTax: 0,
          items: []
        });
      }

      const group = groups.get(key)!;
      group.items.push(line);
      group.totalRevenue += line.amount;
      group.totalTax += line.amount * (line.category_rate / 100);
    });

    return Array.from(groups.values()).sort((a, b) => b.rate - a.rate);
  }, [postedLines]);

  const periodTotals = useMemo(() => {
    const totalRevenue = postedLines.reduce((sum, line) => sum + line.amount, 0);
    const totalTax = postedLines.reduce((sum, line) => sum + (line.amount * line.category_rate / 100), 0);
    return { totalRevenue, totalTax };
  }, [postedLines]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    years.add(currentYear - 1);
    years.add(currentYear + 1);
    return Array.from(years).sort((a, b) => b - a);
  }, []);

  const taxDeadline = new Date(
    currentPeriod.getFullYear(),
    currentPeriod.getMonth() + 1,
    20
  );

  const periodStatus = useMemo(() => {
    if (unpostedInvoices.length > 0) return 'pending';
    if (postedLines.length === 0) return 'pending';
    return 'ready';
  }, [unpostedInvoices, postedLines]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Ładowanie ewidencji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ewidencja przychodów (Ryczałt)</h1>
          <p className="text-muted-foreground mt-1">
            Okres: {format(currentPeriod, 'LLLL yyyy', { locale: pl })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/accounting/ryczalt-accounts'}>
            <Receipt className="h-4 w-4 mr-2" />
            Zarządzaj kontami
          </Button>
        </div>
      </div>

      <PeriodSwitcher
        currentPeriod={currentPeriod}
        onPeriodChange={setCurrentPeriod}
        availableYears={availableYears}
      />

      <PeriodStatusStrip
        status={periodStatus}
        deadline={taxDeadline}
        issueCount={unpostedInvoices.length}
        onFixIssues={() => {}}
        onClosePeriod={() => {}}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Przychód</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(periodTotals.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Podatek ryczałt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(periodTotals.totalTax)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dokumenty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {postedLines.length} / {postedLines.length + unpostedInvoices.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">zaksięgowane / wszystkie</p>
          </CardContent>
        </Card>
      </div>

      {unpostedInvoices.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <div>
                  <CardTitle>Do zaksięgowania</CardTitle>
                  <CardDescription>
                    {unpostedInvoices.length} {unpostedInvoices.length === 1 ? 'dokument wymaga' : 'dokumentów wymaga'} przypisania konta ryczałtu
                  </CardDescription>
                </div>
              </div>
              <Button size="sm">Przypisz konta</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpostedInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium">{invoice.invoice_number}</div>
                    <div className="text-sm text-muted-foreground">{invoice.customer_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Data wystawienia: {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-semibold">{formatCurrency(invoice.total_gross_value)}</div>
                      {invoice.is_paid ? (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-700 mt-1">Zapłacona</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs mt-1">Niezapłacona</Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm">Przypisz</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <CardTitle>Zaksięgowane</CardTitle>
                <CardDescription>
                  Przychody zaksięgowane w ewidencji dla tego okresu
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {postedLines.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Brak zaksięgowanych przychodów w tym okresie
            </div>
          ) : (
            <div className="space-y-6">
              {rateGroups.map((group, index) => (
                <div key={index} className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-3">
                      <RyczaltRateChip rate={group.rate} categoryName={group.categoryName} showName />
                      <span className="text-sm text-muted-foreground">({group.accountNumber})</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatCurrency(group.totalRevenue)} → {formatCurrency(group.totalTax)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? 'dokument' : 'dokumentów'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pl-4">
                    {group.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium">{item.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">{item.customer_name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(item.register_date), 'dd MMM yyyy', { locale: pl })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(item.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            → {formatCurrency(item.amount * (item.category_rate / 100))}
                          </div>
                          <div className="mt-1">
                            {item.is_paid ? (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-700">Zapłacona</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Niezapłacona</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
