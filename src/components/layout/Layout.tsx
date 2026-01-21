import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import AppSidebar from "./AppSidebar";
import Header from "./Header";
import MobileNavigation from "./MobileNavigation";
import { useSidebar } from "@/shared/ui/sidebar";
import Footer from './Footer';
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PageHeaderActionsProvider, usePageHeaderActions } from "@/shared/context/PageHeaderActionsContext";
import { useWorkspaceTabs } from "@/shared/context/WorkspaceTabsContext";
import { ProjectProvider } from "@/shared/context/ProjectContext";

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { state } = useSidebar();

  const LayoutContent = ({ innerChildren }: { innerChildren?: React.ReactNode }) => {
    const { actions } = usePageHeaderActions();
    const { focusMode } = useWorkspaceTabs();
    const location = useLocation();
    const isAccountingRoute = location.pathname.startsWith('/accounting');
    const isContractsRoute = location.pathname.startsWith('/contracts');
    const isSettingsRoute = location.pathname.startsWith('/settings');
    const isDocumentsRoute = location.pathname.startsWith('/documents');
    const isFullBleedRoute = isAccountingRoute || isContractsRoute || isSettingsRoute || isDocumentsRoute;
    const hideBreadcrumbs = isAccountingRoute || isContractsRoute || isSettingsRoute || isDocumentsRoute;
    const isNewBusinessProfileWizardRoute = location.pathname === '/settings/business-profiles/new';
    const disableOuterScroll = isAccountingRoute || isContractsRoute || isDocumentsRoute;

    const mainPaddingClass = isFullBleedRoute
      ? isAccountingRoute
        ? "pt-0 pb-2 pr-2 pl-2 md:pt-0 md:pb-3 md:pr-2 md:pl-2"
        : isDocumentsRoute
          ? "p-0"
          : "pt-2 pb-2 pr-2 pl-2 md:pt-3 md:pb-3 md:pr-2 md:pl-2"
      : "p-4 md:p-6";

    if (isNewBusinessProfileWizardRoute) {
      return (
        <div className="min-h-screen w-full bg-background">
          {innerChildren || <Outlet />}
        </div>
      );
    }

    return (
      <div className="flex min-h-screen w-full bg-background">
        {/* Sidebar - only rendered on desktop */}
        {!focusMode && (
          <div className="hidden md:block fixed top-0 left-0 h-screen z-40">
            <AppSidebar />
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          !focusMode && (state === "expanded" ? "md:ml-56" : "md:ml-16")
        )}>
          <div className="hidden md:flex md:flex-col md:flex-1">
            <Header />
            <main
              className={cn(
                "flex-1 w-full max-w-full",
                disableOuterScroll ? "overflow-hidden" : "overflow-auto",
                mainPaddingClass
              )}
            >
              <div
                className={cn(
                  "w-full",
                  isFullBleedRoute ? "max-w-none" : "max-w-7xl mx-auto"
                )}
              >
                {!hideBreadcrumbs && (
                  <div className={cn(
                    "flex items-center justify-between gap-3",
                    isFullBleedRoute ? "mb-3" : "mb-6"
                  )}>
                    <Breadcrumbs />
                    {actions ? <div className="shrink-0">{actions}</div> : null}
                  </div>
                )}
                {innerChildren || <Outlet />}
              </div>
            </main>
            <Footer />
          </div>

          {/* Mobile Layout: Content area with padding for fixed navigation */}
          <div className="md:hidden flex flex-col flex-1">
            <Header />
            <main
              className={cn(
                "flex-1 w-full max-w-full",
                disableOuterScroll ? "overflow-hidden" : "overflow-auto",
                mainPaddingClass,
                "" // No padding needed
              )}
            >
              <div
                className={cn(
                  "w-full",
                  isFullBleedRoute ? "max-w-none" : "max-w-7xl mx-auto"
                )}
              >
                {!hideBreadcrumbs && (
                  <div className={cn(
                    "flex items-center justify-between gap-3",
                    isFullBleedRoute ? "mb-3" : "mb-6"
                  )}>
                    <Breadcrumbs />
                    {actions ? <div className="shrink-0">{actions}</div> : null}
                  </div>
                )}
                {innerChildren || <Outlet />}
              </div>
            </main>
            <Footer />
          </div>
        </div>

        {/* Mobile Navigation - only on mobile devices */}
        <div className="md:hidden">
          <MobileNavigation />
        </div>
      </div>
    );
  };

  return (
    <ProjectProvider>
      <PageHeaderActionsProvider>
        <LayoutContent innerChildren={children} />
      </PageHeaderActionsProvider>
    </ProjectProvider>
  );
};

export default Layout;
