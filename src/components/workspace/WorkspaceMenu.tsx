import React from 'react';
import { MoreHorizontal, X, Pin, Maximize2, Minimize2, RotateCcw, Search, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';
import { useSidebar } from '@/shared/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';

interface WorkspaceMenuProps {
  onOpenTabSwitcher?: () => void;
}

const WorkspaceMenu: React.FC<WorkspaceMenuProps> = ({ onOpenTabSwitcher }) => {
  const {
    tabs,
    activeTabId,
    closeOtherTabs,
    closeAllTabs,
    closeTabsToRight,
    getTabById,
    pinTab,
    unpinTab,
    focusMode,
    setFocusMode,
  } = useWorkspaceTabs();

  const { state: sidebarState, toggle: toggleSidebar } = useSidebar();
  const activeTab = activeTabId ? getTabById(activeTabId) : null;
  const hasMultipleTabs = tabs.length > 1;
  const activeTabIndex = activeTab ? tabs.findIndex(t => t.id === activeTab.id) : -1;
  const hasTabsToRight = activeTabIndex !== -1 && activeTabIndex < tabs.length - 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Workspace menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Tabs section */}
        {tabs.length > 0 && (
          <>
            <DropdownMenuLabel>Karty</DropdownMenuLabel>
            <DropdownMenuGroup>
              {activeTab && !activeTab.isPinned && (
                <DropdownMenuItem onClick={() => pinTab(activeTab.id)}>
                  <Pin className="mr-2 h-4 w-4" />
                  Przypnij kartę
                </DropdownMenuItem>
              )}
              {activeTab && activeTab.isPinned && (
                <DropdownMenuItem onClick={() => unpinTab(activeTab.id)}>
                  <Pin className="mr-2 h-4 w-4" />
                  Odepnij kartę
                </DropdownMenuItem>
              )}
              {hasMultipleTabs && (
                <DropdownMenuItem
                  onClick={() => activeTab && closeOtherTabs(activeTab.id)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Zamknij inne karty
                </DropdownMenuItem>
              )}
              {hasTabsToRight && (
                <DropdownMenuItem
                  onClick={() => activeTab && closeTabsToRight(activeTab.id)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Zamknij karty po prawej
                </DropdownMenuItem>
              )}
              {tabs.length > 0 && (
                <DropdownMenuItem onClick={closeAllTabs}>
                  <X className="mr-2 h-4 w-4" />
                  Zamknij wszystkie karty
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Layout section */}
        <DropdownMenuLabel>Widok</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setFocusMode(!focusMode)}>
            {focusMode ? (
              <>
                <Minimize2 className="mr-2 h-4 w-4" />
                Wyłącz tryb skupienia
              </>
            ) : (
              <>
                <Maximize2 className="mr-2 h-4 w-4" />
                Tryb skupienia
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleSidebar}>
            {sidebarState === 'expanded' ? (
              <>
                <PanelLeftClose className="mr-2 h-4 w-4" />
                Zwiń panel boczny
              </>
            ) : (
              <>
                <PanelLeft className="mr-2 h-4 w-4" />
                Rozwiń panel boczny
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* Tools section */}
        {onOpenTabSwitcher && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Narzędzia</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onOpenTabSwitcher}>
                <Search className="mr-2 h-4 w-4" />
                Wyszukaj kartę
                <span className="ml-auto text-xs text-muted-foreground">⌘K</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}

        {/* Session restore */}
        {tabs.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // TODO: Implement session restore
                console.log('Restore previous session');
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Przywróć poprzednią sesję
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceMenu;
