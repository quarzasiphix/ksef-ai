import React, { useState } from "react";
import { NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import { BarChart, FileText, Settings, Menu, Users, Package, CreditCard, Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/App";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useBusinessProfile } from "@/context/BusinessProfileContext";

const MobileNavigation = () => {
  const { profiles, selectedProfileId, selectProfile, isLoadingProfiles } = useBusinessProfile();
  const { isPremium, openPremiumDialog, user, logout, setUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Main navigation items
  const mainNavItems = [
    { title: "Panel", path: "/", icon: BarChart },
    { title: "Przychód", path: "/income", icon: CreditCard },
    { title: "Wydatek", path: "/expense", icon: CreditCard },
  ];
  
  // Side menu items
  const sideMenuItems = [
    { title: "Ustawienia", path: "/settings", icon: Settings },
    { title: "Klienci", path: "/customers", icon: Users },
    { title: "Produkty", path: "/products", icon: Package },
  ];

  // Generate NavLink className based on active state
  const getNavClassName = ({ isActive }: { isActive: boolean }) => {
    return cn(
      "flex flex-col items-center justify-center px-4 py-2",
      isActive ? "text-primary" : "text-muted-foreground"
    );
  };

  const location = useLocation();
  // Hide navigation on invoice new/edit pages
  const hideNav = location.pathname.startsWith('/invoices/new') || 
                  location.pathname.startsWith('/income/new') || 
                  location.pathname.startsWith('/expense/new') ||
                  location.pathname.startsWith('/income/edit/') ||
                  location.pathname.startsWith('/expense/edit/');

  if (hideNav) return null;

  // Find the currently selected profile object
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 md:hidden">
      {mainNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={getNavClassName}
        >
          <item.icon className="h-5 w-5" />
          <span className="text-xs mt-1">{item.title}</span>
        </NavLink>
      ))}
      
      <Sheet>
        <SheetTrigger className="flex flex-col items-center justify-center px-4 py-2 text-muted-foreground">
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">Menu</span>
        </SheetTrigger>
        <SheetContent side="right" className="w-[250px] pt-10">
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <PremiumIndicator />
              {isLoadingProfiles ? (
                  <div className="p-4 border-b">
                      <div className="flex flex-col">
                          <span className="text-sm font-medium mb-2">Aktywny profil:</span>
                          <span className="text-xs text-muted-foreground">Ładowanie profili...</span>
                      </div>
                  </div>
              ) : profiles && profiles.length > 0 ? (
                   <div className="p-4 border-b">
                      <div className="flex flex-col">
                          <span className="text-sm font-medium mb-2">Aktywny profil:</span>
                          {!isPremium && profiles.length === 1 ? (
                              <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">{profiles[0]?.name?.split(' ').slice(0, 3).join(' ')}</span>
                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </div>
                          ) : isPremium && profiles.length > 0 ? (
                              <Select value={selectedProfileId || ''} onValueChange={(value) => {
                                  if (value === "add-new-profile") {
                                      if (isPremium) {
                                          navigate("/settings/business-profiles");
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
                                      {selectedProfile?.name?.split(' ').slice(0, 3).join(' ') || "Wybierz profil"}
                                   </SelectValue>
                                 </SelectTrigger>
                                 <SelectContent>
                                   {profiles.map(profile => (
                                     <SelectItem key={profile.id} value={profile.id}>
                                        {profile.name}
                                     </SelectItem>
                                   ))}
                                   <SelectItem value="add-new-profile" className="text-blue-600 font-medium">
                                     Dodaj profil
                                   </SelectItem>
                                 </SelectContent>
                               </Select>
                          ) : !isPremium && profiles.length > 1 ? (
                              <span className="text-xs text-amber-500">Kup Premium, aby zarządzać wieloma profilami.</span>
                          ) : null}
                      </div>
                  </div>
              ) : !isLoadingProfiles && profiles && profiles.length === 0 ? (
                   <div className="p-4 border-b">
                       <div className="flex flex-col">
                           <span className="text-sm font-medium mb-2">Aktywny profil:</span>
                           <span className="text-xs text-muted-foreground">Dodaj swój pierwszy profil firmy w Ustawieniach.</span>
                       </div>
                   </div>
              ) : null}
              <div className="flex flex-col space-y-3 pt-4">
                {!isLoadingProfiles && profiles && profiles.length > 0 && (
                  <>
                    {sideMenuItems.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          cn("flex items-center gap-3 px-4 py-2 rounded-md",
                             isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent")
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </NavLink>
                    ))}
                  </>
                )}
                
                <div className="mt-4 px-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Motyw</span>
                    <ThemeToggle size="sm" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto">
              <UserMenuFooter />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
};

const UserMenuFooter = () => {
  const { user, setUser, isPremium, openPremiumDialog, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mt-8 border-t pt-4 flex flex-col items-start">
      <span className="text-xs text-muted-foreground mb-2">Zalogowano jako:</span>
      <span className={cn(
        "text-sm font-medium mb-2 truncate max-w-[180px]",
        isPremium 
          ? "text-amber-400"
          : "text-foreground"
      )}>
        {user.email}
      </span>
      <Link to="/settings/profile" className="text-xs text-blue-600 hover:underline mt-1">
         Profil osobisty
      </Link>
      <button
        className="text-xs text-red-500 hover:underline"
        onClick={async () => {
          await logout();
          navigate("/auth/login");
        }}
      >
        Wyloguj się
      </button>
    </div>
  );
};

const PremiumIndicator = () => {
  const { isPremium } = useAuth();
  if (!isPremium) return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-4 text-amber-400 font-semibold">
      <Star className="h-5 w-5" fill="currentColor" />
      <span>Premium</span>
    </div>
  );
};

export default MobileNavigation;
