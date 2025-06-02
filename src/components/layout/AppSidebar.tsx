
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
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
  Star
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
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { isPremium, openPremiumDialog } = useAuth();
  const isCollapsed = state === "collapsed";

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
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];

  // Premium features
  const premiumFeatures = [
    { title: "Księgowość", path: "/accounting", icon: Calculator },
    { title: "KSeF", path: "/ksef", icon: Building },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    return cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 w-full justify-start",
      isActive(path) 
        ? "bg-primary text-primary-foreground font-medium shadow-sm" 
        : "hover:bg-muted text-muted-foreground hover:text-foreground"
    );
  };

  return (
    <Sidebar className="border-r-2">
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
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
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
                        "flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer w-full",
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
                    <NavLink to={action.path} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors w-full justify-start">
                      <action.icon className={`h-5 w-5 flex-shrink-0 ${action.color}`} />
                      {!isCollapsed && <span className="font-medium">{action.title}</span>}
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
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!isCollapsed && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Motyw</span>
            <ThemeToggle size="sm" />
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <ThemeToggle size="sm" />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
