import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import AccountingSidebar from './AccountingSidebar';
import { usePageHeaderActions } from '@/context/PageHeaderActionsContext';
import { flushSync } from 'react-dom';

interface AccountingLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const AccountingLayout: React.FC<AccountingLayoutProps> = ({ 
  children,
  showSidebar = true 
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    try {
      const v = window.localStorage.getItem('accounting_sidebar_collapsed');
      return v === '1';
    } catch {
      return false;
    }
  });
  const [desktopPeekPinnedUntil, setDesktopPeekPinnedUntil] = useState<number>(() => {
    try {
      const raw = window.sessionStorage.getItem('accounting_sidebar_peek_pinned_until');
      const v = raw ? Number(raw) : 0;
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  });
  const [desktopPeek, setDesktopPeek] = useState<boolean>(() => {
    try {
      const raw = window.sessionStorage.getItem('accounting_sidebar_peek_pinned_until');
      const v = raw ? Number(raw) : 0;
      return Number.isFinite(v) ? v > Date.now() : false;
    } catch {
      return false;
    }
  });
  const [desktopHoverLockUntil, setDesktopHoverLockUntil] = useState<number>(0);
  const { setActions } = usePageHeaderActions();

  const headerActions = useMemo(() => {
    if (!showSidebar) return null;
    return (
      <div className="lg:hidden flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu księgowości</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu księgowości</SheetTitle>
              <SheetDescription>Nawigacja po modułach księgowości</SheetDescription>
            </SheetHeader>
            <AccountingSidebar onNavigate={() => setMobileOpen(false)} deferNavigationMs={350} />
          </SheetContent>
        </Sheet>
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          Księgowość Spółki
        </span>
      </div>
    );
  }, [mobileOpen, showSidebar]);

  useEffect(() => {
    // Register header actions (only when sidebar is enabled)
    setActions(headerActions);
    return () => {
      setActions(null);
    };
  }, [headerActions, setActions]);

  useEffect(() => {
    try {
      window.localStorage.setItem('accounting_sidebar_collapsed', desktopCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [desktopCollapsed]);

  useEffect(() => {
    // Persist pin state across route navigation to avoid peek flicker
    try {
      window.sessionStorage.setItem(
        'accounting_sidebar_peek_pinned_until',
        String(desktopPeekPinnedUntil || 0)
      );
    } catch {
      // ignore
    }
  }, [desktopPeekPinnedUntil]);

  const handleToggleDesktopCollapsed = () => {
    setDesktopCollapsed((v) => {
      const next = !v;

      // If collapsing while mouse is over the sidebar, it would instantly "peek" open again.
      // Force-close peek and ignore hover briefly so the user sees it collapse immediately.
      if (next) {
        setDesktopPeek(false);
        setDesktopPeekPinnedUntil(0);
        setDesktopHoverLockUntil(Date.now() + 400);
        try {
          window.sessionStorage.setItem('accounting_sidebar_peek_pinned_until', '0');
        } catch {
          // ignore
        }
      }

      return next;
    });
  };

  const isPeekPinned = desktopPeekPinnedUntil > Date.now();

  useEffect(() => {
    if (!desktopPeekPinnedUntil) return;
    const ms = Math.max(0, desktopPeekPinnedUntil - Date.now());
    if (ms === 0) return;

    const t = window.setTimeout(() => {
      // If the user is still hovering, onMouseLeave will control it.
      // If not hovering, allow it to collapse naturally.
      setDesktopPeekPinnedUntil(0);
    }, ms);

    return () => window.clearTimeout(t);
  }, [desktopPeekPinnedUntil]);

  useEffect(() => {
    // While pinned, ensure peek stays open to avoid flicker on route change.
    if (isPeekPinned) {
      setDesktopPeek(true);
    }
  }, [isPeekPinned]);

  const handleDesktopMouseLeave = () => {
    if (isPeekPinned) return;
    setDesktopPeek(false);
  };

  const handleDesktopItemSelect = () => {
    // Keep peek open briefly during route transition so it doesn't collapse on navigation
    // (helps when clicking a menu item while sidebar is expanded-on-hover)
    const until = Date.now() + 900;

    // Persist immediately so the next route mount starts in the same visual state.
    try {
      window.sessionStorage.setItem('accounting_sidebar_peek_pinned_until', String(until));
    } catch {
      // ignore
    }

    // Force synchronous update before navigation happens.
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
          {/* Desktop Sidebar - hidden on mobile */}
          {!desktopCollapsed ? (
            <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-background transition-[width] duration-200 ease-in-out">
              <AccountingSidebar
                collapsed={false}
                onToggleCollapsed={handleToggleDesktopCollapsed}
              />
            </aside>
          ) : (
            // Collapsed sidebar expands inline on hover (pushes content like normal open)
            <aside
              className={cn(
                'hidden lg:flex lg:flex-col lg:border-r lg:bg-background overflow-hidden transition-[width] duration-200 ease-in-out',
                desktopPeek ? 'lg:w-64' : 'lg:w-16'
              )}
              onMouseEnter={() => {
                if (Date.now() < desktopHoverLockUntil) return;
                setDesktopPeek(true);
              }}
              onMouseLeave={handleDesktopMouseLeave}
            >
              <AccountingSidebar
                collapsed={!desktopPeek}
                onToggleCollapsed={handleToggleDesktopCollapsed}
                onItemSelect={handleDesktopItemSelect}
              />
            </aside>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Page Content */}
            <main className="flex-1">{children}</main>
          </div>
        </>
      )}
    </div>
  );
};

export default AccountingLayout;
