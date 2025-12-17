import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import AppSidebar from "./AppSidebar";
import Header from "./Header";
import MobileNavigation from "./MobileNavigation";
import { useSidebar } from "@/components/ui/sidebar";
import Footer from './Footer';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeaderActionsProvider, usePageHeaderActions } from "@/context/PageHeaderActionsContext";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { state } = useSidebar();

  const LayoutContent = ({ innerChildren }: { innerChildren?: React.ReactNode }) => {
    const { actions } = usePageHeaderActions();
    const location = useLocation();
    const isAccountingRoute = location.pathname.startsWith('/accounting');
    const isFullBleedRoute = isAccountingRoute || location.pathname.startsWith('/contracts');
    const isNewBusinessProfileWizardRoute = location.pathname === '/settings/business-profiles/new';

    if (isNewBusinessProfileWizardRoute) {
      return (
        <div className="min-h-screen w-full bg-background">
          {innerChildren || <Outlet />}
        </div>
      );
    }

    return (
      <div className="flex min-h-screen w-full bg-background">
        <div className="hidden md:block fixed top-0 left-0 h-screen">
          <AppSidebar />
        </div>

        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          state === "expanded" ? "md:ml-64" : "md:ml-32"
        )}>
          <Header />
          <main
            className={cn(
              "flex-1 overflow-auto w-full max-w-full",
              isFullBleedRoute
                ? "pt-2 pb-2 pr-2 pl-2 md:pt-3 md:pb-3 md:pr-2 md:pl-2"
                : "p-4 md:p-6"
            )}
          >
            <div
              className={cn(
                "w-full",
                isFullBleedRoute ? "max-w-none" : "max-w-7xl mx-auto"
              )}
            >
              <div className={cn(
                "flex items-center justify-between gap-3",
                isFullBleedRoute ? "mb-3" : "mb-6"
              )}>
                <Breadcrumbs />
                {actions ? <div className="shrink-0">{actions}</div> : null}
              </div>
              {innerChildren || <Outlet />}
            </div>
          </main>
          <Footer />
        </div>

        <MobileNavigation />
      </div>
    );
  };

  return (
    <PageHeaderActionsProvider>
      <LayoutContent innerChildren={children} />
    </PageHeaderActionsProvider>
  );
};

export default Layout;
