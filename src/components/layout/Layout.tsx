
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
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="flex min-h-screen w-full bg-background relative">
        <div className="hidden md:block h-screen sticky top-0 z-20">
          <AppSidebar />
        </div>
        <div className={cn(
          "flex-1 flex flex-col w-full min-w-0 transition-all duration-300 ease-in-out",
          "md:pl-[5rem] group-data-[state=expanded]/sidebar:md:pl-64"
        )}>
          <Header />
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-[88px] md:pb-6 w-full max-w-full">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
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
