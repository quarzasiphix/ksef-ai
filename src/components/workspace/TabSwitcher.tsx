import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Clock } from 'lucide-react';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';

interface TabSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({ open, onOpenChange }) => {
  const { tabs, switchTab, openTab } = useWorkspaceTabs();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Recent documents from localStorage
  const recentDocuments = useMemo(() => {
    try {
      const recent = localStorage.getItem('recent_documents');
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  }, [open]);

  // Filter tabs and recent documents
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    // Filter open tabs
    const matchingTabs = tabs.filter(tab =>
      tab.title.toLowerCase().includes(query) ||
      tab.path.toLowerCase().includes(query) ||
      tab.entityId?.toLowerCase().includes(query)
    );

    // Filter recent documents (if no query or query doesn't match tabs well)
    const matchingRecent = recentDocuments.filter((doc: any) =>
      doc.title?.toLowerCase().includes(query) ||
      doc.path?.toLowerCase().includes(query)
    );

    return {
      tabs: matchingTabs,
      recent: matchingRecent.slice(0, 5), // Limit recent to 5
    };
  }, [searchQuery, tabs, recentDocuments]);

  const allItems = [
    ...filteredItems.tabs.map(t => ({ type: 'tab' as const, data: t })),
    ...filteredItems.recent.map(r => ({ type: 'recent' as const, data: r })),
  ];

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = allItems[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, allItems]);

  const handleSelect = (item: typeof allItems[0]) => {
    if (item.type === 'tab') {
      switchTab(item.data.id);
    } else {
      // Open recent document as new tab
      openTab({
        type: 'document',
        title: item.data.title,
        path: item.data.path,
        entityId: item.data.entityId,
        entityType: item.data.entityType,
      });
    }
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj kart, dokumentów..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Brak wyników</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Open tabs section */}
              {filteredItems.tabs.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Otwarte karty
                  </div>
                  {filteredItems.tabs.map((tab, index) => {
                    const globalIndex = index;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSelect({ type: 'tab', data: tab })}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          selectedIndex === globalIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                      >
                        {tab.icon && <tab.icon className="h-5 w-5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{tab.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {tab.path}
                          </div>
                        </div>
                        {tab.isDirty && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Recent documents section */}
              {filteredItems.recent.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Ostatnie dokumenty
                  </div>
                  {filteredItems.recent.map((doc: any, index) => {
                    const globalIndex = filteredItems.tabs.length + index;
                    return (
                      <button
                        key={doc.id || doc.path}
                        onClick={() => handleSelect({ type: 'recent', data: doc })}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          selectedIndex === globalIndex
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-accent/50"
                        )}
                      >
                        <Clock className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{doc.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {doc.path}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center justify-between">
          <span>Użyj ↑↓ do nawigacji, Enter aby otworzyć</span>
          <span>Esc aby zamknąć</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TabSwitcher;
