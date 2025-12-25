import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ExternalLink, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import LedgerEventRow from './LedgerEventRow';
import type { LedgerEvent } from '../types/ledger';

interface MiniLedgerProps {
  events: LedgerEvent[];
  title?: string;
  documentId: string;
  documentType: 'invoice' | 'expense' | 'contract';
  className?: string;
}

/**
 * Mini Ledger - Embedded timeline view for document pages
 * Shows related financial events in chronological order
 */
export const MiniLedger: React.FC<MiniLedgerProps> = ({
  events,
  title = 'Powiązane zdarzenia',
  documentId,
  documentType,
  className,
}) => {
  // Sort events by timestamp (most recent first)
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    return sortedEvents.reduce((acc, event) => {
      const dateKey = format(new Date(event.timestamp), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, LedgerEvent[]>);
  }, [sortedEvents]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Chronologia zdarzeń finansowych
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/ledger">
            <ExternalLink className="h-4 w-4 mr-2" />
            Otwórz księgę
          </Link>
        </Button>
      </div>

      {/* Timeline with date grouping */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-white/[0.02] rounded-lg border border-white/5">
            <Calendar className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Brak powiązanych zdarzeń</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
            <div key={dateKey}>
              {/* Date header */}
              <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground">
                {format(new Date(dateKey), 'd MMMM yyyy', { locale: pl })}
              </div>
              {/* Events for this date */}
              <div className="bg-white/[0.02] border-y border-white/5">
                {dateEvents.map((event) => (
                  <LedgerEventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Context note */}
      <div className="text-xs text-muted-foreground">
        {events.length} {events.length === 1 ? 'zdarzenie' : events.length < 5 ? 'zdarzenia' : 'zdarzeń'} w historii
      </div>
    </div>
  );
};

export default MiniLedger;
