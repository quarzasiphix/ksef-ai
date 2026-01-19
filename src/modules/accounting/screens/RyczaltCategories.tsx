import React, { useState, useEffect } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, Percent, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { listRyczaltRevenueCategories, createRyczaltCategory, type RyczaltRevenueCategory } from '../data/ryczaltCategoriesRepository';
import { listRyczaltAccounts, createDefaultRyczaltAccounts, getRyczaltAccountsSummary, createRyczaltAccount, type RyczaltAccount } from '../data/ryczaltAccountsRepository';
import { toast } from 'sonner';

export default function RyczaltCategories() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [categories, setCategories] = useState<RyczaltRevenueCategory[]>([]);
  const [accounts, setAccounts] = useState<RyczaltAccount[]>([]);
  const [accountsSummary, setAccountsSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCustomAccountForm, setShowCustomAccountForm] = useState(false);

  useEffect(() => {
    if (!selectedProfile?.id) return;
    
    loadCategories();
  }, [selectedProfile?.id]);

  const loadCategories = async () => {
    if (!selectedProfile?.id) return;
    
    setIsLoading(true);
    try {
      const [categoriesData, accountsData, summaryData] = await Promise.all([
        listRyczaltRevenueCategories(selectedProfile.id),
        listRyczaltAccounts(selectedProfile.id),
        getRyczaltAccountsSummary(selectedProfile.id)
      ]);
      
      setCategories(categoriesData);
      setAccounts(accountsData);
      setAccountsSummary(summaryData);
    } catch (error) {
      console.error('Failed to load ryczałt data:', error);
      toast.error('Błąd podczas ładowania danych ryczałtu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDefaultAccounts = async () => {
    if (!selectedProfile?.id) return;
    
    try {
      await createDefaultRyczaltAccounts(selectedProfile.id);
      await loadCategories(); // Reload to show new accounts
      toast.success('Domyślne konta ryczałtowe utworzone pomyślnie');
    } catch (error) {
      console.error('Failed to create default accounts:', error);
      toast.error('Błąd podczas tworzenia domyślnych kont');
    }
  };

  const handleAddCustomAccount = async (data: {
    categoryName: string;
    rate: number;
    description: string;
    accountName: string;
  }) => {
    if (!selectedProfile?.id) return;
    
    try {
      // First create the category
      const category = await createRyczaltCategory({
        name: data.categoryName,
        rate: data.rate,
        description: data.description,
        business_profile_id: selectedProfile.id,
        is_active: true,
      });
      
      // Then create the account for this category
      const nextAccountNumber = 700 + accounts.length;
      await createRyczaltAccount({
        business_profile_id: selectedProfile.id,
        ryczalt_category_id: category.id,
        account_number: String(nextAccountNumber),
        account_name: data.accountName,
        account_type: 'ryczalt_revenue',
        account_class: 7,
        description: `Ryczałtowe przychody: ${data.categoryName} (${data.rate}%)`,
        is_active: true,
        current_balance: 0,
        period_balance: 0,
        year_balance: 0,
      });
      
      await loadCategories(); // Reload to show new category and account
      setShowCustomAccountForm(false);
      toast.success('Niestandardowa kategoria ryczałtowa dodana pomyślnie');
    } catch (error) {
      console.error('Failed to create custom ryczałt account:', error);
      toast.error('Błąd podczas tworzenia niestandardowej kategorii');
    }
  };

  const handleAddCategory = async (categoryData: Omit<RyczaltRevenueCategory, 'id' | 'created_at'>) => {
    try {
      const newCategory = await createRyczaltCategory(categoryData);
      setCategories(prev => [...prev, newCategory]);
      setShowAddForm(false);
      toast.success('Kategoria ryczałtu dodana pomyślnie');
    } catch (error) {
      console.error('Failed to create ryczałt category:', error);
      toast.error('Błąd podczas dodawania kategorii ryczałtu');
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
          <h1 className="text-3xl font-bold tracking-tight">Kategorie ryczałtowe</h1>
          <p className="text-muted-foreground">
            Zarządzaj stawkami ryczałtu dla {selectedProfile.name}
          </p>
        </div>
        <div className="flex gap-2">
          {accounts.length === 0 && (
            <Button onClick={handleCreateDefaultAccounts} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Utwórz konta
            </Button>
          )}
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj kategorię
          </Button>
        </div>
      </div>

      {/* Ryczałt Accounts Summary */}
      {accountsSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Podsumowanie kont ryczałtowych
            </CardTitle>
            <CardDescription>
              Salda kont ryczałtowych dla wszystkich kategorii
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400">Bieżące saldo</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(accountsSummary.totalBalance)}
                </div>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-600 dark:text-green-400">Saldo okresu</div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(accountsSummary.periodBalance)}
                </div>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="text-sm text-purple-600 dark:text-purple-400">Saldo roku</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(accountsSummary.yearBalance)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Stawki ryczałtowe
          </CardTitle>
          <CardDescription>
            Domyślne stawki systemowe oraz niestandardowe kategorie dla Twojej firmy
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Ładowanie kategorii...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Brak kategorii ryczałtu</h3>
              <p className="text-muted-foreground mb-4">
                Dodaj pierwszą kategorię ryczałtu dla swojej działalności
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj kategorię
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{category.name}</h3>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        {category.rate}%
                      </Badge>
                      {category.business_profile_id ? (
                        <Badge variant="outline">Niestandardowe</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Systemowe
                        </Badge>
                      )}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {category.description}
                      </p>
                    )}
                    {category.pkd_codes && category.pkd_codes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {category.pkd_codes.map((pkd) => (
                          <Badge key={pkd} variant="outline" className="text-xs">
                            {pkd}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!category.business_profile_id && (
                      <Button variant="ghost" size="sm" disabled>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ryczałt Accounts Grouped by Category */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Konta ryczałtowe według kategorii
            </CardTitle>
            <CardDescription>
              Konta księgowe dla każdej kategorii ryczałtowej
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accountsSummary?.accountsByCategory.map((item: any) => (
                <div
                  key={item.category_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{item.category_name}</h3>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        {item.category_rate}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {item.account.account_number}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.account.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(item.account.current_balance)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Saldo bieżące
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showAddForm && (
        <AddCategoryForm
          onSubmit={handleAddCategory}
          onCancel={() => setShowAddForm(false)}
          businessProfileId={selectedProfile.id}
        />
      )}

      {/* Add Custom Ryczał Account Button */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Dodaj niestandardową kategorię ryczałtową
          </CardTitle>
          <CardDescription>
            Stwórz własną kategorię ryczałtową z indywidualną stawką i kontem księgowym
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowCustomAccountForm(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj niestandardową kategorię
          </Button>
        </CardContent>
      </Card>

      {showCustomAccountForm && (
        <AddCustomRyczaltAccountForm
          onSubmit={handleAddCustomAccount}
          onCancel={() => setShowCustomAccountForm(false)}
          businessProfileId={selectedProfile.id}
        />
      )}
    </div>
  );
}

interface AddCategoryFormProps {
  onSubmit: (category: Omit<RyczaltRevenueCategory, 'id' | 'created_at'>) => void;
  onCancel: () => void;
  businessProfileId: string;
}

function AddCategoryForm({ onSubmit, onCancel, businessProfileId }: AddCategoryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    rate: 12,
    description: '',
    pkd_codes: [] as string[],
    is_active: true,
    business_profile_id: businessProfileId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle>Dodaj nową kategorię ryczałtu</CardTitle>
        <CardDescription>
          Niestandardowa kategoria będzie dostępna tylko dla tej firmy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nazwa kategorii</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-2 border rounded-md"
              placeholder="np. Usługi IT"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Stawka (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={formData.rate}
              onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
              className="w-full p-2 border rounded-md"
              placeholder="12"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Opis (opcjonalnie)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Opis kategorii..."
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="submit">
              Dodaj kategorię
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

interface AddCustomRyczaltAccountFormProps {
  onSubmit: (data: {
    categoryName: string;
    rate: number;
    description: string;
    accountName: string;
  }) => void;
  onCancel: () => void;
  businessProfileId: string;
}

function AddCustomRyczaltAccountForm({ onSubmit, onCancel, businessProfileId }: AddCustomRyczaltAccountFormProps) {
  const [formData, setFormData] = useState({
    categoryName: '',
    rate: 12,
    description: '',
    accountName: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="border-2 border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-green-600" />
          Dodaj niestandardową kategorię ryczałtową
        </CardTitle>
        <CardDescription>
          Stwórz własną kategorię ryczałtową z indywidualną stawką i kontem księgowym
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nazwa kategorii *</label>
              <input
                type="text"
                value={formData.categoryName}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryName: e.target.value }))}
                className="w-full p-2 border rounded-md"
                placeholder="np. Konsulting IT dla startupów"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Stawka ryczałtu (%) *</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={formData.rate}
                onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2 border rounded-md"
                placeholder="12.5"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Nazwa konta księgowego *</label>
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
              className="w-full p-2 border rounded-md"
              placeholder="np. Przychody - Konsulting IT"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              To będzie nazwa konta w planie kont (np. 712 - Przychody - Konsulting IT)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Opis kategorii *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Opisz do czego służy ta kategoria ryczałtowa..."
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Krótki opis pomagający zrozumieć przeznaczenie tej kategorii
            </p>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Dodaj kategorię i konto
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
