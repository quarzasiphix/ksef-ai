import React from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import AppSidebar from "./AppSidebar";
import Header from "./Header";
import MobileNavigation from "./MobileNavigation";

const Layout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultState="expanded">
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar */}
        <div className="hidden md:block h-screen">
          <AppSidebar />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6 overflow-auto w-full max-w-full">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
          <footer className="border-t p-4 text-sm text-muted-foreground text-center hidden md:block">
            © {new Date().getFullYear()} Polski System Fakturowy
          </footer>
        </div>
        
        {/* Mobile Navigation */}
        <MobileNavigation />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
