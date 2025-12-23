import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  User, 
  Calendar, 
  FileText, 
  ArrowRight,
  ExternalLink,
  Filter,
  Download
} from 'lucide-react';
import { getCompanyEvents } from '@/integrations/supabase/repositories/eventsRepository';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, type EventType } from '@/types/events';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface EventChainViewerProps {
  businessProfileId: string;
  limit?: number;
  showFilters?: boolean;
  entityType?: string;
  entityId?: string;
}

const EventChainViewer: React.FC<EventChainViewerProps> = ({
  businessProfileId,
  limit = 50,
  showFilters = true,
  entityType,
  entityId,
}) => {
  const navigate = useNavigate();
  const [filterType, setFilterType] = React.useState<EventType | 'all'>('all');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['company-events', businessProfileId, filterType, entityType, entityId],
    queryFn: () => getCompanyEvents(businessProfileId, {
      limit,
      eventType: filterType === 'all' ? undefined : filterType,
      entityType,
      entityId,
    }),
    enabled: !!businessProfileId,
  });

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    };
    return colorMap[color] || colorMap.gray;
  };

  const handleEntityClick = (event: any) => {
    const entityRoutes: Record<string, string> = {
      invoice: '/income',
      expense: '/expenses',
      contract: '/contracts',
      decision: '/decisions',
      employee: '/employees',
      bank_account: '/bank',
    };

    const route = entityRoutes[event.entity_type];
    if (route && event.entity_id) {
      navigate(`${route}/${event.entity_id}`);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Ładowanie zdarzeń...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Łańcuch zdarzeń
          </CardTitle>
          <div className="flex items-center gap-2">
            {showFilters && (
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtry
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Eksport
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Pełna historia wszystkich działań w firmie. Każde zdarzenie jest śledzone i powiązane z decyzją autoryzującą.
        </p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Brak zdarzeń do wyświetlenia</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="relative border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Timeline connector */}
                  {index < events.length - 1 && (
                    <div className="absolute left-8 top-full h-4 w-0.5 bg-border" />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Event indicator */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={getColorClass(EVENT_TYPE_COLORS[event.event_type])}>
                              {EVENT_TYPE_LABELS[event.event_type]}
                            </Badge>
                            {event.event_number && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {event.event_number}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-sm">{event.action_summary}</p>
                        </div>
                        <div className="text-xs text-muted-foreground text-right">
                          {formatDistanceToNow(new Date(event.occurred_at), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </div>
                      </div>

                      {/* Event details */}
                      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{event.actor_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(event.occurred_at).toLocaleString('pl-PL')}</span>
                        </div>
                      </div>

                      {/* Decision reference */}
                      {event.decision_id && (
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            {event.decision_reference || 'Decyzja'}
                          </Badge>
                        </div>
                      )}

                      {/* Entity reference */}
                      {event.entity_reference && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto py-1 px-2 text-xs"
                          onClick={() => handleEntityClick(event)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {event.entity_reference}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}

                      {/* Changes preview */}
                      {event.changes && Object.keys(event.changes).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Szczegóły zmian
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(event.changes, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default EventChainViewer;
