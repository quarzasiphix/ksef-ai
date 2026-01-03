import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Users, Package, Inbox, FileCheck, Building, CreditCard, Calculator } from 'lucide-react';

export type TabType = 'document' | 'workspace';

export interface WorkspaceTab {
  id: string;
  type: TabType;
  title: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  entityId?: string; // For document tabs (invoice ID, contract ID, etc.)
  entityType?: 'invoice' | 'contract' | 'customer' | 'product' | 'employee' | 'expense' | 'storage_file';
  isDirty?: boolean; // Has unsaved changes
  isPinned?: boolean;
  state?: any; // Preserved state (form data, scroll position, filters)
}

interface WorkspaceTabsContextType {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  openTab: (tab: Omit<WorkspaceTab, 'id'>) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  closeAllTabs: () => void;
  closeTabsToRight: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTabState: (tabId: string, state: any) => void;
  markTabDirty: (tabId: string, isDirty: boolean) => void;
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  getTabById: (tabId: string) => WorkspaceTab | undefined;
  focusMode: boolean;
  setFocusMode: (enabled: boolean) => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextType | undefined>(undefined);

export const useWorkspaceTabs = () => {
  const context = useContext(WorkspaceTabsContext);
  if (!context) {
    throw new Error('useWorkspaceTabs must be used within WorkspaceTabsProvider');
  }
  return context;
};

// Helper to generate tab icon based on path
export const getIconForPath = (path: string): React.ComponentType<{ className?: string }> | undefined => {
  if (path.startsWith('/income') || path.startsWith('/inbox')) return FileText;
  if (path.startsWith('/expense')) return CreditCard;
  if (path.startsWith('/customers')) return Users;
  if (path.startsWith('/products')) return Package;
  if (path.startsWith('/contracts')) return FileCheck;
  if (path.startsWith('/accounting')) return Calculator;
  if (path.startsWith('/employees')) return Building;
  if (path.startsWith('/decisions')) return FileCheck;
  if (path.startsWith('/settings')) return Building;
  if (path.startsWith('/documents/repository')) return FileText;
  return undefined;
};

// Helper to generate tab title from path
const getTitleForPath = (path: string): string => {
  if (path.startsWith('/income')) return 'Faktury';
  if (path.startsWith('/expense')) return 'Wydatki';
  if (path.startsWith('/customers')) return 'Klienci';
  if (path.startsWith('/products')) return 'Produkty';
  if (path.startsWith('/contracts')) return 'Kontrakty';
  if (path.startsWith('/inbox')) return 'Skrzynka';
  if (path.startsWith('/accounting')) return 'Księgowość';
  if (path.startsWith('/dashboard')) return 'Pulpit';
  if (path.startsWith('/employees')) return 'Pracownicy';
  if (path.startsWith('/decisions')) return 'Decyzje';
  if (path.startsWith('/settings')) return 'Ustawienia';
  if (path.startsWith('/documents/repository/file/')) return 'Plik';
  if (path.startsWith('/documents/repository')) return 'Repozytorium';
  return 'Dokument';
};

// Helper to get category for path (for category-level tab grouping)
const getCategoryForPath = (path: string): string | null => {
  if (path.startsWith('/accounting')) return 'accounting';
  if (path.startsWith('/decisions')) return 'decisions';
  if (path.startsWith('/settings')) return 'settings';
  return null;
};

export const WorkspaceTabsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Load tabs from localStorage on mount
  useEffect(() => {
    const savedTabs = localStorage.getItem('workspace_tabs');
    const savedActiveTab = localStorage.getItem('workspace_active_tab');
    
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as Omit<WorkspaceTab, 'icon'>[];
        const hydratedTabs: WorkspaceTab[] = parsed.map(tab => ({
          ...tab,
          icon: getIconForPath(tab.path),
        }));
        setTabs(hydratedTabs);
        if (savedActiveTab) {
          setActiveTabId(savedActiveTab);
        }
      } catch (err) {
        console.error('Failed to restore tabs:', err);
      }
    }
  }, []);

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0) {
      const serializableTabs = tabs.map(({ icon, ...rest }) => rest);
      localStorage.setItem('workspace_tabs', JSON.stringify(serializableTabs));
    } else {
      localStorage.removeItem('workspace_tabs');
    }
    
    if (activeTabId) {
      localStorage.setItem('workspace_active_tab', activeTabId);
    } else {
      localStorage.removeItem('workspace_active_tab');
    }
  }, [tabs, activeTabId]);

  const openTab = useCallback((tabData: Omit<WorkspaceTab, 'id'>) => {
    setTabs(prevTabs => {
      // Check if tab already exists (for document tabs with entityId)
      if (tabData.type === 'document' && tabData.entityId) {
        const existingTab = prevTabs.find(
          t => t.type === 'document' && t.entityId === tabData.entityId && t.entityType === tabData.entityType
        );
        if (existingTab) {
          setActiveTabId(existingTab.id);
          navigate(existingTab.path);
          return prevTabs;
        }
      }

      // Check if workspace tab already exists - for category-level tabs, replace with new path
      if (tabData.type === 'workspace') {
        const category = getCategoryForPath(tabData.path);
        if (category) {
          // Find existing tab in same category and replace it
          const existingCategoryTab = prevTabs.find(t => 
            t.type === 'workspace' && getCategoryForPath(t.path) === category
          );
          if (existingCategoryTab) {
            // Update existing tab with new path
            const updatedTabs = prevTabs.map(t => 
              t.id === existingCategoryTab.id 
                ? { ...t, path: tabData.path, title: tabData.title || getTitleForPath(tabData.path) }
                : t
            );
            setActiveTabId(existingCategoryTab.id);
            navigate(tabData.path);
            return updatedTabs;
          }
        } else {
          // For non-category paths, check exact match
          const existingTab = prevTabs.find(t => t.type === 'workspace' && t.path === tabData.path);
          if (existingTab) {
            setActiveTabId(existingTab.id);
            navigate(existingTab.path);
            return prevTabs;
          }
        }
      }

      // Create new tab
      const newTab: WorkspaceTab = {
        ...tabData,
        id: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        icon: tabData.icon || getIconForPath(tabData.path),
        title: tabData.title || getTitleForPath(tabData.path),
      };

      setActiveTabId(newTab.id);
      navigate(newTab.path);
      return [...prevTabs, newTab];
    });
  }, [navigate]);

  const closeTab = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prevTabs;

      const tab = prevTabs[tabIndex];
      
      // Check if tab has unsaved changes
      if (tab.isDirty) {
        const confirmed = window.confirm(
          'Ten dokument ma niezapisane zmiany. Czy na pewno chcesz zamknąć kartę?'
        );
        if (!confirmed) return prevTabs;
      }

      const newTabs = prevTabs.filter(t => t.id !== tabId);

      // If closing active tab, switch to another
      if (activeTabId === tabId && newTabs.length > 0) {
        // Try to activate tab to the right, or left if no right
        const nextTab = newTabs[tabIndex] || newTabs[tabIndex - 1];
        if (nextTab) {
          setActiveTabId(nextTab.id);
          navigate(nextTab.path);
        }
      } else if (newTabs.length === 0) {
        setActiveTabId(null);
        navigate('/dashboard');
      }

      return newTabs;
    });
  }, [activeTabId, navigate]);

  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const tab = prevTabs.find(t => t.id === tabId);
      if (!tab) return prevTabs;

      // Check for dirty tabs
      const dirtyTabs = prevTabs.filter(t => t.id !== tabId && t.isDirty && !t.isPinned);
      if (dirtyTabs.length > 0) {
        const confirmed = window.confirm(
          `${dirtyTabs.length} kart${dirtyTabs.length === 1 ? 'a ma' : 'y mają'} niezapisane zmiany. Kontynuować?`
        );
        if (!confirmed) return prevTabs;
      }

      // Keep pinned tabs and the current tab
      const newTabs = prevTabs.filter(t => t.id === tabId || t.isPinned);
      setActiveTabId(tabId);
      navigate(tab.path);
      return newTabs;
    });
  }, [navigate]);

  const closeAllTabs = useCallback(() => {
    const dirtyTabs = tabs.filter(t => t.isDirty && !t.isPinned);
    if (dirtyTabs.length > 0) {
      const confirmed = window.confirm(
        `${dirtyTabs.length} kart${dirtyTabs.length === 1 ? 'a ma' : 'y mają'} niezapisane zmiany. Kontynuować?`
      );
      if (!confirmed) return;
    }

    // Keep only pinned tabs
    const pinnedTabs = tabs.filter(t => t.isPinned);
    setTabs(pinnedTabs);
    
    if (pinnedTabs.length > 0) {
      setActiveTabId(pinnedTabs[0].id);
      navigate(pinnedTabs[0].path);
    } else {
      setActiveTabId(null);
      navigate('/dashboard');
    }
  }, [tabs, navigate]);

  const closeTabsToRight = useCallback((tabId: string) => {
    setTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.id === tabId);
      if (tabIndex === -1) return prevTabs;

      const tabsToClose = prevTabs.slice(tabIndex + 1);
      const dirtyTabs = tabsToClose.filter(t => t.isDirty && !t.isPinned);
      
      if (dirtyTabs.length > 0) {
        const confirmed = window.confirm(
          `${dirtyTabs.length} kart${dirtyTabs.length === 1 ? 'a ma' : 'y mają'} niezapisane zmiany. Kontynuować?`
        );
        if (!confirmed) return prevTabs;
      }

      // Keep tabs up to and including current, plus pinned tabs to the right
      const newTabs = [
        ...prevTabs.slice(0, tabIndex + 1),
        ...tabsToClose.filter(t => t.isPinned)
      ];

      return newTabs;
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setActiveTabId(tabId);
      navigate(tab.path);
    }
  }, [tabs, navigate]);

  const updateTabState = useCallback((tabId: string, state: any) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, state } : tab
      )
    );
  }, []);

  const markTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, isDirty } : tab
      )
    );
  }, []);

  const pinTab = useCallback((tabId: string) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, isPinned: true } : tab
      )
    );
  }, []);

  const unpinTab = useCallback((tabId: string) => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === tabId ? { ...tab, isPinned: false } : tab
      )
    );
  }, []);

  const getTabById = useCallback((tabId: string) => {
    return tabs.find(t => t.id === tabId);
  }, [tabs]);

  return (
    <WorkspaceTabsContext.Provider
      value={{
        tabs,
        activeTabId,
        openTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
        closeTabsToRight,
        switchTab,
        updateTabState,
        markTabDirty,
        pinTab,
        unpinTab,
        getTabById,
        focusMode,
        setFocusMode,
      }}
    >
      {children}
    </WorkspaceTabsContext.Provider>
  );
};
