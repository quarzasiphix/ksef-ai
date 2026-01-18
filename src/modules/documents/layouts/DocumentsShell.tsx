/**
 * Documents Shell Layout
 * 
 * Persistent layout for all /documents/* routes
 * Provides section-aware sidebar that never disappears
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Menu } from 'lucide-react';
import DocumentsSidebar from '../components/DocumentsSidebar';
import { getSectionFromRoute } from '../types/sections';
import { useStorageFolders } from '../hooks/useStorageFolders';
import { CreateFolderDialog } from '../components/dialogs/CreateFolderDialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/ui/resizable';

const DocumentsShell: React.FC = () => {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedStorageFolderId, setSelectedStorageFolderId] = useState<string | undefined>();
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const currentSection = getSectionFromRoute(location.pathname);
  
  // Fetch storage folders from Supabase
  const { folders: storageFolders, isLoading: isLoadingFolders, updateFolder, deleteFolder } = useStorageFolders();

  const activeFolderId = useMemo(() => {
    const match = location.pathname.match(/folders\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const handleCreateStorageFolder = useCallback(() => {
    setCreateFolderDialogOpen(true);
  }, []);

  const handleFileDropOnFolder = useCallback(async (folderId: string) => {
    if (!draggedFileId) return;

    try {
      console.log(`Moving file ${draggedFileId} to folder ${folderId}`);
      
      // Import StorageService dynamically to avoid circular dependencies
      const { StorageService } = await import('@/shared/services/storageService');
      
      // Move the file
      await StorageService.moveFile(draggedFileId, folderId);
      
      // Clear the dragged file state
      setDraggedFileId(null);
      
      // Show success message
      console.log('File moved successfully');
    } catch (error) {
      console.error('Failed to move file:', error);
      // Show error message
    }
  }, [draggedFileId, setDraggedFileId]);

  const handleRenameStorageFolder = useCallback(async (folderId: string) => {
    try {
      // Get current folder data
      const folder = storageFolders?.find(f => f.id === folderId);
      if (!folder) return;

      const newName = prompt('Nowa nazwa folderu:', folder.name);
      if (!newName || newName === folder.name) return;

      updateFolder({ id: folderId, updates: { name: newName } });
      console.log('Folder renamed successfully');
    } catch (error) {
      console.error('Failed to rename folder:', error);
    }
  }, [storageFolders, updateFolder]);

  const handleDeleteStorageFolder = useCallback(async (folderId: string) => {
    try {
      // Get current folder data
      const folder = storageFolders?.find(f => f.id === folderId);
      if (!folder) return;

      const confirmed = confirm(`Czy na pewno chcesz usunąć folder "${folder.name}"? Spowoduje to również usunięcie wszystkich plików wewnątrz.`);
      if (!confirmed) return;

      deleteFolder(folderId);
      console.log('Folder deleted successfully');
      
      // Navigate away if we were in the deleted folder
      if (selectedStorageFolderId === folderId) {
        setSelectedStorageFolderId(null);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }, [storageFolders, selectedStorageFolderId, setSelectedStorageFolderId, deleteFolder]);

  const handleMoveStorageFolder = useCallback(async (folderId: string) => {
    // For now, just show a message - move dialog would need folder selection
    alert('Funkcja przenoszenia folderów będzie dostępna w przyszłej wersji');
  }, []);

  const handleCopyStorageFolder = useCallback(async (folderId: string) => {
    // Copy folder functionality not yet implemented
    alert('Funkcja kopiowania folderów będzie dostępna w przyszłej wersji');
  }, []);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      <ResizablePanelGroup direction="horizontal">
        {/* Resizable Sidebar */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="hidden lg:block">
          <div className="sticky top-0 h-full overflow-y-auto border-r border-border bg-background">
            <DocumentsSidebar
              currentSection={currentSection}
              currentFolderId={activeFolderId}
              storageFolders={storageFolders || []}
              selectedStorageFolderId={selectedStorageFolderId}
              onStorageFolderSelect={setSelectedStorageFolderId}
              onCreateStorageFolder={handleCreateStorageFolder}
              onRenameStorageFolder={handleRenameStorageFolder}
              onDeleteStorageFolder={handleDeleteStorageFolder}
              onMoveStorageFolder={handleMoveStorageFolder}
              onCopyStorageFolder={handleCopyStorageFolder}
              draggedFileId={draggedFileId ?? undefined}
              onFileDropOnFolder={handleFileDropOnFolder}
            />
          </div>
        </ResizablePanel>

        {/* Resizable Handle */}
        <ResizableHandle className="hidden lg:block hover:bg-accent/50 transition-colors" />

        {/* Main Content Panel */}
        <ResizablePanel defaultSize={80} minSize={70}>
          <main className="flex-1 min-w-0 h-full">
            <Outlet context={{
              selectedStorageFolderId,
              setSelectedStorageFolderId,
              storageFolders: storageFolders || [],
              setDraggedFileId,
              handleFileDropOnFolder,
              draggedFileId,
              mobileSidebarOpen,
              setMobileSidebarOpen,
            }} />
          </main>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Mobile Sidebar */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <DocumentsSidebar
            currentSection={currentSection}
            currentFolderId={activeFolderId}
            storageFolders={storageFolders || []}
            selectedStorageFolderId={selectedStorageFolderId}
            onStorageFolderSelect={setSelectedStorageFolderId}
            onCreateStorageFolder={handleCreateStorageFolder}
            onRenameStorageFolder={handleRenameStorageFolder}
            onDeleteStorageFolder={handleDeleteStorageFolder}
            onMoveStorageFolder={handleMoveStorageFolder}
            onCopyStorageFolder={handleCopyStorageFolder}
            draggedFileId={draggedFileId ?? undefined}
            onFileDropOnFolder={handleFileDropOnFolder}
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
      />
    </div>
  );
};

export default DocumentsShell;
