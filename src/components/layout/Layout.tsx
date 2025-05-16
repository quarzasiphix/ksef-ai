
import React from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "./AppSidebar";
import Header from "./Header";

const Layout = () => {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <Header />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
          <footer className="border-t p-4 text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Polski System Fakturowy
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
