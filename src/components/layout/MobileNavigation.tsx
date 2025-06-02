
import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  BarChart, 
  FileText, 
  Settings, 
  Menu, 
  Users, 
  Package, 
  CreditCard, 
  Plus,
  Calculator,
  Building,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";

const MobileNavigation = () => {
  // Main bottom navigation items - most used features
  const mainNavItems = [
    { title: "Dashboard", path: "/", icon: BarChart },
    { title: "Faktury", path: "/income", icon: FileText },
    { title: "Wydatki", path: "/expense", icon: CreditCard },
  ];
  
  // Quick action items for the side menu
  const quickActions = [
    { title: "Nowa Faktura", path: "/income/new", icon: Plus, color: "text-blue-600" },
    { title: "Nowy Wydatek", path: "/expense/new", icon: Plus, color: "text-green-600" },
  ];

  // Management items for the side menu
  const managementItems = [
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: Package },
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];

  // Premium features for the side menu
  const premiumFeatures = [
    { title: "Księgowość", path: "/accounting", icon: Calculator, premium: true },
    { title: "KSeF", path: "/ksef", icon: Building, premium: true },
  ];

  const getNavClassName = ({ isActive }: { isActive: boolean }) => {
    return cn(
      "flex flex-col items-center justify-center px-4 py-2",
      isActive ? "text-primary" : "text-muted-foreground"
    );
  };

  const location = useLocation();
  const hideNav = location.pathname.startsWith('/invoices/new') || 
                  location.pathname.startsWith('/income/new') || 
                  location.pathname.startsWith('/expense/new') ||
                  location.pathname.startsWith('/income/edit/') ||
                  location.pathname.startsWith('/expense/edit/');

  if (hideNav) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 md:hidden">
      {mainNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={getNavClassName}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-xs mt-1">{item.title}</span>
        </NavLink>
      ))}
      
      <Sheet>
        <SheetTrigger className="flex flex-col items-center justify-center px-4 py-2 text-muted-foreground">
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">Menu</span>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide pt-6">
            <div className="flex flex-col space-y-6 px-6">
              
              {/* Premium Features Section - Moved to top */}
              <PremiumSection features={premiumFeatures} />

              {/* Quick Actions Section */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">SZYBKIE AKCJE</h3>
                <div className="space-y-2">
                  {quickActions.map((action) => (
                    <NavLink
                      key={action.path}
                      to={action.path}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <action.icon className={`h-5 w-5 ${action.color}`} />
                      <span className="font-medium">{action.title}</span>
                    </NavLink>
                  ))}
                </div>
              </div>

              {/* Management Section */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">ZARZĄDZANIE</h3>
                <div className="space-y-1">
                  {managementItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => 
                        cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", 
                           isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
              
              {/* Theme Toggle */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium">Motyw</span>
                  <ThemeToggle size="sm" />
                </div>
              </div>

              {/* Extra padding to ensure content doesn't hide behind sticky footer */}
              <div className="h-20"></div>
            </div>
          </div>

          {/* Sticky User Section at bottom */}
          <div className="sticky bottom-0 bg-background border-t">
            <UserMenuFooter />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

const PremiumSection = ({ features }: { features: any[] }) => {
  const { isPremium, openPremiumDialog } = useAuth();

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-2">
        <h3 className="text-sm font-semibold text-muted-foreground">PREMIUM</h3>
        {isPremium && (
          <div className="flex items-center gap-1">
            <Crown className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">AKTYWNE</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        {features.map((feature) => (
          <div key={feature.path}>
            {isPremium ? (
              <NavLink
                to={feature.path}
                className={({ isActive }) => 
                  cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors", 
                     isActive ? "bg-amber-100 text-amber-900 font-medium" : "text-foreground hover:bg-muted")
                }
              >
                <feature.icon className="h-5 w-5 text-amber-600" />
                <span>{feature.title}</span>
              </NavLink>
            ) : (
              <div 
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer"
                onClick={openPremiumDialog}
              >
                <feature.icon className="h-5 w-5 text-amber-600" />
                <span className="text-amber-900 font-medium">{feature.title}</span>
                <Crown className="h-4 w-4 text-amber-600 ml-auto" />
              </div>
            )}
          </div>
        ))}
      </div>

      {!isPremium && (
        <Button 
          onClick={openPremiumDialog}
          className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
          size="sm"
        >
          <Crown className="mr-2 h-4 w-4" />
          Kup Premium
        </Button>
      )}
    </div>
  );
};

const UserMenuFooter = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null;
  
  return (
    <div className="p-6">
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Zalogowano jako:</div>
        <div className="text-sm font-medium truncate">{user.email}</div>
        <button
          className="text-xs text-red-500 hover:underline"
          onClick={() => {
            localStorage.removeItem("sb_session");
            setUser(null);
            navigate("/auth/login");
          }}
        >
          Wyloguj się
        </button>
      </div>
    </div>
  );
};

export default MobileNavigation;
