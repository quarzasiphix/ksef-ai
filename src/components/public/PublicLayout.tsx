import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import PublicHeader from "./PublicHeader";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
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
import { BusinessProfileProvider } from "@/context/BusinessProfileContext";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  return (
    <BusinessProfileProvider>
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 dark:bg-gradient-to-b dark:from-neutral-950 dark:via-purple-950/20 dark:to-neutral-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-purple-50 to-transparent dark:from-blue-500/10 dark:via-purple-500/5 dark:to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-100 via-blue-50 to-transparent dark:from-purple-500/10 dark:via-blue-500/5 dark:to-transparent pointer-events-none" />
        <PublicHeader />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <Breadcrumbs />
          <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-border/50 shadow-sm">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-gray-900/50 backdrop-blur-sm">
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
                    <Link to="/#features" className="text-neutral-400 hover:text-white transition-colors">
                      Funkcje
                    </Link>
                  </li>
                  <li>
                    <Link to="/#premium" className="text-neutral-400 hover:text-white transition-colors">
                      Premium
                    </Link>
                  </li>
                  <li>
                    <Link to="/policies/privacy" className="text-neutral-400 hover:text-white transition-colors">
                      O nas
                    </Link>
                  </li>
                  <li>
                    <Link to="/policies/tos" className="text-neutral-400 hover:text-white transition-colors">
                      Kontakt
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-white font-semibold mb-4">Informacje prawne</h3>
                <ul className="space-y-2">
                  <li>
                    <Link to="/policies/privacy" className="text-neutral-400 hover:text-white transition-colors">
                      Polityka prywatności
                    </Link>
                  </li>
                  <li>
                    <Link to="/policies/tos" className="text-neutral-400 hover:text-white transition-colors">
                      Regulamin
                    </Link>
                  </li>
                  <li>
                    <Link to="/policies/refunds" className="text-neutral-400 hover:text-white transition-colors">
                      Polityka zwrotów
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-white font-semibold mb-4">Kontakt</h3>
                <ul className="space-y-2 text-neutral-400">
                  <li>Email: kontakt@ksiegai.pl</li>
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
    </BusinessProfileProvider>
  );
} 