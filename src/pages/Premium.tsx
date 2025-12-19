import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, ArrowRight, FileText, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  return (
    <div className="relative py-20 bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-purple-500/10 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <header className="text-center max-w-4xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-full w-16 h-16 shadow-xl">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Płacisz za podmiot,<br />nie za użytkownika</h1>
          <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
            <span className="text-white font-semibold">JDG to księgowość. Spółka to odpowiedzialność.</span><br />
            My wyceniamy odpowiedzialność.
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

        {/* Entity-based Plans */}
        <section className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Wybierz typ podmiotu</h2>
            <p className="text-neutral-400">Jednostka wartości to podmiot prawny, nie użytkownik</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {entityPlans.map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.id === 'spolka'
                    ? 'bg-neutral-900/70 border-amber-500/60 text-white shadow-lg'
                    : 'bg-neutral-900/60 border-neutral-800 text-white'
                }
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <p className="text-xs text-neutral-400 mt-1">{plan.subtitle}</p>
                    </div>
                    {plan.badge && (
                      <Badge className="bg-amber-500 text-white border-amber-400">{plan.badge}</Badge>
                    )}
                  </div>
                  <div className="border-t border-neutral-700 pt-3">
                    <p className="text-xs text-neutral-400 mb-1">Typ podmiotu</p>
                    <p className="text-sm font-medium">{plan.entityType}</p>
                  </div>
                  {plan.price !== null ? (
                    <div>
                      <div className="text-3xl font-extrabold">
                        {plan.price} zł
                        <span className="text-sm font-medium text-neutral-300">/{plan.interval}</span>
                      </div>
                      {plan.trial && (
                        <p className="text-xs text-emerald-400 mt-1">{plan.trial}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-2xl font-extrabold">Oferta indywidualna</div>
                  )}
                  <p className="text-sm text-neutral-300">{plan.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-emerald-600/20 rounded-full p-1.5 mt-0.5">
                          <Check className="h-4 w-4 text-emerald-400" />
                        </div>
                        <p className="text-sm text-neutral-200">{feature}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    {plan.id === 'enterprise' ? (
                      <Button asChild variant="outline" className="w-full border-neutral-700 text-neutral-100 hover:bg-neutral-800">
                        <a href="mailto:kontakt@ksiegai.pl?subject=Enterprise%20%E2%80%94%20oferta%20indywidualna">
                          Skontaktuj się
                        </a>
                      </Button>
                    ) : (
                      <>
                        <Link to={`/premium/plan/${plan.id}`}>
                          <Button
                            className={
                              plan.id === 'spolka'
                                ? 'w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700'
                                : 'w-full'
                            }
                          >
                            {plan.trial ? 'Rozpocznij trial' : 'Wybierz plan'}
                          </Button>
                        </Link>
                        {user && (
                          <Button
                            variant="outline"
                            className="w-full border-neutral-700 text-neutral-100 hover:bg-neutral-800"
                            onClick={() => openPremiumDialog(plan.id)}
                          >
                            Kup teraz
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
                  <span className="font-semibold text-white">JDG + 1 spółka</span> = 19 zł + 89 zł = 108 zł/miesiąc<br />
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
                <h3 className="text-xl font-bold mb-3">Dla spółek: 89 zł to nie za dużo</h3>
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