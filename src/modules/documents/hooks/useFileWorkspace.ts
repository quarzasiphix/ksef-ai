import { useCallback } from 'react';
import { useWorkspaceTabs } from '@/shared/context/WorkspaceTabsContext';
import type { StorageFile } from '../types/storage';

export const useFileWorkspace = () => {
  const { openTab } = useWorkspaceTabs();

  const openFileInTab = useCallback((file: StorageFile) => {
    openTab({
      type: 'document',
      title: file.file_name,
      path: `/documents/repository/file/${file.id}`,
      entityId: file.id,
      entityType: 'storage_file',
      icon: undefined,
    });
  }, [openTab]);

  const openFileById = useCallback((fileId: string, fileName?: string) => {
    openTab({
      type: 'document',
      title: fileName || 'Plik',
      path: `/documents/repository/file/${fileId}`,
      entityId: fileId,
      entityType: 'storage_file',
      icon: undefined,
    });
  }, [openTab]);

  return {
    openFileInTab,
    openFileById,
  };
};
