import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import type { Department } from '@/shared/types';

/**
 * Hook to fetch all departments for the current business profile
 */
export const useDepartments = () => {
  const { selectedProfileId, profiles } = useBusinessProfile();
  const currentProfile = profiles.find(p => p.id === selectedProfileId);

  const {
    data: departments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['departments', currentProfile?.id],
    queryFn: async () => {
      if (!currentProfile?.id) return [];

      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('business_profile_id', currentProfile.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!currentProfile?.id,
  });

  return {
    departments,
    isLoading,
    error,
  };
};
