import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { getEvents } from '@/modules/accounting/data/unifiedEventsRepository';
import { Button } from '@/shared/ui/button';
import { Calendar, Filter, Download, Lock } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useEventDrawer } from '../hooks/useEventDrawer';

interface PostingFilters {
  periodYear?: number;
  periodMonth?: number;
  status?: 'pending' | 'posted' | 'closed' | 'locked';
}

export const EventsPosting: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const { openDrawer } = useEventDrawer();
  const [filters, setFilters] = useState<PostingFilters>({
    periodYear: new Date().getFullYear(),
    periodMonth: new Date().getMonth() + 1,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-posting', selectedProfileId, filters],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      const allEvents = await getEvents(selectedProfileId);
      return allEvents.filter(event => {
        if (filters.periodYear && event.metadata?.period_year !== filters.periodYear) return false;
        if (filters.periodMonth && event.metadata?.period_month !== filters.periodMonth) return false;
        if (filters.status && event.status !== filters.status) return false;
        return true;
      });
    },
    enabled: !!selectedProfileId,
  });

  const stats = {
    total: events.length,
    pending: events.filter(e => e.status === 'pending').length,
    posted: events.filter(e => e.status === 'posted' || e.metadata?.posted).length,
    closed: events.filter(e => e.metadata?.is_closed).length,
    locked: events.filter(e => e.metadata?.period_locked).length,
  };

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Księgowanie</h2>
            <p className="text-sm text-muted-foreground">
              Okres: {filters.periodMonth}/{filters.periodYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Zmień okres
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtry
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Eksport
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 px-6 pb-4">
          <div className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Wszystkie</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Oczekujące</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.posted}</div>
            <div className="text-xs text-muted-foreground">Zaksięgowane</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-bold text-green-600">{stats.closed}</div>
            <div className="text-xs text-muted-foreground">Zamknięte</div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <div className="text-2xl font-bold text-slate-600">{stats.locked}</div>
            <div className="text-xs text-muted-foreground">Zablokowane</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Ładowanie...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Brak zdarzeń w wybranym okresie</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="grid grid-cols-[100px_120px_1fr_120px_120px_120px_100px] gap-4 px-6 py-3 text-xs font-medium text-muted-foreground bg-muted/50 sticky top-0">
              <div>Okres</div>
              <div>Status</div>
              <div>Zdarzenie</div>
              <div className="text-right">Kwota</div>
              <div>Wn</div>
              <div>Ma</div>
              <div className="text-center">Akcje</div>
            </div>
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => openDrawer(event.id)}
                className="grid grid-cols-[100px_120px_1fr_120px_120px_120px_100px] gap-4 px-6 py-3 text-sm hover:bg-muted/50 transition-colors w-full text-left"
              >
                <div className="text-muted-foreground">
                  {event.metadata?.period_month}/{event.metadata?.period_year}
                </div>
                <div>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                    event.metadata?.period_locked && "bg-slate-500/10 text-slate-600",
                    event.metadata?.is_closed && !event.metadata?.period_locked && "bg-green-500/10 text-green-600",
                    event.metadata?.posted && !event.metadata?.is_closed && "bg-blue-500/10 text-blue-600",
                    !event.metadata?.posted && "bg-amber-500/10 text-amber-600"
                  )}>
                    {event.metadata?.period_locked && <Lock className="h-3 w-3" />}
                    {event.metadata?.period_locked ? 'Zablokowane' :
                     event.metadata?.is_closed ? 'Zamknięte' :
                     event.metadata?.posted ? 'Zaksięgowane' : 'Oczekujące'}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{event.action_summary}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {event.entity_type} • {format(new Date(event.occurred_at), 'dd MMM yyyy', { locale: pl })}
                  </div>
                </div>
                <div className="text-right font-mono">
                  {event.amount && formatCurrency(event.amount, event.currency || 'PLN')}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {event.metadata?.debit_account || '—'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {event.metadata?.credit_account || '—'}
                </div>
                <div className="flex items-center justify-center">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDrawer(event.id); }}>
                    Szczegóły
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPosting;
