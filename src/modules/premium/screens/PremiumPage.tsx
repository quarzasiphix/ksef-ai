import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Crown, Star, Check, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { supabase } from '@/integrations/supabase/client';

export const PremiumPage: React.FC = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);
  
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
  
  // Determine current entity type
  const currentEntityType = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa' 
    ? 'spolka' 
    : 'jdg';

  // Pricing based on currency
  const jdgPricing = currencySettings?.currency === 'EUR' 
    ? { monthly: 500, annual: 5000 } // 5 EUR, 50 EUR
    : { monthly: 1900, annual: 19000 }; // 19 PLN, 190 PLN

  const spolkaPricing = currencySettings?.currency === 'EUR'
    ? { monthly: 2100, annual: 21000 } // 21 EUR, 210 EUR  
    : { monthly: 8900, annual: 89000 }; // 89 PLN, 890 PLN

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-4">
          <Crown className="h-12 w-12 text-yellow-500 mr-3" />
          <h1 className="text-4xl font-bold">KsięgaI Premium</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Odblokuj pełnię funkcjonalności dla swojej firmy. Profesjonalne narzędzia księgowe i raportowanie.
        </p>
        {selectedProfile && (
          <p className="text-sm text-gray-500 mt-2">
            Obecnie przeglądasz: <span className="font-medium">{selectedProfile.name}</span> ({currentEntityType === 'jdg' ? 'JDG' : 'Spółka'})
          </p>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Current Entity Type Plan */}
        {currentEntityType === 'jdg' ? (
          <Card className="relative overflow-hidden border-2 border-green-500">
            <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-2 text-sm font-medium">
              Dla Twojej firmy
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">JDG Premium</CardTitle>
                <Badge variant="default">Dla JDG</Badge>
              </div>
              <CardDescription>
                Idealny dla jednoosobowych działalności gospodarczych
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">Nieograniczone faktury</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">Podstawowa księgowość</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">Eksport JPK</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">KSeF integracja</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-medium">Raporty finansowe</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-bold">{formatPrice(jdgPricing.monthly)}</div>
                <div className="text-lg text-gray-500">miesięcznie</div>
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
            <div className="absolute top-0 right-0 bg-blue-500 text-white px-4 py-2 text-sm font-medium">
              Dla Twojej firmy
            </div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Spółka Standard</CardTitle>
                <Badge variant="default">Dla Spółek</Badge>
              </div>
              <CardDescription>
                Pełny system governance dla spółek z o.o. i S.A.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Wszystko z JDG Premium</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">System uchwał i decyzji</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Zarządzanie aktywami</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Ścieżka audytu</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Śledzenie kapitału</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-bold">{formatPrice(spolkaPricing.monthly)}</div>
                <div className="text-lg text-gray-500">miesięcznie</div>
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

        {/* Other Entity Type Plan */}
        {currentEntityType === 'jdg' ? (
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Spółka Standard</CardTitle>
                <Badge variant="secondary">Dla Spółek</Badge>
              </div>
              <CardDescription>
                Pełny system governance dla spółek z o.o. i S.A.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Wszystko z JDG Premium</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">System uchwał i decyzji</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Zarządzanie aktywami</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Ścieżka audytu</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Śledzenie kapitału</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-bold text-gray-600">{formatPrice(spolkaPricing.monthly)}</div>
                <div className="text-lg text-gray-500">miesięcznie</div>
                <div className="text-sm text-gray-500">
                  Rocznie: {formatPrice(spolkaPricing.annual)} (oszczędzasz {formatPrice(spolkaPricing.monthly * 2)})
                </div>
              </div>

              <Button variant="outline" className="w-full" size="lg">
                <Link to="/premium/checkout">
                  Wybierz plan Spółka <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">JDG Premium</CardTitle>
                <Badge variant="secondary">Dla JDG</Badge>
              </div>
              <CardDescription>
                Idealny dla jednoosobowych działalności gospodarczych
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Nieograniczone faktury</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Podstawowa księgowość</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Eksport JPK</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">KSeF integracja</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-gray-600" />
                  </div>
                  <span className="font-medium">Raporty finansowe</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-4xl font-bold text-gray-600">{formatPrice(jdgPricing.monthly)}</div>
                <div className="text-lg text-gray-500">miesięcznie</div>
                <div className="text-sm text-gray-500">
                  Rocznie: {formatPrice(jdgPricing.annual)} (oszczędzasz {formatPrice(jdgPricing.monthly * 2)})
                </div>
              </div>

              <Button variant="outline" className="w-full" size="lg">
                <Link to="/premium/checkout">
                  Wybierz plan JDG <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Features */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Wszystkie funkcje Premium</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-8 w-8 text-blue-500" />
                <h3 className="text-lg font-semibold">Automatyzacja</h3>
              </div>
              <p className="text-gray-600">
                Automatyczne generowanie JPK, integracja z KSeF, automatyczne obliczenia podatkowe
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-8 w-8 text-green-500" />
                <h3 className="text-lg font-semibold">Bezpieczeństwo</h3>
              </div>
              <p className="text-gray-600">
                Szyfrowanie danych, kopie zapasowe, zgodność z RODO, bezpieczne przechowywanie dokumentów
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <h3 className="text-lg font-semibold">Analityka</h3>
              </div>
              <p className="text-gray-600">
                Szczegółowe raporty finansowe, analiza rentowności, prognozy cash flow, dashboardy
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center justify-center mb-4">
              <Star className="h-8 w-8 text-yellow-500 mr-2" />
              <h3 className="text-2xl font-bold">Gotowy na start?</h3>
            </div>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Dołącz do setek firm, które już zaufały KsięgaI. Wybierz plan odpowiedni dla swojej firmy i zacznij oszczędzać czas.
            </p>
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600">
              <Link to="/premium/checkout">
                Rozpocznij teraz <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
