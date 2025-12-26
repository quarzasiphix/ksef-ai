import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { ScrollArea } from '@/shared/ui/scroll-area';
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
        icon: <LayoutDashboard className="h-5 w-5" />,
        description: 'Przegląd finansów',
        color: 'text-blue-500',
      },
    ],
  },
  {
    title: 'PODATKI',
    items: [
      {
        label: 'Zaliczki CIT',
        href: '/accounting/cit',
        icon: <Calculator className="h-5 w-5" />,
        description: 'Podatek dochodowy',
        color: 'text-rose-500',
      },
    ],
  },
  {
    title: 'SPRAWOZDANIA',
    items: [
      {
        label: 'Bilans',
        href: '/accounting/balance-sheet',
        icon: <TrendingUp className="h-5 w-5" />,
        description: 'Aktywa i pasywa',
        color: 'text-sky-500',
      },
      {
        label: 'Kapitał',
        href: '/accounting/capital-events',
        icon: <DollarSign className="h-5 w-5" />,
        description: 'Transakcje kapitałowe',
        color: 'text-emerald-500',
      },
      {
        label: 'Wspólnicy',
        href: '/accounting/shareholders',
        icon: <Users className="h-5 w-5" />,
        description: 'Struktura kapitałowa',
        color: 'text-violet-500',
      },
    ],
  },
  {
    title: 'FORMALNE',
    items: [
      {
        label: 'Rejestr spółki',
        href: '/accounting/company-registry',
        icon: <Building2 className="h-5 w-5" />,
        description: 'NIP-8, KRS, VAT-R',
        color: 'text-amber-500',
      },
      {
        label: 'Dziennik zdarzeń',
        href: '/accounting/event-log',
        icon: <Shield className="h-5 w-5" />,
        description: 'Historia wszystkich działań',
        color: 'text-indigo-500',
      },
    ],
  },
  {
    title: 'PIENIĄDZE',
    items: [
      {
        label: 'Bankowość',
        href: '/accounting/bank',
        icon: <Landmark className="h-5 w-5" />,
        description: 'Konta bankowe',
        color: 'text-teal-500',
      },
      {
        label: 'Kasa',
        href: '/accounting/kasa',
        icon: <Wallet className="h-5 w-5" />,
        description: 'Gotówka KP/KW',
        color: 'text-orange-500',
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
    <div className={cn("flex flex-col h-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border-r border-slate-200 dark:border-slate-800", className)}>
      <div className={cn("border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm", collapsed ? "p-2" : "p-4")}>
        <div className={cn("flex items-start", collapsed ? "justify-center" : "justify-between")}
        >
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-base text-slate-900 dark:text-slate-100">Księgowość Spółki</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Pełna księgowość sp. z o.o.</p>
            </div>
          )}
          {onToggleCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapsed}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={collapsed ? "Rozwiń menu" : "Zwiń menu"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <nav className={cn(collapsed ? "p-2" : "p-3")}>
          {spolkaNavSections.map((section, sectionIdx) => (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <div className="px-3 py-2 text-[10px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                  {section.title}
                </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <Button
                      key={item.href}
                      variant="ghost"
                      className={cn(
                        "group relative transition-all duration-200",
                        collapsed
                          ? "w-full justify-center h-10 px-0"
                          : "w-full justify-start h-10 px-3",
                        "hover:bg-slate-100 dark:hover:bg-slate-800/50",
                        isActive 
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm" 
                          : "text-slate-700 dark:text-slate-300"
                      )}
                      onClick={() => handleNavigation(item.href)}
                      title={collapsed ? item.label : undefined}
                    >
                      <div className={cn(
                        collapsed ? "" : "mr-3", 
                        item.color,
                        "transition-transform group-hover:scale-110",
                        isActive && "scale-110"
                      )}>
                        {item.icon}
                      </div>
                      {!collapsed && (
                        <div className="flex flex-col items-start text-left flex-1">
                          <span className="text-sm font-medium leading-tight">{item.label}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{item.description}</span>
                        </div>
                      )}
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />
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
