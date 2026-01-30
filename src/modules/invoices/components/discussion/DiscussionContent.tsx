import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { ScrollArea } from '@/shared/ui/scroll-area';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';
import { Separator } from '@/shared/ui/separator';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  getOrCreateThreadForInvoice, 
  getThreadMessages, 
  postMessage, 
  subscribeToThreadMessages,
  DiscussionMessage,
} from '@/modules/invoices/data/discussionRepository';
import { ConnectedClient } from '@/shared/lib/client-connection-matcher';
import { toast } from 'sonner';

interface DiscussionContentProps {
  invoiceId: string;
  connectedClient: ConnectedClient;
  className?: string;
}

export const DiscussionContent: React.FC<DiscussionContentProps> = ({ 
  invoiceId, 
  connectedClient,
  className = ''
}) => {
  const { user } = useAuth();
  const { selectedProfileId } = useBusinessProfile();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch or create thread
  const { data: thread, isLoading: isLoadingThread } = useQuery({
    queryKey: ['discussion-thread', invoiceId],
    queryFn: async () => {
      if (!selectedProfileId) return null;
      return getOrCreateThreadForInvoice(
        invoiceId, 
        selectedProfileId, 
        `Dyskusja - ${connectedClient.customer_name}`
      );
    },
    enabled: !!invoiceId && !!selectedProfileId,
  });

  // Fetch messages
  const { data: messages = [], isLoading: isLoadingMessages, refetch: refetchMessages } = useQuery({
    queryKey: ['discussion-messages', thread?.id],
    queryFn: () => thread ? getThreadMessages(thread.id) : Promise.resolve([]),
    enabled: !!thread?.id,
  });

  // Subscription to new messages
  useEffect(() => {
    if (!thread?.id) return;

    const channel = subscribeToThreadMessages(thread.id, (newMessage) => {
      queryClient.setQueryData<DiscussionMessage[]>(['discussion-messages', thread.id], (old) => {
        if (!old) return [newMessage];
        if (old.find(m => m.id === newMessage.id)) return old;
        return [...old, newMessage];
      });
      scrollToBottom();
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [thread?.id, queryClient]);

  // Scroll to bottom on load and new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !thread?.id || !user || !selectedProfileId) return;

    setIsSending(true);
    try {
      const newMessage = await postMessage(
        thread.id,
        messageText,
        selectedProfileId,
        {
          messageType: 'text',
          isInternal: false
        }
      );

      if (newMessage) {
        setMessageText('');
        await refetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Nie udało się wysłać wiadomości');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoadingThread) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4">
          {isLoadingMessages ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Brak wiadomości.</p>
              <p className="text-sm mt-2">Rozpocznij dyskusję z kontrahentem.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={msg.profile?.avatar_url} />
                    <AvatarFallback>
                      {msg.profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground/80">
                        {isMe ? 'Ty' : msg.profile?.full_name || 'Użytkownik'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.created_at), 'dd.MM HH:mm')}
                      </span>
                    </div>
                    
                    <div
                      className={`rounded-lg p-3 text-sm ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'bg-muted text-foreground rounded-tl-none'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <Separator />

      {/* Input Area */}
      <div className="p-4 bg-background">
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" className="shrink-0">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Napisz wiadomość..."
            className="min-h-[2.5rem] max-h-32 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button 
            size="icon" 
            onClick={handleSendMessage} 
            disabled={!messageText.trim() || isSending}
            className="shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
