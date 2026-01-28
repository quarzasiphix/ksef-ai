import { useAuth } from "@/shared/hooks/useAuth";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/shared/ui/button";
import { Check, Crown, Sparkles, ArrowRight, FileText, Shield, Building2 } from "lucide-react";
import { Link, Routes, Route } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import PremiumJDG from "./PremiumJDG";
import PremiumSpolka from "./PremiumSpolka";

// Entity-based pricing: JDG vs Spółka
const entityPlans = [
  {
    id: 'jdg',
    name: 'JDG',
    subtitle: 'Księgowość',
    price: 19,
    interval: 'miesiąc',
    annualPrice: 190,
    entityType: 'JDG (jednoosobowa działalność)',
    tagline: 'Prosty system dla osób prowadzących JDG',
    features: [
      'Nieograniczone faktury i dokumenty',
      'Podstawowa księgowość',
      'Eksport JPK',
      'Uproszczony system decyzji',
    ],
    badge: undefined,
  },
  {
    id: 'spolka',
    name: 'Spółka Standard',
    subtitle: 'Odpowiedzialność',
    price: 89,
    interval: 'miesiąc',
    annualPrice: 890,
    entityType: 'Spółka z o.o. / S.A.',
    tagline: 'Pełny system governance dla spółek',
    features: [
      'System uchwał i decyzji',
      'Zarządzanie aktywami (nieruchomości, pojazdy, IP)',
      'Decyzje powiązane z wydatkami',
      'Ścieżka audytu i odpowiedzialność',
      'Śledzenie kapitału i wspólników',
      'Nieograniczone dokumenty',
      'Architektura gotowa na KSeF',
    ],
    badge: 'Najpopularniejszy',
    trial: '7 dni za darmo',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    subtitle: 'Pełna kontrola',
    price: null,
    interval: '',
    annualPrice: null,
    entityType: 'Banki, grupy kapitałowe',
    tagline: 'Dedykowane wdrożenie, dostęp offline, pełna kontrola',
    features: [
      'Wszystko z planu Spółka Standard',
      'Dedykowane wdrożenie',
      'Dostęp offline',
      'Pełna kontrola nad infrastrukturą',
      'Priorytetowe wsparcie',
    ],
    badge: 'Oferta indywidualna',
  },
];

