import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '@/lib/utils';
import DocumentsSidebar from './DocumentsSidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { usePageHeaderActions } from '@/context/PageHeaderActionsContext';

interface DocumentsLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

const DocumentsLayout: React.FC<DocumentsLayoutProps> = ({ 
  children,
  showSidebar = true 
}) => {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [desktopPeek, setDesktopPeek] = useState(false);
  const [desktopHoverLockUntil, setDesktopHoverLockUntil] = useState(0);
  const [desktopPeekPinnedUntil, setDesktopPeekPinnedUntil] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { setActions } = usePageHeaderActions();

  useEffect(() => {
    if (!showSidebar) return;
    
    setActions(
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>
    );

    return () => setActions(null);
  }, [setActions, showSidebar]);

  const handleToggleDesktopCollapsed = () => {
    setDesktopCollapsed(!desktopCollapsed);
    setDesktopPeek(false);
  };

  const handleDesktopMouseLeave = () => {
    if (Date.now() < desktopPeekPinnedUntil) return;
    setDesktopPeek(false);
  };

  const handleDesktopItemSelect = () => {
    if (!desktopCollapsed) return;
    const until = Date.now() + 300;
    setDesktopHoverLockUntil(until);
    setDesktopPeekPinnedUntil(until);

    flushSync(() => {
      setDesktopPeek(true);
      setDesktopPeekPinnedUntil(until);
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {!showSidebar ? (
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1">{children}</main>
        </div>
      ) : (
        <>
          {/* Mobile Sidebar - Sheet */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="p-0 w-64">
              <DocumentsSidebar 
                onItemSelect={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* Desktop Sidebar - sticky with header offset */}
          {!desktopCollapsed ? (
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:ml-2 lg:border-r lg:bg-background transition-[width] duration-200 ease-in-out lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <DocumentsSidebar
                collapsed={false}
                onToggleCollapsed={handleToggleDesktopCollapsed}
              />
            </aside>
          ) : (
            <aside
              className={cn(
                'hidden lg:flex lg:flex-col lg:ml-2 lg:border-r lg:bg-background overflow-y-auto transition-[width] duration-200 ease-in-out lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]',
                desktopPeek ? 'lg:w-64' : 'lg:w-16'
              )}
              onMouseEnter={() => {
                if (Date.now() < desktopHoverLockUntil) return;
                setDesktopPeek(true);
              }}
              onMouseLeave={handleDesktopMouseLeave}
            >
              <DocumentsSidebar
                collapsed={!desktopPeek}
                onToggleCollapsed={handleToggleDesktopCollapsed}
                onItemSelect={handleDesktopItemSelect}
              />
            </aside>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1">{children}</main>
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentsLayout;
