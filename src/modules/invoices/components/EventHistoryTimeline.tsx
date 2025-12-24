import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Clock, User, FileText, Wallet, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EventHistoryTimelineProps {
  invoiceId: string;
  invoiceNumber: string;
  businessProfileId: string;
}

interface CompanyEvent {
  id: string;
  event_type: string;
  actor_name: string;
  action_summary: string;
  created_at: string;
  changes?: any;
  metadata?: any;
}

const EventHistoryTimeline: React.FC<EventHistoryTimelineProps> = ({
  invoiceId,
  invoiceNumber,
  businessProfileId,
}) => {
  const { data: events, isLoading } = useQuery({
    queryKey: ['invoice-events', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_events')
        .select('*')
        .eq('entity_id', invoiceId)
        .eq('entity_type', 'invoice')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CompanyEvent[];
    },
    enabled: !!invoiceId,
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'invoice_issued':
      case 'invoice_created':
        return FileText;
      case 'payment_received':
        return Wallet;
      case 'invoice_approved':
      case 'decision_made':
        return CheckCircle;
      case 'invoice_modified':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'invoice_issued':
      case 'invoice_created':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'payment_received':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'invoice_approved':
      case 'decision_made':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'invoice_modified':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      invoice_issued: 'Dokument wystawiony',
      invoice_created: 'Dokument utworzony',
      payment_received: 'Płatność otrzymana',
      invoice_approved: 'Dokument zatwierdzony',
      decision_made: 'Decyzja podjęta',
      invoice_modified: 'Dokument zmodyfikowany',
      expense_recorded: 'Wydatek zarejestrowany',
    };
    return labels[eventType] || eventType;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Historia zdarzeń
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Historia zdarzeń
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Brak zarejestrowanych zdarzeń dla tego dokumentu.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          Historia zdarzeń
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => {
            const Icon = getEventIcon(event.event_type);
            const colorClass = getEventColor(event.event_type);
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                )}

                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getEventLabel(event.event_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                          </span>
                        </div>
                        <p className="text-sm font-medium">{event.action_summary}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{event.actor_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional details */}
                    {event.changes && Object.keys(event.changes).length > 0 && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                        {event.changes.payment_method && (
                          <div>
                            <span className="font-medium">Metoda płatności:</span>{' '}
                            {event.changes.payment_method === 'cash' ? 'Gotówka' : 
                             event.changes.payment_method === 'transfer' ? 'Przelew' : 
                             event.changes.payment_method}
                          </div>
                        )}
                        {event.changes.cash_account_name && (
                          <div>
                            <span className="font-medium">Kasa:</span> {event.changes.cash_account_name}
                          </div>
                        )}
                        {event.changes.amount && (
                          <div>
                            <span className="font-medium">Kwota:</span> {event.changes.amount} {event.changes.currency || 'PLN'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Traceability notice */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground italic">
            💡 Wszystkie zdarzenia są rejestrowane dla celów audytowych i zgodności z KSeF.
            Historia jest niemodyfikowalna i stanowi dowód przebiegu operacji.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventHistoryTimeline;
