import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Badge } from '@/shared/ui/badge';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft, FileText, Wallet, BookOpen, Plus, X, Building2 } from 'lucide-react';
import type { CapitalEventWizardData, CapitalEventType } from '@/modules/accounting/types/capital';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getCashAccounts } from '@/modules/accounting/data/kasaRepository';
import { getBankAccountsForProfile } from '@/modules/banking/data/bankAccountRepository';
import { createCapitalEventFromWizard } from '@/modules/accounting/data/capitalEventsRepository';

interface CapitalEventWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessProfileId: string;
  onSuccess?: () => void;
}

type WizardStep = 'type' | 'shareholders' | 'decision' | 'payment' | 'posting';

const CapitalEventWizard: React.FC<CapitalEventWizardProps> = ({
  open,
  onOpenChange,
  businessProfileId,
  onSuccess
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [formData, setFormData] = useState<CapitalEventWizardData>({
    event_type: 'capital_contribution',
    shareholders: [{ shareholder_name: '', amount: 0 }],
    event_date: format(new Date(), 'yyyy-MM-dd'),
    decision_option: 'none',
    payment_option: 'to_be_paid',
    posting_option: 'awaiting_accounting'
  });

  const steps: WizardStep[] = ['type', 'shareholders', 'decision', 'payment', 'posting'];
  const currentStepIndex = steps.indexOf(currentStep);

  const getEventTypeLabel = (type: CapitalEventType) => {
    const labels = {
      capital_contribution: 'Wniesienie kapitału',
      capital_withdrawal: 'Wypłata kapitału',
      dividend: 'Dywidenda',
      capital_increase: 'Podwyższenie kapitału',
      supplementary_payment: 'Dopłata (art. 177 KSH)',
      retained_earnings: 'Zyski zatrzymane',
      other: 'Inne'
    };
    return labels[type] || type;
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  const [loading, setLoading] = useState(false);

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
    try {
      // Validate shareholders
      const validShareholders = formData.shareholders.filter(
        s => s.shareholder_name && s.amount > 0
      );

      if (validShareholders.length === 0) {
        toast.error('Dodaj przynajmniej jednego wspólnika z kwotą większą od zera');
        return;
      }

      // Validate payment method selection
      if (formData.payment_option === 'link_existing') {
        if (formData.payment_type === 'cash_document' && !formData.cash_account_id) {
          toast.error('Wybierz kasę fiskalną');
          return;
        }
        if (formData.payment_type === 'bank_transaction' && !formData.bank_account_id) {
          toast.error('Wybierz konto bankowe');
          return;
        }
      }

      // Validate posting accounts if generating now
      if (formData.posting_option === 'generate_now') {
        if (!formData.debit_account || !formData.credit_account) {
          toast.error('Podaj konta księgowe (Wn i Ma)');
          return;
        }
      }

      setLoading(true);
      
      const events = await createCapitalEventFromWizard(formData, businessProfileId);
      
      toast.success(`Utworzono ${events.length} zdarzenie(ń) kapitałowe(ych)`);
      onOpenChange(false);
      
      // Reset form
      setCurrentStep('type');
      setFormData({
        event_type: 'capital_contribution',
        shareholders: [{ shareholder_name: '', amount: 0 }],
        event_date: format(new Date(), 'yyyy-MM-dd'),
        decision_option: 'none',
        payment_option: 'to_be_paid',
        posting_option: 'awaiting_accounting'
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating capital event:', error);
      toast.error('Błąd podczas tworzenia zdarzenia: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addShareholder = () => {
    setFormData({
      ...formData,
      shareholders: [...formData.shareholders, { shareholder_name: '', amount: 0 }]
    });
  };

  const removeShareholder = (index: number) => {
    setFormData({
      ...formData,
      shareholders: formData.shareholders.filter((_, i) => i !== index)
    });
  };

  const updateShareholder = (index: number, field: 'shareholder_name' | 'amount', value: string | number) => {
    const updated = [...formData.shareholders];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, shareholders: updated });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'type':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Typ zdarzenia kapitałowego</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value: CapitalEventType) => 
                  setFormData({ ...formData, event_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capital_contribution">Wniesienie kapitału</SelectItem>
                  <SelectItem value="supplementary_payment">Dopłata (art. 177 KSH)</SelectItem>
                  <SelectItem value="dividend">Dywidenda</SelectItem>
                  <SelectItem value="capital_increase">Podwyższenie kapitału</SelectItem>
                  <SelectItem value="capital_withdrawal">Wypłata kapitału</SelectItem>
                  <SelectItem value="retained_earnings">Zyski zatrzymane</SelectItem>
                  <SelectItem value="other">Inne</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Data zdarzenia</Label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Wybrano:</strong> {getEventTypeLabel(formData.event_type)}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Utworzysz pełny łańcuch księgowy: decyzja → płatność → księga
              </p>
            </div>
          </div>
        );

      case 'shareholders':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Wspólnicy i kwoty</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Określ, którzy wspólnicy są objęci tym zdarzeniem i jakie kwoty
              </p>
            </div>

            {formData.shareholders.map((shareholder, index) => (
              <div key={index} className="flex items-start gap-2 p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Imię i nazwisko wspólnika"
                    value={shareholder.shareholder_name}
                    onChange={(e) => updateShareholder(index, 'shareholder_name', e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Kwota (PLN)"
                    value={shareholder.amount || ''}
                    onChange={(e) => updateShareholder(index, 'amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                {formData.shareholders.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeShareholder(index)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={addShareholder}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj kolejnego wspólnika
            </Button>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">
                Łącznie: {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
                  formData.shareholders.reduce((sum, s) => sum + (s.amount || 0), 0)
                )}
              </p>
            </div>
          </div>
        );

      case 'decision':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <Label className="text-sm font-medium">Podstawa prawna</Label>
            </div>

            <RadioGroup
              value={formData.decision_option}
              onValueChange={(value: 'existing' | 'new' | 'none') =>
                setFormData({ ...formData, decision_option: value })
              }
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="existing" id="existing" />
                <Label htmlFor="existing" className="flex-1 cursor-pointer">
                  Powiąż z istniejącą decyzją
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="flex-1 cursor-pointer">
                  Utwórz nową decyzję
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="flex-1 cursor-pointer">
                  Bez powiązania (dodaj później)
                </Label>
              </div>
            </RadioGroup>

            {formData.decision_option === 'new' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Typ decyzji</Label>
                  <Select
                    value={formData.new_decision?.type}
                    onValueChange={(value: any) =>
                      setFormData({
                        ...formData,
                        new_decision: { ...formData.new_decision!, type: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz typ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shareholder_resolution">Uchwała zgromadzenia wspólników</SelectItem>
                      <SelectItem value="company_agreement">Umowa spółki</SelectItem>
                      <SelectItem value="share_subscription">Oświadczenie o objęciu udziałów</SelectItem>
                      <SelectItem value="board_decision">Decyzja zarządu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Numer referencyjny</Label>
                  <Input
                    placeholder="np. U/2025/003"
                    value={formData.new_decision?.reference || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        new_decision: { ...formData.new_decision!, reference: e.target.value }
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Data decyzji</Label>
                  <Input
                    type="date"
                    value={formData.new_decision?.date || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        new_decision: { ...formData.new_decision!, date: e.target.value }
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-5 w-5 text-green-600" />
              <Label className="text-sm font-medium">Źródło pieniędzy</Label>
            </div>

            <RadioGroup
              value={formData.payment_option}
              onValueChange={(value: 'link_existing' | 'to_be_paid') =>
                setFormData({ ...formData, payment_option: value })
              }
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="link_existing" id="link_existing" />
                <Label htmlFor="link_existing" className="flex-1 cursor-pointer">
                  Powiąż z transakcją bankową/kasową
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="to_be_paid" id="to_be_paid" />
                <Label htmlFor="to_be_paid" className="flex-1 cursor-pointer">
                  Do wpłaty (brak płatności)
                </Label>
              </div>
            </RadioGroup>

            {formData.payment_option === 'link_existing' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Typ płatności</Label>
                  <Select
                    value={formData.payment_type}
                    onValueChange={(value: 'bank_transaction' | 'cash_document') =>
                      setFormData({ ...formData, payment_type: value, cash_account_id: undefined, bank_account_id: undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz typ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash_document">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Dokument kasowy (KP)
                        </div>
                      </SelectItem>
                      <SelectItem value="bank_transaction">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Transakcja bankowa
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {formData.payment_type === 'cash_document' && (
                  <div>
                    <Label className="text-xs">Kasa fiskalna *</Label>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Zostanie automatycznie wygenerowany dokument KP
                    </p>
                  </div>
                )}
                
                {formData.payment_type === 'bank_transaction' && (
                  <div>
                    <Label className="text-xs">Konto bankowe *</Label>
                    <Select
                      value={formData.bank_account_id}
                      onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
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
                                <span>{account.accountName || account.bankName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {account.accountNumber}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {formData.payment_option === 'to_be_paid' && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  ⚠️ Zdarzenie zostanie utworzone bez powiązania z płatnością. Będzie można je dodać później.
                </p>
              </div>
            )}
          </div>
        );

      case 'posting':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <Label className="text-sm font-medium">Zaksięgowanie</Label>
            </div>

            <RadioGroup
              value={formData.posting_option}
              onValueChange={(value: 'generate_now' | 'awaiting_accounting') =>
                setFormData({ ...formData, posting_option: value })
              }
            >
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="generate_now" id="generate_now" />
                <Label htmlFor="generate_now" className="flex-1 cursor-pointer">
                  Wygeneruj wpis księgowy teraz
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="awaiting_accounting" id="awaiting_accounting" />
                <Label htmlFor="awaiting_accounting" className="flex-1 cursor-pointer">
                  Oczekuje na zaksięgowanie
                </Label>
              </div>
            </RadioGroup>

            {formData.posting_option === 'generate_now' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label className="text-xs">Data księgowania</Label>
                  <Input
                    type="date"
                    value={formData.posting_date || formData.event_date}
                    onChange={(e) => setFormData({ ...formData, posting_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Konto Wn (debet)</Label>
                    <Input
                      placeholder="np. 130"
                      value={formData.debit_account || ''}
                      onChange={(e) => setFormData({ ...formData, debit_account: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Konto Ma (kredyt)</Label>
                    <Input
                      placeholder="np. 801"
                      value={formData.credit_account || ''}
                      onChange={(e) => setFormData({ ...formData, credit_account: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sugerowane konta dla wniesienia kapitału: 130 (Bank) → 801 (Kapitał zakładowy)
                </p>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                Podsumowanie zdarzenia kapitałowego
              </p>
              <div className="space-y-1 text-xs text-green-800 dark:text-green-200">
                <p>• Typ: {getEventTypeLabel(formData.event_type)}</p>
                <p>• Wspólników: {formData.shareholders.length}</p>
                <p>• Łączna kwota: {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(
                  formData.shareholders.reduce((sum, s) => sum + (s.amount || 0), 0)
                )}</p>
                <p>• Decyzja: {formData.decision_option === 'none' ? 'Brak' : formData.decision_option === 'new' ? 'Nowa' : 'Istniejąca'}</p>
                <p>• Płatność: {formData.payment_option === 'to_be_paid' ? 'Do wpłaty' : 'Powiązana'}</p>
                <p>• Księgowanie: {formData.posting_option === 'generate_now' ? 'Teraz' : 'Później'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    const titles = {
      type: 'Typ zdarzenia',
      shareholders: 'Wspólnicy i kwoty',
      decision: 'Podstawa prawna',
      payment: 'Źródło pieniędzy',
      posting: 'Zaksięgowanie'
    };
    return titles[currentStep];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kreator zdarzenia kapitałowego</DialogTitle>
          <DialogDescription>
            Krok {currentStepIndex + 1} z {steps.length}: {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-4">
          {steps.map((step, index) => (
            <React.Fragment key={step}>
              <div
                className={`flex-1 h-2 rounded-full transition-colors ${
                  index <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Wstecz
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
            {currentStepIndex < steps.length - 1 ? (
              <Button onClick={handleNext} disabled={loading}>
                Dalej
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Tworzenie...' : 'Utwórz zdarzenie'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CapitalEventWizard;
