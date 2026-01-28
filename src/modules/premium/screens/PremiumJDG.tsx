import { useAuth } from "@/shared/hooks/useAuth";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { usePremium } from "../context/PremiumContext";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { 
  FileText, 
  Calculator, 
  Wallet, 
  FolderOpen, 
  Bell,
  Check,
  Sparkles,
  TrendingUp,
  Calendar,
  Receipt
} from "lucide-react";

const PremiumJDG = () => {
  const { user, openPremiumDialog } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const { hasPremium, level, isLoading } = usePremium();

  const currentProfile = profiles?.find(p => p.id === selectedProfileId);

  // Debug logging
  console.log('[PremiumJDG] Rendering:', {
    hasPremium,
    level,
    isLoading,
    currentProfile: currentProfile?.name,
    entityType: currentProfile?.entityType
  });

  const features = [
    {
      icon: FileText,
      title: "Faktury & Sprzedaż",
      description: "Wszystko czego potrzebujesz do fakturowania",
      items: [
        "Nieograniczona liczba faktur",
        "Faktury VAT / bez VAT / proforma",
        "Korekty i duplikaty",
        "Numeracja wg własnych schematów",
        "Kontrahenci i historia rozliczeń",
        "Eksport PDF / XML (KSeF-ready)"
      ]
    },
    {
      icon: Calculator,
      title: "Podatki",
      description: "Automatyczna kontrola podatków i terminów",
      items: [
        "Ryczałt (wszystkie stawki)",
        "VAT czynny / zwolniony",
        "Automatyczne wyliczenia podatków",
        "Podgląd należnych podatków \"na dziś\"",
        "Historia okresów podatkowych",
        "Przygotowanie danych do deklaracji"
      ],
      highlight: true
    },
    {
      icon: Wallet,
      title: "Koszty & Bank",
      description: "Kontrola wydatków i przychodów",
      items: [
        "Wydatki ręczne i z dokumentów",
        "Kategorie kosztów (JDG-friendly)",
        "Podpięcie konta bankowego",
        "Przypisywanie wydatków do faktur",
        Kontrola kosztów "do limitu"
      ]
    },
    {
      icon: FolderOpen,
      title: "Dokumenty & Skrzynka",
      description: "Wszystkie dokumenty w jednym miejscu",
      items: [
        "Skrzynka dokumentów",
        "OCR / import faktur kosztowych",
        "Przypisywanie do okresów",
        "Historia zmian",
        "Eksport paczki dokumentów"
      ]
    },
    {
      icon: Bell,
      title: "Automatyzacje",
      description: "System przypomnień i kontroli",
      items: [
        "Automatyczne przypisywanie okresów",
        "Wykrywanie brakujących dokumentów",
        "Alerty o terminach podatków",
        "Alerty o nieopłaconych fakturach"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-neutral-900">Premium – JDG</h1>
                  <p className="text-sm text-neutral-600">Uproszczona księgowość i fakturowanie dla jednoosobowych działalności</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasPremium && level === 'user' ? (
                <Badge className="bg-emerald-500 text-white">Aktywny</Badge>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-neutral-600"
                  >
                    Porównaj z innymi planami
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => openPremiumDialog?.('jdg')}
                  >
                    Aktywuj Premium JDG
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Value Summary */}
        <Card className="mb-12 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold text-neutral-900 mb-6">
              Wszystko, czego potrzebujesz jako JDG — bez zbędnych komplikacji
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 rounded-full p-2 mt-1">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Fakturowanie + KSeF gotowe</p>
                  <p className="text-sm text-neutral-600">Pełna obsługa faktur i KSeF bez komplikacji</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 rounded-full p-2 mt-1">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Ryczałt / VAT / zwolnienie z VAT</p>
                  <p className="text-sm text-neutral-600">Wszystkie formy opodatkowania JDG</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 rounded-full p-2 mt-1">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Automatyczna kontrola podatków</p>
                  <p className="text-sm text-neutral-600">System pilnuje terminów za Ciebie</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-neutral-500 border-t border-emerald-200 pt-4">
              Ten plan jest przypisany do firmy, nie użytkownika. Możesz dodać dowolną liczbę kont i współpracowników.
            </p>
          </CardContent>
        </Card>

        {/* Feature Sections */}
        <div className="space-y-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className={feature.highlight ? "border-emerald-300 shadow-lg" : "border-neutral-200"}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${feature.highlight ? 'bg-emerald-100' : 'bg-neutral-100'}`}>
                    <feature.icon className={`h-6 w-6 ${feature.highlight ? 'text-emerald-600' : 'text-neutral-600'}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                    <p className="text-neutral-600">{feature.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {feature.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-full p-1 mt-0.5">
                        <Check className="h-4 w-4 text-emerald-600" />
                      </div>
                      <p className="text-neutral-700">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tax Timeline Visual */}
        <Card className="mt-12 border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Kontrola podatków w czasie rzeczywistym
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-12 gap-2">
              {['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'].map((month, i) => (
                <div key={i} className="text-center">
                  <div className="bg-emerald-100 rounded-lg p-3 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600 mx-auto" />
                  </div>
                  <p className="text-xs text-neutral-600">{month}</p>
                  <p className="text-xs text-neutral-400">Przychód → Podatek</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="mt-12 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold text-neutral-900 mb-2">JDG Premium</h3>
            <div className="text-5xl font-bold text-emerald-600 mb-2">19 zł</div>
            <p className="text-neutral-600 mb-1">/ miesiąc</p>
            <p className="text-sm text-neutral-500 mb-6">Rozliczane miesięcznie • Brak umów długoterminowych</p>
            
            {!hasPremium && (
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8"
                onClick={() => openPremiumDialog?.('jdg')}
              >
                Aktywuj Premium JDG
                <Sparkles className="ml-2 h-5 w-5" />
              </Button>
            )}
            
            <p className="text-xs text-neutral-500 mt-4">
              Możesz zmienić plan w dowolnym momencie.
            </p>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-500">
            Funkcje dla spółek są dostępne w innych planach.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PremiumJDG;
