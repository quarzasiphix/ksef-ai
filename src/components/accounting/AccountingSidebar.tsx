import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calculator,
  Building2,
  Users,
  DollarSign,
  FileText,
  FolderOpen,
  LayoutDashboard,
  TrendingUp,
  Landmark,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const spolkaNavSections: NavSection[] = [
  {
    title: 'KSIĘGOWOŚĆ',
    items: [
      {
        label: 'Panel główny',
        href: '/accounting',
        icon: <LayoutDashboard className="h-4 w-4" />,
        description: 'Przegląd finansów',
        color: 'text-blue-600',
      },
    ],
  },
  {
    title: 'PODATKI',
    items: [
      {
        label: 'Zaliczki CIT',
        href: '/accounting/cit',
        icon: <Calculator className="h-4 w-4" />,
        description: 'Podatek dochodowy',
        color: 'text-red-600',
      },
    ],
  },
  {
    title: 'SPRAWOZDANIA',
    items: [
      {
        label: 'Bilans',
        href: '/accounting/balance-sheet',
        icon: <TrendingUp className="h-4 w-4" />,
        description: 'Aktywa i pasywa',
        color: 'text-blue-600',
      },
      {
        label: 'Kapitał',
        href: '/accounting/capital-events',
        icon: <DollarSign className="h-4 w-4" />,
        description: 'Transakcje kapitałowe',
        color: 'text-green-600',
      },
      {
        label: 'Wspólnicy',
        href: '/accounting/shareholders',
        icon: <Users className="h-4 w-4" />,
        description: 'Struktura kapitałowa',
        color: 'text-purple-600',
      },
    ],
  },
  {
    title: 'FORMALNE',
    items: [
      {
        label: 'Rejestr spółki',
        href: '/accounting/company-registry',
        icon: <Building2 className="h-4 w-4" />,
        description: 'NIP-8, KRS, VAT-R',
        color: 'text-amber-600',
      },
      {
        label: 'Dziennik zdarzeń',
        href: '/accounting/event-log',
        icon: <Shield className="h-4 w-4" />,
        description: 'Historia wszystkich działań',
        color: 'text-blue-600',
      },
    ],
  },
  {
    title: 'PIENIĄDZE',
    items: [
      {
        label: 'Bankowość',
        href: '/accounting/bank',
        icon: <Landmark className="h-4 w-4" />,
        description: 'Konta bankowe',
        color: 'text-emerald-600',
      },
      {
        label: 'Kasa',
        href: '/accounting/kasa',
        icon: <Wallet className="h-4 w-4" />,
        description: 'Gotówka KP/KW',
        color: 'text-orange-600',
      },
    ],
  },
];

interface AccountingSidebarProps {
  className?: string;
  onNavigate?: () => void;
  onNavigateTo?: (href: string) => void;
  deferNavigationMs?: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onItemSelect?: (href: string) => void;
}

export const AccountingSidebar: React.FC<AccountingSidebarProps> = ({ 
  className,
  onNavigate,
  onNavigateTo,
  deferNavigationMs,
  collapsed = false,
  onToggleCollapsed,
  onItemSelect,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (href: string) => {
    onItemSelect?.(href);

    if (onNavigateTo) {
      onNavigateTo(href);
      return;
    }

    // When rendered inside a Sheet (mobile), unmounting during close animation can crash
    // with 'removeChild' errors. Close first, then navigate after animation.
    if (location.pathname === href) {
      onNavigate?.();
      return;
    }

    if (onNavigate) {
      onNavigate();
    }

    if (deferNavigationMs && deferNavigationMs > 0) {
      window.setTimeout(() => navigate(href), deferNavigationMs);
      return;
    }

    navigate(href);
  };

  return (
    <div className={cn("flex flex-col h-full module-sidebar", className)}>
      <div className={cn("border-b border-module-sidebar-border", collapsed ? "p-2" : "p-3 pl-4")}>
        <div className={cn("flex items-start", collapsed ? "justify-center" : "justify-between")}
        >
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sm">Księgowość Spółki</h2>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Pełna księgowość sp. z o.o.</p>
            </div>
          )}
          {onToggleCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapsed}
              className="h-8 w-8"
              title={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className="p-2 pl-3">
          {spolkaNavSections.map((section, sectionIdx) => (
            <div key={section.title}>
              {!collapsed && (
                <div className="module-sidebar-section-header opacity-60">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5 mb-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={cn(
                        "module-sidebar-item",
                        collapsed
                          ? "w-full justify-center h-8 px-0"
                          : "w-full justify-start h-8 px-2",
                        "hover:bg-muted/40 hover:text-foreground",
                        isActive && "active"
                      )}
                      onClick={() => handleNavigation(item.href)}
                      title={collapsed ? item.label : undefined}
                    >
                      <div className={cn(collapsed ? "" : "mr-2", "opacity-60")}>
                        {item.icon}
                      </div>
                      {!collapsed && (
                        <div className="flex flex-col items-start text-left">
                          <span className="text-xs leading-tight">{item.label}</span>
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
};

export default AccountingSidebar;
