
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { BarChart, FileText, Settings, Menu, Users, Package, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const MobileNavigation = () => {
  // Main navigation items - Changed "Faktury" to "Przychód" and icon to CreditCard
  const mainNavItems = [
    { title: "Dashboard", path: "/", icon: BarChart },
    { title: "Przychód", path: "/invoices", icon: CreditCard },
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];
  
  // Side menu items
  const sideMenuItems = [
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background md:hidden">
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
        </SheetContent>
      </Sheet>
    </nav>
  );
};

export default MobileNavigation;
