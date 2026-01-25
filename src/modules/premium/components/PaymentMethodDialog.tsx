import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { CreditCard, Smartphone, AlertCircle, Info } from 'lucide-react';

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentMethodSelect: (method: 'blik' | 'card') => void;
  totalAmount: number;
  businessCount: number;
  billingCycle: 'monthly' | 'annual';
  blikEnabled?: boolean;
  currency?: string;
  currencySymbol?: string;
}

export const PaymentMethodDialog: React.FC<PaymentMethodDialogProps> = ({
  open,
  onOpenChange,
  onPaymentMethodSelect,
  totalAmount,
  businessCount,
  billingCycle,
  blikEnabled = false,
  currency = 'EUR',
  currencySymbol = '€'
}) => {
  const formatPrice = (amount: number) => {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Wybierz metodę płatności</DialogTitle>
          <DialogDescription>
            Wybierz, jak chcesz zapłacić za subskrypcję Premium
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credit Card (Subscription) */}
          <Card 
            className="cursor-pointer border-2 border-blue-500 hover:border-blue-600 transition-colors"
            onClick={() => onPaymentMethodSelect('card')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Karta kredytowa
                </CardTitle>
                <Badge variant="default">Zalecane</Badge>
              </div>
              <CardDescription>
n                Automatyczne odnawianie co miesiąc
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Automatyczne odnawianie</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Brak konieczności ręcznej płatności</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Możliwość anulowania w każdej chwili</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Wspomniane faktury</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Suma:</span>
                    <span className="font-semibold">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cykl:</span>
                    <span className="font-semibold">
                      {billingCycle === 'annual' ? 'Roczny' : 'Miesięczny'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blik (One-time) - Only show if enabled */}
          {blikEnabled && (
          <Card 
            className="cursor-pointer border-2 border-gray-200 hover:border-gray-300 transition-colors"
            onClick={() => onPaymentMethodSelect('blik')}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="h-5 w-5" />
                  Blik
                </CardTitle>
                <Badge variant="secondary">Jednorazowe</Badge>
              </div>
              <CardDescription>
n                Płatność jednorazowa za pierwszy miesiąc
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Info className="h-4 w-4" />
                <span>Szybka płatność</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Info className="h-4 w-4" />
                <span>Bez podawania danych karty</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertCircle className="h-4 w-4" />
                <span>Wymagualna płatność co miesiąc</span>
              </div>
              <div className="pt-2 border-t">
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Suma:</span>
                    <span className="font-semibold">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Okres:</span>
                    <span className="font-semibold">1 miesiąc</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Info Section */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-2">Informacje o metodach płatności:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>Karta kredytowa:</strong> Automatyczne odnawianie subskrypcji, brak konieczności pamiętania o płatności</li>
                  {blikEnabled && (
                    <>
                      <li>• <strong>Blik:</strong> Jednorazowa płatność za pierwszy miesiąc, następnie trzeba ręcznie odnowić subskrypcję</li>
                      <li>• Obie metody wspierają płatność P24 dla użytkowników bez Blik</li>
                    </>
                  )}
                  {!blikEnabled && (
                    <li>• Płatności w {currency} są obsługiwane wyłącznie kartą kredytową</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Anuluj
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Helper component for check icon
const Check = ({ className }: { className?: string }) => (
  <svg 
    className={`w-4 h-4 text-green-600 ${className || ''}`} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
