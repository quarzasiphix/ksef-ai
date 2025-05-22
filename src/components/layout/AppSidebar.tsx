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
  LogOut
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
  const { user, logout } = useAuth();
  const { state, setState } = useSidebar();
  const isManualToggle = useRef(false);

  const handleToggle = useCallback(() => {
    isManualToggle.current = true;
    setState(state === "expanded" ? "collapsed" : "expanded");
  }, [state, setState]);

  useEffect(() => {
    const handleResize = () => {
      if (!isManualToggle.current) {
        setState(window.innerWidth >= 1400 ? "expanded" : "collapsed");
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [setState]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <Sidebar className={cn(
      "h-screen border-r bg-muted/50 transition-all duration-300",
      state === "expanded" ? "w-64" : "w-16"
    )}>
      <SidebarHeader className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold">K</span>
          </div>
          {state === "expanded" && (
            <span className="text-lg font-semibold">KSEF AI</span>
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

      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex-1 overflow-y-auto scrollbar-none">
          <SidebarContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuButton asChild>
                <NavLink to="/" end isExpanded={state === "expanded"}>
                  <SidebarMenuItem className="h-full p-0">
                    <div className="flex items-center h-full">
                      <LayoutDashboard className="h-4 w-4" />
                      {state === "expanded" && <span className="ml-2">Dashboard</span>}
                    </div>
                  </SidebarMenuItem>
                </NavLink>
              </SidebarMenuButton>

              <SidebarMenuButton asChild>
                <NavLink to="/income" isExpanded={state === "expanded"}>
                  <SidebarMenuItem className="h-full p-0">
                    <div className="flex items-center h-full">
                      <Receipt className="h-4 w-4" />
                      {state === "expanded" && <span className="ml-2">Przychody</span>}
                    </div>
                  </SidebarMenuItem>
                </NavLink>
              </SidebarMenuButton>

              <SidebarMenuButton asChild>
                <NavLink to="/expense" isExpanded={state === "expanded"}>
                  <SidebarMenuItem className="h-full p-0">
                    <div className="flex items-center h-full">
                      <Receipt className="h-4 w-4" />
                      {state === "expanded" && <span className="ml-2">Wydatki</span>}
                    </div>
                  </SidebarMenuItem>
                </NavLink>
              </SidebarMenuButton>

              <SidebarMenuButton asChild>
                <NavLink to="/customers" isExpanded={state === "expanded"}>
                  <SidebarMenuItem className="h-full p-0">
                    <div className="flex items-center h-full">
                      <Users className="h-4 w-4" />
                      {state === "expanded" && <span className="ml-2">Kontrahenci</span>}
                    </div>
                  </SidebarMenuItem>
                </NavLink>
              </SidebarMenuButton>

              <SidebarMenuButton asChild>
                <NavLink to="/products" isExpanded={state === "expanded"}>
                  <SidebarMenuItem className="h-full p-0">
                    <div className="flex items-center h-full">
                      <Package className="h-4 w-4" />
                      {state === "expanded" && <span className="ml-2">Produkty</span>}
                    </div>
                  </SidebarMenuItem>
                </NavLink>
              </SidebarMenuButton>

              <SidebarMenuButton asChild>
                <NavLink to="/settings" isExpanded={state === "expanded"}>
                  <SidebarMenuItem className="h-full p-0">
                    <div className="flex items-center h-full">
                      <Settings className="h-4 w-4" />
                      {state === "expanded" && <span className="ml-2">Ustawienia</span>}
                    </div>
                  </SidebarMenuItem>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenu>
          </SidebarContent>
        </div>

        {/* User info section - now sticky to bottom */}
        <div className="mt-auto border-t p-4">
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
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
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

const NavLink = ({ 
  to, 
  children, 
  end = false,
  isExpanded 
}: { 
  to: string; 
  children: React.ReactNode; 
  end?: boolean;
  isExpanded: boolean;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div
      className={cn(
        "flex items-center h-10 rounded-md transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted"
      )}
      onClick={() => navigate(to)}
    >
      <div className={cn(
        "flex items-center w-full h-full",
        isExpanded ? "px-3" : "px-1 justify-center"
      )}>
        {children}
      </div>
    </div>
  );
};

export default AppSidebar;
