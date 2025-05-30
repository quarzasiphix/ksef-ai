import React, { useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Star
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isPremium } = useAuth();
  const { state, setState } = useSidebar();
  const isManualToggle = useRef(false);

  const handleToggle = useCallback(() => {
    isManualToggle.current = true;
    setState(state === "expanded" ? "collapsed" : "expanded");
    // Reset the manual toggle flag after a short delay
    setTimeout(() => {
      isManualToggle.current = false;
    }, 100);
  }, [state, setState]);

  useEffect(() => {
    const handleResize = () => {
      if (!isManualToggle.current) {
        setState(window.innerWidth >= 1400 ? "expanded" : "collapsed");
      }
    };

    // Set initial state
    handleResize();

    // Add resize listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      isManualToggle.current = false;
    };
  }, [setState]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <Sidebar className={cn(
      "h-screen border-r bg-muted/50 transition-all duration-300 relative",
      state === "expanded" ? "w-64" : "w-16"
    )}>
      <div className="flex flex-col h-full">
        <SidebarHeader className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold">K</span>
            </div>
            {state === "expanded" && (
              <div className="flex items-center gap-2">
                 <span className="text-lg font-semibold">KSEF AI</span>
                 {isPremium && (
                    <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
                 )}
                 {isPremium && state === "expanded" && (
                     <span className="text-xs font-semibold text-amber-400">PREMIUM</span>
                 )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-8 w-8"
          >
            {state === "expanded" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </SidebarHeader>

        <div className="flex-1 overflow-y-auto scrollbar-none pb-16">
          <SidebarContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuButton asChild tooltip={state === 'collapsed' ? 'Dashboard' : undefined}>
                 <Button
                  variant="ghost"
                  className={cn(
                    "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                    location.pathname === "/" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => navigate("/")}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                >
                        <LayoutDashboard
                        className={cn(
                        "h-4 w-4 transition-colors",
                        location.pathname === "/" ? "text-accent-foreground" : "text-white"
                      )} />
                      {state === "expanded" && <span className="ml-2 text-white">Dashboard</span>}
                  </Button>
              </SidebarMenuButton>

              <SidebarMenuButton asChild  tooltip={state === 'collapsed' ? 'Przychody' : undefined}>
              <Button
                  variant="ghost"
                  className={cn(
                    "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                    location.pathname === "/income"
                      ? "bg-accent text-accent-foreground"
                      : cn(
                          state === "collapsed" ? "text-white" : "text-muted-foreground",
                          "hover:bg-accent hover:text-accent-foreground"
                        ),
                  )}
                  onClick={() => navigate("/income")}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                >
                        <Receipt
                        className={cn(
                          "h-4 w-4 transition-colors",
                          location.pathname === "/income" ? "text-accent-foreground" : "text-white"
                        )} />
                        {state === "expanded" && <span className="ml-2 text-white">Przychody</span>}
                    </Button>
              </SidebarMenuButton>

              <SidebarMenuButton asChild  tooltip={state === 'collapsed' ? 'Wydatki' : undefined}>
              <Button
                  variant="ghost"
                  className={cn(
                    "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                    location.pathname === "/expense"
                      ? "bg-accent text-accent-foreground"
                      : cn(
                          state === "collapsed" ? "text-white" : "text-muted-foreground",
                          "hover:bg-accent hover:text-accent-foreground"
                        ),
                  )}
                  onClick={() => navigate("/expense")}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                >
                      <Receipt
                      className={cn(
                        "h-4 w-4 transition-colors",
                        location.pathname === "/expense" ? "text-accent-foreground" : "text-white"
                      )} />
                      {state === "expanded" && <span className="ml-2 text-white">Wydatki</span>}
                  </Button>
              </SidebarMenuButton>

              <SidebarMenuButton asChild  tooltip={state === 'collapsed' ? 'Kontrahenci' : undefined}>
              <Button
                  variant="ghost"
                  className={cn(
                    "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                    location.pathname === "/customers"
                      ? "bg-accent text-accent-foreground"
                      : cn(
                          state === "collapsed" ? "text-white" : "text-muted-foreground",
                          "hover:bg-accent hover:text-accent-foreground"
                        ),
                  )}
                  onClick={() => navigate("/customers")}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                >
                      <Users
                      className={cn(
                        "h-4 w-4 transition-colors",
                        location.pathname === "/customers" ? "text-accent-foreground" : "text-white"
                      )} />
                      {state === "expanded" && <span className="ml-2 text-white">Kontrahenci</span>}
                  </Button>
              </SidebarMenuButton>

              <SidebarMenuButton asChild  tooltip={state === 'collapsed' ? 'Produkty' : undefined}>
              <Button
                  variant="ghost"
                  className={cn(
                    "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                    location.pathname === "/products"
                      ? "bg-accent text-accent-foreground"
                      : cn(
                          state === "collapsed" ? "text-white" : "text-muted-foreground",
                          "hover:bg-accent hover:text-accent-foreground"
                        ),
                  )}
                  onClick={() => navigate("/products")}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                >
                       <Package
                       className={cn(
                        "h-4 w-4 transition-colors",
                        location.pathname === "/products" ? "text-accent-foreground" : "text-white"
                      )} />
                      {state === "expanded" && <span className="ml-2 text-white">Produkty</span>}
                  </Button>
              </SidebarMenuButton>

              <SidebarMenuButton asChild  tooltip={state === 'collapsed' ? 'Ustawienia' : undefined}>
              <Button
                  variant="ghost"
                  className={cn(
                    "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                    location.pathname === "/settings"
                      ? "bg-accent text-accent-foreground"
                      : cn(
                          state === "collapsed" ? "text-white" : "text-muted-foreground",
                          "hover:bg-accent hover:text-accent-foreground"
                        ),
                  )}
                  onClick={() => navigate("/settings")}
                  style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                >
                      <Settings
                      className={cn(
                        "h-4 w-4 transition-colors",
                        location.pathname === "/settings" ? "text-accent-foreground" : "text-white"
                      )} />
                      {state === "expanded" && <span className="ml-2 text-white">Ustawienia</span>}
                  </Button>
              </SidebarMenuButton>
            </SidebarMenu>
          </SidebarContent>
        </div>

        {/* User info section - fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              {state === "expanded" && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Zalogowano jako</span>
                  <span className={cn(
                     "text-xs truncate max-w-[150px]",
                     isPremium 
                       ? "text-amber-400"
                       : "text-muted-foreground"
                  )}>
                    {user?.email}
                  </span>
                </div>
              )}
            </div>
            {state === "expanded" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Sidebar>
  );
};


export default AppSidebar;