import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { toast } from 'sonner';
import { saveCapitalEvent } from '@/integrations/supabase/repositories/spolkaRepository';
import type { CapitalEventType } from '@/shared/types/spolka';
import { getCapitalEventTypeLabel } from '@/shared/types/spolka';

interface CapitalEventsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessProfileId: string;
  shareholders?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export const CapitalEventsDialog: React.FC<CapitalEventsDialogProps> = ({
  open,
  onOpenChange,
  businessProfileId,
  shareholders = [],
  onSuccess,
}) => {
  const [eventType, setEventType] = useState<CapitalEventType>('capital_contribution');
  const [shareholderId, setShareholderId] = useState<string>('none');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Podaj prawidłową kwotę');
      return;
    }

    setSaving(true);
    try {
      await saveCapitalEvent({
        business_profile_id: businessProfileId,
        shareholder_id: shareholderId === 'none' ? undefined : shareholderId,
        event_type: eventType,
        event_date: eventDate,
        amount: parseFloat(amount),
        description: description || undefined,
        affects_balance_sheet: true,
        balance_sheet_line: eventType === 'capital_contribution' ? 'P.I' : 'P.II',
      });

      toast.success('Zdarzenie kapitałowe zapisane');
      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setEventType('capital_contribution');
      setShareholderId('none');
      setEventDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setDescription('');
    } catch (error) {
      console.error('Error saving capital event:', error);
      toast.error('Błąd zapisu zdarzenia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Dodaj zdarzenie kapitałowe</DialogTitle>
          <DialogDescription>
            Zarejestruj transakcję kapitałową (wkład, dywidenda, podział zysku)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="eventType">Typ zdarzenia</Label>
            <Select value={eventType} onValueChange={(value) => setEventType(value as CapitalEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="capital_contribution">Wniesienie kapitału</SelectItem>
                <SelectItem value="dividend_payout">Wypłata dywidendy</SelectItem>
                <SelectItem value="profit_allocation">Podział zysku</SelectItem>
                <SelectItem value="loss_coverage">Pokrycie straty</SelectItem>
                <SelectItem value="capital_increase">Podwyższenie kapitału</SelectItem>
                <SelectItem value="capital_decrease">Obniżenie kapitału</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shareholders.length > 0 && (
            <div>
              <Label htmlFor="shareholder">Wspólnik (opcjonalnie)</Label>
              <Select value={shareholderId} onValueChange={setShareholderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz wspólnika" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Brak (ogólne)</SelectItem>
                  {shareholders.map(sh => (
                    <SelectItem key={sh.id} value={sh.id}>
                      {sh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="eventDate">Data zdarzenia</Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="amount">Kwota (PLN)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="description">Opis (opcjonalnie)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dodatkowe informacje o zdarzeniu"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Anuluj
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CapitalEventsDialog;
