import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { BarChart, FileText, Settings, Menu, Users, Package, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/App";

const MobileNavigation = () => {
  // Main navigation items
  const mainNavItems = [
    { title: "Przychód", path: "/income", icon: CreditCard },
    { title: "Wydatek", path: "/expense", icon: CreditCard },
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];
  
  // Side menu items
  const sideMenuItems = [
    { title: "Dashboard", path: "/", icon: BarChart },
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: Package },
  ];

  // Generate NavLink className based on active state
  const getNavClassName = ({ isActive }: { isActive: boolean }) => {
    return cn(
      "flex flex-col items-center justify-center px-4 py-2",
      isActive ? "text-primary" : "text-muted-foreground"
    );
  };

  const location = useLocation();
  // Hide navigation on invoice new/edit pages
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
        <SheetContent side="right" className="w-[250px] pt-10">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <div className="flex flex-col space-y-3 pt-4">
                {sideMenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => 
                      cn("flex items-center gap-3 px-4 py-2 rounded-md", 
                         isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent")
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </NavLink>
                ))}
                
                <div className="mt-4 px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Motyw</span>
                    <ThemeToggle size="sm" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto">
              <UserMenuFooter />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

const UserMenuFooter = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mt-8 border-t pt-4 flex flex-col items-start">
      <span className="text-xs text-muted-foreground mb-2">Zalogowano jako:</span>
      <span className="text-sm font-medium mb-2">{user.email}</span>
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
  );
};

export default MobileNavigation;
