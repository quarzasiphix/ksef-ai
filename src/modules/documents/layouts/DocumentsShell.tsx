/**
 * Documents Shell Layout
 * 
 * Persistent layout for all /documents/* routes
 * Provides section-aware sidebar that never disappears
 */

import React, { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Menu } from 'lucide-react';
import DocumentsSidebar from '../components/DocumentsSidebar';
import { getSectionFromRoute, type DocumentSection } from '../types/sections';

const DocumentsShell: React.FC = () => {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const currentSection = getSectionFromRoute(location.pathname);

  const activeFolderId = useMemo(() => {
    const match = location.pathname.match(/folders\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  return (
    <div className="relative flex gap-6">
      <div className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border bg-background">
          <DocumentsSidebar
            currentSection={currentSection}
            currentFolderId={activeFolderId}
          />
        </div>
      </div>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed top-24 right-4 z-40 shadow-md"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <DocumentsSidebar
            currentSection={currentSection}
            currentFolderId={activeFolderId}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default DocumentsShell;
