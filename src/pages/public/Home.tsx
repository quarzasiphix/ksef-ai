import { useNavigate } from "react-router-dom";
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
  TrendingUp,
  CreditCard,
  Star,
  LineChart
} from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 md:px-4 py-20 md:py-24">
          <div className="mx-auto text-center sm:max-w-4xl sm:px-0 px-2">
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
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-2 md:px-4">
          <div className="w-full md:max-w-6xl mx-0 md:mx-auto">
            <div
              className="bg-neutral-900 md:bg-neutral-900/50 backdrop-blur-sm border md:border-neutral-800 rounded-2xl p-4 md:p-8 shadow-2xl"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
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

      {/* Free Trial Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-blue-500/10 via-purple-500/10 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Wypróbuj KsiegaI za darmo przez 7&nbsp;dni
          </h2>
          <p className="text-lg text-neutral-300 max-w-2xl mx-auto">
            Zarejestruj się lub zaloguj, aby natychmiast aktywować 7-dniowy okres próbny. <br className="hidden sm:inline" />
            Nie wymagamy karty kredytowej.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/auth/register" className="block">
              <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-lg px-8">
                Rozpocznij darmowy okres próbny
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth/login" className="block">
              <Button variant="outline" size="lg" className="text-white border-neutral-600 hover:bg-neutral-800/50">
                Mam już konto
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-900/30 via-blue-900/20 to-neutral-950/80 pointer-events-none" />
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 mb-4">
              <Star className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 text-sm font-semibold">Kluczowe Funkcje</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              Wszystko, czego potrzebujesz w jednym miejscu
            </h2>
            <p className="text-xl text-white/90 font-medium drop-shadow mb-2">
              Profesjonalne narzędzia do zarządzania finansami Twojej firmy
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-700/80 to-purple-700/80 p-6 rounded-2xl border border-blue-500/40 shadow-lg hover:border-blue-400/80 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-400/80 to-purple-400/80 flex items-center justify-center mb-4 shadow-md">
                <FileText className="h-7 w-7 text-white drop-shadow" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Profesjonalne Fakturowanie</h3>
              <p className="text-white/80 font-medium">
                Twórz i zarządzaj fakturami w kilka kliknięć. Automatyczne generowanie numerów i archiwizacja dokumentów.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-700/80 to-emerald-700/80 p-6 rounded-2xl border border-green-500/40 shadow-lg hover:border-green-400/80 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-400/80 to-emerald-400/80 flex items-center justify-center mb-4 shadow-md">
                <Receipt className="h-7 w-7 text-white drop-shadow" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Zarządzanie Wydatkami</h3>
              <p className="text-white/80 font-medium">
                Śledź wszystkie koszty działalności. Kategoryzuj wydatki i generuj raporty finansowe w czasie rzeczywistym.
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-700/80 to-pink-700/80 p-6 rounded-2xl border border-purple-500/40 shadow-lg hover:border-purple-400/80 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-400/80 to-pink-400/80 flex items-center justify-center mb-4 shadow-md">
                <Users className="h-7 w-7 text-white drop-shadow" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">CRM i Klienci</h3>
              <p className="text-white/80 font-medium">
                Zarządzaj bazą klientów, historią transakcji i automatycznymi przypomnieniami o płatnościach.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Features Section */}
      <section id="premium" className="py-20 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500/5 via-purple-500/5 to-transparent pointer-events-none" />
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
    </>
  );
} 