import React, { useEffect } from "react";
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
  useSidebar
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
  const { open, openMobile, setOpenMobile, setOpen } = useSidebar();
  const location = useLocation();
  const pathname = location.pathname;

  const prevWidthRef = React.useRef<number>(window.innerWidth);
  const isManualToggle = React.useRef(false);

  // Handle responsive behavior
  useEffect(() => {
    const currentWidth = window.innerWidth;
    
    // Only auto-collapse/expand on initial load if not manually toggled
    if (!isManualToggle.current) {
      if (currentWidth < 1400) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      const wasAbove1400 = prevWidthRef.current >= 1400;
      const isNowBelow1400 = newWidth < 1400;
      
      // Only auto-collapse/expand when crossing the 1400px threshold
      if (wasAbove1400 && isNowBelow1400) {
        if (!isManualToggle.current) {
          setOpen(false);
        }
      } else if (!wasAbove1400 && !isNowBelow1400) {
        if (!isManualToggle.current) {
          setOpen(true);
        }
      }
      
      prevWidthRef.current = newWidth;
    };

    // Create debounced resize handler
    const debouncedResize = debounce(handleResize, 100);
    
    // Add event listeners
    window.addEventListener('resize', debouncedResize);
    
    // Clean up
    return () => {
      debouncedResize.cancel();
      window.removeEventListener('resize', debouncedResize);
    };
  }, [setOpen]);
  
  // Handle manual toggle
  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isManualToggle.current = true;
    setOpen(prevOpen => !prevOpen);
    
    // Reset the manual toggle flag after a short delay to allow for future responsive behavior
    // This ensures that if the user resizes the window later, the sidebar will respond
    setTimeout(() => {
      isManualToggle.current = false;
    }, 100);
  };

  // Enhanced debounce helper function with cancel method
  function debounce<T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ) {
    let timeout: NodeJS.Timeout | null = null;
    
    const debounced = (...args: Parameters<T>) => {
      const later = () => {
        timeout = null;
        func(...args);
      };
      
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      
      timeout = setTimeout(later, wait);
    };
    
    debounced.cancel = () => {
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
    };
    
    return debounced;
  }

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
        className="fixed top-0 left-0 h-full w-[280px] bg-background z-50 shadow-lg overflow-hidden"
        style={{
          transform: openMobile ? `translateX(${Math.min(0, dragX)}px)` : 'translateX(-100%)',
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'block',
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
        <div className="mt-auto">
          <UserMenuFooter isOpen={true} />
        </div>
      </div>
    );
  }

  // --- DESKTOP SIDEBAR ---
  return (
    <div className="h-full">
      <Sidebar
        className={cn(
          "h-full bg-background border-r transition-all duration-300 ease-in-out flex flex-col overflow-hidden group/sidebar",
          "w-64"
        )}
        collapsible="icon"
      >
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SidebarTrigger className="m-2 self-end" onClick={handleToggle} />
        <SidebarContent>
          <div className={`mb-8 px-3 ${!open ? "hidden" : "block"}`}>
            <h2 className="text-2xl font-bold text-invoice">AiFaktura</h2>
            <p className="text-xs text-muted-foreground">System Faktur</p>
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <React.Fragment key={item.path}>
                    <SidebarMenuItem>
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
                    {item.addDivider && (
                      <div className="border-t border-border my-1" />
                    )}
                  </React.Fragment>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
        <div className="mt-auto border-t border-border">
          <UserMenuFooter isOpen={open} />
        </div>
      </Sidebar>
    </div>
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
