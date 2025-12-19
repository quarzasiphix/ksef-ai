import React from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const plans = {
  monthly: {
    id: "monthly",
    name: "Miesięczny",
    price: "19 zł",
    interval: "miesiąc",
    tagline: "Najlepszy start, pełen dostęp bez zobowiązań długoterminowych.",
    highlights: [
      "Pełny dostęp do funkcji Premium",
      "Płatność odnawialna co miesiąc",
      "Możesz anulować w dowolnym momencie",
    ],
  },
  annual: {
    id: "annual",
    name: "Roczny",
    price: "150 zł",
    interval: "rok",
    tagline: "Najlepsza cena — oszczędzasz i masz spokój na cały rok.",
    badge: "Najpopularniejszy",
    highlights: [
      "Pełny dostęp do funkcji Premium",
      "Najlepsza cena w przeliczeniu na miesiąc",
      "Faktura raz w roku, mniej formalności",
    ],
  },
  lifetime: {
    id: "lifetime",
    name: "Dożywotni",
    price: "999 zł",
    interval: "jednorazowo",
    tagline: "Jednorazowa płatność i dostęp na zawsze.",
    badge: "Najlepsza wartość",
    highlights: [
      "Pełny dostęp do funkcji Premium",
      "Jednorazowa płatność",
      "Najlepsze dla firm planujących długoterminowo",
    ],
  },
} as const;

const PremiumPlanDetails = () => {
  const { planId } = useParams();
  const { user, openPremiumDialog } = useAuth();

  const planKey = (planId || "") as keyof typeof plans;
  const plan = plans[planKey];

  if (!plan) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Nie znaleziono planu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Wybrany plan nie istnieje lub link jest nieprawidłowy.</p>
            <Link to="/premium">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Wróć do planów
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative py-14 bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-purple-500/10 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 max-w-5xl">
        <div className="mb-10">
          <Link to="/premium" className="inline-flex items-center text-sm text-neutral-300 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Wszystkie plany
          </Link>
        </div>

        <header className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start mb-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <div className="inline-flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 rounded-full w-10 h-10 shadow-xl">
                <Crown className="h-5 w-5 text-white" />
              </div>
              {plan.badge ? (
                <Badge className="bg-amber-500 text-white border-amber-400">{plan.badge}</Badge>
              ) : null}
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Plan {plan.name}
            </h1>
            <p className="text-neutral-300 max-w-2xl">{plan.tagline}</p>
          </div>

          <div className="text-left md:text-right space-y-2">
            <div className="text-3xl font-extrabold">
              {plan.price}
              <span className="text-base font-medium text-neutral-300">/{plan.interval}</span>
            </div>
            {user ? (
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                onClick={() => openPremiumDialog(plan.id)}
              >
                Kup teraz
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <Link to="/auth/register">
                  <Button size="lg" className="w-full">
                    Załóż konto i kup
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button variant="outline" size="lg" className="w-full border-neutral-600">
                    Mam już konto
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="bg-neutral-900/60 border-neutral-800 text-white">
            <CardHeader>
              <CardTitle>Co dostajesz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.highlights.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="flex-shrink-0 bg-emerald-600/20 rounded-full p-1.5 mt-0.5">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-sm text-neutral-200">{item}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-neutral-900/60 border-neutral-800 text-white">
            <CardHeader>
              <CardTitle>Dla kogo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-neutral-200">
              <p>
                Ten plan jest idealny, jeśli chcesz korzystać z Premium bez tarcia: wszystkie funkcje, pełne wsparcie i brak limitów.
              </p>
              <p className="text-neutral-300">
                Jeśli nie masz pewności, wybierz <span className="text-white font-medium">Roczny</span> — to najlepsza cena i najmniej formalności.
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="mt-10 text-center text-xs text-neutral-400">
          * Możesz anulować w każdej chwili. Szczegóły płatności pokażemy w kolejnym kroku.
        </div>
      </div>
    </div>
  );
};

export default PremiumPlanDetails;
