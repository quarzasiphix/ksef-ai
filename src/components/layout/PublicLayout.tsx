import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import PublicHeader from "./PublicHeader";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is logged in, redirect to dashboard
  if (user) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 to-neutral-800">
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