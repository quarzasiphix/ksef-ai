
import React from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import AppSidebar from "./AppSidebar";
import Header from "./Header";
import MobileNavigation from "./MobileNavigation";

const Layout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-6 overflow-auto pb-20 md:pb-6">
            <Outlet />
          </main>
          <footer className="border-t p-4 text-sm text-muted-foreground text-center hidden md:block">
            © {new Date().getFullYear()} Polski System Fakturowy
          </footer>
        </div>
      </div>
      <MobileNavigation />
    </SidebarProvider>
  );
};

export default Layout;