const Premium = () => {
  const { user, openPremiumDialog } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();

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

  // Get current business profile
  const currentProfile = profiles?.find(p => p.id === selectedProfileId);
  const entityType = currentProfile?.entityType || 'dzialalnosc';

  // Determine which plan to highlight based on entity type
  const isJDG = entityType === 'dzialalnosc';
  const isSpolka = entityType === 'sp_zoo' || entityType === 'sa';

  // Filter plans to show the recommended one first
  const recommendedPlan = isJDG 
    ? entityPlans.find(p => p.id === 'jdg')
    : isSpolka 
      ? entityPlans.find(p => p.id === 'spolka')
      : null;

  // Route to entity-specific pages if business profile is selected
  if (currentProfile) {
    if (isJDG) {
      return <PremiumJDG />;
    } else if (isSpolka) {
      return <PremiumSpolka />;
    }
  }

  return (
    <div className="relative py-20 bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-purple-500/10 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <header className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-full w-16 h-16 shadow-xl">
            <Crown className="h-8 w-8 text-white" />
          </div>
          
          {/* Current Business Profile Badge */}
          {currentProfile && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-emerald-400" />
              <span className="text-sm text-neutral-300">
                Aktualnie wybrany podmiot: <span className="font-semibold text-white">{currentProfile.name}</span>
              </span>
              <Badge variant="secondary" className="text-xs">
                {isJDG ? 'JDG' : isSpolka ? 'Spółka' : 'Inny'}
              </Badge>
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            {isJDG ? 'Plan Premium dla JDG' : isSpolka ? 'Plan Premium dla Spółek' : 'Płacisz za podmiot, nie za użytkownika'}
          </h1>
          <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
            {isJDG ? (
              <>
                <span className="text-white font-semibold">Prosty system księgowości dla jednoosobowej działalności gospodarczej.</span><br />
                Wszystko czego potrzebujesz za {formatPrice(currencySettings?.currency === 'EUR' ? 500 : 1900)}/miesiąc.
              </>
            ) : isSpolka ? (
              <>
                <span className="text-white font-semibold">Pełen system governance i odpowiedzialności dla spółek.</span><br />
                Profesjonalne zarządzanie za {formatPrice(currencySettings?.currency === 'EUR' ? 2100 : 8900)}/miesiąc.
              </>
            ) : (
              <>
                <span className="text-white font-semibold">JDG to księgowość. Spółka to odpowiedzialność.</span><br />
                My wyceniamy odpowiedzialność.
              </>
            )}
          </p>
          <div className="flex items-center justify-center gap-8 text-sm text-neutral-400 pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Rozliczenie per podmiot prawny</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>Nieograniczona liczba użytkowników</span>
            </div>
          </div>
        </header>

        {/* Entity-based Plans - Show recommended plan prominently */}
        <section className="max-w-6xl mx-auto mb-16">
          {recommendedPlan && (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">
                  {isJDG ? 'Twój plan: JDG Premium' : 'Twój plan: Spółka Premium'}
                </h2>
                <p className="text-neutral-400">
                  Dopasowany do typu Twojego podmiotu: {currentProfile?.name}
                </p>
              </div>
              
              {/* Recommended Plan - Large Card */}
              <div className="max-w-2xl mx-auto mb-12">
                <Card className={
                  isJDG 
                    ? 'bg-gradient-to-br from-emerald-900/40 to-emerald-950/60 border-emerald-500/60 text-white shadow-2xl'
                    : 'bg-gradient-to-br from-amber-900/40 to-amber-950/60 border-amber-500/60 text-white shadow-2xl'
                }>
                  <CardHeader className="space-y-4 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-2xl">{recommendedPlan.name}</CardTitle>
                        <p className="text-sm text-neutral-300 mt-1">{recommendedPlan.subtitle}</p>
                      </div>
                      <Badge className={
                        isJDG
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-amber-500 text-white border-amber-400'
                      }>
                        Polecane dla Ciebie
                      </Badge>
                    </div>
                    
                    <div className="border-t border-neutral-700 pt-4">
                      <p className="text-xs text-neutral-400 mb-1">Typ podmiotu</p>
                      <p className="text-base font-medium">{recommendedPlan.entityType}</p>
                    </div>
                    
                    <div className="bg-neutral-900/50 rounded-lg p-4">
                      <div className="text-4xl font-extrabold">
                        {isJDG 
                          ? formatPrice(currencySettings?.currency === 'EUR' ? 500 : 1900)
                          : formatPrice(currencySettings?.currency === 'EUR' ? 2100 : 8900)
                        }
                        <span className="text-lg font-medium text-neutral-300">/{recommendedPlan.interval}</span>
                      </div>
                      {recommendedPlan.trial && (
                        <p className="text-sm text-emerald-400 mt-2">{recommendedPlan.trial}</p>
                      )}
                    </div>
                    
                    <p className="text-base text-neutral-200">{recommendedPlan.tagline}</p>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      {recommendedPlan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <div className={`flex-shrink-0 rounded-full p-1.5 mt-0.5 ${
                            isJDG ? 'bg-emerald-600/20' : 'bg-amber-600/20'
                          }`}>
                            <Check className={`h-5 w-5 ${
                              isJDG ? 'text-emerald-400' : 'text-amber-400'
                            }`} />
                          </div>
                          <p className="text-base text-neutral-100">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 pt-4">
                      {user && (
                        <Button
                          size="lg"
                          className={
                            isJDG
                              ? 'w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-lg'
                              : 'w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-lg'
                          }
                          onClick={() => openPremiumDialog(recommendedPlan.id)}
                        >
                          {recommendedPlan.trial ? 'Rozpocznij 7-dniowy trial' : 'Aktywuj plan premium'}
                          <Sparkles className="h-5 w-5 ml-2" />
                        </Button>
                      )}
                      <Link to={`/premium/plan/${recommendedPlan.id}`}>
                        <Button
                          variant="outline"
                          size="lg"
                          className="w-full border-neutral-600 text-neutral-100 hover:bg-neutral-800"
                        >
                          Zobacz szczegóły planu
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Other Plans */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold mb-2">Inne dostępne plany</h3>
            <p className="text-sm text-neutral-400">Możesz również wybrać inny plan dla swojego podmiotu</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {entityPlans.map((plan) => {
              const isRecommended = plan.id === recommendedPlan?.id;
              if (isRecommended) return null; // Skip recommended plan as it's shown above
              
              return (
                <Card
                  key={plan.id}
                  className="bg-neutral-900/60 border-neutral-800 text-white"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <p className="text-xs text-neutral-400 mt-1">{plan.subtitle}</p>
                      </div>
                      {plan.badge && (
                        <Badge className="bg-neutral-700 text-white border-neutral-600">{plan.badge}</Badge>
                      )}
                    </div>
                    <div className="border-t border-neutral-700 pt-3">
                      <p className="text-xs text-neutral-400 mb-1">Typ podmiotu</p>
                      <p className="text-sm font-medium">{plan.entityType}</p>
                    </div>
                    {plan.price !== null ? (
                      <div>
                        <div className="text-2xl font-extrabold">
                          {plan.id === 'jdg' 
                            ? formatPrice(currencySettings?.currency === 'EUR' ? 500 : 1900)
                            : plan.id === 'spolka'
                            ? formatPrice(currencySettings?.currency === 'EUR' ? 2100 : 8900)
                            : `${plan.price} zł`
                          }
                          <span className="text-sm font-medium text-neutral-300">/{plan.interval}</span>
                        </div>
                        {plan.trial && (
                          <p className="text-xs text-emerald-400 mt-1">{plan.trial}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-xl font-extrabold">Oferta indywidualna</div>
                    )}
                    <p className="text-sm text-neutral-300">{plan.tagline}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {plan.features.slice(0, 4).map((feature) => (
                        <div key={feature} className="flex items-start gap-2">
                          <div className="flex-shrink-0 bg-neutral-700/20 rounded-full p-1 mt-0.5">
                            <Check className="h-3 w-3 text-neutral-400" />
                          </div>
                          <p className="text-xs text-neutral-300">{feature}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-2">
                      {plan.id === 'enterprise' ? (
                        <Button asChild variant="outline" size="sm" className="w-full border-neutral-700 text-neutral-100 hover:bg-neutral-800">
                          <a href="mailto:kontakt@ksiegai.pl?subject=Enterprise%20%E2%80%94%20oferta%20indywidualna">
                            Skontaktuj się
                          </a>
                        </Button>
                      ) : (
                        <>
                          <Link to={`/premium/plan/${plan.id}`}>
                            <Button variant="outline" size="sm" className="w-full border-neutral-700 text-neutral-100 hover:bg-neutral-800">
                              Zobacz szczegóły
                            </Button>
                          </Link>
                          {user && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-neutral-400 hover:text-neutral-100"
                              onClick={() => openPremiumDialog(plan.id)}
                            >
                              Wybierz ten plan
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Pricing Philosophy */}
        <section className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-br from-purple-900/40 to-neutral-900/60 border-purple-500/30 text-white">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-3">Jednostka wartości to podmiot prawny</h3>
                <p className="text-neutral-300">Nie użytkownik. Nie dokument. Podmiot.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 p-2 rounded">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold">JDG = niska złożoność</p>
                      <p className="text-sm text-neutral-400">Księgowość, faktury, JPK</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/20 p-2 rounded">
                      <Shield className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold">Spółka = wysoka odpowiedzialność</p>
                      <p className="text-sm text-neutral-400">Governance, audyt, kapitał, ryzyko</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-neutral-700 pt-6 text-center">
                <p className="text-sm text-neutral-300">
                  <span className="font-semibold text-white">JDG + 1 spółka</span> = {formatPrice(currencySettings?.currency === 'EUR' ? 500 : 1900)} + {formatPrice(currencySettings?.currency === 'EUR' ? 2100 : 8900)} = {formatPrice(currencySettings?.currency === 'EUR' ? 2600 : 10800)}/miesiąc<br />
                  <span className="text-xs text-neutral-400">Każdy podmiot rozliczany osobno. Czysto, uczciwie, intuicyjnie.</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Value Proposition */}
        <section className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-br from-neutral-900/80 to-neutral-900/60 border-amber-500/30 text-white">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-3">Dla spółek: {formatPrice(currencySettings?.currency === 'EUR' ? 2100 : 8900)} to nie za dużo</h3>
                <p className="text-neutral-300">To tańsze niż konsekwencje</p>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-4 bg-neutral-800/50 rounded">
                  <p className="font-semibold text-emerald-400 mb-2">vs Biuro księgowe</p>
                  <p className="text-2xl font-bold">500-2000 zł</p>
                  <p className="text-xs text-neutral-400 mt-1">miesięcznie</p>
                </div>
                <div className="text-center p-4 bg-neutral-800/50 rounded">
                  <p className="font-semibold text-emerald-400 mb-2">vs Audyt</p>
                  <p className="text-2xl font-bold">5000+ zł</p>
                  <p className="text-xs text-neutral-400 mt-1">rocznie</p>
                </div>
                <div className="text-center p-4 bg-neutral-800/50 rounded">
                  <p className="font-semibold text-emerald-400 mb-2">vs Błędy prawne</p>
                  <p className="text-2xl font-bold">???? zł</p>
                  <p className="text-xs text-neutral-400 mt-1">nieobliczalne</p>
                </div>
              </div>
              <div className="border-t border-neutral-700 pt-6">
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <p className="font-semibold text-emerald-400">✓ To jest dla Ciebie, jeśli:</p>
                    <ul className="space-y-2 text-neutral-200">
                      <li>• Prowadzisz sp. z o.o. lub S.A.</li>
                      <li>• Rozumiesz wartość governance</li>
                      <li>• Chcesz niezależności od księgowej</li>
                      <li>• Akceptujesz dyscyplinę systemu</li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <p className="font-semibold text-red-400">✗ To NIE jest dla Ciebie, jeśli:</p>
                    <ul className="space-y-2 text-neutral-200">
                      <li>• Szukasz najtańszego rozwiązania</li>
                      <li>• Wystarczy Ci tylko fakturowanie</li>
                      <li>• Nie potrzebujesz systemu decyzji</li>
                      <li>• Nie chcesz odpowiedzialności</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center space-y-6">
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">Spółka z 7-dniowym trialem</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Każda nowa spółka dostaje automatyczny trial. Bez karty. Pełne funkcje.<br />
              <span className="text-white font-medium">Musisz poczuć wartość governance, nie tylko faktur.</span>
            </p>
          </div>
          {user ? (
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-8 text-lg"
              onClick={() => openPremiumDialog('spolka')}
            >
              Rozpocznij 7-dniowy darmowy okres próbny
              <Sparkles className="h-5 w-5 ml-2" />
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/register">
                <Button size="lg" className="px-8 text-lg">
                  Załóż konto i przetestuj za darmo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth/login">
                <Button variant="outline" size="lg" className="px-8 text-lg border-neutral-600">
                  Mam już konto
                </Button>
              </Link>
            </div>
          )}
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            * Nie wymagamy karty kredytowej. Możesz anulować w każdej chwili.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Premium;