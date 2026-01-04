import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { getEvents } from '@/modules/accounting/data/unifiedEventsRepository';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { CheckCircle2, AlertCircle, Upload, Link2, Shield } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useEventDrawer } from '../hooks/useEventDrawer';

export const EventsReconciliation: React.FC = () => {
  const { selectedProfileId } = useBusinessProfile();
  const { openDrawer } = useEventDrawer();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unverified' | 'missing_proof'>('unverified');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events-reconciliation', selectedProfileId, selectedFilter],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      const allEvents = await getEvents(selectedProfileId);
      
      return allEvents.filter(event => {
        const isClosed = event.metadata?.is_closed;
        const isVerified = event.metadata?.verified;
        const hasAttestation = event.metadata?.bank_transaction_id || 
                              event.metadata?.ksef_reference_number ||
                              event.metadata?.decision_pdf_hash;
        
        if (selectedFilter === 'unverified') {
          return isClosed && !isVerified;
        }
        if (selectedFilter === 'missing_proof') {
          return isClosed && !hasAttestation;
        }
        return isClosed;
      });
    },
    enabled: !!selectedProfileId,
  });

  const stats = {
    total: events.length,
    unverified: events.filter(e => !e.metadata?.verified).length,
    missingProof: events.filter(e => 
      !e.metadata?.bank_transaction_id && 
      !e.metadata?.ksef_reference_number &&
      !e.metadata?.decision_pdf_hash
    ).length,
    verified: events.filter(e => e.metadata?.verified).length,
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
            <h2 className="text-lg font-semibold">Weryfikacja</h2>
            <p className="text-sm text-muted-foreground">
              Kolejka zdarzeń wymagających weryfikacji
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import wyciągu
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 px-6 pb-4">
          <button
            onClick={() => setSelectedFilter('all')}
            className={cn(
              "rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent",
              selectedFilter === 'all' && "ring-2 ring-primary"
            )}
          >
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Wszystkie zamknięte</div>
          </button>
          <button
            onClick={() => setSelectedFilter('unverified')}
            className={cn(
              "rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent",
              selectedFilter === 'unverified' && "ring-2 ring-primary"
            )}
          >
            <div className="text-2xl font-bold text-amber-600">{stats.unverified}</div>
            <div className="text-xs text-muted-foreground">Niezweryfikowane</div>
          </button>
          <button
            onClick={() => setSelectedFilter('missing_proof')}
            className={cn(
              "rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent",
              selectedFilter === 'missing_proof' && "ring-2 ring-primary"
            )}
          >
            <div className="text-2xl font-bold text-red-600">{stats.missingProof}</div>
            <div className="text-xs text-muted-foreground">Brak dowodu</div>
          </button>
          <button
            onClick={() => setSelectedFilter('all')}
            className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
          >
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-xs text-muted-foreground">Zweryfikowane</div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Ładowanie...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-medium">Brak zdarzeń do weryfikacji</p>
            <p className="text-sm text-muted-foreground">Wszystkie zamknięte zdarzenia zostały zweryfikowane</p>
          </div>
        ) : (
          <div className="p-6 space-y-3">
            {events.map((event) => {
              const hasHash = !!event.metadata?.event_hash;
              const hasBankTx = !!event.metadata?.bank_transaction_id;
              const hasKSeF = !!event.metadata?.ksef_reference_number;
              const hasDecisionHash = !!event.metadata?.decision_pdf_hash;
              const isVerified = !!event.metadata?.verified;
              const hasAnyProof = hasBankTx || hasKSeF || hasDecisionHash;

              return (
                <div
                  key={event.id}
                  onClick={() => openDrawer(event.id)}
                  className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{event.action_summary}</span>
                        {isVerified ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Zweryfikowane
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Wymaga weryfikacji
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{event.entity_type}</span>
                        <span>•</span>
                        <span>{format(new Date(event.occurred_at), 'dd MMMM yyyy', { locale: pl })}</span>
                        {event.amount && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{formatCurrency(event.amount, event.currency || 'PLN')}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs",
                          hasHash ? "text-green-600" : "text-red-600"
                        )}>
                          {hasHash ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                          <span>Hash</span>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1.5 text-xs",
                          hasBankTx ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {hasBankTx ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                          <span>Bank</span>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1.5 text-xs",
                          hasKSeF ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {hasKSeF ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                          <span>KSeF</span>
                        </div>

                        <div className={cn(
                          "flex items-center gap-1.5 text-xs",
                          hasDecisionHash ? "text-green-600" : "text-muted-foreground"
                        )}>
                          {hasDecisionHash ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                          <span>Decyzja</span>
                        </div>
                      </div>

                      {event.metadata?.verified_at && (
                        <div className="text-xs text-muted-foreground pt-1">
                          Zweryfikowano: {format(new Date(event.metadata.verified_at), 'dd MMM yyyy HH:mm', { locale: pl })}
                          {event.metadata?.verified_by && ` • ${event.metadata.verified_by}`}
                        </div>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex flex-col gap-2">
                      {!isVerified && hasAnyProof && (
                        <Button size="sm" variant="default">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Zweryfikuj
                        </Button>
                      )}
                      {!hasAnyProof && (
                        <Button size="sm" variant="outline">
                          <Upload className="h-4 w-4 mr-2" />
                          Dodaj dowód
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        Szczegóły
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsReconciliation;
