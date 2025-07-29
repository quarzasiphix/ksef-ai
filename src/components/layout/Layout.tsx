import React from "react";
import { Outlet } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import AppSidebar from "./AppSidebar";
import Header from "./Header";
import MobileNavigation from "./MobileNavigation";
import { useSidebar } from "@/components/ui/sidebar";
import Footer from './Footer';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();
  const { state } = useSidebar();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <div className="hidden md:block fixed top-0 left-0 h-screen">
        <AppSidebar />
      </div>
      
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
        state === "expanded" ? "md:ml-64" : "md:ml-32"
      )}>
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-auto w-full max-w-full">
          <div className="max-w-7xl mx-auto w-full">
            <Breadcrumbs />
            {children || <Outlet />}
          </div>
        </main>
        <Footer />
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
    </div>
  );
};

export default Layout;
