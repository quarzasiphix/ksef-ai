
import React, { useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import PublicHeader from "./PublicHeader";
import { Button } from "@/components/ui/button";
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
import { getBusinessProfiles } from "@/integrations/supabase/repositories/businessProfileRepository";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // After login (especially OAuth), user might land on `/`.
    // If so, check if they need to be onboarded or sent to dashboard.
    // We wait for auth state to be resolved (!loading) before checking.
    if (!loading && user && (location.pathname === '/' || location.pathname.startsWith('/auth'))) {
      getBusinessProfiles(user.id).then(profiles => {
        if (profiles.length === 0) {
          navigate("/welcome");
        } else {
          navigate("/dashboard");
        }
      });
    }
  }, [user, loading, navigate, location.pathname]);

  return (
    <BusinessProfileProvider>
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-purple-950/20 to-neutral-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/10 via-blue-500/5 to-transparent pointer-events-none" />
        <PublicHeader />

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
                  <li>Email: contact@ksiegai.pl</li>
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
