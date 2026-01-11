import React, { useState, useEffect } from 'react';
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

interface StorageRepositoryPageProps {
  storageFolders?: StorageFolderTreeNode[];
  selectedFolderId?: string;
  onFolderSelect?: (folderId: string) => void;
  onCreateFolder?: () => void;
  onFileOpen?: (fileId: string) => void;
}

export const StorageRepositoryPage: React.FC<StorageRepositoryPageProps> = ({
  storageFolders: externalFolders,
  selectedFolderId: externalSelectedFolderId,
  onFolderSelect: externalOnFolderSelect,
  onCreateFolder: externalOnCreateFolder,
  onFileOpen: externalOnFileOpen,
}) => {
  const [internalSelectedFolderId, setInternalSelectedFolderId] = useState<string | undefined>();
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>();
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [uploadFileDialogOpen, setUploadFileDialogOpen] = useState(false);
  const [attachFileDialogOpen, setAttachFileDialogOpen] = useState(false);
  const [fileToAttach, setFileToAttach] = useState<string | undefined>();
  const [fileViewUrl, setFileViewUrl] = useState<string | undefined>();
  const [isLoadingFileUrl, setIsLoadingFileUrl] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(true);
  
  const selectedFolderId = externalSelectedFolderId ?? internalSelectedFolderId;
  const setSelectedFolderId = externalOnFolderSelect ?? setInternalSelectedFolderId;
  
  // Fetch all files (storage + accounting documents) for selected folder
  const { data: realFiles = [] } = useAllDocuments(selectedFolderId);
  const { departments } = useDepartments();

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
          setFileViewUrl(url);
          setIsLoadingFileUrl(false);
        })
        .catch(err => {
          console.error('Failed to get secure file URL:', err);
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
    setDraggedFileId(fileId);
  };

  const handleFileDragEnd = () => {
    setDraggedFileId(null);
  };

  const handleFileOpen = (fileId: string) => {
    if (externalOnFileOpen) {
      externalOnFileOpen(fileId);
    } else {
      setSelectedFileId(fileId);
      setShowFileViewer(true);
    }
  };

  const toggleFileViewer = () => {
    setShowFileViewer(!showFileViewer);
  };

  return (
    <div className="h-full">
      <ResizablePanelGroup direction="horizontal">
        {/* File Browser */}
        <ResizablePanel defaultSize={selectedFileId && showFileViewer ? 60 : 100} minSize={40}>
          <FileBrowser
            files={realFiles}
            currentFolderId={selectedFolderId}
            currentFolderName={selectedFolder?.name}
            currentFolderPath={selectedFolder?.path}
            currentDepartmentId={selectedFolder?.department_id}
            onFileSelect={setSelectedFileId}
            onUploadFile={() => handleUploadFile()}
            onCreateFolder={handleCreateFolder}
            onFileDragStart={handleFileDragStart}
            onFileDragEnd={handleFileDragEnd}
            onFileOpen={handleFileOpen}
            onAttachFile={handleAttachFile}
            onToggleFileViewer={toggleFileViewer}
            showFileViewer={showFileViewer}
            selectedFileId={selectedFileId}
            departmentColors={departmentColors}
            departmentNames={departmentNames}
            className="h-full"
          />
        </ResizablePanel>

        {/* File Viewer */}
        {selectedFileId && selectedFile && showFileViewer && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full p-4 overflow-auto">
                {isLoadingFileUrl ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Ładowanie pliku...</p>
                    </div>
                  </div>
                ) : fileViewUrl ? (
                  <FileViewer
                    fileUrl={fileViewUrl}
                    fileName={selectedFile.file_name}
                    mimeType={selectedFile.mime_type}
                    fileSize={selectedFile.file_size}
                  />
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
