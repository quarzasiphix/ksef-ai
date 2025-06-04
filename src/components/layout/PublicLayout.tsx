import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import PublicHeader from "./PublicHeader";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Receipt, 
  Users, 
  Calculator, 
  Building, 
  Shield, 
  Zap, 
  ArrowRight,
  CheckCircle2,
  Crown,
  BarChart3,
  TrendingUp,
  CreditCard,
  Star,
  ArrowUpRight,
  LineChart
} from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-purple-500/5 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/10 via-blue-500/5 to-transparent" />
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-purple-500/5 to-transparent" />
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-6">
              <Star className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Najlepsze darmowe narzędzie do fakturowania</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-100">
              Nowoczesne Fakturowanie i Księgowość w Jednym Miejscu
            </h1>
            <p className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
              Profesjonalne narzędzie dla przedsiębiorców i księgowych. Zarządzaj fakturami, wydatkami i księgowością w jednym, intuicyjnym interfejsie.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth/register" className="block">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8"
                >
                  Rozpocznij za darmo
                </Button>
              </Link>
              <Link to="/auth/login" className="block">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/10"
                >
                  Zaloguj się
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/5 via-purple-500/5 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 shadow-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Stats Preview */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium text-neutral-400">Faktury</p>
                          <p className="text-2xl font-bold text-white">1,234</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 rounded-lg border border-amber-500/20">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium text-neutral-400">Niezapłacone</p>
                          <p className="text-2xl font-bold text-amber-500">23</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-lg border border-green-500/20">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-neutral-400">Przychody</p>
                          <p className="text-xl font-bold text-green-500">123,456 PLN</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/10 to-rose-500/10 p-4 rounded-lg border border-red-500/20">
                      <div className="flex items-center space-x-2">
                        <Receipt className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-neutral-400">Wydatki</p>
                          <p className="text-xl font-bold text-red-500">45,678 PLN</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Trendy miesięczne</h3>
                      <LineChart className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="h-48 bg-neutral-900/50 rounded-lg border border-neutral-700 p-4">
                      <div className="relative h-full">
                        {/* Graph Lines */}
                        <div className="absolute inset-0 flex items-end">
                          <div className="w-full h-full flex items-end justify-between">
                            {[30, 45, 60, 75, 90, 85, 70].map((height, index) => (
                              <div key={index} className="w-8 flex flex-col items-center">
                                <div 
                                  className="w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-t"
                                  style={{ height: `${height}%` }}
                                />
                                <div className="text-xs text-neutral-400 mt-2">
                                  {['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip'][index]}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="w-full border-t border-neutral-700/50" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Features List */}
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-lg border border-blue-500/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Szybkie akcje</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-700 hover:border-blue-500/50 transition-colors cursor-pointer">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white">Nowa Faktura</p>
                          <p className="text-sm text-neutral-400">Wystaw nową fakturę</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-neutral-900/50 border border-neutral-700 hover:border-green-500/50 transition-colors cursor-pointer">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white">Nowy Wydatek</p>
                          <p className="text-sm text-neutral-400">Dodaj nowy wydatek</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-lg border border-blue-500/20">
                    <h3 className="text-lg font-semibold text-white mb-4">Ostatnie faktury</h3>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-neutral-900/50 border border-neutral-700">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium text-white">Faktura #{i}234</p>
                              <p className="text-sm text-neutral-400">Klient {i}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-white">{(i * 1234).toLocaleString('pl-PL')} PLN</p>
                            <p className="text-sm text-neutral-400">Termin: {new Date().toLocaleDateString('pl-PL')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-500/5 via-blue-500/5 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-4">
              <Star className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Kluczowe Funkcje</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Wszystko, czego potrzebujesz w jednym miejscu
            </h2>
            <p className="text-xl text-neutral-300">
              Profesjonalne narzędzia do zarządzania finansami Twojej firmy
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Profesjonalne Fakturowanie</h3>
              <p className="text-neutral-400">
                Twórz i zarządzaj fakturami w kilka kliknięć. Automatyczne generowanie numerów i archiwizacja dokumentów.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20 hover:border-green-500/40 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                <Receipt className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Zarządzanie Wydatkami</h3>
              <p className="text-neutral-400">
                Śledź wszystkie koszty działalności. Kategoryzuj wydatki i generuj raporty finansowe w czasie rzeczywistym.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">CRM i Klienci</h3>
              <p className="text-neutral-400">
                Zarządzaj bazą klientów, historią transakcji i automatycznymi przypomnieniami o płatnościach.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section id="premium" className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500/5 via-purple-500/5 to-transparent" />
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Funkcje Premium</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Odkryj Możliwości Premium
              </h2>
              <p className="text-xl text-neutral-300">
                Rozszerz swoją firmę o zaawansowane funkcje księgowe i automatyzację
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Building className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Integracja z KSeF</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Automatyczne wysyłanie faktur do KSeF
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Generowanie JPK-V7M
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Synchronizacja z systemem podatkowym
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Calculator className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Zaawansowana Księgowość</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Automatyczne rozliczenia podatkowe
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Generowanie deklaracji PIT
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Profesjonalne raporty księgowe
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">AI i Automatyzacja</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Automatyczne rozpoznawanie dokumentów
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Inteligentne kategoryzowanie transakcji
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Asystent księgowy oparty na AI
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-6 rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Integracja Bankowa</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Monitorowanie transakcji w czasie rzeczywistym
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Automatyczne dopasowywanie płatności
                  </li>
                  <li className="flex items-center gap-2 text-neutral-300">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    Alerty o nowych transakcjach
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center mt-12">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-lg px-8"
                onClick={() => navigate("/auth/register")}
              >
                <Crown className="mr-2 h-5 w-5" />
                Rozpocznij z Premium
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-800">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <h3 className="text-white font-semibold mb-4">KsiegaI</h3>
              <p className="text-neutral-400">
                Nowoczesne rozwiązanie dla księgowości i zarządzania dokumentami.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-4">Szybkie linki</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/#features" className="text-neutral-400 hover:text-white transition-colors">
                    Funkcje
                  </a>
                </li>
                <li>
                  <a href="/#premium" className="text-neutral-400 hover:text-white transition-colors">
                    Premium
                  </a>
                </li>
                <li>
                  <a href="/policies/privacy" className="text-neutral-400 hover:text-white transition-colors">
                    O nas
                  </a>
                </li>
                <li>
                  <a href="/policies/tos" className="text-neutral-400 hover:text-white transition-colors">
                    Kontakt
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-semibold mb-4">Informacje prawne</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/policies/privacy" className="text-neutral-400 hover:text-white transition-colors">
                    Polityka prywatności
                  </a>
                </li>
                <li>
                  <a href="/policies/tos" className="text-neutral-400 hover:text-white transition-colors">
                    Regulamin
                  </a>
                </li>
                <li>
                  <a href="/policies/refunds" className="text-neutral-400 hover:text-white transition-colors">
                    Polityka zwrotów
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-semibold mb-4">Kontakt</h3>
              <ul className="space-y-2 text-neutral-400">
                <li>Email: contact@ksiegai.pl</li>
                <li>Telefon: +48 123 456 789</li>
                <li>Adres: Warszawa, Polska</li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-neutral-400">
            <p>© 2024 KsiegaI. Wszelkie prawa zastrzeżone.</p>
          </div>
        </div>
      </footer>
    </div>
  );
} 