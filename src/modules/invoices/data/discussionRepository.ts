import { supabase } from "../../../integrations/supabase/client";

export interface DiscussionThread {
  id: string;
  invoice_id: string | null;
  business_profile_id: string;
  title: string | null;
  status: 'active' | 'resolved' | 'archived';
  participant_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscussionMessage {
  id: string;
  thread_id: string;
  user_id: string;
  business_profile_id: string;
  message: string;
  message_type: 'text' | 'system' | 'status_change' | 'attachment';
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  is_internal: boolean;
  is_edited: boolean;
  edited_at: string | null;
  reply_to_message_id: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    avatar_url: string;
  };
}

export interface DiscussionParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  business_profile_id: string;
  role: 'owner' | 'participant' | 'viewer';
  last_read_at: string | null;
  unread_count: number;
  notifications_enabled: boolean;
  joined_at: string;
}

/**
 * Get or create a discussion thread for an invoice
 */
export async function getOrCreateThreadForInvoice(
  invoiceId: string,
  businessProfileId: string,
  title?: string
): Promise<DiscussionThread | null> {
  try {
    // First, try to get existing thread
    const { data: existing, error: fetchError } = await supabase
      .from('discussion_threads')
      .select('*')
      .eq('invoice_id', invoiceId)
      .maybeSingle(); // Use maybeSingle() to handle no rows gracefully

    if (existing) {
      return existing;
    }

    // Create new thread if doesn't exist
    const { data: newThread, error: createError } = await supabase
      .from('discussion_threads')
      .insert({
        invoice_id: invoiceId,
        business_profile_id: businessProfileId,
        title: title || `Dyskusja - Faktura`,
        status: 'active',
      })
      .select()
      .single();

    if (createError) throw createError;

    // Add the current user as a participant
    const { data: { user } } = await supabase.auth.getUser();
    if (user && newThread) {
      await supabase
        .from('discussion_participants')
        .insert({
          thread_id: newThread.id,
          user_id: user.id,
          business_profile_id: businessProfileId,
          role: 'owner',
          notifications_enabled: true,
        });
    }

    return newThread;
  } catch (error) {
    console.error('Error getting/creating thread:', error);
    return null;
  }
}

/**
 * Get messages for a thread with user profiles
 */
export async function getThreadMessages(threadId: string): Promise<DiscussionMessage[]> {
  const { data, error } = await supabase
    .from('discussion_messages')
    .select(`
      *,
      business_profile:business_profiles!discussion_messages_business_profile_id_fkey(
        id,
        name,
        user_id
      )
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  // Transform the data to match the expected interface
  return (data || []).map(msg => ({
    ...msg,
    profile: msg.business_profile ? {
      full_name: msg.business_profile.name,
      avatar_url: null, // TODO: Add avatar_url to business_profiles if needed
    } : null
  }));
}

/**
 * Post a new message to a thread
 */
export async function postMessage(
  threadId: string,
  message: string,
  businessProfileId: string,
  options?: {
    messageType?: 'text' | 'system' | 'status_change' | 'attachment';
    isInternal?: boolean;
    replyToMessageId?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    attachmentSize?: number;
  }
): Promise<DiscussionMessage | null> {
  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('No authenticated user found');
    return null;
  }

  const { data, error } = await supabase
    .from('discussion_messages')
    .insert({
      thread_id: threadId,
      user_id: user.id, // Add the user_id to satisfy RLS policy
      message,
      business_profile_id: businessProfileId,
      message_type: options?.messageType || 'text',
      is_internal: options?.isInternal || false,
      reply_to_message_id: options?.replyToMessageId,
      attachment_url: options?.attachmentUrl,
      attachment_name: options?.attachmentName,
      attachment_size: options?.attachmentSize,
    })
    .select(`
      *,
      business_profile:business_profiles!discussion_messages_business_profile_id_fkey(
        id,
        name,
        user_id
      )
    `)
    .single();

  if (error) {
    console.error('Error posting message:', error);
    return null;
  }

  // Transform the data to match the expected interface
  return data ? {
    ...data,
    profile: data.business_profile ? {
      full_name: data.business_profile.name,
      avatar_url: null, // TODO: Add avatar_url to business_profiles if needed
    } : null
  } : null;
}

/**
 * Mark a thread as read for the current user
 */
export async function markThreadAsRead(threadId: string): Promise<boolean> {
  const { error } = await supabase.rpc('mark_thread_as_read', {
    p_thread_id: threadId,
  });

  if (error) {
    console.error('Error marking thread as read:', error);
    return false;
  }

  return true;
}

/**
 * Get unread message count for current user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('discussion_participants')
    .select('unread_count')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return data?.reduce((sum, p) => sum + p.unread_count, 0) || 0;
}

/**
 * Get participants for a thread
 */
export async function getThreadParticipants(threadId: string): Promise<DiscussionParticipant[]> {
  const { data, error } = await supabase
    .from('discussion_participants')
    .select('*')
    .eq('thread_id', threadId);

  if (error) {
    console.error('Error fetching participants:', error);
    return [];
  }

  return data || [];
}

/**
 * Update thread status
 */
export async function updateThreadStatus(
  threadId: string,
  status: 'active' | 'resolved' | 'archived'
): Promise<boolean> {
  const { error } = await supabase
    .from('discussion_threads')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', threadId);

  if (error) {
    console.error('Error updating thread status:', error);
    return false;
  }

  return true;
}

/**
 * Subscribe to new messages in a thread (real-time)
 */
export function subscribeToThreadMessages(
  threadId: string,
  callback: (message: DiscussionMessage) => void
) {
  return supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'discussion_messages',
        filter: `thread_id=eq.${threadId}`,
      },
      async (payload) => {
        // Fetch the full message with profile data
        const { data } = await supabase
          .from('discussion_messages')
          .select(`
            *,
            business_profile:business_profiles!discussion_messages_business_profile_id_fkey(
              id,
              name,
              user_id
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          // Transform the data to match the expected interface
          const transformedData = {
            ...data,
            profile: data.business_profile ? {
              full_name: data.business_profile.name,
              avatar_url: null, // TODO: Add avatar_url to business_profiles if needed
            } : null
          };
          callback(transformedData);
        }
      }
    )
    .subscribe();
}
