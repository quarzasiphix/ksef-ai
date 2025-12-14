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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const spolkaNavItems: NavItem[] = [
  {
    label: 'Panel główny',
    href: '/accounting',
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: 'Przegląd finansów',
    color: 'text-blue-600',
  },
  {
    label: 'Zaliczki CIT',
    href: '/accounting/cit',
    icon: <Calculator className="h-5 w-5" />,
    description: 'Podatek dochodowy',
    color: 'text-red-600',
  },
  {
    label: 'Bilans',
    href: '/accounting/balance-sheet',
    icon: <TrendingUp className="h-5 w-5" />,
    description: 'Aktywa i pasywa',
    color: 'text-blue-600',
  },
  {
    label: 'Wspólnicy',
    href: '/accounting/shareholders',
    icon: <Users className="h-5 w-5" />,
    description: 'Struktura kapitałowa',
    color: 'text-purple-600',
  },
  {
    label: 'Kapitał',
    href: '/accounting/capital-events',
    icon: <DollarSign className="h-5 w-5" />,
    description: 'Transakcje kapitałowe',
    color: 'text-green-600',
  },
  {
    label: 'Uchwały',
    href: '/accounting/resolutions',
    icon: <FileText className="h-5 w-5" />,
    description: 'Decyzje wspólników',
    color: 'text-indigo-600',
  },
  {
    label: 'Rejestr Spółki',
    href: '/accounting/company-registry',
    icon: <Building2 className="h-5 w-5" />,
    description: 'NIP-8, KRS, VAT-R',
    color: 'text-amber-600',
  },
  {
    label: 'Dokumenty',
    href: '/accounting/documents',
    icon: <FolderOpen className="h-5 w-5" />,
    description: 'Umowy, licencje',
    color: 'text-slate-600',
  },
];

interface AccountingSidebarProps {
  className?: string;
  onNavigate?: () => void;
  deferNavigationMs?: number;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onItemSelect?: (href: string) => void;
}

export const AccountingSidebar: React.FC<AccountingSidebarProps> = ({ 
  className,
  onNavigate,
  deferNavigationMs,
  collapsed = false,
  onToggleCollapsed,
  onItemSelect,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (href: string) => {
    onItemSelect?.(href);

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
    <div className={cn("flex flex-col h-full", className)}>
      <div className={cn("border-b", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-start", collapsed ? "justify-center" : "justify-between")}
        >
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-lg">Księgowość Spółki</h2>
              <p className="text-xs text-muted-foreground">Pełna księgowość sp. z o.o.</p>
            </div>
          )}
          {onToggleCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapsed}
              className="h-9 w-9"
              title={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            >
              {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {spolkaNavItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  collapsed
                    ? "w-full justify-center h-10 px-0"
                    : "w-full justify-start h-auto py-3 px-3",
                  isActive && "bg-accent"
                )}
                onClick={() => handleNavigation(item.href)}
                title={collapsed ? item.label : undefined}
              >
                <div className={cn(collapsed ? "" : "mr-3", item.color)}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <div className="flex flex-col items-start transition-opacity duration-150 ease-out">
                    <span className="font-medium text-sm">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                )}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>
    </div>
  );
};

export default AccountingSidebar;
