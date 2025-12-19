import { useNavigate } from "react-router-dom";
import { Seo } from '@/components/seo/Seo';
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
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Seo 
        title="Nie myśl o księgowości - KsięgaI dopilnuje wszystko za Ciebie" 
        description="Przestań martwić się księgowością, podatkami i fakturami. KsięgaI ogarnia faktury, wydatki i zgodność podatkową za Ciebie — bez stresu, bez chaosu."
      />
      {/* Hero Section - NUCLEAR HEADLINE */}
      <section className="relative py-12 md:py-20 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 md:px-4 py-8 md:py-12">
          <div className="mx-auto text-center max-w-5xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600/10 border border-blue-500/30 mb-8">
              <span className="text-base">🇵🇱</span>
              <span className="text-blue-300 text-sm font-semibold">Dla polskich przedsiębiorców — także tych, którzy sprzedają za granicę</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Nie myśl o księgowości.
            </h1>
            <p className="text-2xl md:text-3xl text-gray-300 mb-6 font-medium leading-relaxed">
              KsięgaI dopilnuje faktur, podatków i porządku w firmie <span className="text-blue-400">za Ciebie</span>.
            </p>
            <p className="text-lg md:text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
              Wystawiasz faktury.<br />
              Resztą zajmuje się system.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link to="/auth/register" className="block">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-6 h-auto shadow-xl hover:shadow-2xl transition-all"
                >
                  Zobacz, jak działa księgowość bez myślenia — zacznij za darmo
                </Button>
              </Link>
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-gray-400 font-medium">Zgodne z polskimi przepisami • KSeF • JPK • realia polskich firm — także w UE</p>
              <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap text-sm">
                <span className="flex items-center gap-2 text-gray-300">
                  <span className="text-base">🇵🇱</span>
                  <span>Polski język i wsparcie</span>
                </span>
                <span className="flex items-center gap-2 text-gray-300">
                  <span className="text-base">🇵🇱</span>
                  <span>Polskie przepisy i KSeF</span>
                </span>
                <span className="flex items-center gap-2 text-gray-300">
                  <span className="text-base">🇵🇱</span>
                  <span>Dla polskich przedsiębiorców</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IS THIS FOR - Pain-based targeting */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 md:px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
              Jeśli prowadzisz firmę i nie chcesz myśleć o księgowości — to jest dla Ciebie.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 text-left">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 dark:text-red-400 text-xl">✗</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    Masz dość pilnowania faktur, terminów i dokumentów
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 dark:text-red-400 text-xl">✗</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    Nie wiesz, czy wszystko jest zgodne z przepisami
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 dark:text-red-400 text-xl">✗</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    Boisz się błędów, które mogą kosztować czas lub pieniądze
                  </p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-red-600 dark:text-red-400 text-xl">✗</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-lg">
                    Chcesz mieć porządek, ale bez uczenia się księgowości
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-400 mt-8 font-medium">
              KsięgaI zostało stworzone po to, żebyś nie musiał się na tym znać.
            </p>
            <div className="mt-10 p-6 bg-white dark:bg-gray-800 rounded-xl border-2 border-blue-200 dark:border-blue-800">
              <p className="text-lg text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                KsięgaI powstało, aby dać polskim firmom przewagę — w kraju i za granicą.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SPEED & CERTAINTY */}
      <section className="py-16 bg-white dark:bg-gray-950">
        <div className="container mx-auto px-6 md:px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8">
              Porządek w finansach w jeden wieczór
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Pierwsza faktura w mniej niż 5 minut
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Bez szkoleń, bez komplikacji
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Wydatki pod kontrolą bez Excela
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Wszystko w jednym miejscu
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Zawsze gotowe do sprawdzenia
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Żadnych niespodzianek
                </p>
              </div>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-10">
              Używane przez przedsiębiorców, którzy chcą spokoju, nie skomplikowanych systemów.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES → RELIEF (What stops being your problem) */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 md:px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              Co dokładnie przestaje być Twoim problemem?
            </h2>
            <div className="grid grid-cols-1 gap-6 mt-10">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Faktury</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      Wystawiasz, wysyłasz, zapominasz. System pilnuje reszty.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Receipt className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Wydatki</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      Wszystkie koszty w jednym miejscu, bez szukania i zgadywania.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Klienci</h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      Zawsze wiesz, kto zapłacił, a kto nie — bez ręcznego sprawdzania.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section - Simplified */}
      <section className="py-16 relative bg-white dark:bg-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-2 md:px-4">
          <div className="w-full md:max-w-6xl mx-0 md:mx-auto">
            <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-6 font-medium">
              To, co widzisz poniżej, to efekt działania systemu — nie coś, czym musisz zarządzać.
            </p>
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
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/10 dark:bg-neutral-900/50 border border-white/10 dark:border-neutral-700 hover:border-blue-500/50 transition-colors cursor-pointer">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white dark:text-white">Nowa Faktura</p>
                          <p className="text-sm text-white/70 dark:text-neutral-400">Wystaw nową fakturę</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/10 dark:bg-neutral-900/50 border border-white/10 dark:border-neutral-700 hover:border-green-500/50 transition-colors cursor-pointer">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white dark:text-white">Nowy Wydatek</p>
                          <p className="text-sm text-white/70 dark:text-neutral-400">Dodaj nowy wydatek</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 rounded-lg border border-blue-500/20">
                    <h3 className="text-lg font-semibold text-white dark:text-white mb-4">Ostatnie faktury</h3>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-neutral-900/50 border border-white/10 dark:border-neutral-700">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <p className="font-medium text-white dark:text-white">Faktura #{i}234</p>
                              <p className="text-sm text-white/70 dark:text-neutral-400">Klient {i}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-white dark:text-white">{(i * 1234).toLocaleString('pl-PL')} PLN</p>
                            <p className="text-sm text-white/70 dark:text-neutral-400">Termin: {new Date().toLocaleDateString('pl-PL')}</p>
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

      {/* FINAL CTA - Hormozi Close */}
      <section className="py-16 relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-6 md:px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Sprawdź, jak to jest nie myśleć o księgowości
          </h2>
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="flex flex-col sm:flex-row gap-2 text-lg text-gray-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                7 dni za darmo
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Bez karty
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Bez zobowiązań
              </span>
            </div>
          </div>
          <Link to="/auth/register" className="inline-block">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xl px-12 py-7 h-auto shadow-2xl hover:shadow-3xl transition-all"
            >
              Zacznij teraz — ryzyko = 0
              <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
          </Link>
          <p className="text-sm text-gray-500 mt-6">
            Gotowe w 5 minut • Działa w Polsce • Zgodne z KSeF
          </p>
          <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700 inline-block">
            <p className="text-sm text-gray-400">
              Aplikacja w języku polskim.<br />
              Wsparcie dla polskich przedsiębiorców — w kraju i za granicą.
            </p>
          </div>
        </div>
      </section>


      {/* PREMIUM - Risk Removal Framing */}
      <section id="premium" className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-6 md:px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">Premium</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Dla firm, które nie chcą ryzykować błędów
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
                Zgodność z polskimi przepisami i KSeF — żebyś spał spokojnie, nawet gdy zmieniają się zasady.
              </p>
              <p className="text-base text-gray-500 dark:text-gray-500 italic">
                Zbudowane w oparciu o polskie prawo podatkowe i realne procesy księgowe — nie marketingowe założenia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">KSeF & podatki</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Nie martwisz się, czy coś jest źle wysłane lub źle policzone.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Automatyczne wysyłanie do KSeF</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Generowanie JPK-V7M</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Synchronizacja z US</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Calculator className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Zaawansowana księgowość</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Gotowe dane, kiedy ich potrzebujesz — bez paniki przed terminami.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Automatyczne rozliczenia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Deklaracje PIT/CIT</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Raporty zawsze gotowe</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">AI</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Dokumenty same się ogarniają. Ty tylko zatwierdzasz.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Rozpoznawanie dokumentów</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Kategoryzacja transakcji</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Asystent księgowy</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Bank</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Widzisz pieniądze w czasie rzeczywistym. Bez ręcznego dopasowywania.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Transakcje na żywo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Auto-dopasowanie płatności</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Alerty o wpłatach</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-center mt-12">
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-10 py-6 h-auto"
                  onClick={() => navigate("/auth/register")}
                >
                  Aktywuj Premium i miej pewność, że wszystko jest OK
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 