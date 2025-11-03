import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { BusinessProfileSwitcher } from "@/components/layout/BusinessProfileSwitcher";
import { User, Crown, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import React from "react";

export default function PublicHeader() {
  const { user, logout, isPremium } = useAuth();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-lg supports-[backdrop-filter]:bg-neutral-900/60">
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

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full hover:bg-neutral-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-blue-500" />
            )}
          </button>

          {/* Auth/Profile Section */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* Business Profile Switcher (hidden on mobile, visible on md+) */}
                <div className="hidden md:block">
                  <BusinessProfileSwitcher isCollapsed={false} />
                </div>
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center mr-2 ${isPremium ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-muted'}`}>
                    <User className="h-5 w-5 text-white" />
                    {isPremium && (
                      <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate text-white max-w-[120px]">{user.email}</span>
                    {isPremium && (
                      <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full mt-0.5">
                        <Crown className="h-2.5 w-2.5" />
                        <span>PREMIUM</span>
                      </span>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    className="ml-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <LogOut className="h-3 w-3" />
                    Wyloguj się
                  </button>
                </div>
                {/* Go to Application Button */}
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate("/")}
                >
                  Przejdź do aplikacji
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 