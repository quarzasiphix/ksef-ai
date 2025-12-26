import React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { FileText, Clock, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { BlockedEventCard } from './BlockedEventCard';

interface InboxEventCardProps {
  event: {
    id: string;
    event_type: string;
    occurred_at: string;
    recorded_at: string;
    amount: number | null;
    currency: string | null;
    status: string;
    document_number: string;
    counterparty: string | null;
    blocked_by: string | null;
    blocked_reason: string | null;
    inbox_reasons: string[] | null;
  };
  onClassify?: (eventId: string) => void;
  onApprove?: (eventId: string) => void;
  onCreateDecision?: (eventId: string) => void;
}

/**
 * Card displaying an inbox event with actions
 */
export const InboxEventCard: React.FC<InboxEventCardProps> = ({
  event,
  onClassify,
  onApprove,
  onCreateDecision,
}) => {
  const isBlocked = !!event.blocked_by;
  const reasons = event.inbox_reasons || [];

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {event.document_number}
              </h3>
              <Badge variant="outline" className="text-xs">
                {event.status}
              </Badge>
            </div>
            
            {event.counterparty && (
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                {event.counterparty}
              </p>
            )}
            
            {event.amount && (
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1">
                {event.amount.toLocaleString('pl-PL', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {event.currency || 'PLN'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Data zdarzenia: {format(new Date(event.occurred_at), 'dd MMM yyyy', { locale: pl })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>
            Dodano: {format(new Date(event.recorded_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
          </span>
        </div>
      </div>

      {/* Blocked state */}
      {isBlocked && event.blocked_reason && (
        <BlockedEventCard
          blockedBy={event.blocked_by!}
          blockedReason={event.blocked_reason}
          onCreateDecision={() => onCreateDecision?.(event.id)}
        />
      )}

      {/* Inbox reasons */}
      {!isBlocked && reasons.length > 0 && (
        <div className="space-y-1.5">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-1.5"
            >
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
        {event.status === 'captured' && onClassify && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onClassify(event.id)}
          >
            Sklasyfikuj
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        )}
        
        {event.status === 'classified' && !isBlocked && onApprove && (
          <Button
            size="sm"
            onClick={() => onApprove(event.id)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            Zatwierdź i zaksięguj
          </Button>
        )}
      </div>
    </div>
  );
};
