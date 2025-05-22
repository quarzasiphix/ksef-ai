import React, { useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import { Sidebar, 
  SidebarContent, 
  SidebarTrigger, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
  SidebarProvider
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  FileText, 
  Settings, 
  Users,
  Package,
  CreditCard,
  ArrowDownRight
} from "lucide-react";

const AppSidebar = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [openMobile, setOpenMobile] = React.useState(false);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const dragStartX = React.useRef(0);
  const sidebarRef = React.useRef<HTMLDivElement>(null);
  const { state, setState } = useSidebar();
  const lastWidth = React.useRef(window.innerWidth);
  const isInitialMount = React.useRef(true);
  const isManualToggle = React.useRef(false);

  // Handle resize events
  const handleResize = useCallback(() => {
    const currentWidth = window.innerWidth;
    const previousWidth = lastWidth.current;
    
    // Only trigger if width crosses the 1400px threshold and it's not the initial mount
    // and it's not a manual toggle
    if (!isInitialMount.current && !isManualToggle.current) {
      if (previousWidth >= 1400 && currentWidth < 1400) {
        setState("collapsed");
      } else if (previousWidth < 1400 && currentWidth >= 1400) {
        setState("expanded");
      }
    }
    
    // Update last width
    lastWidth.current = currentWidth;
    
    // Update mobile state
    setIsMobile(currentWidth < 768);
  }, [setState]);

  // Add resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Set initial mount to false after first render
    isInitialMount.current = false;
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Handle manual toggle
  const handleToggle = useCallback(() => {
    isManualToggle.current = true;
    setState(state === "expanded" ? "collapsed" : "expanded");
    // Reset manual toggle flag after a short delay
    setTimeout(() => {
      isManualToggle.current = false;
    }, 100);
  }, [setState, state]);

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || !openMobile) return;
    setDragging(true);
    dragStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const deltaX = e.touches[0].clientX - dragStartX.current;
    if (deltaX < 0) setDragX(deltaX);
  };

  const handleTouchEnd = () => {
    if (!dragging) return;
    const sidebarWidth = sidebarRef.current?.offsetWidth || 300;
    if (Math.abs(dragX) > sidebarWidth * 0.4) {
      setOpenMobile(false);
    }
    setDragX(0);
    setDragging(false);
  };

  // Navigation items
  const navItems = [
    { title: "Przychód", path: "/income", icon: CreditCard },
    { title: "Wydatki", path: "/expense", icon: ArrowDownRight, addDivider: true },
    { title: "Dashboard", path: "/", icon: BarChart },
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

  // Generate NavLink className based on active state
  const getNavClassName = ({ isActive }: { isActive: boolean }) => {
    return `flex items-center py-2 px-3 rounded-md ${
      isActive 
        ? "bg-primary text-primary-foreground" 
        : "hover:bg-muted text-foreground"
    }`;
  };

  const SidebarContent = () => (
    <>
      <div className={cn("flex-shrink-0 mb-8 px-3 pt-4", state === "collapsed" && "hidden")}>
        <h2 className="text-2xl font-bold text-invoice">AiFaktura</h2>
        <p className="text-xs text-muted-foreground">System Faktur</p>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <React.Fragment key={item.path}>
                  <SidebarMenuItem className="flex items-center">
                    <SidebarMenuButton asChild className="w-full">
                      <NavLink
                        to={item.path}
                        end={item.path === "/"}
                        className={cn(
                          getNavClassName,
                          state === "collapsed" && "justify-center px-2",
                          "h-10 w-full"
                        )}
                        onClick={handleNavigation}
                      >
                        <div className={cn(
                          "flex items-center w-full",
                          state === "expanded" ? "flex-row" : "flex-col justify-center"
                        )}>
                          <item.icon className={cn(
                            "h-5 w-5",
                            state === "expanded" && "mr-2"
                          )} />
                          {state === "expanded" && <span>{item.title}</span>}
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {item.addDivider && (
                    <div className="border-t border-border my-1" />
                  )}
                </React.Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
      <div className="flex-shrink-0 border-t border-border mt-auto">
        <UserMenuFooter isOpen={state === "expanded"} />
      </div>
    </>
  );

  return (
    <SidebarProvider defaultState="expanded">
      {isMobile ? (
        // Mobile Sidebar (Sheet)
        <div
          ref={sidebarRef}
          className="fixed top-0 left-0 h-full w-[280px] bg-muted/50 z-50 shadow-lg flex flex-col"
          style={{
            transform: openMobile ? `translateX(${Math.min(0, dragX)}px)` : 'translateX(-100%)',
            transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <SidebarContent />
        </div>
      ) : (
        // Desktop Sidebar
        <Sidebar
          className={cn(
            "h-screen bg-muted/50 border-r transition-all duration-300 ease-in-out flex flex-col group/sidebar"
          )}
          size={state === "expanded" ? "default" : "icon"}
        >
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0">
              <SidebarTrigger className="m-2 self-end" onClick={handleToggle} />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <SidebarContent />
            </div>
          </div>
        </Sidebar>
      )}
    </SidebarProvider>
  );
};

interface UserMenuFooterProps {
  isOpen: boolean;
}

const UserMenuFooter = ({ isOpen }: UserMenuFooterProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null;
  
  if (!isOpen) return null;
  
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
