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
  Shield
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

  // Dashboard item
  const dashboardItem: SidebarItem = { title: "Dashboard", path: "/dashboard", icon: BarChart };

  // Finanse group
  const fakturyItem: SidebarItem = { title: "Faktury", path: "/income", icon: FileText, className: "lg:hidden" };
  const wydatkiItem: SidebarItem = { title: "Wydatki", path: "/expense", icon: CreditCard, className: "lg:hidden" };
  const bankItem: SidebarItem = { title: "Bankowość", path: bankPath, icon: Banknote };
  const accountingItem: SidebarItem = { title: "Księgowość", path: "/accounting", icon: Calculator };

  // Zarządzanie group
  const clientsItem = { title: "Klienci", path: "/customers", icon: Users, className: "lg:hidden" } as SidebarItem;
  const productsItem = { title: "Produkty", path: "/products", icon: Package, className: "lg:hidden" } as SidebarItem;
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
  const decisionsItem: SidebarItem = { title: "Decyzje", path: "/decisions", icon: Shield };
  const contractsItem: SidebarItem = { title: isSpoolka ? "Dokumenty" : "Umowy", path: "/contracts", icon: Signature };
  const employeesItem = { title: "Pracownicy", path: "/employees", icon: UserCheck } as SidebarItem;
  const inventoryItem: SidebarItem = { title: "Magazyn", path: "/inventory", icon: Boxes, premium: true };

  // KSeF and settings (not in main sidebar groups)
  const ksefItem: SidebarItem = { title: "KSeF", path: "/ksef", icon: Building, premium: true };
  const settingsItem = { title: "Ustawienia", path: "/settings", icon: Settings } as SidebarItem;

  // Finanse sidebar group
  const finanseItems: SidebarItem[] = [fakturyItem, wydatkiItem, bankItem, accountingItem];

  // Zarządzanie sidebar group
  const zarzadzanieItems: SidebarItem[] = [clientsItem, productsItem, decisionsItem, contractsItem, employeesItem, ...(isPremium ? [inventoryItem] : []), settingsItem];

  // Premium section for non-premium users (upsell)
  const premiumFeatures: SidebarItem[] = [inventoryItem, ksefItem];

  const isActive = (path: string) => {
    // Special handling for dashboard to prevent matching other routes that start with /
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getNavClassName = (path: string, premiumItem?: boolean, extraClass?: string) => {
    const base = "flex items-center px-3 py-2 rounded-lg transition-all duration-200 w-full text-white";
    const align = isCollapsed ? "justify-center" : "gap-3 justify-start";
    const extra = extraClass || "";

    if (premiumItem && isPremium) {
      return cn(
        base,
        align,
        extra,
        isActive(path)
          ? "bg-amber-600 text-white shadow-sm"
          : "hover:bg-amber-500/80 text-white"
      );
    }

    if (premiumItem) {
      return cn(
        base,
        align,
        extra,
        "text-white/50 hover:text-white/70 cursor-not-allowed opacity-50"
      );
    }

    return cn(
      base,
      align,
      extra,
      isActive(path)
        ? "bg-primary text-white shadow-sm"
        : "text-white/90 hover:bg-primary/80 hover:text-white"
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
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2">
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Polski System
              </h2>
              <p className="text-xs text-muted-foreground">Fakturowy</p>
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
        <div className="py-2 border-b">
          <BusinessProfileSwitcher isCollapsed={isCollapsed} />
        </div>

        {/* Dashboard button */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem key={dashboardItem.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(dashboardItem.path)}
                  tooltip={isCollapsed ? dashboardItem.title : undefined}
                >
                  <NavLink to={dashboardItem.path} className={getNavClassName(dashboardItem.path, dashboardItem.premium)}>
                    <dashboardItem.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{dashboardItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

                {/* Quick Actions */}
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>SZYBKIE AKCJE</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {quickActions.map((action) => (
                <SidebarMenuItem key={action.path}>
                  <SidebarMenuButton
                    asChild
                    tooltip={isCollapsed ? action.title : undefined}
                  >
                    <a href={action.path} className={cn(
                        "flex items-center rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors w-full text-white/90 hover:text-white",
                        isCollapsed ? "justify-center h-10 px-0" : "gap-3 px-3 py-2"
                    )}>
                      <action.icon className={`h-5 w-5 flex-shrink-0 ${action.color} opacity-90`} />
                      {!isCollapsed && (
                        <span className="font-medium">
                          {action.title}
                        </span>
                      )}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Finanse */}
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>FINANSE</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {finanseItems.map((item) => (
                <SidebarMenuItem key={item.path} className={item.className}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path)}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <NavLink to={item.path} className={getNavClassName(item.path, item.premium)}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Zarządzanie */}
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>ZARZĄDZANIE</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {zarzadzanieItems.map((item) => (
                <SidebarMenuItem key={item.path} className={item.className}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path)}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <NavLink to={item.path} className={getNavClassName(item.path, item.premium)}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
      
      <SidebarFooter className="border-t p-4">
        <SidebarUserInfo />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
