import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StorageService } from '@/shared/services/storageService';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import type { UploadFileInput } from '../types/storage';

export const useStorageFiles = (folderId?: string) => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const currentProfile = profiles.find(p => p.id === selectedProfileId);
  const queryClient = useQueryClient();

  const {
    data: files = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['storage-files', folderId],
    queryFn: () => StorageService.getFilesInFolder(folderId!),
    enabled: !!folderId,
  });

  const uploadFileMutation = useMutation({
    mutationFn: (input: UploadFileInput) => StorageService.uploadFile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-files', folderId] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => StorageService.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-files', folderId] });
    },
  });

  const moveFileMutation = useMutation({
    mutationFn: ({ fileId, targetFolderId }: { fileId: string; targetFolderId: string }) =>
      StorageService.moveFile(fileId, targetFolderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage-files'] });
    },
  });

  return {
    files,
    isLoading,
    error,
    uploadFile: uploadFileMutation.mutate,
    deleteFile: deleteFileMutation.mutate,
    moveFile: moveFileMutation.mutate,
    isUploading: uploadFileMutation.isPending,
    isDeleting: deleteFileMutation.isPending,
    isMoving: moveFileMutation.isPending,
  };
};
