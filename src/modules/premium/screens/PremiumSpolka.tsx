import { useAuth } from "@/shared/hooks/useAuth";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import { usePremium } from "../context/PremiumContext";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { 
  FileText, 
  Shield, 
  Users, 
  Building2, 
  FolderOpen,
  GitBranch,
  CheckCircle2,
  Clock,
  FileCheck,
  Sparkles,
  Scale,
  Briefcase,
  Archive
} from "lucide-react";

const PremiumSpolka = () => {
  const { user, openPremiumDialog } = useAuth();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const { hasPremium, level, isLoading } = usePremium();

  const currentProfile = profiles?.find(p => p.id === selectedProfileId);

  const governancePillars = [
    {
      icon: Scale,
      title: "Decyzje",
      items: ["Uchwały", "Zgody", "Odpowiedzialność"]
    },
    {
      icon: Briefcase,
      title: "Finanse",
      items: ["Faktury", "Kapitał", "Wydatki"]
    },
    {
      icon: Archive,
      title: "Audyt",
      items: ["Historia zmian", "Powiązania", "Dowody"]
    }
  ];

  const features = [
    {
      icon: Scale,
      title: "System decyzji i uchwał",
      description: "Każde zdarzenie finansowe wymaga podstawy prawnej",
      items: [
        "Uchwały zarządu",
        "Decyzje wspólników",
        "Powiązanie decyzji z fakturami, wydatkami, umowami",
        "Statusy: Projekt / Zatwierdzona / Odrzucona / Wykonana",
        "Rejestr decyzji (timeline)",
        "Każda zmiana kapitału wymaga decyzji"
      ],
      highlight: true,
      mandatory: true
    },
    {
      icon: Users,
      title: "Kapitał, wspólnicy, odpowiedzialność",
      description: "Pełna kontrola nad strukturą właścicielską",
      items: [
        "Rejestr wspólników",
        "Udziały i zmiany",
        "Dopłaty wspólników",
        "Zwroty dopłat",
        "Historia zmian kapitałowych",
        "Powiązanie z dokumentami i uchwałami"
      ]
    },
    {
      icon: FileText,
      title: "Faktury & KSeF (Spółka mode)",
      description: "Fakturowanie z pełną ścieżką audytu",
      items: [
        "Faktury sprzedażowe",
        "Faktury kosztowe",
        "KSeF (wysyłka, statusy, błędy)",
        "Powiązanie faktur z decyzjami, działami, projektami",
        "Korekty + historia",
        "Każda faktura = zdarzenie w systemie"
      ]
    },
    {
      icon: Shield,
      title: "Wydatki, bank, ścieżka audytu",
      description: "Od decyzji przez płatność do dokumentu",
      items: [
        "Import bankowy",
        "Przypisanie wydatków do decyzji",
        "Przypisanie wydatków do działów",
        "Przypisanie wydatków do projektów",
        "Ścieżka audytu: kto dodał, kto zatwierdził, na jakiej podstawie"
      ]
    },
    {
      icon: GitBranch,
      title: "Działy, projekty, struktura",
      description: "Organizacja wewnętrzna spółki",
      items: [
        "Działy organizacyjne",
        "Projekty",
        "Przypisywanie kosztów i przychodów",
        "Raportowanie per dział / projekt",
        "Kontrola budżetów"
      ]
    },
    {
      icon: FolderOpen,
      title: "Dokumenty & rejestry",
      description: "Ewidencja wszystkich zdarzeń korporacyjnych",
      items: [
        "Umowy",
        "Uchwały",
        "Dokumenty korporacyjne",
        "Rejestr zmian",
        "Eksport do audytu / księgowości",
        "Historia korekt"
      ]
    },
    {
      icon: FileCheck,
      title: "Compliance & reporting",
      description: "System zaprojektowany pod kontrole i audyt",
      items: [
        "Raporty okresowe",
        "Zamknięcia okresów",
        "Blokady edycji",
        "Eksport pełnych paczek danych",
        "Historia korekt",
        "Przygotowanie do audytu zewnętrznego"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="bg-amber-900/30 p-2 rounded-lg border border-amber-700/50">
                  <Building2 className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Premium – Spółka</h1>
                  <p className="text-sm text-neutral-400">System zarządzania finansami, decyzjami i odpowiedzialnością w spółce</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasPremium && level === 'business' ? (
                <Badge className="bg-amber-500 text-white">Aktywny</Badge>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-neutral-300 border-neutral-700"
                  >
                    Porównaj z JDG
                  </Button>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => openPremiumDialog?.('spolka')}
                  >
                    Zarządzaj planem
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Governance Overview */}
        <Card className="mb-12 bg-gradient-to-br from-neutral-800 to-neutral-900 border-amber-700/50">
          <CardContent className="p-8">
            <h2 className="text-3xl font-bold mb-6">
              Pełna kontrola nad finansami i decyzjami spółki
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {governancePillars.map((pillar, index) => (
                <div key={index} className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-700">
                  <div className="bg-amber-900/30 p-3 rounded-lg inline-block mb-4">
                    <pillar.icon className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-3">{pillar.title}</h3>
                  <ul className="space-y-2">
                    {pillar.items.map((item, i) => (
                      <li key={i} className="text-sm text-neutral-300 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <p className="text-sm text-neutral-400 border-t border-neutral-700 pt-4">
              Każde zdarzenie w systemie ma właściciela, czas i kontekst prawny.
            </p>
          </CardContent>
        </Card>

        {/* Feature Sections */}
        <div className="space-y-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className={`bg-neutral-900 ${
                feature.highlight 
                  ? "border-amber-600 shadow-xl shadow-amber-900/20" 
                  : "border-neutral-800"
              }`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    feature.highlight 
                      ? 'bg-amber-900/30 border border-amber-700/50' 
                      : 'bg-neutral-800'
                  }`}>
                    <feature.icon className={`h-6 w-6 ${
                      feature.highlight ? 'text-amber-500' : 'text-neutral-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                      {feature.mandatory && (
                        <Badge className="bg-red-900/30 text-red-400 border-red-700/50">
                          Obowiązkowe
                        </Badge>
                      )}
                    </div>
                    <p className="text-neutral-400">{feature.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {feature.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-start gap-3">
                      <div className="bg-amber-900/20 rounded-full p-1 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      </div>
                      <p className="text-neutral-300">{item}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Decision Timeline Visual */}
        <Card className="mt-12 bg-neutral-900 border-amber-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Przykładowa ścieżka decyzji
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-amber-900/30 p-3 rounded-lg">
                  <Scale className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Uchwała zarządu</p>
                  <p className="text-sm text-neutral-400">Zatwierdzenie zakupu sprzętu</p>
                </div>
                <Badge className="bg-emerald-900/30 text-emerald-400">Zatwierdzona</Badge>
              </div>
              
              <div className="ml-8 border-l-2 border-amber-700/30 pl-8 py-2">
                <div className="flex items-center gap-4">
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <FileText className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Faktura zakupu</p>
                    <p className="text-sm text-neutral-400">Powiązana z uchwałą #2024/03/15</p>
                  </div>
                </div>
              </div>
              
              <div className="ml-8 border-l-2 border-amber-700/30 pl-8 py-2">
                <div className="flex items-center gap-4">
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <Shield className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Płatność bankowa</p>
                    <p className="text-sm text-neutral-400">Przypisana do faktury i decyzji</p>
                  </div>
                </div>
              </div>
              
              <div className="ml-8 border-l-2 border-amber-700/30 pl-8 py-2">
                <div className="flex items-center gap-4">
                  <div className="bg-neutral-800 p-3 rounded-lg">
                    <Archive className="h-5 w-5 text-neutral-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Dokumentacja</p>
                    <p className="text-sm text-neutral-400">Pełna ścieżka audytu zachowana</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Note */}
        <Card className="mt-12 bg-gradient-to-br from-neutral-800 to-neutral-900 border-amber-700/50">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">
              System zaprojektowany pod kontrole, audyt i spory
            </p>
            <p className="text-neutral-400">
              Każda akcja jest rejestrowana, każda decyzja ma kontekst, każdy dokument ma właściciela
            </p>
          </CardContent>
        </Card>

        {/* Pricing */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-br from-amber-900/20 to-neutral-900 border-amber-700/50">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-2">Spółka Standard</h3>
              <div className="text-5xl font-bold text-amber-500 mb-2">89 zł</div>
              <p className="text-neutral-400 mb-4">/ miesiąc</p>
              <ul className="space-y-2 mb-6 text-sm text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  Nielimitowani użytkownicy
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  Nielimitowane podmioty w grupie
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-500" />
                  Pełny system governance
                </li>
              </ul>
              
              {!hasPremium && (
                <Button
                  size="lg"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-lg"
                  onClick={() => openPremiumDialog?.('spolka')}
                >
                  Aktywuj plan Spółka
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-neutral-800 to-neutral-900 border-neutral-700">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-2">Spółka Enterprise</h3>
              <div className="text-3xl font-bold text-neutral-300 mb-2">Custom pricing</div>
              <p className="text-neutral-400 mb-4">Oferta indywidualna</p>
              <ul className="space-y-2 mb-6 text-sm text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-neutral-400" />
                  SLA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-neutral-400" />
                  Integracje
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-neutral-400" />
                  Dedykowany onboarding
                </li>
              </ul>
              
              <Button
                size="lg"
                variant="outline"
                className="w-full border-neutral-600 text-neutral-300 hover:bg-neutral-800 text-lg"
                asChild
              >
                <a href="mailto:kontakt@ksiegai.pl?subject=Enterprise">
                  Skontaktuj się
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Strategic Note */}
        <Card className="mt-12 bg-gradient-to-br from-neutral-800 to-neutral-900 border-amber-700/30">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">
              Księgai Spółka to system dowodowy — nie tylko księgowość
            </h3>
            <p className="text-neutral-300 max-w-2xl mx-auto">
              To nie jest narzędzie do fakturowania. To system, który dokumentuje każdą decyzję, 
              każdy wydatek, każdą zmianę w strukturze spółki. To ochrona przed sporami, 
              audytami i konsekwencjami prawnym.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumSpolka;
