import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Plus, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getCapitalEvents } from '@/modules/spolka/data/spolkaRepository';
import { supabase } from '@/integrations/supabase/client';
import type { CapitalEvent } from '@/modules/spolka/spolka';
import { getCapitalEventTypeLabel } from '@/modules/spolka/spolka';
import CapitalEventsDialog from '@/modules/spolka/components/CapitalEventsDialog';
import { Badge } from '@/shared/ui/badge';

const CapitalEvents = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

  const [events, setEvents] = useState<CapitalEvent[]>([]);
  const [shareholders, setShareholders] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadData = async () => {
    if (!selectedProfileId) return;
    
    setLoading(true);
    try {
      const [eventsData, shareholdersData] = await Promise.all([
        getCapitalEvents(selectedProfileId),
        supabase
          .from('shareholders')
          .select('id, name')
          .eq('business_profile_id', selectedProfileId)
          .eq('is_active', true),
      ]);

      setEvents(eventsData);
      setShareholders(shareholdersData.data || []);
    } catch (error) {
      console.error('Error loading capital events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProfileId]);

  // Redirect if not sp_zoo
  useEffect(() => {
    if (selectedProfile && selectedProfile.entityType !== 'sp_zoo' && selectedProfile.entityType !== 'sa') {
      navigate('/accounting');
    }
  }, [selectedProfile, navigate]);

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  const totalContributions = events
    .filter(e => e.event_type === 'capital_contribution' || e.event_type === 'capital_increase')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalPayouts = events
    .filter(e => e.event_type === 'dividend_payout' || e.event_type === 'capital_decrease')
    .reduce((sum, e) => sum + e.amount, 0);

  const netCapital = totalContributions - totalPayouts;

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Zdarzenia kapitałowe</h1>
            <p className="text-muted-foreground text-sm">
              Historia transakcji kapitałowych i dywidend
            </p>
          </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj zdarzenie
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wkłady kapitałowe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {totalContributions.toLocaleString('pl-PL')} PLN
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wypłaty dywidend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {totalPayouts.toLocaleString('pl-PL')} PLN
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kapitał netto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {netCapital.toLocaleString('pl-PL')} PLN
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Historia zdarzeń</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Ładowanie...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Brak zdarzeń kapitałowych</p>
              <p className="text-sm mt-2">Dodaj pierwsze zdarzenie klikając przycisk powyżej</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{getCapitalEventTypeLabel(event.event_type)}</span>
                      <Badge variant="outline" className="text-xs">
                        {event.shareholder_name || 'Ogólne'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(event.event_date), 'dd MMMM yyyy', { locale: pl })}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-semibold ${
                        event.event_type === 'capital_contribution' || event.event_type === 'capital_increase'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {event.event_type === 'capital_contribution' || event.event_type === 'capital_increase' ? '+' : '-'}
                      {event.amount.toLocaleString('pl-PL')} PLN
                    </div>
                    {event.balance_sheet_line && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Bilans: {event.balance_sheet_line}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CapitalEventsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        businessProfileId={selectedProfileId!}
        shareholders={shareholders}
        onSuccess={loadData}
      />
    </div>
  );
};

export default CapitalEvents;
