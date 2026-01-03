import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StorageFolder } from '../types/storage';

/**
 * Hook to fetch a single storage folder by ID
 * Used for displaying folder context in dialogs
 */
export const useStorageFolder = (folderId?: string) => {
  return useQuery({
    queryKey: ['storage-folder', folderId],
    queryFn: async () => {
      if (!folderId) return null;

      const { data, error } = await supabase
        .from('storage_folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (error) throw error;
      return data as StorageFolder;
    },
    enabled: !!folderId,
  });
};
