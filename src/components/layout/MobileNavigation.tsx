import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Moon,
  Crown,
  User,
  LogOut,
  Sun,
  ChevronDown,
  Monitor,
  Shield,
  UserCheck,
  Boxes,
  Signature,
  Banknote
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BusinessProfileSwitcher } from './BusinessProfileSwitcher';
import { useBusinessProfile } from '@/context/BusinessProfileContext';

const MobileNavigation = () => {
  const { theme, setTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isPremium, openPremiumDialog } = useAuth();

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

  // Management items for the side menu (inventory is premium gated)
  const managementItems = [
    { title: "Klienci", path: "/customers", icon: Users, premium: false },
    { title: "Umowy", path: "/contracts", icon: Signature, premium: false },
    { title: "Pracownicy", path: "/employees", icon: UserCheck, premium: false },
    { title: "Produkty", path: "/products", icon: Package, premium: false },
    { title: "Magazyn", path: "/inventory", icon: Boxes, premium: true },
    { title: "Ustawienia", path: "/settings", icon: Settings, premium: false },
  ];

  // Premium features
  const premiumFeatures = [
    { title: "Księgowość", path: "/accounting", icon: Calculator, premium: true, group: "finanse" },
    { title: "KSeF", path: "/ksef", icon: Building, premium: true, group: "zarzadzanie" },
  ];

  // Finanse group (updated to match desktop)
  const finanseItems = [
    { title: "Faktury", path: "/income", icon: FileText },
    { title: "Wydatki", path: "/expense", icon: CreditCard },
    { title: "Bankowość", path: "/bank", icon: Banknote },
    { title: "Księgowość", path: "/accounting", icon: Calculator, premium: true },
  ];

  // Zarządzanie group (updated to match desktop)
  const zarzadzanieItems = [
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: Package },
    { title: "Umowy", path: "/contracts", icon: Signature },
    { title: "Pracownicy", path: "/employees", icon: UserCheck },
    { title: "Magazyn", path: "/inventory", icon: Boxes, premium: true },
  ];

  // If premium, add Księgowość to Finanse and KSeF to Zarządzanie
  if (isPremium) {
    // Księgowość is already included as premium in Finanse
    zarzadzanieItems.push({ title: "KSeF", path: "/ksef", icon: Building, premium: true });
  }

  // Ustawienia group
  const ustawieniaItems = [
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];

  // For non-premium users, show premium features in a separate section
  const showPremiumSection = !isPremium;

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
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center px-4 py-2",
              isActive ? "text-primary" : "text-muted-foreground"
            )
          }
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
              {/* Premium badge at top if premium */}
              {isPremium && (
                <div className="flex items-center justify-between mb-3 px-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">PREMIUM</h3>
                  <div className="flex items-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">AKTYWNE</span>
                  </div>
                </div>
              )}
              {/* Quick Actions */}
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
              {/* Finanse Section */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">FINANSE</h3>
                <div className="space-y-1">
                  {finanseItems.map((item) => (
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
              {/* Zarządzanie Section */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">ZARZĄDZANIE</h3>
                <div className="space-y-1">
                  {zarzadzanieItems.map((item) => (
                    item.premium && !isPremium ? (
                      <div
                        key={item.title}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer"
                        onClick={openPremiumDialog}
                      >
                        <item.icon className="h-5 w-5 text-amber-600" />
                        <span className="text-amber-900 font-medium flex-1">{item.title}</span>
                        <Crown className="h-4 w-4 text-amber-600" />
                      </div>
                    ) : (
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
                    )
                  ))}
                </div>
              </div>
              {/* Premium Section for non-premium users */}
              {showPremiumSection && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">PREMIUM</h3>
                  <div className="space-y-1">
                    {premiumFeatures.map((feature) => (
                      <div
                        key={feature.title}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer"
                        onClick={openPremiumDialog}
                      >
                        <feature.icon className="h-5 w-5 text-amber-600" />
                        <span className="text-amber-900 font-medium flex-1">{feature.title}</span>
                        <Crown className="h-4 w-4 text-amber-600" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Theme Toggle */}
              <div className="border-t pt-4">
                <div className="px-3">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">MOTYW</h3>
                  <div className="relative">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center justify-between w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-background">
                          <Sun className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                        </div>
                        <span className="text-sm font-medium">Motyw</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-popover rounded-md shadow-lg border border-border overflow-hidden">
                        <button
                          onClick={() => {
                            setTheme('light');
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${theme === 'light' ? 'bg-accent' : ''}`}
                        >
                          <Sun className="mr-2 h-4 w-4" />
                          <span>Jasny</span>
                        </button>
                        <button
                          onClick={() => {
                            setTheme('dark');
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${theme === 'dark' ? 'bg-accent' : ''}`}
                        >
                          <Moon className="mr-2 h-4 w-4" />
                          <span>Ciemny</span>
                        </button>
                        <button
                          onClick={() => {
                            setTheme('system');
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${theme === 'system' ? 'bg-accent' : ''}`}
                        >
                          <Monitor className="mr-2 h-4 w-4" />
                          <span>Systemowy</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Policies Section */}
              <div className="border-t pt-4">
                <div className="px-3">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">POLITYKI</h3>
                  <div className="space-y-1">
                    <NavLink
                      to="/policies/privacy"
                      className={({ isActive }) =>
                        cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")
                      }
                    >
                      <Shield className="h-5 w-5" />
                      <span>Polityka Prywatności</span>
                    </NavLink>
                    <NavLink
                      to="/policies/tos"
                      className={({ isActive }) =>
                        cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")
                      }
                    >
                      <FileText className="h-5 w-5" />
                      <span>Regulamin</span>
                    </NavLink>
                    <NavLink
                      to="/policies/refunds"
                      className={({ isActive }) =>
                        cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")
                      }
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Polityka Zwrotów</span>
                    </NavLink>
                  </div>
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

const UserMenuFooter = () => {
  const { user, logout, isPremium } = useAuth();
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();

  if (!user) return null;
  
  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <div className="p-4 border-t">
      {/* Business Profile Switcher */}
      <div className="mb-3">
        <BusinessProfileSwitcher isCollapsed={false} />
      </div>
      
      {/* User Info */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-muted'}`}>
            <User className="h-5 w-5 text-white" />
            {isPremium && (
              <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <NavLink to="/settings" className="flex items-center gap-2 group">
            <p className="text-sm font-medium truncate group-hover:underline">
              {user.email}
            </p>
            {isPremium && (
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                <Crown className="h-2.5 w-2.5" />
                <span>PREMIUM</span>
              </span>
            )}
          </NavLink>
          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground mt-0.5 flex items-center gap-1"
          >
            <LogOut className="h-3 w-3" />
            Wyloguj się
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileNavigation;