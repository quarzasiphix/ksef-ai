import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ChevronDown, ChevronUp, Clock, FileText, DollarSign, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CollapsibleEventHistoryProps {
  invoiceId: string;
  invoiceNumber: string;
  businessProfileId: string;
}

const CollapsibleEventHistory: React.FC<CollapsibleEventHistoryProps> = ({
  invoiceId,
  invoiceNumber,
  businessProfileId,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ['invoice-events', invoiceId],
    queryFn: async () => {
      console.log('[CollapsibleEventHistory] Querying events for:', { invoiceId, businessProfileId });
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .eq('entity_type', 'invoice')
        .eq('entity_id', invoiceId)
        .order('created_at', { ascending: false });

      console.log('[CollapsibleEventHistory] Query result:', { data, error, count: data?.length });
      
      if (error) {
        console.error('[CollapsibleEventHistory] Query error:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!invoiceId && !!businessProfileId,
  });

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('created')) return <FileText className="h-4 w-4" />;
    if (eventType.includes('payment')) return <DollarSign className="h-4 w-4" />;
    if (eventType.includes('booked')) return <BookOpen className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      'invoice_created': 'dokument utworzony',
      'invoice_payment_received': 'płatność otrzymana',
      'invoice_booked': 'zaksięgowany',
      'decision_automatic': 'decyzja: automatyczna',
      'decision_approved': 'decyzja: zatwierdzona',
    };
    return labels[eventType] || eventType;
  };

  const lastEvent = events[0];

  return (
    <div className="space-y-2">
      {/* Compact View - Show Last Event */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {lastEvent ? (
            <span className="text-muted-foreground">
              Ostatnie zdarzenie: {getEventLabel(lastEvent.event_type)} • {' '}
              {format(new Date(lastEvent.created_at), "dd.MM.yyyy HH:mm", { locale: pl })}
            </span>
          ) : (
            <span className="text-muted-foreground">Brak zdarzeń</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-8 px-2"
        >
          <span className="text-xs mr-1">Historia</span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Expanded History */}
      {isExpanded && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Historia zdarzeń</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Brak zarejestrowanych zdarzeń
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 text-muted-foreground">
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getEventLabel(event.event_type)}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), "dd.MM.yyyy HH:mm", { locale: pl })}
                        </span>
                      </div>
                      {event.metadata && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {JSON.stringify(event.metadata)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-3 border-t text-xs text-muted-foreground">
                  Wszystkie zdarzenia są rejestrowane dla celów audytowych. Historia jest niemodyfikowalna.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CollapsibleEventHistory;
