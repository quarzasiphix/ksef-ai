import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import type { 
  Attachment, 
  AttachmentWithFile, 
  CreateAttachmentInput, 
  UpdateAttachmentInput,
  AttachmentEntityType 
} from '@/shared/types/attachment';

/**
 * Hook to fetch attachments for a specific entity
 */
export const useAttachments = (entityType: AttachmentEntityType, entityId: string) => {
  const { selectedProfileId } = useBusinessProfile();

  return useQuery({
    queryKey: ['attachments', entityType, entityId, selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId || !entityId) return [];

      const { data, error } = await supabase
        .from('attachments_with_files')
        .select('*')
        .eq('business_profile_id', selectedProfileId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as AttachmentWithFile[];
    },
    enabled: !!selectedProfileId && !!entityId,
  });
};

/**
 * Hook to create a new attachment
 */
export const useCreateAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAttachmentInput) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('attachments')
        .insert({
          ...input,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Attachment;
    },
    onSuccess: (data) => {
      // Invalidate attachments queries for this entity
      queryClient.invalidateQueries({
        queryKey: ['attachments', data.entity_type, data.entity_id],
      });
    },
  });
};

/**
 * Hook to update an attachment
 */
export const useUpdateAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAttachmentInput }) => {
      const { data, error } = await supabase
        .from('attachments')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Attachment;
    },
    onSuccess: (data) => {
      // Invalidate attachments queries for this entity
      queryClient.invalidateQueries({
        queryKey: ['attachments', data.entity_type, data.entity_id],
      });
    },
  });
};

/**
 * Hook to delete an attachment
 */
export const useDeleteAttachment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: { 
      id: string; 
      entityType: AttachmentEntityType; 
      entityId: string;
    }) => {
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, entityType, entityId };
    },
    onSuccess: ({ entityType, entityId }) => {
      // Invalidate attachments queries for this entity
      queryClient.invalidateQueries({
        queryKey: ['attachments', entityType, entityId],
      });
    },
  });
};

/**
 * Hook to check if an entity has a signed decision PDF (for audit readiness)
 */
export const useHasSignedDecisionPDF = (decisionId: string) => {
  const { data: attachments = [] } = useAttachments('decision', decisionId);
  
  return attachments.some(att => att.role === 'DECISION_SIGNED_PDF');
};
