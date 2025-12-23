import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { 
  Shield, 
  Download, 
  Search, 
  Filter,
  ExternalLink,
  Calendar,
  User,
  FileText,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { getCompanyEvents, getEventStats } from '@/modules/accounting/data/eventsRepository';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS, type EventType, type CompanyEvent } from '@/shared/types/events';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';

const EventLog: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProfileId, profiles } = useBusinessProfile();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['company-events', selectedProfileId, filterType],
    queryFn: () => getCompanyEvents(selectedProfileId!, {
      limit: 500,
      eventType: filterType === 'all' ? undefined : filterType,
    }),
    enabled: !!selectedProfileId && isSpoolka,
  });

  const { data: stats } = useQuery({
    queryKey: ['event-stats', selectedProfileId],
    queryFn: () => getEventStats(selectedProfileId!),
    enabled: !!selectedProfileId && isSpoolka,
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = searchQuery === '' || 
      event.action_summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.entity_reference?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEntity = filterEntity === 'all' || event.entity_type === filterEntity;
    
    return matchesSearch && matchesEntity;
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

  const handleEntityClick = (event: CompanyEvent) => {
    const entityRoutes: Record<string, string> = {
      invoice: '/income',
      expense: '/expenses',
      contract: '/contracts',
      decision: '/decisions',
      employee: '/employees',
      bank_account: '/bank',
      document: '/contracts/documents',
      asset: '/assets',
      resolution: '/spolka/resolutions',
    };

    const route = entityRoutes[event.entity_type];
    if (route && event.entity_id) {
      navigate(`${route}/${event.entity_id}`);
    } else {
      toast.info(`Nawigacja dla typu ${event.entity_type} nie jest jeszcze dostępna`);
    }
  };

  const handleDecisionClick = (decisionId: string) => {
    navigate(`/decisions/${decisionId}`);
  };

  const handleExportCSV = () => {
    const csv = [
      ['Data', 'Typ zdarzenia', 'Akcja', 'Wykonawca', 'Decyzja', 'Dokument', 'ID dokumentu'].join(','),
      ...filteredEvents.map(event => [
        new Date(event.occurred_at).toLocaleString('pl-PL'),
        EVENT_TYPE_LABELS[event.event_type],
        event.action_summary,
        event.actor_name,
        event.decision_reference || '-',
        event.entity_reference || '-',
        event.entity_id
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `event-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Wyeksportowano dziennik zdarzeń');
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(filteredEvents, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `event-log-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('Wyeksportowano dziennik zdarzeń');
  };

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  if (!isSpoolka) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Dziennik zdarzeń dostępny tylko dla Spółek</h2>
          <p className="text-muted-foreground mb-6">
            Ta sekcja jest dostępna tylko dla Spółek z o.o. i S.A.
          </p>
          <Button variant="outline" onClick={() => navigate('/accounting')}>
            Przejdź do księgowości
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Dziennik zdarzeń</h1>
        </div>
        <p className="text-muted-foreground">
          Pełna historia wszystkich działań w firmie. Każde zdarzenie jest śledzone, powiązane z decyzją i możliwe do zweryfikowania.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total_events}</div>
              <p className="text-xs text-muted-foreground">Wszystkie zdarzenia</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {(stats.events_by_type.invoice_created || 0) + (stats.events_by_type.invoice_issued || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Faktury</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">
                {(stats.events_by_type.expense_created || 0) + (stats.events_by_type.expense_approved || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Wydatki</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">
                {(stats.events_by_type.decision_created || 0) + (stats.events_by_type.decision_approved || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Decyzje</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtry i wyszukiwanie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Szukaj w zdarzeniach..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as EventType | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Typ zdarzenia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie typy</SelectItem>
                <SelectItem value="invoice_created">Faktury utworzone</SelectItem>
                <SelectItem value="invoice_issued">Faktury wystawione</SelectItem>
                <SelectItem value="expense_created">Wydatki utworzone</SelectItem>
                <SelectItem value="expense_approved">Wydatki zatwierdzone</SelectItem>
                <SelectItem value="contract_created">Umowy utworzone</SelectItem>
                <SelectItem value="decision_created">Decyzje utworzone</SelectItem>
                <SelectItem value="employee_hired">Zatrudnienia</SelectItem>
                <SelectItem value="bank_account_added">Konta bankowe</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEntity} onValueChange={setFilterEntity}>
              <SelectTrigger>
                <SelectValue placeholder="Typ dokumentu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie dokumenty</SelectItem>
                <SelectItem value="invoice">Faktury</SelectItem>
                <SelectItem value="expense">Wydatki</SelectItem>
                <SelectItem value="contract">Umowy</SelectItem>
                <SelectItem value="decision">Decyzje</SelectItem>
                <SelectItem value="employee">Pracownicy</SelectItem>
                <SelectItem value="bank_account">Konta bankowe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Eksport CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-2" />
              Eksport JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Zdarzenia ({filteredEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Ładowanie zdarzeń...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Brak zdarzeń spełniających kryteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Event header */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className={getColorClass(EVENT_TYPE_COLORS[event.event_type])}>
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </Badge>
                        {event.event_number && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {event.event_number}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.occurred_at), {
                            addSuffix: true,
                            locale: pl,
                          })}
                        </span>
                      </div>

                      {/* Action summary */}
                      <p className="font-medium mb-2">{event.action_summary}</p>

                      {/* Event details */}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto py-1 px-2 mb-2 mr-2"
                          onClick={() => handleDecisionClick(event.decision_id!)}
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          {event.decision_reference || 'Decyzja'}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}

                      {/* Entity reference */}
                      {event.entity_reference && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-auto py-1 px-2 mb-2"
                          onClick={() => handleEntityClick(event)}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {event.entity_reference}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}

                      {/* Entity ID (for debugging/reference) */}
                      <div className="text-xs text-muted-foreground mt-2">
                        <span className="font-mono">
                          {event.entity_type} • {event.entity_id}
                        </span>
                      </div>

                      {/* Changes preview */}
                      {event.changes && Object.keys(event.changes).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            Szczegóły zmian
                          </summary>
                          <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto max-h-40">
                            {JSON.stringify(event.changes, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EventLog;
