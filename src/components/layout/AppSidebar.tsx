import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Plus,
  Users, 
  Package, 
  Settings, 
  Crown,
  User,
  LogOut,
  UserCheck,
  Boxes,
  LucideIcon,
  Signature,
  Building,
  BarChart,
  Banknote,
  Calculator,
  FileText,
  CreditCard,
  Shield,
  TrendingUp,
  DollarSign,
  Scale,
  Briefcase,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BusinessProfileSwitcher } from "./BusinessProfileSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useBusinessProfile } from "@/context/BusinessProfileContext";

const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { isPremium, openPremiumDialog, user, logout } = useAuth();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const isSpZoo = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
  const bankPath = isSpZoo ? '/accounting/bank' : '/bank';

  // Quick actions
  const quickActions = [
    { title: "Nowa Faktura", path: "/income/new", icon: Plus, color: "text-green-600 dark:text-green-400" },
    { title: "Nowy Wydatek", path: "/expense/new", icon: Plus, color: "text-red-600 dark:text-red-400" },
  ];

  // Sidebar item type with optional premium flag
  interface SidebarItem {
    title: string;
    path: string;
    icon: LucideIcon;
    premium?: boolean;
    className?: string;
  }

  interface SidebarSection {
    label: string;
    subtitle?: string;
    items: SidebarItem[];
    showForJdg?: boolean;
    showForSpoolka?: boolean;
  }

  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  // 1️⃣ OVERVIEW
  const overviewItem: SidebarItem = { 
    title: isSpoolka ? "Przegląd" : "Dashboard", 
    path: "/dashboard", 
    icon: BarChart 
  };

  // 2️⃣ FINANSE (Money responsibility)
  const finanseSection: SidebarSection = {
    label: "FINANSE",
    subtitle: "Przepływy pieniężne i rozliczenia",
    showForJdg: true,
    showForSpoolka: true,
    items: [
      { title: "Faktury", path: "/income", icon: FileText, className: "lg:hidden" },
      { title: "Wydatki", path: "/expense", icon: CreditCard, className: "lg:hidden" },
      { title: "Bankowość", path: bankPath, icon: Banknote },
      { title: "Kasa", path: "/accounting/kasa", icon: Wallet },
      { title: "Analizy", path: "/analytics", icon: TrendingUp },
    ],
  };

  // 3️⃣ KSIĘGOWOŚĆ (Tax & compliance - spółka only)
  const ksiegowoscSection: SidebarSection = {
    label: "KSIĘGOWOŚĆ",
    subtitle: "Podatki i sprawozdania",
    showForJdg: false,
    showForSpoolka: true,
    items: [
      { title: "Panel główny", path: "/accounting", icon: Calculator },
      { title: "Bilans", path: "/accounting/balance-sheet", icon: TrendingUp },
      { title: "Kapitał", path: "/accounting/capital-events", icon: DollarSign },
      { title: "Wspólnicy", path: "/accounting/shareholders", icon: Users },
    ],
  };

  // For JDG: simplified accounting
  const ksiegowoscJdgSection: SidebarSection = {
    label: "KSIĘGOWOŚĆ",
    subtitle: "Podatki i rozliczenia",
    showForJdg: true,
    showForSpoolka: false,
    items: [
      { title: "Księgowość", path: "/accounting", icon: Calculator },
    ],
  };

  // 4️⃣ FORMALNOŚCI (Legal spine - spółka only)
  const formalnosciSection: SidebarSection = {
    label: "FORMALNOŚCI",
    subtitle: "Wymagania prawne i dokumenty",
    showForJdg: false,
    showForSpoolka: true,
    items: [
      { title: "Decyzje", path: "/decisions", icon: Shield },
      { title: "Dokumenty", path: "/contracts", icon: Signature },
      { title: "Rejestr spółki", path: "/accounting/company-registry", icon: Building },
    ],
  };

  // For JDG: just contracts
  const formalnosciJdgSection: SidebarSection = {
    label: "DOKUMENTY",
    subtitle: "Umowy i pliki",
    showForJdg: true,
    showForSpoolka: false,
    items: [
      { title: "Umowy", path: "/contracts", icon: Signature },
    ],
  };

  // 5️⃣ OPERACJE (Operations - lower priority)
  const operacjeSection: SidebarSection = {
    label: "OPERACJE",
    subtitle: "Zasoby i działania",
    showForJdg: true,
    showForSpoolka: true,
    items: [
      { title: "Klienci", path: "/customers", icon: Users, className: "lg:hidden" },
      { title: "Produkty", path: "/products", icon: Package, className: "lg:hidden" },
      { title: "Pracownicy", path: "/employees", icon: UserCheck },
      ...(isPremium ? [{ title: "Magazyn", path: "/inventory", icon: Boxes, premium: true }] : []),
    ],
  };

  // 6️⃣ SYSTEM (Settings - last)
  const systemSection: SidebarSection = {
    label: "SYSTEM",
    subtitle: undefined,
    showForJdg: true,
    showForSpoolka: true,
    items: [
      { title: "Ustawienia", path: "/settings", icon: Settings },
    ],
  };

  // Build sections based on entity type
  const sections: SidebarSection[] = [
    finanseSection,
    ...(isSpoolka ? [ksiegowoscSection, formalnosciSection] : [ksiegowoscJdgSection, formalnosciJdgSection]),
    operacjeSection,
    systemSection,
  ].filter(section => 
    isSpoolka ? section.showForSpoolka !== false : section.showForJdg !== false
  );

  // Premium section for non-premium users (upsell)
  const inventoryItem: SidebarItem = { title: "Magazyn", path: "/inventory", icon: Boxes, premium: true };
  const ksefItem: SidebarItem = { title: "KSeF", path: "/ksef", icon: Building, premium: true };
  const premiumFeatures: SidebarItem[] = [inventoryItem, ksefItem];

  const isActive = (path: string) => {
    // Special handling for dashboard to prevent matching other routes that start with /
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getNavClassName = (path: string, premium?: boolean) => {
    const active = isActive(path);
    return cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
      active
        ? "bg-muted/60 text-foreground font-medium"
        : "text-sidebar-foreground/75 hover:bg-muted/30 hover:text-foreground",
      premium && !isPremium && "opacity-50"
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  // Profile info for sidebar footer
  const SidebarUserInfo = () => {
    if (!user) return null;
    const Avatar = (
      <div
        className={`relative w-10 h-10 rounded-full flex items-center justify-center ${isPremium ? "bg-gradient-to-br from-amber-500 to-amber-700" : "bg-muted"}`}
      >
        <User className="h-5 w-5 text-white" />
        {isPremium && (
          <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
            <Crown className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    );
    return (
      <div className="flex items-center gap-3">
        <NavLink to="/settings" className="flex items-center gap-3 flex-1 min-w-0 group" aria-label="Ustawienia profilu">
          {Avatar}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:underline">
                {user.email}
              </p>
              {isPremium && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  <Crown className="h-2.5 w-2.5" />
                  <span>PREMIUM</span>
                </span>
              )}
            </div>
          )}
        </NavLink>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8"
            aria-label="Wyloguj"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <Sidebar className={cn("border-r-2 transition-all duration-300", isCollapsed ? "w-32" : "w-64")}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-3">
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="text-base font-bold text-sidebar-foreground">
                KsiegaI
              </h2>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5">System księgowy</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            <ThemeToggle size="sm" variant="ghost" showLabel={false} />
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Business Profile Switcher */}
        <div className="py-2 border-b border-sidebar-border">
          <BusinessProfileSwitcher isCollapsed={isCollapsed} />
        </div>

        {/* Spółka Context Header - only for spółki */}
        {isSpoolka && selectedProfile && !isCollapsed && (
          <div 
            className="px-3 py-3 border-b border-sidebar-border cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => navigate('/accounting/company-registry')}
          >
            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-sidebar-foreground/60 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {selectedProfile.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  <span className="text-[10px] text-sidebar-foreground/60">stabilna</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overview - always first */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key={overviewItem.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(overviewItem.path)}
                  tooltip={isCollapsed ? overviewItem.title : undefined}
                >
                  <NavLink to={overviewItem.path} className={getNavClassName(overviewItem.path)}>
                    <overviewItem.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span className="text-base">{overviewItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Dynamic sections based on entity type */}
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            {!isCollapsed && (
              <div className="px-2 mb-1">
                <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-sidebar-foreground/50">
                  {section.label}
                </SidebarGroupLabel>
                {section.subtitle && (
                  <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 leading-tight">
                    {section.subtitle}
                  </p>
                )}
              </div>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.path} className={item.className}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.path)}
                      tooltip={isCollapsed ? item.title : undefined}
                    >
                      <NavLink to={item.path} className={getNavClassName(item.path, item.premium)}>
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-base">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Upsell Premium Section (visible only for non-premium users) */}
        {!isPremium && (
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-2">
              {!isCollapsed && (
                <SidebarGroupLabel className="flex items-center gap-2">
                  PREMIUM
                  <Crown className="h-3 w-3 text-amber-500" />
                </SidebarGroupLabel>
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {premiumFeatures.map((feature) => (
                  <SidebarMenuItem key={feature.path}>
                    <SidebarMenuButton
                      onClick={openPremiumDialog}
                      tooltip={isCollapsed ? `${feature.title} (Premium)` : undefined}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer w-full",
                          isCollapsed ? "justify-center" : "justify-between"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <feature.icon className="h-5 w-5 flex-shrink-0 text-amber-600" />
                          {!isCollapsed && (
                            <span className="text-amber-900 font-medium">{feature.title}</span>
                          )}
                        </div>
                        {!isCollapsed && <Crown className="h-4 w-4 text-amber-600" />}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarUserInfo />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
