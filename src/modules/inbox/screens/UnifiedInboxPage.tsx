import React from 'react';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { useInboxEvents, useClassifyEvent, useApproveEvent } from '@/shared/hooks/useUnifiedEvents';
import { InboxEmptyState } from '../components/InboxEmptyState';
import { InboxEventCard } from '../components/InboxEventCard';
import { Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/**
 * Unified inbox page showing unposted events needing action
 * Events automatically disappear when posted to ledger
 */
export const UnifiedInboxPage: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const navigate = useNavigate();
  
  const { data: inboxEvents, isLoading } = useInboxEvents(selectedProfileId || '');
  const classifyMutation = useClassifyEvent();
  const approveMutation = useApproveEvent();

  const handleClassify = (eventId: string) => {
    navigate(`/inbox/classify/${eventId}`);
  };

  const handleApprove = async (eventId: string) => {
    try {
      await approveMutation.mutateAsync(eventId);
      toast.success('Zdarzenie zatwierdzone i zaksięgowane');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Nie udało się zatwierdzić zdarzenia');
      }
    }
  };

  const handleCreateDecision = (eventId: string) => {
    navigate(`/decisions/create?for_event=${eventId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 mx-auto mb-4" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Ładowanie...</p>
        </div>
      </div>
    );
  }

  const events = inboxEvents || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Inbox className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Skrzynka
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Zdarzenia do rozliczenia
          </p>
        </div>
      </div>

      {/* Content */}
      {events.length === 0 ? (
        <InboxEmptyState />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {events.length} {events.length === 1 ? 'zdarzenie' : 'zdarzeń'} do rozliczenia
            </p>
          </div>

          <div className="space-y-3">
            {events.map((event) => (
              <InboxEventCard
                key={event.id}
                event={event}
                onClassify={handleClassify}
                onApprove={handleApprove}
                onCreateDecision={handleCreateDecision}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedInboxPage;
