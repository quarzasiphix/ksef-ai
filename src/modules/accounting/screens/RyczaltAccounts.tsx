import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, Edit, Trash2, CreditCard, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { listRyczaltAccounts, getRyczaltAccountsSummary, createRyczaltAccount, deleteRyczaltAccount, getNextAccountNumber, type RyczaltAccount } from '../data/ryczaltRepository';
import { listRyczaltCategories, type RyczaltCategory } from '../data/ryczaltRepository';
import { toast } from 'sonner';

export default function RyczaltAccounts() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [categories, setCategories] = useState<RyczaltCategory[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!selectedProfile?.id) return;
    
    loadData();
  }, [selectedProfile?.id]);

  const loadData = async () => {
    if (!selectedProfile?.id) return;
    
    setIsLoading(true);
    try {
      const [accountsData, categoriesData, summaryData] = await Promise.all([
        listRyczaltAccounts(selectedProfile.id),
        listRyczaltCategories(),
        getRyczaltAccountsSummary(selectedProfile.id)
      ]);
      
      setAccounts(accountsData);
      setCategories(categoriesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load ryczałt data:', error);
      toast.error('Błąd podczas ładowania danych ryczałtu');
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
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj konto
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Łączne saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Wszystkie konta ryczałtowe
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Saldo okresu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.periodBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Bieżący okres rozliczeniowy
              </p>
                {accounts.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aktywne konta ryczałtowe
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Account className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
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
                    <Account className="h-5 w-5 text-blue-600" />
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
                      {formatCurrency(account.current_balance)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Saldo bieżące
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
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Stawka podatku: <strong>{account.category_rate}%</strong>
                    {account.pkd_codes && account.pkd_codes.length > 0 && (
                      <span className="ml-2">
                        • PKD: {account.pkd_codes.join(', ')}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Usuń
                  </Button>
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
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
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
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
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
