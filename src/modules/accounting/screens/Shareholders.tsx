import React, { useEffect, useState } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Users, Plus, Edit, Building2 } from 'lucide-react';
import { getShareholders, createShareholder, updateShareholder } from '@/modules/accounting/data/accountingRepository';
import type { Shareholder } from '@/modules/accounting/accounting';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface ShareholdersProps {
  embedded?: boolean;
}

const Shareholders: React.FC<ShareholdersProps> = ({ embedded = false }) => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tax_id: '',
    address: '',
    email: '',
    phone: '',
    share_percentage: 0,
    initial_capital_contribution: 0,
    joined_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  useEffect(() => {
    if (selectedProfileId) {
      loadShareholders();
    }
  }, [selectedProfileId]);

  const loadShareholders = async () => {
    if (!selectedProfileId) return;
    setLoading(true);
    try {
      const data = await getShareholders(selectedProfileId);
      setShareholders(data);
    } catch (error) {
      console.error('Error loading shareholders:', error);
      toast.error('Błąd podczas ładowania wspólników');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (shareholder?: Shareholder) => {
    if (shareholder) {
      setEditingShareholder(shareholder);
      setFormData({
        name: shareholder.name,
        tax_id: shareholder.tax_id || '',
        address: shareholder.address || '',
        email: shareholder.email || '',
        phone: shareholder.phone || '',
        share_percentage: shareholder.share_percentage,
        initial_capital_contribution: shareholder.initial_capital_contribution,
        joined_date: shareholder.joined_date || format(new Date(), 'yyyy-MM-dd'),
        notes: shareholder.notes || ''
      });
    } else {
      setEditingShareholder(null);
      setFormData({
        name: '',
        tax_id: '',
        address: '',
        email: '',
        phone: '',
        share_percentage: 0,
        initial_capital_contribution: 0,
        joined_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedProfileId) return;

    // Validate share percentage
    const totalShares = shareholders
      .filter(s => s.id !== editingShareholder?.id)
      .reduce((sum, s) => sum + s.share_percentage, 0);
    
    if (totalShares + formData.share_percentage > 100) {
      toast.error('Suma udziałów nie może przekroczyć 100%');
      return;
    }

    try {
      if (editingShareholder) {
        await updateShareholder(editingShareholder.id, {
          ...formData,
          business_profile_id: selectedProfileId
        });
        toast.success('Wspólnik zaktualizowany');
      } else {
        await createShareholder({
          ...formData,
          business_profile_id: selectedProfileId,
          is_active: true
        });
        toast.success('Wspólnik dodany');
      }
      setDialogOpen(false);
      loadShareholders();
    } catch (error) {
      console.error('Error saving shareholder:', error);
      toast.error('Błąd podczas zapisywania wspólnika');
    }
  };

  const totalShares = shareholders.reduce((sum, s) => sum + s.share_percentage, 0);
  const totalCapital = shareholders.reduce((sum, s) => sum + s.initial_capital_contribution, 0);

  if (selectedProfile?.entityType !== 'sp_zoo' && selectedProfile?.entityType !== 'sa') {
    if (embedded) return null;
    return (
      <div className="space-y-6 pb-20 px-4 md:px-6">
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        <div className="text-center py-12">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Wspólnicy dostępni tylko dla Spółek</h2>
          <p className="text-muted-foreground">
            Ta funkcja jest dostępna tylko dla Spółek z o.o. i S.A.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "space-y-6 pb-20 px-4 md:px-6"}>
        {/* Breadcrumbs */}
        {!embedded && (
          <div className="mb-4">
            <Breadcrumbs />
          </div>
        )}
        
        {/* Header */}
        {!embedded && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Wspólnicy</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Struktura kapitałowa spółki i dane wspólników
              </p>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj wspólnika
            </Button>
          </div>
        )}
        
        {embedded && (
          <div className="flex items-center justify-end">
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj wspólnika
            </Button>
          </div>
        )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Liczba wspólników</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shareholders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Suma udziałów</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalShares.toFixed(2)}%</div>
            {totalShares !== 100 && (
              <p className="text-xs text-amber-600 mt-1">Pozostało: {(100 - totalShares).toFixed(2)}%</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Kapitał zakładowy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(totalCapital)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shareholders List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista wspólników</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Ładowanie...</div>
          ) : shareholders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Brak wspólników</p>
              <Button variant="outline" className="mt-4" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj pierwszego wspólnika
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {shareholders.map((shareholder) => {
                // Mock calculation - in real app, this would come from linked capital events
                const declaredContribution = shareholder.initial_capital_contribution;
                const paidAmount = declaredContribution * 0.7; // Mock: 70% paid
                const outstanding = declaredContribution - paidAmount;
                const lastPaymentDate = '2025-01-15'; // Mock date
                
                return (
                  <div
                    key={shareholder.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{shareholder.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {shareholder.tax_id && `NIP/PESEL: ${shareholder.tax_id}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-lg">{shareholder.share_percentage}%</p>
                          <p className="text-xs text-muted-foreground">udział</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(shareholder)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Financial Obligations Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Zadeklarowano</p>
                        <p className="font-semibold text-sm">
                          {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(declaredContribution)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Wpłacono</p>
                        <p className="font-semibold text-sm text-green-600">
                          {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(paidAmount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Do wpłaty</p>
                        <p className={`font-semibold text-sm ${outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(outstanding)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Ostatnia wpłata</p>
                        <p className="font-semibold text-sm">
                          {lastPaymentDate ? new Date(lastPaymentDate).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Warning for outstanding amounts */}
                    {outstanding > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-600">
                        <span className="font-medium">⚠️ Niespełnione zobowiązanie kapitałowe</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShareholder ? 'Edytuj wspólnika' : 'Dodaj wspólnika'}
            </DialogTitle>
            <DialogDescription>
              Uzupełnij dane wspólnika oraz jego udział i wkład kapitałowy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Imię i nazwisko / Nazwa firmy *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jan Kowalski"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">NIP/PESEL</label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data przystąpienia</label>
                <Input
                  type="date"
                  value={formData.joined_date}
                  onChange={(e) => setFormData({ ...formData, joined_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Adres</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="ul. Przykładowa 1, 00-000 Warszawa"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jan@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Telefon</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+48 123 456 789"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Udział (%) *</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.share_percentage}
                  onChange={(e) => setFormData({ ...formData, share_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Wkład kapitałowy (PLN) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.initial_capital_contribution}
                  onChange={(e) => setFormData({ ...formData, initial_capital_contribution: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notatki</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md min-h-[80px]"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Dodatkowe informacje..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || formData.share_percentage <= 0}>
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shareholders;
