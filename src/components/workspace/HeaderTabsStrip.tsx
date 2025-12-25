import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';
import { X, MoreHorizontal, Inbox, FileText, FileCheck, Users, Package, Building } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

// Section configuration with colors and root tabs
const SECTIONS = {
  inbox: {
    key: 'inbox',
    label: 'Skrzynka',
    icon: Inbox,
    color: 'blue',
    rootPath: '/inbox',
    accentClass: 'border-t-blue-500/50',
    bgClass: 'bg-blue-500/5',
  },
  invoices: {
    key: 'invoices',
    label: 'Faktury',
    icon: FileText,
    color: 'sky',
    rootPath: '/income',
    accentClass: 'border-t-sky-500/50',
    bgClass: 'bg-sky-500/5',
  },
  contracts: {
    key: 'contracts',
    label: 'Kontrakty',
    icon: FileCheck,
    color: 'amber',
    rootPath: '/contracts',
    accentClass: 'border-t-amber-500/50',
    bgClass: 'bg-amber-500/5',
  },
  customers: {
    key: 'customers',
    label: 'Klienci',
    icon: Users,
    color: 'violet',
    rootPath: '/customers',
    accentClass: 'border-t-violet-500/50',
    bgClass: 'bg-violet-500/5',
  },
  products: {
    key: 'products',
    label: 'Produkty',
    icon: Package,
    color: 'emerald',
    rootPath: '/products',
    accentClass: 'border-t-emerald-500/50',
    bgClass: 'bg-emerald-500/5',
  },
  employees: {
    key: 'employees',
    label: 'Pracownicy',
    icon: Building,
    color: 'indigo',
    rootPath: '/employees',
    accentClass: 'border-t-indigo-500/50',
    bgClass: 'bg-indigo-500/5',
  },
} as const;

type SectionKey = keyof typeof SECTIONS;

// Map path to section
const getSectionForPath = (path: string): SectionKey | null => {
  if (path.startsWith('/inbox')) return 'inbox';
  if (path.startsWith('/income') || path.startsWith('/expense')) return 'invoices';
  if (path.startsWith('/contracts')) return 'contracts';
  if (path.startsWith('/customers')) return 'customers';
  if (path.startsWith('/products')) return 'products';
  if (path.startsWith('/employees')) return 'employees';
  return null;
};

interface SectionTrayProps {
  section: typeof SECTIONS[SectionKey];
  tabs: any[];
  activeTabId: string | null;
  onSwitchTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNavigateRoot: () => void;
  maxVisibleTabs?: number;
}

const SectionTray: React.FC<SectionTrayProps> = ({
  section,
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onNavigateRoot,
  maxVisibleTabs = 4,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const visibleTabs = tabs.slice(0, maxVisibleTabs);
  const overflowTabs = tabs.slice(maxVisibleTabs);
  const hasOverflow = overflowTabs.length > 0;
  const Icon = section.icon;

  // Check if any tab in this section is active
  const isAnySectionTabActive = tabs.some(tab => tab.id === activeTabId);
  const isRootActive = tabs.length === 0 && isAnySectionTabActive;

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-lg border-t-2 transition-all",
        section.accentClass,
        isAnySectionTabActive ? section.bgClass : "bg-white/[0.02]",
        "border-white/5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Root tab - always visible */}
      <button
        onClick={onNavigateRoot}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "text-xs font-medium transition-all",
          "hover:bg-white/10",
          isRootActive
            ? "bg-white/15 text-white"
            : "text-white/70 hover:text-white/90"
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{section.label}</span>
      </button>

      {/* Document tabs in this section */}
      <AnimatePresence mode="popLayout">
        {visibleTabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const TabIcon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{
                layout: { type: "spring", stiffness: 500, damping: 35 },
                opacity: { duration: 0.12 },
              }}
              onClick={() => onSwitchTab(tab.id)}
              className={cn(
                "group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
                "text-xs font-medium transition-all max-w-[140px]",
                isActive
                  ? "bg-white/20 text-white shadow-sm"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
              )}
            >
              {TabIcon && typeof TabIcon === 'function' && (
                <TabIcon className="h-3.5 w-3.5 flex-shrink-0" />
              )}
              <span className="truncate flex-1 min-w-0">{tab.title}</span>
              
              {/* Dirty indicator */}
              {tab.isDirty && (
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              )}

              {/* Close button - only on hover */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
                className={cn(
                  "grid h-4 w-4 place-items-center rounded",
                  "text-white/40 hover:text-white hover:bg-white/20",
                  "transition-opacity",
                  isHovered || isActive ? "opacity-100" : "opacity-0"
                )}
                role="button"
                aria-label="Zamknij"
              >
                <X className="h-3 w-3" />
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>

      {/* Overflow indicator */}
      {hasOverflow && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white/60 hover:bg-white/10 hover:text-white/80 transition-all">
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span>+{overflowTabs.length}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {overflowTabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => onSwitchTab(tab.id)}
                  className="flex items-center gap-2"
                >
                  {TabIcon && typeof TabIcon === 'function' && (
                    <TabIcon className="h-4 w-4" />
                  )}
                  <span className="flex-1 truncate">{tab.title}</span>
                  {tab.isDirty && (
                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

const HeaderTabsStrip: React.FC = () => {
  const { tabs, activeTabId, switchTab, closeTab } = useWorkspaceTabs();
  const navigate = useNavigate();

  // Group tabs by section
  const groupedTabs = useMemo(() => {
    const groups: Record<SectionKey, any[]> = {
      inbox: [],
      invoices: [],
      contracts: [],
      customers: [],
      products: [],
      employees: [],
    };

    tabs.forEach((tab) => {
      const sectionKey = getSectionForPath(tab.path);
      if (sectionKey && groups[sectionKey]) {
        groups[sectionKey].push(tab);
      }
    });

    return groups;
  }, [tabs]);

  // Only show sections that have tabs or are commonly used
  const activeSections = useMemo(() => {
    return Object.entries(SECTIONS).filter(([key]) => {
      const sectionKey = key as SectionKey;
      // Always show inbox, invoices, contracts
      if (['inbox', 'invoices', 'contracts'].includes(sectionKey)) return true;
      // Show others only if they have tabs
      return groupedTabs[sectionKey].length > 0;
    });
  }, [groupedTabs]);

  if (activeSections.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide px-2 scroll-smooth">
        <AnimatePresence mode="sync">
          {activeSections.map(([key, section]) => {
            const sectionKey = key as SectionKey;
            const sectionTabs = groupedTabs[sectionKey];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SectionTray
                  section={section}
                  tabs={sectionTabs}
                  activeTabId={activeTabId}
                  onSwitchTab={switchTab}
                  onCloseTab={closeTab}
                  onNavigateRoot={() => navigate(section.rootPath)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HeaderTabsStrip;
