
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
      <div className="flex min-h-screen w-full relative">
        <AppSidebar />
        <div className="flex flex-1 flex-col w-full">
          <Header />
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-[88px] md:pb-6 w-full max-w-full overflow-x-hidden">
            <Outlet />
          </main>
          <footer className="border-t p-4 text-sm text-muted-foreground text-center hidden md:block">
            © {new Date().getFullYear()} Polski System Fakturowy
          </footer>
        </div>
        <MobileNavigation />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
