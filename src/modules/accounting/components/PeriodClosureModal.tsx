import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { formatPeriodName } from '../utils/periodState';

interface PeriodClosureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  month: number;
  totalRevenue: number;
  totalTax: number;
  invoiceCount: number;
  onConfirm: (lockPeriod: boolean, note?: string) => Promise<void>;
}

export function PeriodClosureModal({
  open,
  onOpenChange,
  year,
  month,
  totalRevenue,
  totalTax,
  invoiceCount,
  onConfirm,
}: PeriodClosureModalProps) {
  const [lockPeriod, setLockPeriod] = useState(false);
  const [note, setNote] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const periodName = formatPeriodName(year, month);

  const handleConfirm = async () => {
    if (!confirmChecked) return;

    setIsClosing(true);
    try {
      await onConfirm(lockPeriod, note || undefined);
      onOpenChange(false);
      // Reset state
      setLockPeriod(false);
      setNote('');
      setConfirmChecked(false);
    } catch (error) {
      console.error('Error closing period:', error);
    } finally {
      setIsClosing(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset state
    setLockPeriod(false);
    setNote('');
    setConfirmChecked(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="h-5 w-5" />
            Zamknięcie okresu księgowego
          </DialogTitle>
          <DialogDescription>
            Zamykasz okres: <span className="font-semibold">{periodName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Period Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3">Podsumowanie okresu</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-blue-700">Przychody</p>
                <p className="text-lg font-bold text-blue-900">
                  {totalRevenue.toFixed(2)} PLN
                </p>
              </div>
              <div>
                <p className="text-blue-700">Podatek</p>
                <p className="text-lg font-bold text-blue-900">
                  {totalTax.toFixed(2)} PLN
                </p>
              </div>
              <div>
                <p className="text-blue-700">Faktury</p>
                <p className="text-lg font-bold text-blue-900">
                  {invoiceCount}
                </p>
              </div>
            </div>
          </div>

          {/* What happens */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Co się stanie po zamknięciu okresu?
            </h3>
            <ul className="space-y-2 text-sm text-amber-800">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Zostanie utworzone niezmienne zdarzenie księgowe z podsumowaniem okresu</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Stan ewidencji zostanie zapisany jako migawka historyczna</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Okres zostanie oznaczony jako "zamknięty"</span>
              </li>
              {lockPeriod && (
                <li className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-red-700">
                    Okres zostanie zablokowany - nie będzie można go ponownie otworzyć
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Lock option */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="lock-period"
                checked={lockPeriod}
                onCheckedChange={(checked) => setLockPeriod(checked as boolean)}
              />
              <div className="flex-1">
                <Label
                  htmlFor="lock-period"
                  className="text-sm font-medium cursor-pointer"
                >
                  Zablokuj okres (nieodwracalne)
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Zablokowany okres nie może być ponownie otwarty. Wybierz tę opcję tylko jeśli
                  okres został zgłoszony do urzędu skarbowego i nie będzie wymagał korekt.
                </p>
              </div>
            </div>
          </div>

          {/* Optional note */}
          <div>
            <Label htmlFor="closure-note" className="text-sm font-medium">
              Notatka (opcjonalnie)
            </Label>
            <Textarea
              id="closure-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dodaj notatkę do zamknięcia okresu..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Confirmation checkbox */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm-closure"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
              />
              <Label
                htmlFor="confirm-closure"
                className="text-sm font-medium cursor-pointer"
              >
                Potwierdzam, że wszystkie dokumenty zostały zaksięgowane i rozumiem konsekwencje
                zamknięcia okresu
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isClosing}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmChecked || isClosing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isClosing ? 'Zamykanie...' : 'Zamknij okres'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
