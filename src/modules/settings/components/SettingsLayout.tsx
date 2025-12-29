import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/shared/ui/sheet';
import { Menu } from 'lucide-react';
import SettingsSidebar from './SettingsSidebar';
import { usePageHeaderActions } from '@/shared/context/PageHeaderActionsContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const COLLAPSED_KEY = 'settings_sidebar_collapsed';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingMobileHref, setPendingMobileHref] = useState<string | null>(null);
  const { setActions } = usePageHeaderActions();
  const navigate = useNavigate();
  const location = useLocation();

  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [desktopPeekPinnedUntil, setDesktopPeekPinnedUntil] = useState<number>(() => {
    try {
      const raw = window.sessionStorage.getItem('settings_sidebar_peek_pinned_until');
      const v = raw ? Number(raw) : 0;
      return Number.isFinite(v) ? v : 0;
    } catch {
      return 0;
    }
  });
  const [desktopPeek, setDesktopPeek] = useState<boolean>(() => {
    try {
      const raw = window.sessionStorage.getItem('settings_sidebar_peek_pinned_until');
      const v = raw ? Number(raw) : 0;
      return Number.isFinite(v) ? v > Date.now() : false;
    } catch {
      return false;
    }
  });
  const [desktopHoverLockUntil, setDesktopHoverLockUntil] = useState<number>(0);

  const handleMobileNavigateTo = (href: string) => {
    setPendingMobileHref(href);
    setMobileOpen(false);
  };

  useEffect(() => {
    if (!mobileOpen && pendingMobileHref) {
      navigate(pendingMobileHref);
      setPendingMobileHref(null);
    }
  }, [mobileOpen, navigate, pendingMobileHref]);

  const headerActions = useMemo(() => {
    return (
      <div className="lg:hidden flex items-center gap-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="px-4 pt-4 pb-2 text-left">
              <SheetTitle>Menu ustawień</SheetTitle>
              <SheetDescription>Nawigacja po ustawieniach</SheetDescription>
            </SheetHeader>
            <SettingsSidebar
              onNavigateTo={handleMobileNavigateTo}
            />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-medium">Ustawienia</span>
      </div>
    );
  }, [handleMobileNavigateTo, mobileOpen]);

  useEffect(() => {
    setActions(headerActions);
    return () => {
      setActions(null);
    };
  }, [headerActions, setActions]);

  useEffect(() => {
    if (desktopPeek && Date.now() > desktopPeekPinnedUntil) {
      setDesktopPeek(false);
    }
  }, [location.pathname, desktopPeek, desktopPeekPinnedUntil]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        'settings_sidebar_peek_pinned_until',
        String(desktopPeekPinnedUntil || 0)
      );
    } catch {
      // ignore
    }
  }, [desktopPeekPinnedUntil]);

  const handleToggleDesktopCollapsed = () => {
    const next = !desktopCollapsed;
    setDesktopCollapsed(next);

    try {
      window.localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {
      // ignore
    }

    if (next) {
      setDesktopPeek(false);
      setDesktopPeekPinnedUntil(0);
      setDesktopHoverLockUntil(Date.now() + 400);
      try {
        window.sessionStorage.setItem('settings_sidebar_peek_pinned_until', '0');
      } catch {
        // ignore
      }
    }
  };

  const handleDesktopMouseEnter = () => {
    if (!desktopCollapsed) return;
    if (Date.now() < desktopHoverLockUntil) return;
    setDesktopPeek(true);
  };

  const handleDesktopMouseLeave = () => {
    if (!desktopCollapsed) return;
    if (Date.now() < desktopPeekPinnedUntil) return;
    setDesktopPeek(false);
  };

  const handleDesktopItemSelect = () => {
    const until = Date.now() + 900;

    try {
      window.sessionStorage.setItem('settings_sidebar_peek_pinned_until', String(until));
    } catch {
      // ignore
    }

    setDesktopPeekPinnedUntil(until);
    setDesktopPeek(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Desktop Sidebar */}
      {!desktopCollapsed ? (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:bg-background transition-[width] duration-200 ease-in-out lg:h-full overflow-hidden">
          <SettingsSidebar
            collapsed={false}
            onToggleCollapsed={handleToggleDesktopCollapsed}
          />
        </aside>
      ) : (
        <aside
          className={cn(
            'hidden lg:flex lg:flex-col lg:border-r lg:bg-background overflow-hidden transition-[width] duration-200 ease-in-out lg:h-full',
            desktopPeek ? 'w-64' : 'w-16'
          )}
          onMouseEnter={handleDesktopMouseEnter}
          onMouseLeave={handleDesktopMouseLeave}
        >
          <SettingsSidebar
            collapsed={!desktopPeek}
            onToggleCollapsed={handleToggleDesktopCollapsed}
            onItemSelect={handleDesktopItemSelect}
          />
        </aside>
      )}

      {/* Main Content - No padding, full width */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto px-4 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SettingsLayout;
