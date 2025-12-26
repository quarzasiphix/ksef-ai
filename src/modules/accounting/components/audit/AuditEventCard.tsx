import React from 'react';
import { cn } from '@/shared/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  CheckCircle2, 
  Edit, 
  FileCheck, 
  FileX, 
  Link2, 
  Shield,
  User,
  AlertCircle
} from 'lucide-react';
import type { AuditEvent } from '../../types/audit';
import { Badge } from '@/shared/ui/badge';

interface AuditEventCardProps {
  event: AuditEvent;
  onLedgerEntryClick?: (entryId: string) => void;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case 'created':
      return FileCheck;
    case 'edited':
      return Edit;
    case 'approved':
      return CheckCircle2;
    case 'posted':
      return Shield;
    case 'corrected':
      return Edit;
    case 'cancelled':
      return FileX;
    case 'decision_linked':
      return Link2;
    case 'payment_linked':
      return Link2;
    default:
      return FileCheck;
  }
};

const getEventLabel = (eventType: string) => {
  const labels: Record<string, string> = {
    created: 'Utworzono',
    edited: 'Edytowano',
    approved: 'Zatwierdzono',
    posted: 'Zaksięgowano',
    corrected: 'Skorygowano',
    cancelled: 'Anulowano',
    decision_linked: 'Powiązano z decyzją',
    payment_linked: 'Powiązano płatność',
  };
  return labels[eventType] || eventType;
};

const getEventColor = (eventType: string) => {
  switch (eventType) {
    case 'created':
      return 'text-blue-500';
    case 'edited':
      return 'text-amber-500';
    case 'approved':
      return 'text-green-500';
    case 'posted':
      return 'text-emerald-500';
    case 'corrected':
      return 'text-orange-500';
    case 'cancelled':
      return 'text-red-500';
    case 'decision_linked':
    case 'payment_linked':
      return 'text-violet-500';
    default:
      return 'text-slate-500';
  }
};

export const AuditEventCard: React.FC<AuditEventCardProps> = ({ event, onLedgerEntryClick }) => {
  const Icon = getEventIcon(event.eventType);
  const eventColor = getEventColor(event.eventType);

  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-3 top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-800 last:hidden" />
      
      {/* Event node */}
      <div className={cn(
        "absolute left-0 top-2 w-6 h-6 rounded-full border-2 border-white dark:border-slate-950 flex items-center justify-center",
        "bg-slate-100 dark:bg-slate-900",
        eventColor
      )}>
        <Icon className="h-3 w-3" />
      </div>

      {/* Event content */}
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("font-medium text-sm", eventColor)}>
                {getEventLabel(event.eventType)}
              </span>
              {event.metadata?.backdated && (
                <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                  Wstecz
                </Badge>
              )}
              {event.metadata?.delayDays && event.metadata.delayDays > 7 && (
                <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                  Opóźnione ({event.metadata.delayDays}d)
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {event.description}
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
            {format(new Date(event.actionTimestamp), 'HH:mm')}
          </span>
        </div>

        {/* Actor */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            {event.actorAvatar ? (
              <img src={event.actorAvatar} alt={event.actorName} className="w-full h-full rounded-full" />
            ) : (
              <User className="h-3 w-3 text-slate-600 dark:text-slate-400" />
            )}
          </div>
          <div className="text-xs">
            <span className="text-slate-900 dark:text-slate-100 font-medium">{event.actorName}</span>
            {event.actorRole && (
              <span className="text-slate-500 dark:text-slate-400 ml-1">• {event.actorRole}</span>
            )}
          </div>
        </div>

        {/* Changes */}
        {event.changes && event.changes.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 space-y-1">
            {event.changes.map((change, idx) => (
              <div key={idx} className="text-xs">
                <span className="text-slate-600 dark:text-slate-400">{change.field}:</span>
                <span className="text-red-600 dark:text-red-400 line-through ml-1">{String(change.before)}</span>
                <span className="text-green-600 dark:text-green-400 ml-1">→ {String(change.after)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Decision link */}
        {event.metadata?.decisionReference && (
          <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400">
            <Shield className="h-3 w-3" />
            <span>Decyzja: {event.metadata.decisionReference}</span>
          </div>
        )}

        {/* Linked ledger entries */}
        {event.linkedLedgerEntryIds && event.linkedLedgerEntryIds.length > 0 && (
          <div className="space-y-1">
            {event.linkedLedgerEntryIds.map((entryId) => (
              <button
                key={entryId}
                onClick={() => onLedgerEntryClick?.(entryId)}
                className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Link2 className="h-3 w-3" />
                <span>Otwórz wpis księgowy</span>
              </button>
            ))}
          </div>
        )}

        {/* Delay warning */}
        {event.metadata?.delayDays && event.metadata.delayDays > 7 && (
          <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 dark:text-red-200">
              <p className="font-medium">Zaksięgowano z opóźnieniem</p>
              <p className="text-red-600 dark:text-red-300 mt-0.5">
                {event.metadata.delayDays} dni po wystąpieniu zdarzenia ekonomicznego
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditEventCard;
