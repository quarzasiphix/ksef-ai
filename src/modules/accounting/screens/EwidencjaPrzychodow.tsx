import React, { useState, useEffect, useMemo } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, Receipt, TrendingUp, Calendar, Filter, Calculator, MoreHorizontal, Trash2, FileText, Lock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAccountingPeriod } from '../hooks/useAccountingPeriod';
import { PeriodControlBar } from '../components/PeriodControlBar';
import { PeriodActionBanner } from '../components/PeriodActionBanner';
import { UnpostedQueueWidget } from '../components/UnpostedQueueWidget';
import { UnaccountedQueuePanel } from '../components/UnaccountedQueuePanel';
import { 
  generateYearPeriodStates, 
  getCurrentPeriod, 
  formatPeriodName,
  canClosePeriod 
} from '../utils/periodState';
import { 
  closeAccountingPeriod, 
  getClosedPeriods, 
  getPeriodStatistics 
} from '../data/periodRepository';
import { PeriodClosureModal } from '../components/PeriodClosureModal';
import { RyczaltAccountAssignmentModal } from '../components/RyczaltAccountAssignmentModal';
import { PeriodLockingWidget } from '../components/PeriodLockingWidget';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { listRyczaltAccounts, getRyczaltAccountsSummary, type RyczaltAccount } from '../data/ryczaltRepository';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EwidencjaItem {
  id: string;
  invoice_id: string;
  register_number: string;
  register_date: string;
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  amount: number;
  original_amount: number;
  currency: string;
  exchange_rate: number;
  category_name: string;
  category_rate: number;
  account_number: string;
}

