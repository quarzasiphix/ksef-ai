import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Link } from 'react-router-dom';
import { Crown, Star, Check, ArrowRight } from 'lucide-react';

interface PremiumUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName?: string;
  entityType?: 'jdg' | 'spolka';
}

export const PremiumUpgradeDialog: React.FC<PremiumUpgradeDialogProps> = ({
  open,
  onOpenChange,
  businessName = 'Twojej firmie',
  entityType = 'jdg'
}) => {
  // Fetch currency settings
  const { data: currencySettings } = useQuery({
    queryKey: ['currency-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('currency, currency_symbol, blik_enabled')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const formatPrice = (amount: number) => {
    const currency = currencySettings?.currency || 'EUR';
    const locale = currency === 'PLN' ? 'pl-PL' : 'de-DE';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  };

  // Pricing based on currency
  const jdgPricing = currencySettings?.currency === 'EUR' 
    ? { monthly: 500, annual: 5000 } // 5 EUR, 50 EUR
    : { monthly: 1900, annual: 19000 }; // 19 PLN, 190 PLN

  const spolkaPricing = currencySettings?.currency === 'EUR'
    ? { monthly: 2100, annual: 21000 } // 21 EUR, 210 EUR  
    : { monthly: 8900, annual: 89000 }; // 89 PLN, 890 PLN
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Odblokuj Premium dla {businessName}
          </DialogTitle>
          <DialogDescription>
            Wykup subskrypcję Premium, aby uzyskać dostęp do wszystkich funkcji
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Plan for Current Entity Type */}
          {entityType === 'jdg' ? (
            <Card className="relative overflow-hidden border-2 border-green-500">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-medium">
                Dla Twojej firmy
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">JDG Premium</CardTitle>
                  <Badge variant="default">Dla JDG</Badge>
                </div>
                <CardDescription>
                  Idealny dla jednoosobowych działalności gospodarczych
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Nieograniczone faktury</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Podstawowa księgowość</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Eksport JPK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">KSeF integracja</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Raporty finansowe</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{formatPrice(jdgPricing.monthly)}</div>
                  <div className="text-sm text-gray-500">miesięcznie</div>
                  <div className="text-sm text-green-600 font-medium">
                    Rocznie: {formatPrice(jdgPricing.annual)} (oszczędzasz {formatPrice(jdgPricing.monthly * 2)})
                  </div>
                </div>

                <Button asChild className="w-full" size="lg">
                  <Link to="/premium/checkout">
                    Wybierz plan JDG <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="relative overflow-hidden border-2 border-blue-500">
              <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-medium">
                Dla Twojej firmy
              </div>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Spółka Standard</CardTitle>
                  <Badge variant="default">Dla Spółek</Badge>
                </div>
                <CardDescription>
                  Pełny system governance dla spółek z o.o. i S.A.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Wszystko z JDG Premium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">System uchwał i decyzji</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Zarządzanie aktywami</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Ścieżka audytu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Śledzenie kapitału</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-3xl font-bold">{formatPrice(spolkaPricing.monthly)}</div>
                  <div className="text-sm text-gray-500">miesięcznie</div>
                  <div className="text-sm text-green-600 font-medium">
                    Rocznie: {formatPrice(spolkaPricing.annual)} (oszczędzasz {formatPrice(spolkaPricing.monthly * 2)})
                  </div>
                </div>

                <Button asChild className="w-full" size="lg">
                  <Link to="/premium/checkout">
                    Wybierz plan Spółka <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Other Entity Type Option */}
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-4">
              Masz również firmę innego typu?
            </p>
            <Button variant="outline" asChild>
              <Link to="/premium">
                Zobacz wszystkie plany <Star className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
