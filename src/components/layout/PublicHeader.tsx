import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function PublicHeader() {
  return (
    <header className="border-b border-neutral-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-white hover:text-primary transition-colors">
              KsiegaI
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/#features" className="text-neutral-300 hover:text-white transition-colors">
              Funkcje
            </a>
            <a href="/#premium" className="text-neutral-300 hover:text-white transition-colors">
              Premium
            </a>
            <a href="/policies/privacy" className="text-neutral-300 hover:text-white transition-colors">
              O nas
            </a>
            <a href="/policies/tos" className="text-neutral-300 hover:text-white transition-colors">
              Kontakt
            </a>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
            <Link to="/auth/login" className="block">
              <Button 
                variant="ghost" 
                className="text-neutral-300 hover:text-white"
              >
                Zaloguj się
              </Button>
            </Link>
            <Link to="/auth/register" className="block">
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
              >
                Zarejestruj się
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 