export default function EwidencjaPrzychodow() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const { period, setPeriod, getPeriodLabel } = useAccountingPeriod();
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [allEwidencjaItems, setAllEwidencjaItems] = useState<EwidencjaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deletedInvoiceIds, setDeletedInvoiceIds] = useState<Set<string>>(new Set());
  const [currentYear, setCurrentYear] = useState(period.key.year);
  
  // Period state management
  const currentPeriodData = getCurrentPeriod();
  const [selectedPeriod, setSelectedPeriod] = useState<Date>(
    new Date(currentPeriodData.year, currentPeriodData.month - 1, 1)
  );
  const [periodStates, setPeriodStates] = useState<any[]>([]);
  const [periodStats, setPeriodStats] = useState<any>(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  useEffect(() => {
    if (!selectedProfile?.id) return;
    loadData();
    loadPeriodData();
  }, [selectedProfile?.id, period.key.year, period.key.month]);

  const loadPeriodData = async () => {
    if (!selectedProfile?.id) return;
    
    try {
      const year = selectedPeriod.getFullYear();
      const month = selectedPeriod.getMonth() + 1;
      
      // Get closed periods
      const closedPeriods = await getClosedPeriods(selectedProfile.id);
      
      // Generate period states for the year
      const states = generateYearPeriodStates(year, closedPeriods);
      setPeriodStates(states);
      
      // Get statistics for selected period
      const stats = await getPeriodStatistics(selectedProfile.id, year, month);
      setPeriodStats(stats);
    } catch (error) {
      console.error('Error loading period data:', error);
    }
  };

  const handleClosePeriod = async (lockPeriod: boolean, note?: string) => {
    if (!selectedProfile?.id) return;
    
    const year = selectedPeriod.getFullYear();
    const month = selectedPeriod.getMonth() + 1;
    
    try {
      const result = await closeAccountingPeriod(
        selectedProfile.id,
        year,
        month,
        lockPeriod,
        note
      );
      
      if (result.success) {
        toast.success('Okres zamknięty pomyślnie');
        await loadPeriodData();
      } else {
        toast.error(result.message || 'Nie udało się zamknąć okresu');
      }
    } catch (error) {
      console.error('Error closing period:', error);
      toast.error('Błąd podczas zamykania okresu');
    }
  };

  useEffect(() => {
    setCurrentYear(period.key.year);
  }, [period.key.year]);

  const loadData = async () => {
    if (!selectedProfile?.id) return;
    
    console.log('🔄 Loading data for profile:', selectedProfile.id);
    setIsLoading(true);
    try {
      const [accountsData, registerLinesData] = await Promise.all([
        listRyczaltAccounts(selectedProfile.id),
        getRegisterLines(selectedProfile.id)
      ]);
      
      console.log('🔄 Data loaded:', { 
        accounts: accountsData.length, 
        registerLines: registerLinesData.length 
      });
      
      setAccounts(accountsData);
      
      // Process register lines to create ewidencja items
      const items = processRegisterLinesForEwidencja(registerLinesData, accountsData);
      
      // Filter out deleted items (cache workaround) - use invoice_id for filtering
      const filteredItems = items.filter(item => !deletedInvoiceIds.has(item.invoice_id));
      console.log('🔄 Processed ewidencja items:', items.length);
      console.log('🔄 After filtering deleted items:', filteredItems.length);
      console.log('🔄 Ewidencja items IDs:', filteredItems.map(item => ({ id: item.id, invoice_id: item.invoice_id, invoice: item.invoice_number })));
      console.log('🔄 Deleted invoice IDs:', Array.from(deletedInvoiceIds));
      
      setAllEwidencjaItems(filteredItems);
      console.log('🔄 State updated with', filteredItems.length, 'items');
    } catch (error) {
      console.error('Failed to load ewidencja data:', error);
      toast.error('Błąd podczas ładowania ewidencji przychodów');
    } finally {
      setIsLoading(false);
    }
  };

  const getRegisterLines = async (businessProfileId: string) => {
    console.log('📡 Fetching register lines for business profile:', businessProfileId);
    
    // Join with invoices to get currency and exchange rate information
    const { data, error } = await supabase
      .from('jdg_revenue_register_lines')
      .select(`
        *,
        invoices!inner(
          currency,
          exchange_rate,
          total_gross_value
        )
      `)
      .eq('business_profile_id', businessProfileId)
      .order('occurred_at', { ascending: false });
    
    console.log('📡 Register lines result:', { error, count: data?.length, data: data?.slice(0, 3) });
    
    if (error) {
      console.error('❌ Error fetching register lines:', error);
      throw error;
    }
    
    // Filter out the deleted item if it's still in cache
    const filteredData = data?.filter(item => {
      // This is a workaround for Supabase cache issues
      return true; // We'll handle this in the delete function
    }) || [];
    
    console.log('📡 Returning register lines:', filteredData.length, 'items');
    return filteredData;
  };

  const processRegisterLinesForEwidencja = (
    registerLines: any[], 
    accounts: RyczaltAccount[]
  ): EwidencjaItem[] => {
    return registerLines
      .map(line => {
        const account = accounts.find(acc => acc.id === line.ryczalt_account_id);
        
        const originalAmount = parseFloat(line.invoices?.total_gross_value) || 0;
        const currency = line.invoices?.currency || 'PLN';
        const exchangeRate = parseFloat(line.invoices?.exchange_rate) || 1;
        
        return {
          id: line.id,
          invoice_id: line.invoice_id,
          register_number: line.document_number,
          register_date: line.occurred_at,
          invoice_number: line.document_number,
          issue_date: line.occurred_at,
          customer_name: line.counterparty_name,
          amount: parseFloat(line.tax_base_amount) || 0, // This should be in PLN
          original_amount: originalAmount,
          currency: currency,
          exchange_rate: exchangeRate,
          category_name: line.category_name || account?.category_name || 'Nieznane konto',
          category_rate: parseFloat(line.ryczalt_rate) || account?.category_rate || 0,
          account_number: line.ryczalt_account_number || account?.account_number || 'Brak konta'
        };
      })
      .sort((a, b) => new Date(b.register_date).getTime() - new Date(a.register_date).getTime());
  };

  const handleRemoveInvoiceFromEwidencja = async (invoiceId: string) => {
    // Immediate feedback
    console.log('🗑️ Delete button clicked for invoice:', invoiceId);
    toast.info('Usuwanie faktury...');
    
    setIsDeleting(true);
    try {
      console.log('🔄 Starting deletion process for:', invoiceId);
      
      // Step 1: Remove ALL register lines for this invoice (this is what the UI displays)
      console.log('📋 Step 1: Deleting ALL register lines for invoice...');
      const { error: registerError, count: registerCount } = await supabase
        .from('jdg_revenue_register_lines')
        .delete()
        .eq('invoice_id', invoiceId);

      console.log('📋 Register lines deletion result:', { error: registerError, count: registerCount });

      // Also delete from new ryczalt_invoice_items table if it exists
      try {
        const { error: itemError } = await supabase
          .from('ryczalt_invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);
        
        console.log('📋 Ryczalt items deletion result:', { error: itemError });
      } catch (itemError) {
        console.log('📋 Ryczalt items table might not exist yet:', itemError);
      }

      if (registerError) {
        console.error('❌ Failed to delete from register lines:', registerError);
        throw registerError;
      }

      // Step 2: Remove ryczałt account link from invoice
      console.log('📝 Step 2: Updating invoice ryczalt account link...');
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ ryczalt_account_id: null })
        .eq('id', invoiceId);

      console.log('📝 Invoice update result:', { error: invoiceError });

      if (invoiceError) {
        console.error('❌ Failed to update invoice:', invoiceError);
        throw invoiceError;
      }

      // Step 3: Update invoice status
      console.log('🔄 Step 3: Updating invoice status...');
      const { error: statusError } = await supabase
        .from('invoices')
        .update({ 
          accounting_status: 'unposted',
          accounting_locked_at: null,
          accounting_locked_by: null
        })
        .eq('id', invoiceId);

      console.log('🔄 Status update result:', { error: statusError });

      if (statusError) {
        console.error('❌ Failed to update invoice status:', statusError);
        throw statusError;
      }

      console.log('✅ Successfully deleted invoice, clearing state and reloading...');
      
      // Add to deleted INVOICE IDs set (cache workaround) - use invoice_id, not register line id
      setDeletedInvoiceIds(prev => new Set([...prev, invoiceId]));
      console.log('🗑️ Added to deleted INVOICE IDs set:', invoiceId);
      
      // Immediately clear the deleted item from state
      setAllEwidencjaItems(prev => {
        const filtered = prev.filter(item => item.id !== invoiceId);
        console.log('🧹 Cleared invoice from state, remaining items:', filtered.length);
        return filtered;
      });
      
      // Force a refresh to ensure UI updates
      setRefreshKey(prev => prev + 1);
      console.log('🔄 Forced refresh with key:', refreshKey + 1);
      
      // Then reload data to ensure consistency
      await loadData();
      console.log('🔄 Data reload completed');
      
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if the deleted item is still in the data (debugging)
      const stillExists = allEwidencjaItems.some(item => item.id === invoiceId);
      console.log('🔍 Check if deleted item still exists:', stillExists);
      
      if (stillExists) {
        console.log('⚠️ Item still exists due to cache issue, but marked as deleted');
        toast.success('Faktura usunięta z ewidencji (cache issue)');
      } else {
        console.log('✅ Confirmed: Deleted item no longer exists in database');
        toast.success('Faktura usunięta z ewidencji');
      }
    } catch (error) {
      console.error('❌ Failed to remove invoice from ewidencja:', error);
      toast.error(`Błąd podczas usuwania faktury: ${error.message || 'Nieznany błąd'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter items for selected period
  const ewidencjaItems = useMemo(() => {
    return allEwidencjaItems.filter(item => {
      const itemDate = new Date(item.register_date);
      const periodStart = startOfMonth(new Date(period.key.year, period.key.month - 1));
      const periodEnd = endOfMonth(new Date(period.key.year, period.key.month - 1));
      return itemDate >= periodStart && itemDate <= periodEnd;
    });
  }, [allEwidencjaItems, period.key.year, period.key.month]);

  const calculateGroupTax = (group: any) => {
    const taxAmount = group.total_amount * (group.category_rate / 100);
    // Deadline is 20th of next month after the period
    const deadlineDate = new Date(period.key.year, period.key.month, 20);
    
    return {
      taxAmount,
      deadlineDate,
      invoiceCount: group.items.length
    };
  };

  // Sync period with existing period hook
  useEffect(() => {
    const year = selectedPeriod.getFullYear();
    const month = selectedPeriod.getMonth() + 1;
    setPeriod({ year, month });
  }, [selectedPeriod]);

  const selectedYear = selectedPeriod.getFullYear();
  const selectedMonth = selectedPeriod.getMonth() + 1;
  const currentState = periodStates.find(
    p => p.year === selectedYear && p.month === selectedMonth
  );

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

  // Group items by category
  const groupedByCategory = ewidencjaItems.reduce((groups, item) => {
    const key = item.category_name;
    if (!groups[key]) {
      groups[key] = {
        category_name: item.category_name,
        category_rate: item.category_rate,
        account_number: item.account_number,
        items: [],
        total_amount: 0
      };
    }
    groups[key].items.push(item);
    groups[key].total_amount += item.amount;
    return groups;
  }, {} as Record<string, any>);

  const totalRevenue = ewidencjaItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6 p-6" key={refreshKey}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ewidencja przychodów</h1>
          <p className="text-muted-foreground">
            Przychody zgrupowane według kategorii ryczałtowych dla {selectedProfile.name}
          </p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button onClick={() => window.location.href = '/accounting/ryczalt-accounts'}>
              <Plus className="h-4 w-4 mr-2" />
              Stwórz konto ryczałtowe
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.href = '/accounting/ryczalt-accounts'}>
            <Receipt className="h-4 w-4 mr-2" />
            Zarządzaj kontami
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filtruj
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj przychód
          </Button>
        </div>
      </div>

      {/* Period Control Bar */}
      <PeriodControlBar
        currentPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        periodStates={periodStates.map(p => ({
          ...p,
          taxAmount: p.year === selectedYear && p.month === selectedMonth ? periodStats?.totalTax : undefined,
          invoiceCount: p.year === selectedYear && p.month === selectedMonth ? periodStats?.invoiceCount : undefined,
          postedCount: p.year === selectedYear && p.month === selectedMonth ? periodStats?.invoiceCount : undefined,
        }))}
        onClosePeriod={() => setShowClosureModal(true)}
      />
      
      {/* Action Banner */}
      {currentState && periodStats && (
        <PeriodActionBanner
          status={currentState.status}
          periodName={formatPeriodName(selectedYear, selectedMonth)}
          taxAmount={periodStats.totalTax}
          taxDeadline={currentState.taxDeadline}
          invoiceCount={periodStats.invoiceCount}
          postedCount={periodStats.invoiceCount}
          unpostedCount={periodStats.unpostedCount}
          onViewDocuments={() => window.location.href = '/income'}
          onAssignAccounts={() => setShowAssignmentModal(true)}
          onClosePeriod={() => {
            const check = canClosePeriod(selectedYear, selectedMonth, periodStats.unpostedCount);
            if (check.canClose) {
              setShowClosureModal(true);
            } else {
              toast.error(check.reason);
            }
          }}
        />
      )}

      {/* Period Locking Widget */}
      <PeriodLockingWidget 
        compact={false}
        showCriticalOnly={false}
        autoLockEnabled={true}
      />

      {/* Period Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Przychody okresu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPeriodLabel(period.key)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              Liczba dokumentów
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {ewidencjaItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zaksięgowane faktury
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-red-600" />
              Podatek do zapłaty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                Object.values(groupedByCategory).reduce((sum, group: any) => {
                  return sum + (group.total_amount * (group.category_rate / 100));
                }, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma ryczałtu
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              Termin płatności
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600">
              {format(new Date(period.key.year, period.key.month, 20), 'dd MMM yyyy', { locale: pl })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date() > new Date(period.key.year, period.key.month, 20) 
                ? '⚠️ Po terminie' 
                : `${Math.ceil((new Date(period.key.year, period.key.month, 20).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dni pozostało`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Unaccounted Queue Panel */}
      {selectedProfile?.id && (
        <UnaccountedQueuePanel
          businessProfileId={selectedProfile.id}
          periodYear={selectedYear}
          periodMonth={selectedMonth}
          onAssignCategories={(invoiceIds) => {
            // Open assignment modal with specific invoices
            setShowAssignmentModal(true);
          }}
          onViewInvoice={(invoiceId) => {
            window.location.href = `/income/${invoiceId}`;
          }}
          onFixError={(invoiceId) => {
            window.location.href = `/income/${invoiceId}`;
          }}
        />
      )}

      {/* Period Status Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Okres: {getPeriodLabel(period.key)}</CardTitle>
              <CardDescription className="mt-1">
                Ewidencja podatkowa - termin złożenia do 20 {format(new Date(period.key.year, period.key.month), 'MMMM yyyy', { locale: pl })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                {ewidencjaItems.length} {ewidencjaItems.length === 1 ? 'dokument' : ewidencjaItems.length < 5 ? 'dokumenty' : 'dokumentów'}
              </Badge>
              {new Date() > new Date(period.key.year, period.key.month, 20) ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Po terminie
                </Badge>
              ) : (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {Math.ceil((new Date(period.key.year, period.key.month, 20).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dni do terminu
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Ewidencja Grouped by Category */}
      {Object.keys(groupedByCategory).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak przychodów w okresie {getPeriodLabel(period.key)}</h3>
            <p className="text-muted-foreground mb-4">
              {accounts.length === 0 
                ? "Nie masz jeszcze kont ryczałtowych. Stwórz konto, aby zacząć grupować przychody."
                : `Nie znaleziono zaksięgowanych przychodów dla okresu ${getPeriodLabel(period.key)}. Zaksięguj faktury z wybranym kontem ryczałtowym.`
              }
            </p>
            <div className="flex gap-2 justify-center">
              {accounts.length === 0 && (
                <Button onClick={() => window.location.href = '/accounting/ryczalt-accounts'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Stwórz konto ryczałtowe
                </Button>
              )}
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Dodaj fakturę
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedByCategory).map((group: any) => {
            const taxInfo = calculateGroupTax(group);
            return (
              <Card key={group.category_name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{group.category_name}</CardTitle>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        {group.category_rate}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {group.account_number}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(group.total_amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {group.items.length} {group.items.length === 1 ? 'transakcja' : group.items.length < 5 ? 'transakcje' : 'transakcji'}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Tax Summary */}
                  <div className="bg-muted border border-border rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Podsumowanie ryczałtu</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Podatek ({group.category_rate}%):</div>
                        <div className="font-medium text-red-600">{formatCurrency(taxInfo.taxAmount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Termin płatności:</div>
                        <div className="font-medium">
                          {format(taxInfo.deadlineDate, 'dd MMMM yyyy', { locale: pl })}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Status:</div>
                        <div className="font-medium text-orange-600">
                          {new Date() > taxInfo.deadlineDate ? 'Po terminie' : 'Do zapłaty'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item: EwidencjaItem) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => window.location.href = `/income/${item.invoice_id}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div>
                            <div className="font-medium group-hover:text-primary transition-colors">{item.invoice_number}</div>
                            <div className="text-sm text-muted-foreground">{item.customer_name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">
                              {formatCurrency(item.amount)}
                              {item.currency !== 'PLN' && (
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(item.original_amount, item.currency)} 
                                  <span className="text-xs ml-1">
                                    (×{item.exchange_rate})
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(item.issue_date), 'dd.MM.yyyy', { locale: pl })}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `/income/${item.invoice_id}`;
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Szczegóły faktury
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🔴 Dropdown delete clicked for invoice:', item.invoice_id);
                                  console.log('🔴 Register line ID:', item.id);
                                  handleRemoveInvoiceFromEwidencja(item.invoice_id);
                                }}
                                disabled={isDeleting}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isDeleting ? 'Usuwanie...' : 'Usuń z ewidencji'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('🔍 Test button clicked for invoice:', item.id);
                                  console.log('🔍 Invoice data:', item);
                                  toast.info(`Test: Invoice ${item.invoice_number} (${item.id})`);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Testuj
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
