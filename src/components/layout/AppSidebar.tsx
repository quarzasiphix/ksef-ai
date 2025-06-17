import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  BarChart, 
  FileText, 
  CreditCard, 
  Users, 
  Package, 
  Settings, 
  Plus,
  Calculator,
  Building,
  Crown,
  Shield,
  User,
  LogOut,
  UserCheck,
  Boxes
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

const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { isPremium, openPremiumDialog, user, logout } = useAuth();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  // Main navigation items
  const mainNavItems = [
    { title: "Dashboard", path: "/", icon: BarChart },
    { title: "Faktury", path: "/income", icon: FileText },
    { title: "Wydatki", path: "/expense", icon: CreditCard },
  ];

  // Quick actions
  const quickActions = [
    { title: "Nowa Faktura", path: "/income/new", icon: Plus, color: "text-blue-600" },
    { title: "Nowy Wydatek", path: "/expense/new", icon: Plus, color: "text-green-600" },
  ];

  // Management items
  const managementItems = [
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: Package },
    { title: "Pracownicy", path: "/employees", icon: UserCheck },
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];

  // Premium features
  const premiumFeatures = [
    { title: "Księgowość", path: "/accounting", icon: Calculator },
    { title: "Magazyn", path: "/inventory", icon: Boxes },
    { title: "KSeF", path: "/ksef", icon: Building },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    return cn(
      "flex items-center px-3 py-2 rounded-lg transition-all duration-200 w-full",
      isCollapsed ? "justify-center" : "gap-3 justify-start",
      isActive(path)
        ? "bg-primary text-primary-foreground font-medium shadow-sm"
        : "hover:bg-muted text-foreground/80 hover:text-foreground dark:text-foreground/90 dark:hover:text-foreground"
    );
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
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
                    <NavLink
                      to={action.path}
                      className={cn(
                        "flex items-center rounded-lg bg-muted hover:bg-muted/80 transition-colors w-full dark:bg-muted/50 dark:hover:bg-muted/70",
                        isCollapsed ? "justify-center h-10 px-0" : "gap-3 px-3 py-2"
                      )}
                    >
                      <action.icon className={`h-5 w-5 flex-shrink-0 ${action.color} dark:opacity-90`} />
                      {!isCollapsed && (
                        <span className="font-medium text-foreground/90 dark:text-foreground">
                          {action.title}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Main Navigation */}
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>GŁÓWNE</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path)}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <NavLink to={item.path} className={getNavClassName(item.path)}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>ZARZĄDZANIE</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.path)}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <NavLink to={item.path} className={getNavClassName(item.path)}>
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        
        {/* Premium Features Section - At the top */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 py-2">
            {!isCollapsed && (
              <SidebarGroupLabel className="flex items-center gap-2">
                PREMIUM
                {isPremium ? (
                  <Shield className="h-3 w-3 text-amber-500" />
                ) : (
                  <Crown className="h-3 w-3 text-amber-500" />
                )}
              </SidebarGroupLabel>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {premiumFeatures.map((feature) => (
                <SidebarMenuItem key={feature.path}>
                  {isPremium ? (
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(feature.path)}
                      tooltip={isCollapsed ? feature.title : undefined}
                    >
                      <NavLink to={feature.path} className={cn(
                        getNavClassName(feature.path),
                        isActive(feature.path) ? "bg-amber-100 text-amber-900" : "hover:bg-amber-50"
                      )}>
                        <feature.icon className="h-5 w-5 flex-shrink-0 text-amber-600" />
                        {!isCollapsed && <span>{feature.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      onClick={openPremiumDialog}
                      tooltip={isCollapsed ? `${feature.title} (Premium)` : undefined}
                    >
                      <div className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer w-full",
                        isCollapsed ? "justify-center" : "justify-between"
                      )}>
                        <div className="flex items-center gap-3">
                          <feature.icon className="h-5 w-5 flex-shrink-0 text-amber-600" />
                          {!isCollapsed && (
                            <span className="text-amber-900 font-medium">{feature.title}</span>
                          )}
                        </div>
                        {!isCollapsed && <Crown className="h-4 w-4 text-amber-600" />}
                      </div>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          
          {!isPremium && !isCollapsed && (
            <div className="px-2 mt-2">
              <Button 
                onClick={openPremiumDialog}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                size="sm"
              >
                <Crown className="mr-2 h-4 w-4" />
                Kup Premium
              </Button>
            </div>
          )}
        </SidebarGroup>
      </SidebarContent>
      
      {/* beginning of footer */}
      <SidebarFooter className="border-t p-4">
        <SidebarUserInfo isCollapsed={isCollapsed} user={user} isPremium={isPremium} handleLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
};

// Desktop sidebar user info styled like mobile
const SidebarUserInfo = ({
  isCollapsed,
  user,
  isPremium,
  handleLogout,
}: {
  isCollapsed: boolean;
  user: { email?: string } | null;
  isPremium: boolean;
  handleLogout: () => void;
}) => {
  if (!user) return null;

  // Shared avatar markup to reuse between collapsed & expanded views
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

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center w-full">
        <NavLink to="/settings" className="flex-shrink-0" aria-label="Ustawienia profilu">
          {Avatar}
        </NavLink>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="ml-2 h-8 w-8"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <NavLink to="/settings" className="flex items-center gap-3 flex-1 min-w-0 group" aria-label="Ustawienia profilu">
          {Avatar}
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
        </NavLink>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8"
          aria-label="Wyloguj"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default AppSidebar;
