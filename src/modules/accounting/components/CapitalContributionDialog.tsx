import React, { useId, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { toast } from 'sonner';
import { createEquityTransaction } from '@/modules/accounting/data/accountingRepository';
import { getCashAccounts } from '@/modules/accounting/data/kasaRepository';
import { getBankAccountsForProfile } from '@/modules/banking/data/bankAccountRepository';
import type { EquityTransaction } from '@/modules/accounting/accounting';
import type { CashAccount } from '@/modules/accounting/kasa';
import type { BankAccount } from '@/shared/types/bank';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Building2, Plus, AlertTriangle, FileText, Upload, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { generateCashContributionDeclaration, downloadPDF } from '@/modules/accounting/services/capitalContributionPdfService';
import { uploadCapitalContributionDocument } from '@/modules/accounting/services/documentStorageService';
import { getBusinessProfileById } from '@/modules/settings/data/businessProfileRepository';

interface CapitalContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessProfileId: string;
  shareholderName?: string;
  shareholderId?: string;
  declaredAmount?: number;
  onSuccess?: () => void;
}

const CapitalContributionDialog: React.FC<CapitalContributionDialogProps> = ({
  open,
  onOpenChange,
  businessProfileId,
  shareholderName,
  shareholderId,
  declaredAmount,
  onSuccess
}) => {
  const descriptionId = useId();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    transaction_type: 'capital_contribution' as EquityTransaction['transaction_type'],
    amount: declaredAmount || 0,
    shareholder_name: shareholderName || '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'bank' as 'bank' | 'cash',
    cash_account_id: '',
    bank_account_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [documentStep, setDocumentStep] = useState<'none' | 'generate' | 'upload' | 'complete'>('none');
  const [uploadedDocument, setUploadedDocument] = useState<File | null>(null);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Update form when shareholder props change
  React.useEffect(() => {
    if (shareholderName) {
      setFormData(prev => ({
        ...prev,
        shareholder_name: shareholderName,
        amount: declaredAmount || prev.amount
      }));
    }
  }, [shareholderName, declaredAmount]);

  const { data: cashAccounts = [] } = useQuery({
    queryKey: ['cash-accounts', businessProfileId],
    queryFn: () => getCashAccounts(businessProfileId),
    enabled: !!businessProfileId && open,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts', businessProfileId],
    queryFn: () => getBankAccountsForProfile(businessProfileId),
    enabled: !!businessProfileId && open,
  });

  const handleSubmit = async () => {
    if (formData.amount <= 0) {
      toast.error('Kwota musi być większa od zera');
      return;
    }

    if (!formData.shareholder_name) {
      toast.error('Podaj nazwę wspólnika');
      return;
    }

    if (formData.payment_method === 'cash' && !formData.cash_account_id) {
      toast.error('Wybierz kasę fiskalną');
      return;
    }

    if (formData.payment_method === 'bank' && !formData.bank_account_id) {
      toast.error('Wybierz konto bankowe');
      return;
    }

    // For cash contributions, require signed document upload
    if (formData.payment_method === 'cash' && !uploadedDocument) {
      toast.error('Musisz wygenerować i przesłać podpisane oświadczenie wpłaty gotówkowej');
      return;
    }

    setLoading(true);
    try {
      await createEquityTransaction({
        business_profile_id: businessProfileId,
        transaction_type: formData.transaction_type,
        amount: formData.amount,
        shareholder_name: formData.shareholder_name || undefined,
        description: formData.description || undefined,
        transaction_date: formData.transaction_date,
        payment_method: formData.payment_method,
        cash_account_id: formData.payment_method === 'cash' ? formData.cash_account_id : undefined,
        bank_account_id: formData.payment_method === 'bank' ? formData.bank_account_id : undefined,
        signed_document_id: uploadedDocumentId || undefined,
      });

      // Show success message with details about what was created
      if (formData.payment_method === 'cash') {
        const cashAccountName = cashAccounts?.find(a => a.id === formData.cash_account_id)?.name || 'kasa';
        toast.success(`Transakcja kapitałowa zapisana. Utworzono dokument KP w kasie "${cashAccountName}" (+${formData.amount.toFixed(2)} PLN)`);
      } else {
        toast.success('Transakcja kapitałowa zapisana');
      }
      onOpenChange(false);
      
      // Reset form
      setFormData({
        transaction_type: 'capital_contribution',
        amount: 0,
        shareholder_name: '',
        description: '',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'bank',
        cash_account_id: '',
        bank_account_id: ''
      });
      setDocumentStep('none');
      setUploadedDocument(null);
      setUploadedDocumentId(null);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating equity transaction:', error);
      toast.error('Błąd podczas zapisywania transakcji');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDocument = async () => {
    if (!formData.shareholder_name || formData.amount <= 0) {
      toast.error('Uzupełnij dane wspólnika i kwotę przed wygenerowaniem dokumentu');
      return;
    }

    setGeneratingPdf(true);
    try {
      // Fetch company data
      const businessProfile = await getBusinessProfileById(businessProfileId);
      if (!businessProfile) {
        throw new Error('Nie znaleziono profilu firmy');
      }

      // Get selected cash register
      const selectedCashAccount = cashAccounts.find(acc => acc.id === formData.cash_account_id);
      if (!selectedCashAccount) {
        throw new Error('Wybierz kasę fiskalną');
        return;
      }

      // Generate PDF
      const pdfBlob = await generateCashContributionDeclaration({
        companyName: businessProfile.companyName || businessProfile.name,
        companyAddress: `${businessProfile.address || ''}, ${businessProfile.postalCode || ''} ${businessProfile.city || ''}`.trim(),
        companyNIP: businessProfile.taxId || '',
        companyKRS: businessProfile.krs,
        shareholderName: formData.shareholder_name,
        shareholderAddress: undefined, // TODO: Get from shareholder data if available
        shareholderPESEL: undefined, // TODO: Get from shareholder data if available
        amount: formData.amount,
        currency: 'PLN',
        contributionDate: formData.transaction_date,
        cashRegisterName: selectedCashAccount.name,
        boardMembers: [], // TODO: Get board members from company data
        paymentMethod: 'cash',
        bankAccount: undefined,
        transferReference: undefined,
      });

      // Download the PDF
      const fileName = `Oswiadczenie_wplaty_${formData.shareholder_name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      downloadPDF(pdfBlob, fileName);

      toast.success('Dokument wygenerowany. Podpisz go i prześlij.');
      setDocumentStep('upload');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Błąd podczas generowania dokumentu');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Proszę przesłać plik PDF');
      return;
    }

    try {
      toast.info('Przesyłanie dokumentu...');
      
      // Upload document to storage
      const uploadedDoc = await uploadCapitalContributionDocument(
        file,
        businessProfileId,
        {
          shareholderName: formData.shareholder_name,
          amount: formData.amount,
          contributionDate: formData.transaction_date,
          documentType: 'cash_contribution_declaration',
        }
      );

      setUploadedDocument(file);
      setUploadedDocumentId(uploadedDoc.id);
      setDocumentStep('complete');
      toast.success('Dokument przesłany pomyślnie');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Błąd podczas przesyłania dokumentu');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" aria-describedby={descriptionId}>
        <DialogHeader>
          <DialogTitle>Nowa transakcja kapitałowa</DialogTitle>
          <DialogDescription id={descriptionId}>
            Dodaj zdarzenie kapitałowe dla spółki (np. wniesienie kapitału, dywidenda).
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Typ transakcji</label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value: EquityTransaction['transaction_type']) => 
                setFormData({ ...formData, transaction_type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capital_contribution">Wniesienie kapitału</SelectItem>
                <SelectItem value="capital_withdrawal">Wypłata kapitału</SelectItem>
                <SelectItem value="retained_earnings">Zyski zatrzymane</SelectItem>
                <SelectItem value="dividend">Dywidenda</SelectItem>
                <SelectItem value="other">Inne</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Data transakcji</label>
            <Input
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Kwota (PLN)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Wspólnik *</label>
            <Input
              value={formData.shareholder_name}
              onChange={(e) => setFormData({ ...formData, shareholder_name: e.target.value })}
              placeholder="Jan Kowalski"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Opis (opcjonalnie)</label>
            <textarea
              className="w-full px-3 py-2 border rounded-md min-h-[80px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Dodatkowe informacje..."
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Metoda płatności</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value: 'bank' | 'cash') => 
                setFormData({ ...formData, payment_method: value, cash_account_id: '', bank_account_id: '' })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Przelew bankowy
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Gotówka
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.payment_method === 'cash' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Kasa fiskalna *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigate('/accounting/kasa');
                    onOpenChange(false);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Dodaj kasę
                </Button>
              </div>
              <Select
                value={formData.cash_account_id}
                onValueChange={(value) => setFormData({ ...formData, cash_account_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kasę" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.length === 0 ? (
                    <SelectItem value="no-accounts" disabled>
                      Brak aktywnych kas
                    </SelectItem>
                  ) : (
                    cashAccounts
                      .filter(acc => acc.status === 'active')
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {account.current_balance.toFixed(2)} {account.currency}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.payment_method === 'bank' && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Konto bankowe *</Label>
              {bankAccounts.length === 0 && (
                <Alert className="mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Brak kont bankowych. Dodaj konto bankowe przed zapisaniem przelewu kapitałowego.
                  </AlertDescription>
                </Alert>
              )}
              <Select
                value={formData.bank_account_id}
                onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
                disabled={bankAccounts.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz konto" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length === 0 ? (
                    <SelectItem value="no-accounts" disabled>
                      Brak kont bankowych
                    </SelectItem>
                  ) : (
                    bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex flex-col">
                          <span>{account.account_name || account.bank_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {account.account_number}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cash Contribution Document Flow */}
          {formData.payment_method === 'cash' && formData.cash_account_id && (
            <div className="border rounded-lg p-4 space-y-4 bg-amber-50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">Oświadczenie wpłaty gotówkowej</h4>
                  <p className="text-xs text-muted-foreground">
                    Dla wpłat gotówkowych wymagane jest podpisane oświadczenie wspólnika i zarządu
                  </p>
                </div>
              </div>

              {/* Step 1: Generate PDF */}
              {documentStep === 'none' && (
                <div className="space-y-3">
                  <div className="text-sm">
                    <strong>Krok 1:</strong> Wygeneruj dokument oświadczenia
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGenerateDocument}
                    disabled={generatingPdf || !formData.cash_account_id}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generatingPdf ? 'Generowanie...' : 'Pobierz oświadczenie (PDF)'}
                  </Button>
                </div>
              )}

              {/* Step 2: Upload Signed PDF */}
              {(documentStep === 'upload' || documentStep === 'complete') && (
                <div className="space-y-3">
                  <div className="text-sm">
                    <strong>Krok 2:</strong> Prześlij podpisany dokument
                  </div>
                  {documentStep === 'complete' && uploadedDocument ? (
                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm flex-1">{uploadedDocument.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUploadedDocument(null);
                          setDocumentStep('upload');
                        }}
                      >
                        Zmień
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="document-upload"
                      />
                      <label htmlFor="document-upload">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          asChild
                        >
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Prześlij podpisany PDF
                          </span>
                        </Button>
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Dokument musi być podpisany przez wspólnika i zarząd (elektronicznie lub zeskanowany)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Anuluj
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CapitalContributionDialog;
