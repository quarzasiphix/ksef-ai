import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
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
  BarChart, 
  FileText, 
  Settings, 
  Users,
  Package,
  CreditCard
} from "lucide-react";

const AppSidebar = () => {
  const { open, openMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const pathname = location.pathname;

  // --- DRAG STATE FOR MOBILE SIDEBAR ---
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragStartX = React.useRef(0);
  const sidebarRef = React.useRef<HTMLDivElement>(null);

  // Only enable drag on mobile sidebar (Sheet)
  const isMobile = window.innerWidth < 768; // tailwind md breakpoint

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !openMobile) return;
    setDragging(true);
    dragStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const deltaX = e.touches[0].clientX - dragStartX.current;
    // Only allow left swipe
    if (deltaX < 0) setDragX(deltaX);
  };
  const handleTouchEnd = () => {
    if (!dragging) return;
    // If dragged more than 40% width, close sidebar
    const sidebarWidth = sidebarRef.current?.offsetWidth || 300;
    if (Math.abs(dragX) > sidebarWidth * 0.4) {
      setOpenMobile(false);
    }
    setDragX(0);
    setDragging(false);
  };

  // Navigation items
  const navItems = [
    { title: "Dashboard", path: "/", icon: BarChart },
    { title: "Przychód", path: "/income", icon: CreditCard },
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: Package },
    { title: "Ustawienia", path: "/settings", icon: Settings },
  ];
  
  // Handle navigation and close sidebar on mobile
  const handleNavigation = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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

  // --- MOBILE SHEET SIDEBAR: Drag to close overlay ---
  if (isMobile) {
    return (
      <div
        ref={sidebarRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: '75vw',
          maxWidth: 320,
          background: 'var(--background, #181a20)',
          zIndex: 1000,
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(.4,0,.2,1)',
          display: openMobile ? 'block' : 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mb-8 px-3 pt-4">
          <h2 className="text-2xl font-bold text-invoice">AiFaktura</h2>
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
                      onClick={handleNavigation}
                    >
                      <item.icon className="h-5 w-5 mr-2" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    );
  }

  // --- DESKTOP SIDEBAR ---
  return (
    <Sidebar 
      className={`border-r ${!open ? "w-14" : "w-60"} hidden md:block`}
      collapsible="icon"
    >
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        <div className={`mb-8 px-3 ${!open ? "hidden" : "block"}`}>
          <h2 className="text-2xl font-bold text-invoice">AiFaktura</h2>
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
                      onClick={handleNavigation}
                    >
                      <item.icon className={`h-5 w-5 ${open ? "mr-2" : ""}`} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* User info and logout at the bottom */}
        <UserMenuFooter />
      </SidebarContent>
    </Sidebar>
  );
};

const UserMenuFooter = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null;
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="mt-8 border-t pt-4 flex flex-col items-start px-3 pb-4">
      <span className="text-xs text-muted-foreground mb-2">Zalogowano jako:</span>
      <span className="text-sm font-medium mb-2">{user.email}</span>
      <button
        className="text-xs text-red-500 hover:underline"
        onClick={handleLogout}
      >
        Wyloguj się
      </button>
    </div>
  );
};

export default AppSidebar;
