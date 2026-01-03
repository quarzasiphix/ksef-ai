import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';

/**
 * Hook to fetch real document statistics from database views
 * No mock data - shows actual counts or zero
 */
export const useDocumentStats = () => {
  const { selectedProfileId } = useBusinessProfile();

  return useQuery({
    queryKey: ['document-stats', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) {
        return {
          attachments: {
            total: 0,
            unlinked: 0,
            requiresAttention: 0,
            linkedEntities: 0,
          },
          decisions: {
            total: 0,
            requiresAttention: 0,
          },
          contracts: {
            total: 0,
          },
          files: {
            total: 0,
          },
        };
      }

      // Fetch attachment counts
      const { count: attachmentCount } = await supabase
        .from('attachments')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', selectedProfileId);

      // Fetch unlinked files count
      const { count: unlinkedCount } = await supabase
        .from('storage_files_unlinked')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', selectedProfileId);

      // Fetch files requiring attention
      const { count: requiresAttentionCount } = await supabase
        .from('storage_files_requiring_attention')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', selectedProfileId);

      // Fetch linked entities count (distinct entity_type, entity_id pairs)
      const { data: attachments } = await supabase
        .from('attachments')
        .select('entity_type, entity_id')
        .eq('business_profile_id', selectedProfileId);

      const linkedEntitiesCount = new Set(
        attachments?.map(a => `${a.entity_type}:${a.entity_id}`) || []
      ).size;

      // Fetch decisions requiring attention
      const { count: decisionsAttentionCount } = await supabase
        .from('decisions_requiring_attention')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', selectedProfileId);

      // Fetch total decisions
      const { count: decisionsCount } = await supabase
        .from('decisions')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', selectedProfileId);

      // Fetch total contracts
      const { count: contractsCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', selectedProfileId);

      // Fetch total storage files
      const { count: filesCount } = await supabase
        .from('storage_files')
        .select('*', { count: 'exact', head: true })
        .eq('business_profile_id', selectedProfileId);

      return {
        attachments: {
          total: attachmentCount || 0,
          unlinked: unlinkedCount || 0,
          requiresAttention: requiresAttentionCount || 0,
          linkedEntities: linkedEntitiesCount,
        },
        decisions: {
          total: decisionsCount || 0,
          requiresAttention: decisionsAttentionCount || 0,
        },
        contracts: {
          total: contractsCount || 0,
        },
        files: {
          total: filesCount || 0,
        },
      };
    },
    enabled: !!selectedProfileId,
  });
};
