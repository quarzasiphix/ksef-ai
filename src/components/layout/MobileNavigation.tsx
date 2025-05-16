
import React from "react";
import { NavLink } from "react-router-dom";
import { BarChart, FileText, Users, Package, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const MobileNavigation = () => {
  // Navigation items (simplified version of sidebar items)
  const navItems = [
    { title: "Dashboard", path: "/", icon: BarChart },
    { title: "Faktury", path: "/invoices", icon: FileText },
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: Package },
    { title: "Ustawienia", path: "/settings", icon: Settings },
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
      {navItems.map((item) => (
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
    </nav>
  );
};

export default MobileNavigation;
