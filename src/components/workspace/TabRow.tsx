import React, { useRef, useEffect, useState } from 'react';
import { X, Pin, Inbox, FileText, FileSignature, MoreHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

// Pinned tabs configuration - always visible, icon-only or very short
const PINNED_TABS = [
  { id: 'inbox', title: 'Skrzynka', path: '/inbox', icon: Inbox },
  { id: 'invoices', title: 'Faktury', path: '/income', icon: FileText },
  { id: 'contracts', title: 'Kontrakty', path: '/contracts', icon: FileSignature },
];

interface TabProps {
  tab: any;
  isActive: boolean;
  isPinned?: boolean;
  isCompact?: boolean;
  onSwitch: () => void;
  onClose: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
}

const Tab: React.FC<TabProps> = ({
  tab,
  isActive,
  isPinned = false,
  isCompact = false,
  onSwitch,
  onClose,
  onPin,
  onUnpin,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const IconComponent = tab.icon;

  const baseClasses = cn(
    "group relative inline-flex items-center gap-2",
    "rounded-xl border transition-all duration-200",
    "min-w-[120px] max-w-[220px]",
    isCompact ? "px-2.5 py-1.5" : "px-3 py-2",
    "text-sm"
  );

  const stateClasses = isActive
    ? cn(
        "bg-white/10 text-white border-white/15",
        "shadow-[0_8px_20px_-12px_rgba(0,0,0,0.8)]",
        // Active accent underline
        "after:absolute after:inset-x-3 after:-bottom-[1px]",
        "after:h-[2px] after:rounded-full after:bg-blue-500/80"
      )
    : cn(
        "bg-white/5 border-white/10 text-white/80",
        "hover:bg-white/8 hover:text-white hover:border-white/15"
      );

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { type: "spring", stiffness: 500, damping: 35 },
        opacity: { duration: 0.15 },
      }}
      onClick={onSwitch}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(baseClasses, stateClasses)}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1 pointer-events-none">
        {IconComponent && typeof IconComponent === 'function' && (
          <IconComponent className={cn(
            "h-4 w-4 flex-shrink-0",
            isActive ? "text-white/90" : "text-white/60"
          )} />
        )}
        <div className="min-w-0 truncate font-medium">
          {tab.title}
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-1 flex-shrink-0 pointer-events-none">
        {/* Dirty dot */}
        {tab.isDirty && (
          <div 
            className="h-2 w-2 rounded-full bg-amber-400/90 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]"
            title="Niezapisane zmiany"
          />
        )}

        {/* Pin indicator (only for pinned tabs) */}
        {isPinned && (
          <Pin className="h-3 w-3 text-blue-400/80" />
        )}

        {/* Close button - hover only for clean look */}
        {!isPinned && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={cn(
              "ml-1 grid h-5 w-5 place-items-center rounded-md cursor-pointer pointer-events-auto",
              "text-white/50 transition-all",
              isHovered ? "opacity-100" : "opacity-0",
              "hover:bg-white/10 hover:text-white"
            )}
            aria-label="Zamknij kartę"
            role="button"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </motion.button>
  );
};

const TabRow: React.FC = () => {
  const {
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    pinTab,
    unpinTab,
  } = useWorkspaceTabs();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [overflowTabs, setOverflowTabs] = useState<typeof tabs>([]);
  const [showOverflow, setShowOverflow] = useState(false);

  // Check for overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const hasOverflow = container.scrollWidth > container.clientWidth;
      setShowOverflow(hasOverflow);

      if (hasOverflow) {
        // Calculate which tabs should go to overflow
        const visibleCount = Math.floor(container.clientWidth / 180); // Approximate tab width
        const overflow = tabs.slice(visibleCount);
        setOverflowTabs(overflow);
      } else {
        setOverflowTabs([]);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [tabs]);

  if (tabs.length === 0) return null;

  const pinnedTabs = tabs.filter(t => t.isPinned);
  const workingTabs = tabs.filter(t => !t.isPinned);
  const visibleWorkingTabs = showOverflow 
    ? workingTabs.slice(0, workingTabs.length - overflowTabs.length)
    : workingTabs;

  return (
    <div className="sticky top-[52px] z-30 border-b border-white/5 bg-gradient-to-b from-black/40 to-black/20 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-2 px-4">
        {/* Pinned tabs zone */}
        {pinnedTabs.length > 0 && (
          <>
            <div className="flex items-center gap-1">
              <AnimatePresence mode="popLayout">
                {pinnedTabs.map((tab) => (
                  <Tab
                    key={tab.id}
                    tab={tab}
                    isActive={tab.id === activeTabId}
                    isPinned={true}
                    isCompact={true}
                    onSwitch={() => switchTab(tab.id)}
                    onClose={() => closeTab(tab.id)}
                    onUnpin={() => unpinTab(tab.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
            <div className="h-6 w-px bg-white/5" />
          </>
        )}

        {/* Working tabs zone */}
        <div
          ref={scrollContainerRef}
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence mode="popLayout">
            {visibleWorkingTabs.map((tab) => (
              <Tab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onSwitch={() => switchTab(tab.id)}
                onClose={() => closeTab(tab.id)}
                onPin={() => pinTab(tab.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Overflow menu */}
        {showOverflow && overflowTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-sm text-white/80 hover:bg-white/10 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {overflowTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <DropdownMenuItem
                    key={tab.id}
                    onClick={() => switchTab(tab.id)}
                    className="flex items-center gap-2"
                  >
                    {IconComponent && typeof IconComponent === 'function' && (
                      <IconComponent className="h-4 w-4" />
                    )}
                    <span className="flex-1 truncate">{tab.title}</span>
                    {tab.isDirty && (
                      <div className="h-2 w-2 rounded-full bg-amber-400/90" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default TabRow;
