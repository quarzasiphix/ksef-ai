import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Star, Check, Crown, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

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

const Premium = () => {
  const { user, openPremiumDialog } = useAuth();
  const [showingDialog, setShowingDialog] = useState(false);

  const handleGetPremium = () => {
    if (user) {
      openPremiumDialog();
      setShowingDialog(true);
    }
  };

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

        {/* Features grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto mb-20">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 bg-neutral-900/60 border border-neutral-800 rounded-lg p-5 backdrop-blur-sm"
            >
              <div className="flex-shrink-0 bg-emerald-600/20 rounded-full p-1.5">
                <Check className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-sm leading-relaxed text-neutral-200">{feature}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="text-center space-y-6">
          {user ? (
            <Button
              size="lg"
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-8 text-lg"
              onClick={handleGetPremium}
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