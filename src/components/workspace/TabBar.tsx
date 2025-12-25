import React, { useRef, useEffect, useState } from 'react';
import { X, Pin, MoreHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

// Safari-like tab styling constants
const TAB_STYLES = {
  inactive: 'bg-transparent hover:bg-accent/30',
  active: 'bg-accent/50 backdrop-blur-xl',
  border: 'border border-border/40',
  shadow: 'shadow-sm',
};

const TabBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    switchTab,
    closeTab,
    pinTab,
    unpinTab,
  } = useWorkspaceTabs();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [overflowTabs, setOverflowTabs] = useState<typeof tabs>([]);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check if tabs overflow
  useEffect(() => {
    const checkOverflow = () => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const hasOverflow = container.scrollWidth > container.clientWidth;
      setShowOverflow(hasOverflow);

      // Calculate which tabs are in overflow
      if (hasOverflow) {
        const visibleWidth = container.clientWidth - 100; // Reserve space for overflow button
        let accumulatedWidth = 0;
        const minTabWidth = 120;
        
        const overflow = tabs.filter((_, index) => {
          accumulatedWidth += minTabWidth;
          return accumulatedWidth > visibleWidth;
        });
        
        setOverflowTabs(overflow);
      } else {
        setOverflowTabs([]);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [tabs]);

  // Handle scroll for shadow effect
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsScrolled(container.scrollLeft > 0);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  if (tabs.length === 0) return null;

  const visibleTabs = showOverflow ? tabs.slice(0, tabs.length - overflowTabs.length) : tabs;

  return (
    <div className={cn(
      "relative border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60",
      "transition-shadow duration-200",
      isScrolled && "shadow-sm"
    )}>
      <div className="flex items-center h-11 px-3 gap-1.5">
        {/* Scrollable tab container */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <AnimatePresence mode="popLayout">
            {visibleTabs.map((tab) => (
              <Tab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onSwitch={() => switchTab(tab.id)}
                onClose={() => closeTab(tab.id)}
                onPin={() => tab.isPinned ? unpinTab(tab.id) : pinTab(tab.id)}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Overflow menu */}
        {showOverflow && overflowTabs.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-md",
                  "hover:bg-accent transition-colors",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {overflowTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className="flex items-center gap-2"
                >
                  {tab.icon && <tab.icon className="h-4 w-4" />}
                  <span className="flex-1 truncate">{tab.title}</span>
                  {tab.isDirty && (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

interface TabProps {
  tab: any;
  isActive: boolean;
  onSwitch: () => void;
  onClose: () => void;
  onPin: () => void;
}

const Tab: React.FC<TabProps> = ({ tab, isActive, onSwitch, onClose, onPin }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.98, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -10 }}
      transition={{
        layout: { type: "spring", stiffness: 500, damping: 35 },
        opacity: { duration: 0.15 },
        scale: { duration: 0.15 },
      }}
      onClick={onSwitch}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex items-center gap-2 h-8 px-3.5 rounded-full",
        "transition-all duration-200 ease-out",
        "min-w-[100px] max-w-[220px]",
        "border border-transparent",
        isActive
          ? cn(
              TAB_STYLES.active,
              TAB_STYLES.border,
              "text-foreground font-medium",
              "shadow-sm"
            )
          : cn(
              TAB_STYLES.inactive,
              "text-muted-foreground hover:text-foreground",
              "hover:border-border/20"
            ),
        tab.isPinned && "min-w-[80px]"
      )}
      style={{
        backdropFilter: isActive ? 'blur(12px)' : 'blur(4px)',
      }}
    >
      {/* Active indicator - Safari style subtle bottom accent */}
      {isActive && (
        <motion.div
          layoutId="activeTab"
          className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary/60 rounded-full"
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      )}

      {/* Pin indicator */}
      {tab.isPinned && (
        <Pin className="h-3 w-3 shrink-0 text-primary" />
      )}

      {/* Icon */}
      {tab.icon && !tab.isPinned && (
        <tab.icon className="h-4 w-4 shrink-0" />
      )}

      {/* Title */}
      <span className="flex-1 truncate text-sm font-medium">
        {tab.title}
      </span>

      {/* Dirty indicator */}
      {tab.isDirty && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
        />
      )}

      {/* Close button */}
      {(isHovered || isActive) && !tab.isPinned && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "shrink-0 rounded-sm p-0.5",
            "hover:bg-accent-foreground/10 transition-colors"
          )}
        >
          <X className="h-3 w-3" />
        </motion.button>
      )}

      {/* Context menu trigger (right-click) */}
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          // TODO: Show context menu with pin/unpin, close, etc.
        }}
        className="absolute inset-0"
      />
    </motion.button>
  );
};

export default TabBar;
