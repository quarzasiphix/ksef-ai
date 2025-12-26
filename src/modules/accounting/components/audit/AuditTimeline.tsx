import React from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import AuditEventCard from './AuditEventCard';
import type { AuditEvent } from '../../types/audit';

interface AuditTimelineProps {
  events: AuditEvent[];
  onLedgerEntryClick?: (entryId: string) => void;
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events, onLedgerEntryClick }) => {
  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Brak zdarzeń audytowych
          </p>
        </div>
      </div>
    );
  }

  // Group events by date
  const groupedEvents = events.reduce((acc, event) => {
    const dateKey = format(new Date(event.actionTimestamp), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, AuditEvent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
        <div key={dateKey}>
          {/* Date header */}
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 py-2 mb-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {format(new Date(dateKey), 'd MMMM yyyy', { locale: pl })}
            </h3>
            <div className="mt-1 h-px bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Events for this date */}
          <div className="space-y-0">
            {dateEvents.map((event) => (
              <AuditEventCard
                key={event.id}
                event={event}
                onLedgerEntryClick={onLedgerEntryClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuditTimeline;
