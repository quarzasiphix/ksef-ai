import React, { useEffect } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { StorageRepositoryPage } from './StorageRepositoryPage';
import type { StorageFolderTreeNode } from '../types/storage';
import { useFileWorkspace } from '../hooks/useFileWorkspace';

interface DocumentsOutletContext {
  selectedStorageFolderId?: string;
  setSelectedStorageFolderId: (id: string) => void;
  storageFolders: StorageFolderTreeNode[];
  setDraggedFileId: (id: string | null) => void;
  handleFileDropOnFolder: (folderId: string) => void;
  draggedFileId: string | null;
}

const DocumentRepository: React.FC = () => {
  const { folderId, fileId } = useParams<{ folderId?: string; fileId?: string }>();
  const { 
    selectedStorageFolderId, 
    setSelectedStorageFolderId, 
    storageFolders,
  } = useOutletContext<DocumentsOutletContext>();
  
  const { openFileById } = useFileWorkspace();

  // Sync URL params with state
  useEffect(() => {
    if (folderId && folderId !== selectedStorageFolderId) {
      setSelectedStorageFolderId(folderId);
    }
  }, [folderId, selectedStorageFolderId, setSelectedStorageFolderId]);

  // Open file in workspace tab when fileId is in URL
  useEffect(() => {
    if (fileId) {
      openFileById(fileId);
    }
  }, [fileId, openFileById]);

  const handleFileOpen = (id: string) => {
    openFileById(id);
  };

  return (
    <StorageRepositoryPage
      storageFolders={storageFolders}
      selectedFolderId={selectedStorageFolderId}
      onFolderSelect={setSelectedStorageFolderId}
      onFileOpen={handleFileOpen}
    />
  );
};

export default DocumentRepository;
