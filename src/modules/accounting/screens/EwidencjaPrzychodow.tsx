import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, Receipt, TrendingUp, Calendar, Filter } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { listRyczaltAccounts, getRyczaltAccountsSummary, type RyczaltAccount } from '../data/ryczaltAccountsRepository';
import { listRyczaltRevenueCategories, type RyczaltRevenueCategory } from '../data/ryczaltCategoriesRepository';
import { getInvoices } from '@/modules/invoices/data/invoiceRepository';
import { toast } from 'sonner';
import type { Invoice } from '@/shared/types';

interface EwidencjaItem {
  id: string;
  invoice_number: string;
  issue_date: string;
  customer_name: string;
  amount: number;
  category_name: string;
  category_rate: number;
  account_number: string;
}

export default function EwidencjaPrzychodow() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [categories, setCategories] = useState<RyczaltRevenueCategory[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ewidencjaItems, setEwidencjaItems] = useState<EwidencjaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  useEffect(() => {
    if (!selectedProfile?.id) return;
    
    loadData();
  }, [selectedProfile?.id]);

  const loadData = async () => {
    if (!selectedProfile?.id) return;
    
    setIsLoading(true);
    try {
      const [accountsData, categoriesData, invoicesData] = await Promise.all([
        listRyczaltAccounts(selectedProfile.id),
        listRyczaltRevenueCategories(selectedProfile.id),
        getInvoices(selectedProfile.user_id || '', selectedProfile.id)
      ]);
      
      setAccounts(accountsData);
      setCategories(categoriesData);
      setInvoices(invoicesData.filter(inv => inv.transactionType === 'income'));
      
      // Process invoices to create ewidencja items
      const items = processInvoicesForEwidencja(invoicesData, accountsData, categoriesData);
      setEwidencjaItems(items);
    } catch (error) {
      console.error('Failed to load ewidencja data:', error);
      toast.error('Błąd podczas ładowania ewidencji przychodów');
    } finally {
      setIsLoading(false);
    }
  };

  const processInvoicesForEwidencja = (
    invoices: Invoice[], 
    accounts: RyczaltAccount[], 
    categories: RyczaltRevenueCategory[]
  ): EwidencjaItem[] => {
    return invoices
      .filter(inv => inv.transactionType === 'income' && (inv as any).ryczalt_category_id)
      .map(inv => {
        const account = accounts.find(acc => acc.ryczalt_category_id === (inv as any).ryczalt_category_id);
        const category = categories.find(cat => cat.id === (inv as any).ryczalt_category_id);
        
        return {
          id: inv.id,
          invoice_number: inv.number || 'Brak numeru',
          issue_date: inv.issueDate || '',
          customer_name: inv.customerName || 'Nieznany klient',
          amount: inv.totalAmount || 0,
          category_name: category?.name || 'Nieznana kategoria',
          category_rate: category?.rate || 0,
          account_number: account?.account_number || 'Brak konta'
        };
      })
      .sort((a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime());
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Ewidencja przychodów</h1>
          <p className="text-muted-foreground">
            Przychody zgrupowane według kategorii ryczałtowych dla {selectedProfile.name}
          </p>
        </div>
        <div className="flex gap-2">
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
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Wszystkie kategorie ryczałtowe
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              Liczba transakcji
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {ewidencjaItems.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Faktury przychodowe
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Okres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {format(new Date(), 'MMMM yyyy', { locale: pl })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Bieżący miesiąc
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ewidencja Grouped by Category */}
      {Object.keys(groupedByCategory).length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak przychodów</h3>
            <p className="text-muted-foreground mb-4">
              Nie znaleziono przychodów z kategoriami ryczałtowymi
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj pierwszą fakturę
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.values(groupedByCategory).map((group: any) => (
            <Card key={group.category_name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{group.category_name}</CardTitle>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
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
                      {group.items.length} transakcji
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {group.items.map((item: EwidencjaItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{item.invoice_number}</div>
                          <div className="text-sm text-muted-foreground">{item.customer_name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(item.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(item.issue_date), 'dd.MM.yyyy', { locale: pl })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
