import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Building2, TrendingUp, FileText, AlertCircle, Users, Landmark } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { EmptyStateAccounting } from '../components/EmptyStateAccounting';
import { getAccountingSetupState, SetupState } from '../domain/setupState';
import type { BusinessProfile } from '@/shared/types';
import { AutoPostingButton } from '../components/AutoPostingButton';
import { UnpostedQueueWidget } from '../components/UnpostedQueueWidget';
import { AccountingPeriodStatus } from '../components/AccountingPeriodStatus';
import { TaxObligationsTimeline } from '../components/TaxObligationsTimeline';

export default function SpzooAccounting() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [activeTab, setActiveTab] = useState('overview');
  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadSetupState() {
      if (!selectedProfile?.id) return;
      
      setIsLoadingSetup(true);
      try {
        const state = await getAccountingSetupState(selectedProfile.id);
        setSetupState(state);
      } catch (error) {
        console.error('Failed to load setup state:', error);
      } finally {
        setIsLoadingSetup(false);
      }
    }
    
    loadSetupState();
  }, [selectedProfile?.id]);

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Wybierz profil spółki, aby zobaczyć księgowość.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show empty state for new businesses or businesses with no activity
  if (!isLoadingSetup && setupState && (setupState.stage === 'empty' || setupState.stage === 'configured_no_activity')) {
    return (
      <EmptyStateAccounting
        setupState={setupState}
        entityType="sp_zoo"
        onAction={(route) => navigate(route)}
      />
    );
  }

  const isSpZoo = selectedProfile.entityType === 'sp_zoo';
  const isSA = selectedProfile.entityType === 'sa';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Księgowość Spółki
          </h1>
          <p className="text-muted-foreground">
            {selectedProfile.name}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {isSpZoo ? 'Sp. z o.o.' : isSA ? 'S.A.' : 'Spółka'}
        </Badge>
      </div>

      {/* Period Status & Auto-Post */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccountingPeriodStatus businessProfileId={selectedProfile.id} />
        <UnpostedQueueWidget businessProfileId={selectedProfile.id} />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="ledger">Księga główna</TabsTrigger>
          <TabsTrigger value="capital">Kapitał</TabsTrigger>
          <TabsTrigger value="statements">Sprawozdania</TabsTrigger>
          <TabsTrigger value="obowiazki">Obowiązki</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Plan kont</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Aktywny</div>
                <p className="text-xs text-muted-foreground">
                  Polski plan kont dla spółek
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <a href="/accounting/chart-of-accounts">Zobacz plan kont →</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Księgowania</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Automatyczne</div>
                <p className="text-xs text-muted-foreground">
                  Reguły księgowania aktywne
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <a href="/accounting/posting-rules">Zarządzaj regułami →</a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Kapitał zakładowy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedProfile.share_capital?.toLocaleString('pl-PL') || '0'} PLN
                </div>
                <p className="text-xs text-muted-foreground">
                  Kapitał zadeklarowany
                </p>
                <Button variant="link" className="p-0 h-auto mt-2" asChild>
                  <a href="/accounting/capital-events">Zdarzenia kapitałowe →</a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ostatnie księgowania</CardTitle>
              <CardDescription>
                Automatycznie zaksięgowane dokumenty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lista ostatnich zapisów księgowych pojawi się tutaj...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Księga główna</CardTitle>
              <CardDescription>
                Wszystkie zapisy księgowe w układzie chronologicznym
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Widok księgi głównej w przygotowaniu...
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/accounting/ledger">Otwórz księgę główną →</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capital" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zdarzenia kapitałowe</CardTitle>
              <CardDescription>
                Wkłady, podwyższenia, dywidendy, uchwały
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Zarządzanie kapitałem spółki...
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/accounting/capital-events">Otwórz moduł kapitału →</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wspólnicy</CardTitle>
              <CardDescription>
                Struktura właścicielska i udziały
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Lista wspólników i ich udziałów...
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/accounting/shareholders">Zarządzaj wspólnikami →</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bilans</CardTitle>
              <CardDescription>
                Aktywa, pasywa, kapitał własny
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href="/accounting/balance-sheet">Otwórz bilans →</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rachunek zysków i strat</CardTitle>
              <CardDescription>
                Przychody, koszty, wynik finansowy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href="/accounting/profit-loss">Otwórz RZiS →</a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="obowiazki" className="space-y-4">
          <TaxObligationsTimeline
            businessProfileId={selectedProfile.id}
            entityType="spolka"
            isVatExempt={false}
            taxType="cit"
          />
        </TabsContent>
      </Tabs>

      {/* Info Alert */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Księgowość spółki wymaga pełnej ewidencji księgowej zgodnie z ustawą o rachunkowości.
          System automatycznie księguje dokumenty według reguł księgowania.
        </AlertDescription>
      </Alert>
    </div>
  );
}
