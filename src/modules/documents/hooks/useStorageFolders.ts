import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StorageService } from '@/shared/services/storageService';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useDepartment } from '@/shared/context/DepartmentContext';
import type { CreateStorageFolderInput, StorageFolderTreeNode } from '../types/storage';

export const useStorageFolders = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const currentProfile = profiles.find(p => p.id === selectedProfileId);
  const { selectedDepartment } = useDepartment();
  const queryClient = useQueryClient();

  const {
    data: folders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['storage-folders', currentProfile?.id, selectedDepartment?.id],
    queryFn: () => StorageService.getFolderTree(currentProfile!.id, selectedDepartment?.id),
    enabled: !!currentProfile?.id,
  });

  const createFolderMutation = useMutation({
    mutationFn: (input: CreateStorageFolderInput) => StorageService.createFolder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-folders', currentProfile?.id] });
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      StorageService.updateFolder(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-folders', currentProfile?.id] });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => StorageService.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-folders', currentProfile?.id] });
    },
  });

  return {
    folders,
    isLoading,
    error,
    createFolder: createFolderMutation.mutate,
    createFolderMutation,
    updateFolder: updateFolderMutation.mutate,
    updateFolderMutation,
    deleteFolder: deleteFolderMutation.mutate,
    deleteFolderMutation,
    isCreating: createFolderMutation.isPending,
    isUpdating: updateFolderMutation.isPending,
    isDeleting: deleteFolderMutation.isPending,
  };
};
