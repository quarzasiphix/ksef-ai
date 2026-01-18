import React, { useState, useContext, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { FileBrowser } from '../components/storage/FileBrowser';
import { FileViewer } from '../components/viewers/FileViewer';
import type { StorageFolderTreeNode, StorageFile } from '../types/storage';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/shared/ui/resizable';
import { UploadFileDialog } from '../components/dialogs/UploadFileDialog';
import { useAllDocuments, getAccountingVirtualFolders } from '../hooks/useAllDocuments';
import { StorageService } from '@/shared/services/storageService';
import { DocumentUrlService } from '@/shared/services/documentUrlService';
import { useDepartments } from '../hooks/useDepartments';
import { AttachFileDialog } from '@/modules/decisions/components/AttachFileDialog';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface StorageRepositoryPageProps {
  storageFolders?: StorageFolderTreeNode[];
  selectedFolderId?: string;
  onFolderSelect?: (folderId: string) => void;
  onCreateFolder?: () => void;
  onFileOpen?: (fileId: string) => void;
  setDraggedFileId?: (fileId: string | null) => void;
  onFileDropOnFolder?: (folderId: string) => void;
}

export const StorageRepositoryPage: React.FC<StorageRepositoryPageProps> = ({
  storageFolders: externalFolders,
  selectedFolderId: externalSelectedFolderId,
  onFolderSelect: externalOnFolderSelect,
  onCreateFolder: externalOnCreateFolder,
  onFileOpen: externalOnFileOpen,
  setDraggedFileId: externalSetDraggedFileId,
  onFileDropOnFolder: externalOnFileDropOnFolder,
}) => {
  const [internalSelectedFolderId, setInternalSelectedFolderId] = useState<string | undefined>();
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>();
  const [uploadFileDialogOpen, setUploadFileDialogOpen] = useState(false);
  const [attachFileDialogOpen, setAttachFileDialogOpen] = useState(false);
  const [fileToAttach, setFileToAttach] = useState<string | undefined>();
  const [fileViewUrl, setFileViewUrl] = useState<string | undefined>();
  const [isLoadingFileUrl, setIsLoadingFileUrl] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key
  const [isUploading, setIsUploading] = useState(false); // Track upload state
  // Get mobile sidebar state from DocumentsShell context
  const context = useOutletContext<{
    selectedStorageFolderId?: string;
    setSelectedStorageFolderId?: (id: string | undefined) => void;
    storageFolders?: StorageFolderTreeNode[];
    setDraggedFileId?: (id: string | null) => void;
    onFileDropOnFolder?: (folderId: string) => void;
    draggedFileId?: string | null;
    mobileSidebarOpen: boolean;
    setMobileSidebarOpen: (open: boolean) => void;
  }>();
  
  const { mobileSidebarOpen, setMobileSidebarOpen } = context || {};
  
  const selectedFolderId = externalSelectedFolderId ?? internalSelectedFolderId;
  const setSelectedFolderId = externalOnFolderSelect ?? setInternalSelectedFolderId;
  
  // Fetch all files (storage + accounting documents) for selected folder
  const { data: realFiles = [], refetch } = useAllDocuments(selectedFolderId);
  const { departments } = useDepartments();

  // Add refresh key to trigger refetch
  React.useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  // Build department maps for file browser
  const departmentColors = new Map<string, string>();
  const departmentNames = new Map<string, string>();
  departments.forEach(dept => {
    departmentColors.set(dept.id, dept.color || '#6b7280');
    departmentNames.set(dept.id, dept.name);
  });

  // Fetch file URL when file is selected - using secure edge function
  useEffect(() => {
    if (selectedFileId) {
      setIsLoadingFileUrl(true);
      
      const selectedFile = realFiles.find(f => f.id === selectedFileId);
      
      if (!selectedFile) {
        setFileViewUrl(undefined);
        setIsLoadingFileUrl(false);
        return;
      }

      // Use secure DocumentUrlService for all files (accounting and storage)
      const source = selectedFile.source === 'accounting' ? 'accounting' : 'storage';
      
      DocumentUrlService.getViewUrl(selectedFileId, source)
        .then(url => {
          console.log('Secure file URL fetched:', url);
          console.log('File details:', { selectedFileId, source, fileName: selectedFile?.file_name });
          setFileViewUrl(url);
          setIsLoadingFileUrl(false);
        })
        .catch(err => {
          console.error('Failed to get secure file URL:', err);
          console.error('Error details:', { selectedFileId, source, fileName: selectedFile?.file_name, error: err });
          setFileViewUrl(undefined);
          setIsLoadingFileUrl(false);
        });
    } else {
      setFileViewUrl(undefined);
      setIsLoadingFileUrl(false);
    }
  }, [selectedFileId, realFiles]);

  // Get virtual folders for accounting documents
  const virtualFolders = getAccountingVirtualFolders();
  
  // Combine real and virtual folders
  const allFolders = [
    ...(externalFolders || []),
    ...virtualFolders
  ];

  // Use only real data - no mock fallbacks
  const selectedFile = realFiles.find(f => f.id === selectedFileId);
  const selectedFolder = allFolders.find(f => f.id === selectedFolderId);
  
  const storageFolders = allFolders;

  const handleCreateFolder = () => {
    if (externalOnCreateFolder) {
      externalOnCreateFolder();
    } else {
      console.log('Create folder in:', selectedFolderId);
      // TODO: Implement folder creation
    }
  };

  const handleUploadFile = (folderId?: string) => {
    if (selectedFolderId) {
      setUploadFileDialogOpen(true);
    }
  };

  const handleAttachFile = (fileId: string) => {
    setFileToAttach(fileId);
    setAttachFileDialogOpen(true);
  };

  const handleFileDragStart = (fileId: string) => {
    externalSetDraggedFileId?.(fileId);
  };

  const handleFileDragEnd = () => {
    externalSetDraggedFileId?.(null);
  };

  const handleFileOpen = (fileId: string) => {
    if (externalOnFileOpen) {
      externalOnFileOpen(fileId);
    } else {
      setSelectedFileId(fileId);
      setShowFileViewer(true);
    }
  };

  const handleFileRename = async (fileId: string) => {
    try {
      const file = realFiles.find(f => f.id === fileId);
      if (!file) return;

      const newName = prompt('Nowa nazwa pliku:', file.file_name);
      if (!newName || newName === file.file_name) return;

      // Update file name in database
      const { error } = await supabase
        .from('storage_files')
        .update({ file_name: newName })
        .eq('id', fileId);

      if (error) throw error;
      
      // Refresh files list
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to rename file:', error);
      alert('Nie udało się zmienić nazwy pliku');
    }
  };

  const handleFileMove = async (fileId: string) => {
    try {
      // For now, just show a message - move dialog would need folder selection
      alert('Funkcja przenoszenia plików będzie dostępna w przyszłej wersji');
    } catch (error) {
      console.error('Failed to move file:', error);
    }
  };

  const handleFileCopy = async (fileId: string) => {
    try {
      const file = realFiles.find(f => f.id === fileId);
      if (!file) return;

      // Create a copy with new name
      const copyName = prompt('Nazwa kopii:', `${file.file_name}_kopia`);
      if (!copyName) return;

      await StorageService.copyFile(fileId, undefined, copyName);
      
      // Refresh files list
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to copy file:', error);
      alert('Nie udało się skopiować pliku');
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const file = realFiles.find(f => f.id === fileId);
      if (!file) return;

      const confirmed = confirm(`Czy na pewno chcesz usunąć plik "${file.file_name}"?`);
      if (!confirmed) return;

      await StorageService.deleteFile(fileId);
      
      // Clear selection and refresh
      setSelectedFileId(undefined);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Nie udało się usunąć pliku');
    }
  };

  const toggleFileViewer = () => {
    setShowFileViewer(!showFileViewer);
  };

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  return (
    <div className="h-full">
      <ResizablePanelGroup direction="horizontal">
        {/* File Browser - hidden on mobile when file is selected */}
        <ResizablePanel 
          defaultSize={selectedFileId && showFileViewer ? 60 : 100} 
          minSize={40}
          className={selectedFileId && showFileViewer ? 'hidden lg:block' : ''}
        >
          <FileBrowser
            files={realFiles}
            currentFolderId={selectedFolderId}
            onFileSelect={setSelectedFileId}
            onUploadFile={() => {
              handleUploadFile();
              setIsUploading(true);
            }}
            onCreateFolder={handleCreateFolder}
            onFileDragStart={handleFileDragStart}
            onFileDragEnd={handleFileDragEnd}
            onFileOpen={handleFileOpen}
            onFileRename={handleFileRename}
            onFileMove={handleFileMove}
            onFileCopy={handleFileCopy}
            onFileDelete={handleFileDelete}
            onAttachFile={handleAttachFile}
            onToggleFileViewer={toggleFileViewer}
            showFileViewer={showFileViewer}
            selectedFileId={selectedFileId}
            departmentColors={departmentColors}
            departmentNames={departmentNames}
            isUploading={isUploading}
            onToggleMobileSidebar={toggleMobileSidebar}
          />
        </ResizablePanel>

        {/* File Viewer - fullscreen on mobile, side panel on desktop */}
        {selectedFileId && selectedFile && showFileViewer && (
          <>
            <ResizableHandle className="hidden lg:block" />
            <ResizablePanel 
              defaultSize={40} 
              minSize={30}
              className="fixed inset-0 z-50 lg:relative lg:z-auto transition-all duration-300 ease-in-out transform"
              style={{
                transform: showFileViewer ? 'translateX(0)' : 'translateX(100%)',
                opacity: showFileViewer ? '1' : '0'
              }}
            >
              <div className="h-full overflow-auto bg-background">
                {isLoadingFileUrl ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Ładowanie pliku...</p>
                    </div>
                  </div>
                ) : fileViewUrl ? (
                  <div className="animate-in fade-in duration-300">
                    <FileViewer
                      fileUrl={fileViewUrl}
                      fileName={selectedFile.file_name}
                      mimeType={selectedFile.mime_type}
                      fileSize={selectedFile.file_size}
                      onClose={() => {
                        setSelectedFileId(undefined);
                        setShowFileViewer(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">Nie udało się załadować pliku</p>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {selectedFolderId && (
        <UploadFileDialog
          open={uploadFileDialogOpen}
          onOpenChange={setUploadFileDialogOpen}
          folderId={selectedFolderId}
          onUploadComplete={() => {
            // Refresh the file list after upload
            setRefreshKey(prev => prev + 1);
            // Reset upload state
            setIsUploading(false);
          }}
        />
      )}

      {fileToAttach && (
        <AttachFileDialog
          open={attachFileDialogOpen}
          onOpenChange={setAttachFileDialogOpen}
          entityType="document"
          entityId={fileToAttach}
          allowedRoles={['PRIMARY', 'SUPPORTING', 'SCAN', 'SIGNED', 'OTHER']}
        />
      )}
    </div>
  );
};
