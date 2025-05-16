
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarTrigger, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar
} from "@/components/ui/sidebar";
import { 
  ChartBar, 
  FileText, 
  Settings, 
  Users,
  PolishZloty
} from "lucide-react";

const AppSidebar = () => {
  const { collapsed } = useSidebar();
  const location = useLocation();
  const pathname = location.pathname;

  // Navigation items
  const navItems = [
    { title: "Dashboard", path: "/", icon: ChartBar },
    { title: "Faktury", path: "/invoices", icon: FileText },
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: PolishZloty },
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];

  // Check if current path is active or a subpath
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  // Get the currently active group
  const activeGroup = navItems.find(item => isActive(item.path))?.path;

  // Generate NavLink className based on active state
  const getNavClassName = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center py-2 px-3 rounded-md ${
      isActive 
        ? "bg-primary text-primary-foreground" 
        : "hover:bg-muted text-foreground"
    }`;
  };

  return (
    <Sidebar 
      className={`border-r ${collapsed ? "w-14" : "w-60"}`}
      collapsible
    >
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <div className={`mb-8 px-3 ${collapsed ? "hidden" : "block"}`}>
          <h2 className="text-2xl font-bold text-invoice">KSeF</h2>
          <p className="text-xs text-muted-foreground">System Faktur</p>
        </div>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      end={item.path === "/"}
                      className={getNavClassName}
                    >
                      <item.icon className={`h-5 w-5 ${!collapsed ? "mr-2" : ""}`} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
