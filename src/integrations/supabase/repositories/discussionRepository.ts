import { supabase } from "../client";

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
      .single();

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
      profile:user_id(full_name, avatar_url)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return data || [];
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
  const { data, error } = await supabase
    .from('discussion_messages')
    .insert({
      thread_id: threadId,
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
      profile:user_id(full_name, avatar_url)
    `)
    .single();

  if (error) {
    console.error('Error posting message:', error);
    return null;
  }

  return data;
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
            profile:user_id(full_name, avatar_url)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          callback(data);
        }
      }
    )
    .subscribe();
}
