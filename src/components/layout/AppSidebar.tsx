import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  Settings, 
  Crown,
  User,
  LogOut,
  Building,
  Boxes,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/shared/ui/sidebar";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { useSidebar } from "@/shared/ui/sidebar";
import { useAuth } from "@/shared/hooks/useAuth";
import { usePremium } from "@/shared/context/PremiumContext";
import { useBusinessProfile } from "@/shared/context/BusinessProfileContext";
import SidebarGroupHeader from "./sidebar/SidebarGroupHeader";
import SidebarNavItem from "./sidebar/SidebarNavItem";
import { buildNavGroups } from "./sidebar/navConfig";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BusinessProfileSwitcher } from "./BusinessProfileSwitcher";

const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { openPremiumDialog, user, logout } = useAuth();
  const { hasPremium } = usePremium();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const isSpZoo = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
  const bankPath = isSpZoo ? '/accounting/bank' : '/bank';

  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';
  const entityType: "spoolka" | "jdg" = isSpoolka ? "spoolka" : "jdg";
  const navContext = React.useMemo(() => ({
    entityType,
    bankPath,
    hasPremium: hasPremium,
  }), [entityType, bankPath, hasPremium]);

  const navGroups = React.useMemo(() => buildNavGroups(navContext), [navContext]);

  const premiumFeatures = React.useMemo(() => ([
    { title: "Magazyn", icon: Boxes, path: "/inventory" },
  ]), []);

  const defaultExpandedSections = React.useMemo(() => {
    return new Set(navGroups.filter(group => group.defaultExpanded !== false).map(group => group.id));
  }, [navGroups]);

  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(defaultExpandedSections);

  React.useEffect(() => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      navGroups.forEach(group => {
        if (group.defaultExpanded !== false && !next.has(group.id)) {
          next.add(group.id);
        }
      });
      return next;
    });
  }, [navGroups]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Context highlighting: determine if current page is related to ledger
  const isLedgerRelated = () => {
    return location.pathname.startsWith('/ledger') ||
           location.pathname.startsWith('/income') ||
           location.pathname.startsWith('/expense') ||
           location.pathname.startsWith('/bank') ||
           location.pathname.startsWith('/accounting/kasa');
  };

  const shouldHighlightLedger = isLedgerRelated() && !location.pathname.startsWith('/ledger');

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname === "/";
    }
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  // Profile info for sidebar footer
  const SidebarUserInfo = () => {
    if (!user) return null;
    const Avatar = (
      <div
        className={`relative w-10 h-10 rounded-full flex items-center justify-center ${hasPremium ? "bg-gradient-to-br from-amber-500 to-amber-700" : "bg-muted"}`}
      >
        <User className="h-5 w-5 text-white" />
        {hasPremium && (
          <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
            <Crown className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
    );
    return (
      <div className={cn(
        "flex items-center",
        isCollapsed ? "justify-center" : "gap-3"
      )}>
        <NavLink to="/settings" className={cn(
          "flex items-center group",
          isCollapsed ? "" : "gap-3 flex-1 min-w-0"
        )} aria-label="Ustawienia profilu">
          {Avatar}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:underline">
                {user.email}
              </p>
              {hasPremium && (
                <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  <Crown className="h-2.5 w-2.5" />
                  <span>PREMIUM</span>
                </span>
              )}
            </div>
          )}
        </NavLink>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8"
            aria-label="Wyloguj"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <Sidebar className={cn("border-r transition-all duration-300", isCollapsed ? "w-16" : "w-56")}>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn(
          "flex items-center py-3",
          isCollapsed ? "justify-center px-0 flex-col gap-2" : "gap-2 px-3"
        )}>
          {!isCollapsed && (
            <div className="flex-1">
              <h2 className="text-base font-bold text-sidebar-foreground">
                KsiegaI
              </h2>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5">System księgowy</p>
            </div>
          )}
          <div className={cn(
            "flex items-center",
            isCollapsed ? "flex-col gap-2" : "gap-1"
          )}>
            <ThemeToggle size="sm" variant="ghost" showLabel={false} />
            <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Business Profile Switcher + stability indicator */}
        <div className="py-2 border-b border-sidebar-border space-y-2">
          <BusinessProfileSwitcher isCollapsed={isCollapsed} />

          {isSpoolka && selectedProfile && !isCollapsed && (
            <button
              type="button"
              className="w-full px-2 py-2 flex items-center gap-2 rounded-lg border border-sidebar-border/60 hover:bg-muted/30 text-left transition-colors"
              onClick={() => navigate('/accounting/company-registry')}
            >
              <Building className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wide">
                  stabilna
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Dynamic sections with progressive disclosure */}
        {navGroups.map((section) => {
          const sectionId = section.id;
          const isExpanded = expandedSections.has(sectionId);
          const isMoney = sectionId === 'money';
          const isSystem = sectionId === 'system';
          const collapsible = !isMoney && !isSystem;
          
          return (
            <SidebarGroup key={section.label}>
              {!isCollapsed && (
                <SidebarGroupHeader
                  label={section.label}
                  subtitle={section.subtitle}
                  collapsible={collapsible}
                  expanded={collapsible ? isExpanded : true}
                  onToggle={collapsible ? () => toggleSection(sectionId) : undefined}
                />
              )}
              
              {(isCollapsed || !collapsible || isExpanded) && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => {
                      const itemIsActive = isActive(item.path);
                      const isLedgerItem = item.id === "ledger";
                      const showLedgerGlow = isLedgerItem && shouldHighlightLedger;

                      return (
                        <SidebarNavItem
                          key={item.id}
                          item={item}
                          isActive={itemIsActive}
                          highlightLedger={showLedgerGlow}
                          collapsed={isCollapsed}
                        />
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}

        {/* Upsell Premium Section (visible only for non-premium users) */}
        {!hasPremium && (
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-2">
              {!isCollapsed && (
                <SidebarGroupLabel className="flex items-center gap-2">
                  PREMIUM
                  <Crown className="h-3 w-3 text-amber-500" />
                </SidebarGroupLabel>
              )}
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {premiumFeatures.map((feature) => (
                  <SidebarMenuItem key={feature.path}>
                    <SidebarMenuButton
                      onClick={() => openPremiumDialog()}
                      tooltip={isCollapsed ? `${feature.title} (Premium)` : undefined}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer w-full",
                          isCollapsed ? "justify-center" : "justify-between"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <feature.icon className="h-5 w-5 flex-shrink-0 text-amber-600" />
                          {!isCollapsed && (
                            <span className="text-amber-900 font-medium">{feature.title}</span>
                          )}
                        </div>
                        {!isCollapsed && <Crown className="h-4 w-4 text-amber-600" />}
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarUserInfo />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
