import React, { useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  Users,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronDown,
  Star,
  FileText
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusinessProfile } from "@/context/BusinessProfileContext";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isPremium, openPremiumDialog } = useAuth();
  const { state, setState } = useSidebar();
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();
  const { toast } = useToast();

  const handleToggle = useCallback(() => {
    setState(state === "expanded" ? "collapsed" : "expanded");
  }, [state, setState]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  // Find the currently selected profile object
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  return (
    <Sidebar className={cn(
      "h-screen border-r bg-muted/50 transition-all duration-300 relative",
      state === "expanded" ? "w-64" : "w-16"
    )}>
      <div className="flex flex-col h-full">
        <SidebarHeader className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold">K</span>
            </div>
            {state === "expanded" && (
              <div className="flex items-center gap-2">
                 <span className="text-lg font-semibold">KSEF AI</span>
                 {isPremium && (
                    <Star className="h-4 w-4 text-amber-400" fill="currentColor" />
                 )}
                 {isPremium && state === "expanded" && (
                     <span className="text-xs font-semibold text-amber-400">PREMIUM</span>
                 )}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggle}
            className="h-8 w-8"
          >
            {state === "expanded" ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </SidebarHeader>

        {/* Business Profile Selector - Displayed in expanded state */}
        {state === "expanded" && (
           <div className="p-4 border-b bg-muted/50">
             <div className="flex flex-col">
               <span className="text-sm font-medium mb-2">Aktywny profil:</span>
               {isLoadingProfiles ? (
                   <span className="text-xs text-muted-foreground">Ładowanie profili...</span>
               ) : profiles && profiles.length > 0 ? (
                 <>
                   {!isPremium && profiles.length === 1 ? ( // Single non-premium profile
                     <div className="flex items-center gap-1">
                       <span className="text-xs text-muted-foreground">{profiles[0]?.name?.split(' ').slice(0, 3).join(' ')}</span>
                       <ChevronDown className="h-3 w-3 text-muted-foreground" />
                     </div>
                   ) : (
                      <Select value={selectedProfileId || ''} onValueChange={(value) => {
                          if (value === "add-new-profile") {
                              if (isPremium) {
                                  navigate("/settings/business-profiles/new"); // Navigate to settings to add a new profile
                              } else {
                                   toast({
                                       title: "Wymagane Premium",
                                       description: "Kup Premium, aby dodać więcej profili firmowych.",
                                       variant: "destructive",
                                   });
                                   openPremiumDialog();
                               }
                          } else {
                              selectProfile(value);
                          }
                      }}>
                         <SelectTrigger className="w-full text-xs">
                           <SelectValue placeholder="Wybierz profil">
                             {selectedProfile?.name?.split(' ').slice(0, 3).join(' ') || "Wybierz profil"} {/* Use selectedProfile for display */}
                           </SelectValue>
                         </SelectTrigger>
                         <SelectContent position="popper">
                           {profiles.map(profile => (
                             <SelectItem key={profile.id} value={profile.id}>
                               {profile.name} {/* Show full name in dropdown */}
                             </SelectItem>
                           ))}
                           {/* Always show Add Profile option */}
                           <SelectItem value="add-new-profile" className="text-blue-600 font-medium">
                             Dodaj profil
                           </SelectItem>
                         </SelectContent>
                       </Select>
                   )}
                 </>
               ) : !isLoadingProfiles && profiles && profiles.length === 0 ? ( // No profiles
                   <span className="text-xs text-muted-foreground">Dodaj swój pierwszy profil firmy w Ustawieniach.</span>
               ) : null}
             </div>
           </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-none pb-16">
          <SidebarContent>
            <SidebarMenu className={cn("space-y-0.5", state === "collapsed" && "pt-8")}>
              {/* Render profile specific items only after profiles are loaded and exist */}
              {!isLoadingProfiles && profiles && profiles.length > 0 && (
                <>
                  {/* Active Profile display in collapsed state */}
                  {state === 'collapsed' && selectedProfile && ( // Use selectedProfile for display
                      <SidebarMenuButton asChild tooltip={selectedProfile?.name || 'Aktywny profil'}>
                          <Button
                               variant="ghost"
                               className={cn(
                                   "flex w-full items-center rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                                   "justify-center"
                               )}
                               onClick={() => navigate("/settings/business-profiles")} // Navigate to profile settings on click
                                style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: 'center' }}
                            >
                             <span className="text-xs font-semibold">{selectedProfile?.name?.[0] || 'P'}</span>{/* Added ? for safe access */}
                           </Button>
                      </SidebarMenuButton>
                  )}

                <SidebarMenuButton asChild tooltip={state !== 'expanded' ? 'Dashboard' : undefined}>
                  <Button
                   variant="ghost"
                   className={cn(
                     "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                     location.pathname === "/" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                   )}
                   onClick={() => navigate("/")}
                   style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                 >
                        <LayoutDashboard
                        className={cn(
                        "h-4 w-4 transition-colors",
                        location.pathname === "/" ? "text-accent-foreground" : "text-white"
                      )} />
                      {state !== "collapsed" && <span className="ml-2 text-white">Dashboard</span>}
                  </Button>
                </SidebarMenuButton>

                <SidebarMenuButton asChild  tooltip={state !== 'expanded' ? 'Księgowanie' : undefined}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                      location.pathname === "/accounting"
                        ? "bg-accent text-accent-foreground"
                        : cn(
                            state === "collapsed" ? "text-white" : "text-muted-foreground",
                            "hover:bg-accent hover:text-accent-foreground"
                          ),
                    )}
                    onClick={() => navigate("/accounting")}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                  >
                    <FileText
                      className={cn(
                        "h-4 w-4 transition-colors",
                        location.pathname === "/accounting" ? "text-accent-foreground" : "text-white"
                      )} />
                    {state !== "collapsed" && <span className="ml-2 text-white">Księgowanie</span>}
                  </Button>
                </SidebarMenuButton>

                <SidebarMenuButton asChild  tooltip={state !== 'expanded' ? 'Przychody' : undefined}>
                <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                      location.pathname === "/income"
                        ? "bg-accent text-accent-foreground"
                        : cn(
                            state === "collapsed" ? "text-white" : "text-muted-foreground",
                            "hover:bg-accent hover:text-accent-foreground"
                          ),
                    )}
                    onClick={() => navigate("/income")}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                  >
                        <Receipt
                        className={cn(
                          "h-4 w-4 transition-colors",
                          location.pathname === "/income" ? "text-accent-foreground" : "text-white"
                        )} />
                        {state !== "collapsed" && <span className="ml-2 text-white">Przychody</span>}
                    </Button>
                </SidebarMenuButton>

                <SidebarMenuButton asChild  tooltip={state !== 'expanded' ? 'Wydatki' : undefined}>
                <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                      location.pathname === "/expense"
                        ? "bg-accent text-accent-foreground"
                        : cn(
                            state === "collapsed" ? "text-white" : "text-muted-foreground",
                            "hover:bg-accent hover:text-accent-foreground"
                          ),
                    )}
                    onClick={() => navigate("/expense")}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                  >
                        <Receipt
                        className={cn(
                          "h-4 w-4 transition-colors",
                          location.pathname === "/expense" ? "text-accent-foreground" : "text-white"
                        )} />
                        {state !== "collapsed" && <span className="ml-2 text-white">Wydatki</span>}
                    </Button>
                </SidebarMenuButton>

                <SidebarMenuButton asChild  tooltip={state !== 'expanded' ? 'Kontrahenci' : undefined}>
                <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                      location.pathname === "/customers"
                        ? "bg-accent text-accent-foreground"
                        : cn(
                            state === "collapsed" ? "text-white" : "text-muted-foreground",
                            "hover:bg-accent hover:text-accent-foreground"
                          ),
                    )}
                    onClick={() => navigate("/customers")}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                  >
                        <Users
                        className={cn(
                          "h-4 w-4 transition-colors",
                          location.pathname === "/customers" ? "text-accent-foreground" : "text-white"
                        )} />
                        {state !== "collapsed" && <span className="ml-2 text-white">Kontrahenci</span>}
                    </Button>
                </SidebarMenuButton>

                <SidebarMenuButton asChild  tooltip={state !== 'expanded' ? 'Produkty' : undefined}>
                <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                      location.pathname === "/products"
                        ? "bg-accent text-accent-foreground"
                        : cn(
                            state === "collapsed" ? "text-white" : "text-muted-foreground",
                            "hover:bg-accent hover:text-accent-foreground"
                          ),
                    )}
                    onClick={() => navigate("/products")}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                  >
                         <Package
                         className={cn(
                          "h-4 w-4 transition-colors",
                          location.pathname === "/products" ? "text-accent-foreground" : "text-white"
                        )} />
                        {state !== "collapsed" && <span className="ml-2 text-white">Produkty</span>}
                    </Button>
                </SidebarMenuButton>

                <SidebarMenuButton asChild  tooltip={state !== 'expanded' ? 'Ustawienia' : undefined}>
                <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center rounded-md text-sm font-medium transition-colors",
                      location.pathname === "/settings"
                        ? "bg-accent text-accent-foreground"
                        : cn(
                            state === "collapsed" ? "text-white" : "text-muted-foreground",
                            "hover:bg-accent hover:text-accent-foreground"
                          ),
                    )}
                    onClick={() => navigate("/settings")}
                    style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '0.35rem 0.5rem', justifyContent: state === 'expanded' ? 'flex-start' : 'center' }}
                  >
                        <Settings
                        className={cn(
                          "h-4 w-4 transition-colors",
                          location.pathname === "/settings" ? "text-accent-foreground" : "text-white"
                        )} />
                        {state !== "collapsed" && <span className="ml-2 text-white">Ustawienia</span>}
                    </Button>
                </SidebarMenuButton>
                </>
              )}
            </SidebarMenu>
          </SidebarContent>
        </div>

        {/* User info section - fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {user?.email?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
              {state === "expanded" && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Zalogowano jako</span>
                  <span className={cn(
                     "text-xs truncate max-w-[150px]",
                     isPremium
                       ? "text-amber-400"
                       : "text-muted-foreground"
                  )}>
                    {user?.email}
                  </span>
                  {/* Link to Personal Profile Settings */}
                  <Link to="/settings/profile" className="text-xs text-blue-600 hover:underline mt-1">
                    Profil osobisty
                  </Link>
                </div>
              )}
            </div>
            {state === "expanded" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Sidebar>
  );
};


export default AppSidebar;