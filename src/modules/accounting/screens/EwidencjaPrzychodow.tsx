import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Receipt, AlertCircle, CheckCircle2, Calendar, Plus, History, CheckSquare, Square } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { PeriodStatusStrip } from '../components/PeriodStatusStrip';
import { RyczaltRateChip } from '../components/RyczaltRateChip';
import { listRyczaltAccounts, type RyczaltAccount } from '../data/ryczaltRepository';
import { useGlobalData } from '@/shared/hooks/use-global-data';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useQueryClient } from '@tanstack/react-query';

interface InvoiceWithAccounting {
  id: string;
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  total_gross_value: number;
  pln_gross_value: number;
  currency: string;
  exchange_rate: number;
  is_paid: boolean;
  ryczalt_account_id: string | null;
  accounting_status: 'unposted' | 'posted' | 'needs_review' | 'rejected';
  ryczalt_account?: {
    id: string;
    account_number: string;
    account_name: string;
    category_rate: number;
    category_name: string;
  };
}

interface RateGroup {
  rate: number;
  categoryName: string;
  accountNumber: string;
  totalRevenue: number;
  totalTax: number;
  items: InvoiceWithAccounting[];
}

export default function EwidencjaPrzychodow() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState(new Date());
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithAccounting | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAccountId, setBulkAccountId] = useState<string>('');
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Fetch invoices directly with ryczalt account data
  const [invoicesData, setInvoicesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedProfile?.id) return;
    loadData();
  }, [selectedProfile?.id, currentPeriod]);

  const loadData = async () => {
    if (!selectedProfile?.id) return;
    
    setIsLoading(true);
    try {
      const [accountsData, invoicesData] = await Promise.all([
        listRyczaltAccounts(selectedProfile.id),
        loadInvoices()
      ]);
      
      setAccounts(accountsData);
      setInvoicesData(invoicesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvoices = async () => {
    const periodStart = startOfMonth(currentPeriod);
    const periodEnd = endOfMonth(currentPeriod);

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        business_profiles ( id, name, user_id, tax_id, address, city, postal_code ),
        customers ( id, name, user_id, tax_id, address, city, postal_code ),
        invoice_items ( id, product_id, name, quantity, unit_price, vat_rate, unit, total_net_value, total_gross_value, total_vat_value, vat_exempt )
      `)
      .eq('business_profile_id', selectedProfile?.id)
      .eq('transaction_type', 'income')
      .gte('issue_date', periodStart.toISOString())
      .lte('issue_date', periodEnd.toISOString())
      .order('issue_date', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const handleAssignAccount = async () => {
    if (!selectedInvoice || !selectedAccountId) {
      toast.error('Wybierz konto ryczałtu');
      return;
    }

    setIsAssigning(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          ryczalt_account_id: selectedAccountId,
          accounting_status: 'posted'
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      toast.success('Konto ryczałtu zostało przypisane');
      setSelectedInvoice(null);
      setSelectedAccountId('');
      
      // Refresh data properly
      await loadData();
    } catch (error) {
      console.error('Error assigning account:', error);
      toast.error('Błąd podczas przypisywania konta');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAccountId || selectedInvoices.size === 0) {
      toast.error('Wybierz konto ryczałtu i faktury do przypisania');
      return;
    }

    setIsBulkAssigning(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          ryczalt_account_id: bulkAccountId,
          accounting_status: 'posted'
        })
        .in('id', Array.from(selectedInvoices));

      if (error) throw error;

      toast.success(`Przypisano ${selectedInvoices.size} faktur do konta ryczałtu`);
      setSelectedInvoices(new Set());
      setBulkAccountId('');
      setShowBulkAssignModal(false);
      
      // Refresh data properly
      await loadData();
    } catch (error) {
      console.error('Error bulk assigning accounts:', error);
      toast.error('Błąd podczas masowego przypisywania kont');
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    setSelectedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceId)) {
        newSet.delete(invoiceId);
      } else {
        newSet.add(invoiceId);
      }
      return newSet;
    });
  };

  const toggleAllInvoices = () => {
    if (selectedInvoices.size === unpostedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(unpostedInvoices.map(inv => inv.id)));
    }
  };

  // Enrich invoices with ryczalt account data
  const allInvoices = useMemo(() => {
    if (!invoicesData) return [];
    
    return invoicesData.map(invoice => {
      const ryczaltAccount = accounts.find(acc => acc.id === invoice.ryczalt_account_id);
      
      // Calculate PLN value considering exchange rate
      const exchangeRate = invoice.exchange_rate || 1;
      const plnGrossValue = invoice.currency === 'PLN' 
        ? (invoice.total_gross_value || 0)
        : (invoice.total_gross_value || 0) * exchangeRate;

      return {
        id: invoice.id,
        invoice_number: invoice.number,
        issue_date: invoice.issue_date,
        customer_name: invoice.customers?.name || '',
        total_gross_value: invoice.total_gross_value || 0,
        pln_gross_value: plnGrossValue,
        currency: invoice.currency || 'PLN',
        exchange_rate: exchangeRate,
        is_paid: invoice.is_paid || false,
        ryczalt_account_id: invoice.ryczalt_account_id,
        accounting_status: (invoice.accounting_status as 'unposted' | 'posted' | 'needs_review' | 'rejected') || 'unposted',
        ryczalt_account: ryczaltAccount ? {
          id: ryczaltAccount.id,
          account_number: ryczaltAccount.account_number,
          account_name: ryczaltAccount.account_name,
          category_rate: ryczaltAccount.category_rate || 0,
          category_name: ryczaltAccount.category_name || ''
        } : undefined
      };
    });
  }, [invoicesData, accounts]);

  const unpostedInvoices = useMemo(() => {
    return allInvoices.filter(inv => !inv.ryczalt_account_id);
  }, [allInvoices]);

  const postedInvoices = useMemo(() => {
    return allInvoices.filter(inv => inv.ryczalt_account_id);
  }, [allInvoices]);

  const rateGroups = useMemo(() => {
    const groups = new Map<string, RateGroup>();

    postedInvoices.forEach(invoice => {
      if (!invoice.ryczalt_account) return;

      const key = `${invoice.ryczalt_account.category_rate}-${invoice.ryczalt_account.category_name}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          rate: invoice.ryczalt_account.category_rate,
          categoryName: invoice.ryczalt_account.category_name,
          accountNumber: invoice.ryczalt_account.account_number,
          totalRevenue: 0,
          totalTax: 0,
          items: []
        });
      }

      const group = groups.get(key)!;
      group.items.push(invoice);
      group.totalRevenue += invoice.pln_gross_value;
      group.totalTax += invoice.pln_gross_value * (invoice.ryczalt_account.category_rate / 100);
    });

    return Array.from(groups.values()).sort((a, b) => b.rate - a.rate);
  }, [postedInvoices]);

  const periodTotals = useMemo(() => {
    const totalRevenue = postedInvoices.reduce((sum, inv) => sum + inv.pln_gross_value, 0);
    const totalTax = postedInvoices.reduce((sum, inv) => {
      if (!inv.ryczalt_account) return sum;
      return sum + (inv.pln_gross_value * inv.ryczalt_account.category_rate / 100);
    }, 0);
    return { totalRevenue, totalTax };
  }, [postedInvoices]);

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
    if (postedInvoices.length === 0) return 'pending';
    return 'ready';
  }, [unpostedInvoices, postedInvoices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Ładowanie ewidencji...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ewidencja przychodów (Ryczałt)</h1>
          <p className="text-muted-foreground mt-1">
            Okres: {format(currentPeriod, 'LLLL yyyy', { locale: pl })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCorrectionModal(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Poprawki
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/accounting/ryczalt-accounts'}>
            <Receipt className="h-4 w-4 mr-2" />
            Zarządzaj kontami
          </Button>
          <PeriodSwitcher
            currentPeriod={currentPeriod}
            onPeriodChange={setCurrentPeriod}
            availableYears={availableYears}
          />
        </div>
      </div>

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
              {postedInvoices.length} / {allInvoices.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">zaksięgowane / wszystkie</p>
          </CardContent>
        </Card>
      </div>

      {unpostedInvoices.length > 0 && (
        <Card className="border-orange-800 bg-orange-950/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-orange-400" />
                <div>
                  <CardTitle>Do zaksięgowania</CardTitle>
                  <CardDescription>
                    {unpostedInvoices.length} {unpostedInvoices.length === 1 ? 'dokument wymaga' : 'dokumentów wymaga'} przypisania konta ryczałtu
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAllInvoices}
                  className="flex items-center gap-2"
                >
                  {selectedInvoices.size === unpostedInvoices.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  {selectedInvoices.size === unpostedInvoices.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
                </Button>
                {selectedInvoices.size > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setShowBulkAssignModal(true)}
                    className="flex items-center gap-2"
                  >
                    Zaksięguj wszystkie ({selectedInvoices.size})
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unpostedInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleInvoiceSelection(invoice.id)}
                      className="flex-shrink-0"
                    >
                      {selectedInvoices.has(invoice.id) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="font-medium">{invoice.invoice_number}</div>
                      <div className="text-sm text-muted-foreground">{invoice.customer_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Data wystawienia: {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-semibold">
                        {formatCurrency(invoice.total_gross_value, invoice.currency)}
                        {invoice.currency !== 'PLN' && (
                          <span className="text-sm text-muted-foreground ml-2">
                            ≈ {formatCurrency(invoice.pln_gross_value, 'PLN')}
                          </span>
                        )}
                      </div>
                      {invoice.is_paid ? (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-400 mt-1">Zapłacona</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs mt-1">Niezapłacona</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setSelectedAccountId('');
                      }}
                      className="ml-2"
                    >
                      Przypisz konto
                    </Button>
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
                  Faktury przypisane do kont ryczałtu
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {postedInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Brak zaksięgowanych faktur w tym okresie
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
                    {group.items.map(invoice => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <div className="font-medium">{invoice.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">{invoice.customer_name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(invoice.total_gross_value, invoice.currency)}
                            {invoice.currency !== 'PLN' && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ≈ {formatCurrency(invoice.pln_gross_value, 'PLN')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            → {formatCurrency(invoice.pln_gross_value * (invoice.ryczalt_account!.category_rate / 100), 'PLN')}
                          </div>
                          <div className="mt-1">
                            {invoice.is_paid ? (
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

      {/* Assignment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Przypisz konto ryczałtu</CardTitle>
              <CardDescription>
                Faktura: {selectedInvoice.invoice_number} • {formatCurrency(selectedInvoice.total_gross_value, selectedInvoice.currency)}
                {selectedInvoice.currency !== 'PLN' && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ≈ {formatCurrency(selectedInvoice.pln_gross_value, 'PLN')}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Kontrahent</label>
                <div className="text-sm text-muted-foreground">{selectedInvoice.customer_name}</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data wystawienia</label>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(selectedInvoice.issue_date), 'dd MMMM yyyy', { locale: pl })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Wybierz konto ryczałtu</label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz konto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.account_number}</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{account.account_name}</span>
                          <RyczaltRateChip rate={account.category_rate || 0} categoryName={account.category_name || ''} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAccountId && (
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <div className="text-sm font-medium">Podsumowanie</div>
                  <div className="text-sm text-muted-foreground">
                    Przychód: {formatCurrency(selectedInvoice.pln_gross_value, 'PLN')}
                    {selectedInvoice.currency !== 'PLN' && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({formatCurrency(selectedInvoice.total_gross_value, selectedInvoice.currency)})
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Podatek: {formatCurrency(selectedInvoice.pln_gross_value * ((accounts.find(a => a.id === selectedAccountId)?.category_rate || 0) / 100), 'PLN')}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedInvoice(null);
                    setSelectedAccountId('');
                  }}
                  disabled={isAssigning}
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleAssignAccount}
                  disabled={!selectedAccountId || isAssigning}
                >
                  {isAssigning ? 'Przypisywanie...' : 'Przypisz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Assignment Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Przypisz konto ryczałtu (masowe)</CardTitle>
              <CardDescription>
                {selectedInvoices.size} {selectedInvoices.size === 1 ? 'faktura' : selectedInvoices.size <= 4 ? 'faktury' : 'faktur'} do przypisania
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Wybrane faktury:</label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {Array.from(selectedInvoices).map(invoiceId => {
                    const invoice = unpostedInvoices.find(inv => inv.id === invoiceId);
                    return invoice ? (
                      <div key={invoice.id} className="text-sm text-muted-foreground flex justify-between items-center">
                        <span>{invoice.invoice_number}</span>
                        <div className="text-right">
                          <div>{formatCurrency(invoice.total_gross_value, invoice.currency)}</div>
                          {invoice.currency !== 'PLN' && (
                            <div className="text-xs">≈ {formatCurrency(invoice.pln_gross_value, 'PLN')}</div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Suma:</div>
                <div className="text-sm text-muted-foreground">
                  {Array.from(selectedInvoices).reduce((sum, invoiceId) => {
                    const invoice = unpostedInvoices.find(inv => inv.id === invoiceId);
                    return sum + (invoice?.total_gross_value || 0);
                  }, 0)} PLN
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Wybierz konto ryczałtu</label>
                <Select value={bulkAccountId} onValueChange={setBulkAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz konto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <span>{account.account_number}</span>
                          <span className="text-muted-foreground">•</span>
                          <span>{account.account_name}</span>
                          <RyczaltRateChip rate={account.category_rate || 0} categoryName={account.category_name || ''} />
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bulkAccountId && (
                <div className="bg-muted p-3 rounded-lg space-y-1">
                  <div className="text-sm font-medium">Podsumowanie</div>
                  <div className="text-sm text-muted-foreground">
                    Przychód: {formatCurrency(
                      Array.from(selectedInvoices).reduce((sum, invoiceId) => {
                        const invoice = unpostedInvoices.find(inv => inv.id === invoiceId);
                        return sum + (invoice?.pln_gross_value || 0);
                      }, 0), 'PLN'
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Podatek: {formatCurrency(
                      Array.from(selectedInvoices).reduce((sum, invoiceId) => {
                        const invoice = unpostedInvoices.find(inv => inv.id === invoiceId);
                        return sum + (invoice?.pln_gross_value || 0);
                      }, 0) * ((accounts.find(a => a.id === bulkAccountId)?.category_rate || 0) / 100), 'PLN'
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowBulkAssignModal(false);
                    setBulkAccountId('');
                  }}
                  disabled={isBulkAssigning}
                >
                  Anuluj
                </Button>
                <Button 
                  onClick={handleBulkAssign}
                  disabled={!bulkAccountId || isBulkAssigning}
                >
                  {isBulkAssigning ? 'Przypisywanie...' : `Przypisz ${selectedInvoices.size} ${selectedInvoices.size === 1 ? 'fakturę' : selectedInvoices.size <= 4 ? 'faktury' : 'faktur'}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Poprawki dla poprzednich okresów
              </CardTitle>
              <CardDescription>
                Dodaj brakujące faktury lub skoryguj zaksięgowanie dla okresu {format(currentPeriod, 'LLLL yyyy', { locale: pl })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  <span className="text-sm">Dodaj brakującą fakturę</span>
                  <span className="text-xs text-muted-foreground">Wprowadź nową fakturę dla tego okresu</span>
                </Button>
                
                <Button variant="outline" className="h-20 flex-col gap-2">
                  <Receipt className="h-6 w-6" />
                  <span className="text-sm">Przypisz konto ryczałtu</span>
                  <span className="text-xs text-muted-foreground">Połącz fakturę z odpowiednim kontem</span>
                </Button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Typy poprawek:</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>• <strong>Dodanie faktury:</strong> Wprowadź fakturę, która nie została dodana do systemu</div>
                  <div>• <strong>Korekta zaksięgowania:</strong> Zmień przypisanie konta ryczałtu dla istniejącej faktury</div>
                  <div>• <strong>Poprawa danych:</strong> Zaktualizuj kwoty, daty lub dane kontrahenta</div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCorrectionModal(false)}>
                  Anuluj
                </Button>
                <Button onClick={() => {
                  toast.info('Funkcja poprawek zostanie wkrótce dodana');
                  setShowCorrectionModal(false);
                }}>
                  Kontynuuj
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
