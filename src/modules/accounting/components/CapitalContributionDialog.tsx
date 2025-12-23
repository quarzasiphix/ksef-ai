import React, { useId, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { toast } from 'sonner';
import { createEquityTransaction } from '@/integrations/supabase/repositories/accountingRepository';
import type { EquityTransaction } from '@/modules/accounting/accounting';
import { format } from 'date-fns';

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
  const [formData, setFormData] = useState({
    transaction_type: 'capital_contribution' as EquityTransaction['transaction_type'],
    amount: 0,
    shareholder_name: '',
    description: '',
    transaction_date: format(new Date(), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (formData.amount <= 0) {
      toast.error('Kwota musi być większa od zera');
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
        transaction_date: formData.transaction_date
      });

      toast.success('Transakcja kapitałowa zapisana');
      onOpenChange(false);
      setFormData({
        transaction_type: 'capital_contribution',
        amount: 0,
        shareholder_name: '',
        description: '',
        transaction_date: format(new Date(), 'yyyy-MM-dd')
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
