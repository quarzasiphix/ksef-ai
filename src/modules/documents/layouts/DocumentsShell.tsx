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
import { getSectionFromRoute } from '../types/sections';
import { useStorageFolders } from '../hooks/useStorageFolders';
import { CreateFolderDialog } from '../components/dialogs/CreateFolderDialog';

const DocumentsShell: React.FC = () => {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedStorageFolderId, setSelectedStorageFolderId] = useState<string | undefined>();
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const currentSection = getSectionFromRoute(location.pathname);
  
  // Fetch storage folders from Supabase
  const { folders: storageFolders, isLoading: isLoadingFolders } = useStorageFolders();

  const activeFolderId = useMemo(() => {
    const match = location.pathname.match(/folders\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const handleCreateStorageFolder = () => {
    setCreateFolderDialogOpen(true);
  };

  const handleFileDropOnFolder = (folderId: string) => {
    if (!draggedFileId) return;
    console.log('Move file', draggedFileId, 'to folder', folderId);
    setDraggedFileId(null);
  };

  return (
    <div className="relative flex gap-6">
      <div className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r border-border bg-background">
          <DocumentsSidebar
            currentSection={currentSection}
            currentFolderId={activeFolderId}
            storageFolders={storageFolders || []}
            selectedStorageFolderId={selectedStorageFolderId}
            onStorageFolderSelect={setSelectedStorageFolderId}
            onCreateStorageFolder={handleCreateStorageFolder}
            draggedFileId={draggedFileId ?? undefined}
            onFileDropOnFolder={handleFileDropOnFolder}
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
            storageFolders={storageFolders || []}
            selectedStorageFolderId={selectedStorageFolderId}
            onStorageFolderSelect={setSelectedStorageFolderId}
            onCreateStorageFolder={handleCreateStorageFolder}
            draggedFileId={draggedFileId ?? undefined}
            onFileDropOnFolder={handleFileDropOnFolder}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0">
        <Outlet context={{
          selectedStorageFolderId,
          setSelectedStorageFolderId,
          storageFolders: storageFolders || [],
          setDraggedFileId,
          handleFileDropOnFolder,
          draggedFileId,
        }} />
      </main>

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
      />
    </div>
  );
};

export default DocumentsShell;
