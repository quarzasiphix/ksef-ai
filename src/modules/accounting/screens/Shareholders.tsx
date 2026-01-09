import React, { useEffect, useState, useMemo } from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Badge } from '@/shared/ui/badge';
import { Textarea } from '@/shared/ui/textarea';
import { 
  Users, Plus, Edit, Building2, FileText, Upload, History, 
  DollarSign, Calendar, User, Phone, Mail, MapPin, AlertCircle,
  CheckCircle, Clock, X, Download, Eye
} from 'lucide-react';
import { 
  getShareholders, createShareholder, updateShareholder, 
  getEquityTransactionsByShareholder, getEquityTransactionWithDocument 
} from '@/modules/accounting/data/accountingRepository';
import { uploadCapitalContributionDocument, linkDocumentToEquityTransaction } from '@/modules/accounting/services/documentStorageService';
import type { Shareholder, EquityTransaction } from '@/modules/accounting/accounting';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import CapitalContributionDialog from '@/modules/accounting/components/CapitalContributionDialog';

interface ShareholdersProps {
  embedded?: boolean;
}

const Shareholders: React.FC<ShareholdersProps> = ({ embedded = false }) => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [capitalWizardOpen, setCapitalWizardOpen] = useState(false);
  const [selectedShareholderForCapital, setSelectedShareholderForCapital] = useState<Shareholder | null>(null);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [shareholderCapitalData, setShareholderCapitalData] = useState<Record<string, { paid: number; lastDate: string | null }>>({});
  const [selectedShareholder, setSelectedShareholder] = useState<Shareholder | null>(null);
  const [shareholderTransactions, setShareholderTransactions] = useState<EquityTransaction[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newTransactionLog, setNewTransactionLog] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
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
      
      // Load capital contribution data for each shareholder
      const capitalData: Record<string, { paid: number; lastDate: string | null }> = {};
      for (const shareholder of data) {
        const transactions = await getEquityTransactionsByShareholder(selectedProfileId, shareholder.name);
        const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
        const lastTransaction = transactions[0];
        capitalData[shareholder.id] = {
          paid: totalPaid,
          lastDate: lastTransaction ? lastTransaction.transaction_date : null
        };
      }
      setShareholderCapitalData(capitalData);
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

  const handleOpenDetailDialog = async (shareholder: Shareholder) => {
    setSelectedShareholder(shareholder);
    setDetailDialogOpen(true);
    
    // Load detailed transaction data
    try {
      const transactions = await getEquityTransactionsByShareholder(selectedProfileId!, shareholder.name);
      // Load documents for each transaction
      const transactionsWithDocs = await Promise.all(
        transactions.map(async (transaction) => {
          const transactionWithDoc = await getEquityTransactionWithDocument(transaction.id);
          return transactionWithDoc || transaction;
        })
      );
      setShareholderTransactions(transactionsWithDocs);
    } catch (error) {
      console.error('Error loading shareholder transactions:', error);
      toast.error('Błąd podczas ładowania transakcji');
    }
  };

  const handleAddTransactionLog = async (transactionId: string) => {
    if (!newTransactionLog.trim()) {
      toast.error('Wpisz treść notatki');
      return;
    }

    try {
      // Add log to transaction description or metadata
      const transaction = shareholderTransactions.find(t => t.id === transactionId);
      if (transaction) {
        const updatedDescription = transaction.description 
          ? `${transaction.description}\n\nNotatka (${new Date().toLocaleDateString('pl-PL')}): ${newTransactionLog}`
          : `Notatka (${new Date().toLocaleDateString('pl-PL')}): ${newTransactionLog}`;

        // Update transaction with new log
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase
          .from('equity_transactions')
          .update({ 
            description: updatedDescription,
            updated_at: new Date().toISOString()
          })
          .eq('id', transactionId);

        setNewTransactionLog('');
        toast.success('Notatka dodana');
        
        // Reload transactions
        await handleOpenDetailDialog(selectedShareholder!);
      }
    } catch (error) {
      console.error('Error adding transaction log:', error);
      toast.error('Błąd podczas dodawania notatki');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, transactionId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Proszę przesłać plik PDF');
      return;
    }

    setUploadingFile(true);
    try {
      const transaction = shareholderTransactions.find(t => t.id === transactionId);
      if (!transaction) return;

      // Upload document
      const uploadedDoc = await uploadCapitalContributionDocument(
        file,
        selectedProfileId!,
        {
          shareholderName: selectedShareholder!.name,
          amount: transaction.amount,
          contributionDate: transaction.transaction_date,
          documentType: 'capital_contribution_statement',
        }
      );

      // Link document to transaction
      await linkDocumentToEquityTransaction(
        uploadedDoc.id,
        transactionId
      );

      toast.success('Dokument przesłany i połączony z transakcją');
      
      // Reload transactions
      await handleOpenDetailDialog(selectedShareholder!);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Błąd podczas przesyłania dokumentu');
    } finally {
      setUploadingFile(false);
    }
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
        setDialogOpen(false);
        loadShareholders();
      } else {
        const newShareholder = await createShareholder({
          ...formData,
          business_profile_id: selectedProfileId,
          is_active: true
        });
        toast.success('Wspólnik dodany');
        setDialogOpen(false);
        
        // Offer to add capital contribution
        if (formData.initial_capital_contribution > 0) {
          setSelectedShareholderForCapital(newShareholder);
          setCapitalWizardOpen(true);
        } else {
          loadShareholders();
        }
      }
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
                const declaredContribution = shareholder.initial_capital_contribution;
                const capitalInfo = shareholderCapitalData[shareholder.id] || { paid: 0, lastDate: null };
                const paidAmount = capitalInfo.paid;
                const outstanding = declaredContribution - paidAmount;
                const lastPaymentDate = capitalInfo.lastDate;
                
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
                          onClick={() => handleOpenDetailDialog(shareholder)}
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
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-amber-600">⚠️ Niespełnione zobowiązanie kapitałowe</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedShareholderForCapital(shareholder);
                            setCapitalWizardOpen(true);
                          }}
                        >
                          Dodaj wpłatę kapitału
                        </Button>
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

      {/* Capital Contribution Dialog */}
      {selectedShareholderForCapital && (
        <CapitalContributionDialog
          open={capitalWizardOpen}
          onOpenChange={(open) => {
            setCapitalWizardOpen(open);
            if (!open) {
              setSelectedShareholderForCapital(null);
              loadShareholders();
            }
          }}
          businessProfileId={selectedProfileId!}
          shareholderName={selectedShareholderForCapital.name}
          shareholderId={selectedShareholderForCapital.id}
          declaredAmount={selectedShareholderForCapital.initial_capital_contribution}
        />
      )}

      {/* Shareholder Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Szczegóły wspólnika: {selectedShareholder?.name}
            </DialogTitle>
            <DialogDescription>
              Przeglądaj transakcje kapitałowe, dokumenty i dodawaj notatki
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="overview" className="flex-1">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Przegląd</TabsTrigger>
              <TabsTrigger value="transactions">Transakcje</TabsTrigger>
              <TabsTrigger value="documents">Dokumenty</TabsTrigger>
              <TabsTrigger value="edit">Edycja</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4 mt-4">
              {selectedShareholder && (
                <div className="grid gap-6">
                  {/* Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Dane podstawowe
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Imię i nazwisko</p>
                        <p className="font-medium">{selectedShareholder.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Udział</p>
                        <p className="font-medium">{selectedShareholder.share_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">NIP/PESEL</p>
                        <p className="font-medium">{selectedShareholder.tax_id || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data przystąpienia</p>
                        <p className="font-medium">
                          {selectedShareholder.joined_date 
                            ? new Date(selectedShareholder.joined_date).toLocaleDateString('pl-PL')
                            : '—'
                          }
                        </p>
                      </div>
                      {selectedShareholder.address && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Adres</p>
                          <p className="font-medium">{selectedShareholder.address}</p>
                        </div>
                      )}
                      {selectedShareholder.email && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedShareholder.email}</p>
                        </div>
                      )}
                      {selectedShareholder.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Telefon</p>
                          <p className="font-medium">{selectedShareholder.phone}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Podsumowanie finansowe
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Wkład zadeklarowany</p>
                          <p className="text-lg font-semibold">
                            {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(selectedShareholder.initial_capital_contribution)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Wpłacono</p>
                          <p className="text-lg font-semibold text-green-600">
                            {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
                              shareholderCapitalData[selectedShareholder.id]?.paid || 0
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Do wpłaty</p>
                          <p className="text-lg font-semibold text-amber-600">
                            {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
                              selectedShareholder.initial_capital_contribution - (shareholderCapitalData[selectedShareholder.id]?.paid || 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4 mt-4">
              <div className="space-y-3">
                {shareholderTransactions.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <History className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Brak transakcji kapitałowych</h3>
                      <p className="text-muted-foreground mb-4">
                        Ten wspólnik nie ma jeszcze żadnych transakcji kapitałowych.
                      </p>
                      <Button 
                        onClick={() => {
                          setSelectedShareholderForCapital(selectedShareholder);
                          setCapitalWizardOpen(true);
                          setDetailDialogOpen(false);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj transakcję kapitałową
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  shareholderTransactions.map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={transaction.transaction_type === 'capital_contribution' ? 'default' : 'secondary'}>
                                {transaction.transaction_type === 'capital_contribution' ? 'Wkład' : 'Wypłata'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(transaction.transaction_date).toLocaleDateString('pl-PL')}
                              </span>
                            </div>
                            <p className="font-semibold text-lg">
                              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(transaction.amount)}
                            </p>
                            {transaction.description && (
                              <p className="text-sm text-muted-foreground mt-1">{transaction.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {transaction.payment_method && (
                              <Badge variant="outline">
                                {transaction.payment_method === 'cash' ? 'Gotówka' : 'Przelew'}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Add Transaction Log */}
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">Dodaj notatkę</span>
                          </div>
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Wpisz notatkę do tej transakcji..."
                              value={newTransactionLog}
                              onChange={(e) => setNewTransactionLog(e.target.value)}
                              className="flex-1 min-h-[60px]"
                            />
                            <Button 
                              onClick={() => handleAddTransactionLog(transaction.id)}
                              disabled={!newTransactionLog.trim()}
                              size="sm"
                            >
                              Dodaj
                            </Button>
                          </div>
                        </div>

                        {/* File Upload */}
                        <div className="border-t pt-3 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Upload className="h-4 w-4" />
                            <span className="text-sm font-medium">Dodaj dokument</span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => handleFileUpload(e, transaction.id)}
                              className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-muted hover:file:bg-muted/80"
                              disabled={uploadingFile}
                            />
                            {uploadingFile && (
                              <span className="text-sm text-muted-foreground">Przesyłanie...</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Dokumenty kapitałowe</h3>
                  <p className="text-muted-foreground mb-4">
                    Dokumenty są przypisane do konkretnych transakcji w zakładce "Transakcje".
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Przejdź do zakładki Transakcje, aby zobaczyć i zarządzać dokumentami.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="edit" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Edytuj dane wspólnika</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Dodatkowe informacje..."
                      className="min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Zamknij
            </Button>
            {selectedShareholder && (
              <Button 
                onClick={() => {
                  // Switch to edit tab and handle save
                  const activeTab = 'edit';
                  // Save logic would go here
                  toast.success('Zmiany zapisane');
                  setDetailDialogOpen(false);
                  loadShareholders();
                }}
              >
                Zapisz zmiany
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Shareholders;
