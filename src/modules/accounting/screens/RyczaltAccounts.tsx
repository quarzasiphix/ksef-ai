import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, Trash2, CreditCard, TrendingUp, Calendar, Calculator, MoreHorizontal, FileText } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { 
  listRyczaltAccounts, 
  getRyczaltAccountsSummary, 
  createRyczaltAccount, 
  deleteRyczaltAccount, 
  getNextAccountNumber, 
  listRyczaltCategories,
  type RyczaltAccount,
  type RyczaltCategory 
} from '../data/ryczaltRepository';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getContractsByBusinessProfile } from '@/modules/contracts/data/contractRepository';
import { type Contract } from '@/shared/types';

function RyczaltAccounts() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [categories, setCategories] = useState<RyczaltCategory[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [accountTaxInfo, setAccountTaxInfo] = useState<Record<string, any>>({});
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (!selectedProfile?.id) return;
    loadData();
  }, [selectedProfile?.id]);

  const loadData = async () => {
    if (!selectedProfile?.id) return;
    
    setIsLoading(true);
    try {
      const [accountsData, categoriesData, summaryData, contractsData] = await Promise.all([
        listRyczaltAccounts(selectedProfile.id),
        listRyczaltCategories(),
        getRyczaltAccountsSummary(selectedProfile.id),
        getContractsByBusinessProfile(selectedProfile.id)
      ]);
      
      setAccounts(accountsData);
      setCategories(categoriesData);
      setSummary(summaryData);
      setContracts(contractsData);

      // Load tax info for each account
      const taxInfoPromises = accountsData.map(async (account) => {
        try {
          const invoices = await getAccountInvoices(account.id);
          const taxInfo = calculateTaxInfo(invoices, account.category_rate);
          return [account.id, taxInfo];
        } catch (error) {
          console.error(`Failed to load tax info for account ${account.id}:`, error);
          return [account.id, { totalAmount: 0, taxAmount: 0, invoiceCount: 0 }];
        }
      });

      const taxInfoResults = await Promise.all(taxInfoPromises);
      const taxInfoMap = Object.fromEntries(taxInfoResults);
      setAccountTaxInfo(taxInfoMap);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async (data: {
    accountName: string;
    categoryId: string;
    description: string;
  }) => {
    if (!selectedProfile?.id) return;
    
    try {
      const nextNumber = await getNextAccountNumber(selectedProfile.id);
      
      await createRyczaltAccount({
        business_profile_id: selectedProfile.id,
        ryczalt_category_id: data.categoryId,
        account_number: nextNumber,
        account_name: data.accountName,
        description: data.description,
        is_active: true,
        current_balance: 0,
        period_balance: 0,
        year_balance: 0,
      });
      
      await loadData();
      setShowAddForm(false);
      toast.success('Konto ryczałtowe dodane pomyślnie');
    } catch (error) {
      console.error('Failed to create ryczałt account:', error);
      toast.error('Błąd podczas tworzenia konta ryczałtowego');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await deleteRyczaltAccount(accountId);
      await loadData();
      toast.success('Konto ryczałtowe usunięte');
    } catch (error) {
      console.error('Failed to delete ryczałt account:', error);
      toast.error('Błąd podczas usuwania konta');
    }
  };

  const handleRemoveInvoiceFromAccount = async (invoiceId: string) => {
    try {
      console.log('Removing invoice from ryczalt account:', invoiceId);
      
      // Remove from register lines first (this is what the UI displays)
      const { error: registerError } = await supabase
        .from('jdg_revenue_register_lines')
        .delete()
        .eq('invoice_id', invoiceId);

      if (registerError) {
        console.error('Failed to delete from register lines:', registerError);
        throw registerError;
      }

      // Remove ryczałt account link from invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ ryczalt_account_id: null })
        .eq('id', invoiceId);

      if (invoiceError) {
        console.error('Failed to update invoice:', invoiceError);
        throw invoiceError;
      }

      // Update invoice status
      const { error: statusError } = await supabase
        .from('invoices')
        .update({ 
          accounting_status: 'unposted',
          accounting_locked_at: null,
          accounting_locked_by: null
        })
        .eq('id', invoiceId);

      if (statusError) {
        console.error('Failed to update invoice status:', statusError);
        throw statusError;
      }

      console.log('Successfully removed invoice, reloading data...');
      await loadData();
      toast.success('Faktura usunięta z konta ryczałtowego');
    } catch (error) {
      console.error('Failed to remove invoice from ryczałt account:', error);
      toast.error('Błąd podczas usuwania faktury z konta');
    }
  };

  const getAccountInvoices = async (accountId: string) => {
    const { data, error } = await supabase
      .from('jdg_revenue_register_lines')
      .select(`
        *,
        invoices!inner(
          number,
          customer_name,
          total_gross_value,
          currency,
          exchange_rate,
          sell_date
        )
      `)
      .eq('ryczalt_account_id', accountId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const calculateTaxInfo = (invoices: any[], rate: number) => {
    // Calculate total with currency conversion
    let totalAmount = 0;
    invoices.forEach((inv) => {
      const amount = parseFloat(inv.tax_base_amount) || 0;
      const exchangeRate = inv.invoices?.exchange_rate || 1;
      const currency = inv.invoices?.currency || 'PLN';
      
      if (currency === 'PLN' || exchangeRate === 1) {
        totalAmount += amount;
      } else {
        totalAmount += amount * exchangeRate;
      }
    });
    
    const taxAmount = totalAmount * (rate / 100);
    
    return {
      totalAmount,
      taxAmount,
      invoiceCount: invoices.length,
      currentMonth: new Date().getMonth() + 1,
      currentYear: new Date().getFullYear(),
      deadlineDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 20) // 20th of next month
    };
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Konta ryczałtowe</h1>
          <p className="text-muted-foreground">
            Zarządzaj kontami ryczałtowymi dla {selectedProfile.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            {isLoading ? 'Odświeżanie...' : 'Odśwież'}
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj konto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Łączne przychody
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(Object.values(accountTaxInfo).reduce((sum, info) => sum + (info.totalAmount || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Wszystkie konta ryczałtowe
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              Łączny podatek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(Object.values(accountTaxInfo).reduce((sum, info) => sum + (info.taxAmount || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Podatek ryczałtowy do zapłaty
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              Liczba faktur
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(accountTaxInfo).reduce((sum, info) => sum + (info.invoiceCount || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Wszystkie zaksięgowane faktury
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak kont ryczałtowych</h3>
            <p className="text-muted-foreground mb-4">
              Nie masz jeszcze żadnych kont ryczałtowych. Dodaj pierwsze konto, aby rozpocząć.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwsze konto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{account.account_name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {account.account_number}
                        </Badge>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          {account.category_name} ({account.category_rate}%)
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(accountTaxInfo[account.id]?.totalAmount || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Suma faktur ({accountTaxInfo[account.id]?.invoiceCount || 0})
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {account.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {account.description}
                  </p>
                )}
                
                {/* Tax Calculations */}
                {accountTaxInfo[account.id] && (
                  <div className="bg-muted border border-border rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Podsumowanie ryczałtu</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Liczba faktur:</div>
                        <div className="font-medium">{accountTaxInfo[account.id].invoiceCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Przychód:</div>
                        <div className="font-medium">{formatCurrency(accountTaxInfo[account.id].totalAmount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Podatek ({account.category_rate}%):</div>
                        <div className="font-medium text-red-600">{formatCurrency(accountTaxInfo[account.id].taxAmount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Termin płatności:</div>
                        <div className="font-medium">
                          {format(accountTaxInfo[account.id].deadlineDate, 'dd MMMM yyyy', { locale: pl })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contracts Section */}
                <div className="bg-muted border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Powiązane umowy</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => window.location.href = '/contracts'}
                    >
                      Zarządzaj
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {contracts.filter(contract => 
                      contract.contract_type === 'service' || 
                      contract.contract_type === 'general'
                    ).slice(0, 3).map((contract) => (
                      <div key={contract.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{contract.number}</span>
                          <span className="text-muted-foreground">{contract.subject}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {format(new Date(contract.issueDate), 'dd.MM.yyyy', { locale: pl })}
                        </span>
                      </div>
                    ))}
                    {contracts.filter(contract => 
                      contract.contract_type === 'service' || 
                      contract.contract_type === 'general'
                    ).length === 0 && (
                      <div className="text-xs text-muted-foreground text-center py-2">
                        Brak powiązanych umów
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Stawka podatku: <strong>{account.category_rate}%</strong>
                    {account.pkd_codes && account.pkd_codes.length > 0 && (
                      <span className="ml-2">
                        • PKD: {account.pkd_codes.join(', ')}
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => window.location.href = '/accounting/ewidencja'}
                      >
                        Zobacz faktury
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Usuń konto
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Account Form */}
      {showAddForm && (
        <AddRyczaltAccountForm
          categories={categories}
          onSubmit={handleAddAccount}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

interface AddRyczaltAccountFormProps {
  categories: RyczaltCategory[];
  onSubmit: (data: {
    accountName: string;
    categoryId: string;
    description: string;
  }) => void;
  onCancel: () => void;
}

function AddRyczaltAccountForm({ categories, onSubmit, onCancel }: AddRyczaltAccountFormProps) {
  const [formData, setFormData] = useState({
    accountName: '',
    categoryId: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const selectedCategory = categories.find(c => c.id === formData.categoryId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Dodaj konto ryczałtowe
        </CardTitle>
        <CardDescription>
          Stwórz nowe konto ryczałtowe połączone z kategorią systemową
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nazwa konta *</label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              className="w-full p-2 border rounded-md"
              placeholder="np. Usługi programistyczne"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Nazwa, która pomaga Ci zidentyfikować to konto
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Kategoria ryczałtu *</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
              className="w-full p-2 border rounded-md"
              required
            >
              <option value="">Wybierz kategorię</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.rate}%)
                </option>
              ))}
            </select>
            {selectedCategory && (
              <p className="text-xs text-muted-foreground mt-1">
                Stawka podatku: <strong>{selectedCategory.rate}%</strong>
                {selectedCategory.description && ` • ${selectedCategory.description}`}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Opis konta (opcjonalnie)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Opis przeznaczenia tego konta..."
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj konto
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Anuluj
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default RyczaltAccounts;
