import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features: string[] = [
  "Nieograniczone profile firmowe",
  "Nieograniczone faktury i dokumenty",
  "Zaawansowane raporty i statystyki",
  "Eksport danych (JPK, KSeF)",
  "Magazyn – śledzenie stanów i ruchów towarów",
  "Priorytetowe wsparcie techniczne",
  "Backup i synchronizacja danych",
  "Automatyczne wysyłanie faktur e-mailem",
];

const plans = [
  {
    id: "monthly",
    name: "Miesięczny",
    price: "19 zł",
    interval: "miesiąc",
    tagline: "Pełny dostęp bez zobowiązań długoterminowych.",
  },
  {
    id: "annual",
    name: "Roczny",
    price: "150 zł",
    interval: "rok",
    tagline: "Najlepsza cena w przeliczeniu na miesiąc.",
    badge: "Najpopularniejszy",
  },
  {
    id: "lifetime",
    name: "Dożywotni",
    price: "",
    interval: "",
    tagline: "Dostęp offline, wdrożenie i oferta dopasowana do Twojej firmy.",
    badge: "Oferta indywidualna",
  },
] as const;

const Premium = () => {
  const { user, openPremiumDialog } = useAuth();

  return (
    <div className="relative py-20 bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-purple-500/10 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <header className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-full w-16 h-16 shadow-xl">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Pakiet&nbsp;Premium</h1>
          <p className="text-lg text-neutral-300">
            Odblokuj pełne możliwości KsiegaI dzięki subskrypcji Premium i rozwijaj swój biznes bez ograniczeń.
          </p>
        </header>

        {/* Plans */}
        <section className="max-w-6xl mx-auto mb-16">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.id === 'annual'
                    ? 'bg-neutral-900/70 border-amber-500/60 text-white shadow-lg'
                    : 'bg-neutral-900/60 border-neutral-800 text-white'
                }
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.badge ? (
                      <Badge className="bg-amber-500 text-white border-amber-400">{plan.badge}</Badge>
                    ) : null}
                  </div>
                  {plan.id === 'lifetime' ? (
                    <div className="text-3xl font-extrabold">Oferta indywidualna</div>
                  ) : (
                    <div className="text-3xl font-extrabold">
                      {plan.price}
                      <span className="text-sm font-medium text-neutral-300">/{plan.interval}</span>
                    </div>
                  )}
                  <p className="text-sm text-neutral-300">{plan.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {features.slice(0, 5).map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="flex-shrink-0 bg-emerald-600/20 rounded-full p-1.5 mt-0.5">
                          <Check className="h-4 w-4 text-emerald-400" />
                        </div>
                        <p className="text-sm text-neutral-200">{feature}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    <Link to={`/premium/plan/${plan.id}`}>
                      <Button
                        className={
                          plan.id === 'annual'
                            ? 'w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700'
                            : 'w-full'
                        }
                      >
                        Wybierz plan
                      </Button>
                    </Link>

                    {plan.id === 'lifetime' ? (
                      <Button asChild variant="outline" className="w-full border-neutral-700 text-neutral-100 hover:bg-neutral-800">
                        <a href="mailto:kontakt@ksiegai.pl?subject=Plan%20Do%C5%BCywotni%20%E2%80%94%20oferta%20indywidualna">
                          Skontaktuj się
                        </a>
                      </Button>
                    ) : user ? (
                      <Button
                        variant="outline"
                        className="w-full border-neutral-700 text-neutral-100 hover:bg-neutral-800"
                        onClick={() => openPremiumDialog(plan.id)}
                      >
                        Kup teraz
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Full feature list */}
        <section className="max-w-5xl mx-auto mb-16">
          <Card className="bg-neutral-900/60 border-neutral-800 text-white">
            <CardHeader>
              <CardTitle className="text-xl">Wszystkie funkcje Premium</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <div className="flex-shrink-0 bg-emerald-600/20 rounded-full p-1.5 mt-0.5">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-200">{feature}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* CTA */}
        <section className="text-center space-y-6">
          {user ? (
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-8 text-lg"
              onClick={() => openPremiumDialog('annual')}
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