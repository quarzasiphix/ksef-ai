import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

/**
 * Hook to fetch storage files with attachment statistics
 * Uses storage_files_with_attachment_count view for real-time link status
 */
export const useStorageFilesWithStats = (folderId?: string) => {
  const { selectedProfileId } = useBusinessProfile();

  return useQuery({
    queryKey: ['storage-files-with-stats', selectedProfileId, folderId],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      let query = supabase
        .from('storage_files_with_attachment_count')
        .select('*')
        .eq('business_profile_id', selectedProfileId);

      if (folderId) {
        query = query.eq('storage_folder_id', folderId);
      }

      const { data, error } = await query.order('uploaded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProfileId,
  });
};
