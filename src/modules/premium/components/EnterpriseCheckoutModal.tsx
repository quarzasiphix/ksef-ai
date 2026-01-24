import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Building2, Check, Loader2, AlertCircle } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/hooks/useAuth';

interface EnterpriseCheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

export const EnterpriseCheckoutModal: React.FC<EnterpriseCheckoutModalProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const { companies, enterprisePricing, isLoading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (priceInGrosze: number) => {
    return (priceInGrosze / 100).toFixed(0);
  };

  const getEntityTypeDisplay = (entityType: string) => {
    switch (entityType) {
      case 'dzialalnosc': return 'JDG';
      case 'sp_zoo': return 'Sp. z o.o.';
      case 'sa': return 'S.A.';
      default: return entityType;
    }
  };

  const handleCheckout = async () => {
    if (!user || !enterprisePricing) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('create-enterprise-checkout', {
        body: {
          userId: user.id,
          pricing: enterprisePricing,
          companies: companies?.map(c => ({
            id: c.id,
            name: c.name,
            entity_type: c.entity_type
          }))
        }
      });

      if (functionError) throw functionError;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to create checkout session');
      setCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Enterprise Plan</DialogTitle>
          <DialogDescription>
            Premium dla wszystkich Twoich firm z jedną subskrypcją
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Companies Overview */}
          <Card className="bg-neutral-50 border-neutral-200">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Twoje firmy ({companies?.length || 0})
              </h3>
              <div className="space-y-2">
                {companies?.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-2 bg-white rounded border border-neutral-200">
                    <div>
                      <p className="font-medium text-sm">{company.name}</p>
                      <p className="text-xs text-neutral-500">NIP: {company.tax_id}</p>
                    </div>
                    <Badge variant="outline" className="border-neutral-300">
                      {getEntityTypeDisplay(company.entity_type)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pricing Breakdown */}
          {enterprisePricing && (
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Kalkulacja ceny</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Cena bazowa Enterprise</span>
                    <span className="font-medium">{formatPrice(enterprisePricing.base_price)} zł</span>
                  </div>
                  {enterprisePricing.jdg_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">
                        {enterprisePricing.jdg_count} × JDG ({formatPrice(enterprisePricing.per_jdg_price)} zł każda)
                      </span>
                      <span className="font-medium">
                        {formatPrice(enterprisePricing.per_jdg_price * enterprisePricing.jdg_count)} zł
                      </span>
                    </div>
                  )}
                  {enterprisePricing.spolka_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-600">
                        {enterprisePricing.spolka_count} × Spółka ({formatPrice(enterprisePricing.per_spolka_price)} zł każda)
                      </span>
                      <span className="font-medium">
                        {formatPrice(enterprisePricing.per_spolka_price * enterprisePricing.spolka_count)} zł
                      </span>
                    </div>
                  )}
                  <div className="border-t border-purple-200 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Razem miesięcznie</span>
                      <span className="text-purple-600">
                        {formatPrice(enterprisePricing.total_monthly_price)} zł
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">
                    * Cena automatycznie dostosowuje się do liczby firm
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 text-emerald-900">Co otrzymujesz?</h3>
              <div className="space-y-2">
                {[
                  'Premium dla wszystkich obecnych firm',
                  'Automatyczne premium dla nowych firm',
                  'Jedna faktura za wszystko',
                  'Priorytetowe wsparcie',
                  'Zaawansowane funkcje dla wszystkich firm',
                  'Możliwość anulowania w każdej chwili'
                ].map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2">
                    <div className="flex-shrink-0 bg-emerald-600 rounded-full p-1 mt-0.5">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                    <p className="text-sm text-emerald-900">{benefit}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Błąd</p>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={checkoutLoading}
              className="flex-1"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={checkoutLoading || !enterprisePricing}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Przygotowywanie...
                </>
              ) : (
                <>
                  Przejdź do płatności
                  {enterprisePricing && (
                    <span className="ml-2">
                      ({formatPrice(enterprisePricing.total_monthly_price)} zł/mies.)
                    </span>
                  )}
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-neutral-500">
            Zostaniesz przekierowany do bezpiecznej strony płatności Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
