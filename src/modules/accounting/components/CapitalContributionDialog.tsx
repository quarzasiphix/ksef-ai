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
import { Wallet, Building2, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CapitalContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessProfileId: string;
  onSuccess?: () => void;
}

const CapitalContributionDialog: React.FC<CapitalContributionDialogProps> = ({
  open,
  onOpenChange,
  businessProfileId,
  onSuccess
}) => {
  const descriptionId = useId();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    transaction_type: 'capital_contribution' as EquityTransaction['transaction_type'],
    amount: 0,
    shareholder_name: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'bank' as 'bank' | 'cash',
    cash_account_id: '',
    bank_account_id: ''
  });
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
    if (formData.amount <= 0) {
      toast.error('Kwota musi być większa od zera');
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
        bank_account_id: formData.payment_method === 'bank' ? formData.bank_account_id : undefined
      });

      toast.success('Transakcja kapitałowa zapisana');
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={descriptionId}>
        <DialogHeader>
          <DialogTitle>Nowa transakcja kapitałowa</DialogTitle>
          <DialogDescription id={descriptionId}>
            Dodaj zdarzenie kapitałowe dla spółki (np. wniesienie kapitału, dywidenda).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
            <label className="text-sm font-medium mb-2 block">Wspólnik (opcjonalnie)</label>
            <Input
              value={formData.shareholder_name}
              onChange={(e) => setFormData({ ...formData, shareholder_name: e.target.value })}
              placeholder="Jan Kowalski"
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
        </div>
        <DialogFooter>
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
