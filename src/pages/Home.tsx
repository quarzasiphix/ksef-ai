import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Bot, FileText, Mail, Calculator } from "lucide-react";

const features = [
  {
    title: "Automatyzacja Faktur",
    description: "Wykorzystaj AI do automatycznego odczytywania i przetwarzania faktur",
    icon: <FileText className="w-6 h-6" />,
  },
  {
    title: "Asystent AI",
    description: "Inteligentny asystent pomagający w codziennych zadaniach księgowych",
    icon: <Bot className="w-6 h-6" />,
  },
  {
    title: "Automatyzacja Emaili",
    description: "Automatyczne przetwarzanie i kategoryzacja wiadomości email",
    icon: <Mail className="w-6 h-6" />,
  },
  {
    title: "Integracja z KSeF",
    description: "Bezpieczna i szybka integracja z Krajowym Systemem e-Faktur",
    icon: <Calculator className="w-6 h-6" />,
  },
];

const premiumFeatures = [
  "Nieograniczona liczba faktur",
  "Wiele profili firmowych",
  "Pełny dostęp do statystyk",
  "Priorytetowe wsparcie",
  "Integracja z KSeF",
  "Automatyzacja procesów",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Nowoczesne Rozwiązanie dla <br />
            <span className="text-blue-500">Solo Przedsiębiorców</span> i <br />
            <span className="text-blue-500">Księgowych</span>
          </h1>
          <p className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
            Automatyzuj swoją księgowość z pomocą sztucznej inteligencji. 
            Oszczędzaj czas i eliminuj błędy dzięki naszemu inteligentnemu systemowi.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/auth/login">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Zaloguj się
              </Button>
            </Link>
            <Link to="/auth/register">
              <Button 
                size="lg" 
                variant="outline"
                className="text-white border-white hover:bg-white/10"
              >
                Zarejestruj się
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Dlaczego warto wybrać naszą platformę?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-neutral-800/50 p-6 rounded-lg border border-neutral-700 hover:border-blue-500 transition-colors"
            >
              <div className="text-blue-500 mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-neutral-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Premium Section */}
      <div id="premium" className="container mx-auto px-4 py-20">
        <div className="bg-neutral-800/50 rounded-2xl p-8 md:p-12 border border-neutral-700">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Rozpocznij z wersją Premium
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Odblokuj pełny potencjał naszej platformy i zoptymalizuj swoją księgowość
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <ul className="space-y-4">
                {premiumFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">99 zł</span>
                <span className="text-neutral-400">/miesiąc</span>
              </div>
              <Link to="/auth/register">
                <Button 
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto"
                >
                  Rozpocznij teraz
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

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
                  <a href="#features" className="text-neutral-400 hover:text-white transition-colors">
                    Funkcje
                  </a>
                </li>
                <li>
                  <a href="#premium" className="text-neutral-400 hover:text-white transition-colors">
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