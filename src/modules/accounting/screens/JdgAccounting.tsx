import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Calendar, TrendingUp, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { KPiRView } from '../components/KPiRView';
import { ZusPaymentTracker } from '../components/ZusPaymentTracker';
import { PitAdvancesTracker } from '../components/PitAdvancesTracker';
import { TaxObligationsTimeline } from '../components/TaxObligationsTimeline';
import { EmptyStateAccounting } from '../components/EmptyStateAccounting';
import { getAccountingSetupState, SetupState } from '../domain/setupState';
import type { BusinessProfile } from '@/shared/types';

export default function JdgAccounting() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
  const [activeTab, setActiveTab] = useState('ewidencja');
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
            Wybierz profil działalności gospodarczej, aby zobaczyć księgowość.
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
        entityType="dzialalnosc"
        onAction={(route) => navigate(route)}
      />
    );
  }

  // Data-driven from profile
  const taxType = selectedProfile.taxType || selectedProfile.tax_type;
  const isRyczalt = taxType === 'ryczalt';
  const isLiniowy = taxType === 'liniowy';
  const isSkala = taxType === 'skala';
  const isVatExempt = selectedProfile.is_vat_exempt ?? false;
  const ryczaltRate = selectedProfile.defaultRyczaltRate;

  return (
    <div className="space-y-6 p-6">
      {/* Header with Tax Regime Summary */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Księgowość JDG</h1>
        <p className="text-muted-foreground">
          {selectedProfile.name}
        </p>
      </div>

      {/* Tax Regime Card - Data-driven */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Forma opodatkowania
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Podatek dochodowy</p>
              <div className="flex items-center gap-2">
                {isRyczalt && (
                  <Badge variant="default">Ryczałt {ryczaltRate ? `${ryczaltRate}%` : ''}</Badge>
                )}
                {isLiniowy && (
                  <Badge variant="default">Liniowy 19%</Badge>
                )}
                {isSkala && (
                  <Badge variant="default">Skala podatkowa (PIT)</Badge>
                )}
                {!taxType && (
                  <Badge variant="outline">Nie ustawiono</Badge>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">VAT</p>
              <div className="flex items-center gap-2">
                {isVatExempt ? (
                  <>
                    <Badge variant="secondary">Zwolniony (art. 113)</Badge>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </>
                ) : (
                  <Badge variant="default">Czynny podatnik VAT</Badge>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ewidencja</p>
              <Badge variant="outline">
                {isRyczalt ? 'Ewidencja przychodów' : 'KPiR'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ewidencja">
            {isRyczalt ? 'Ewidencja' : 'KPiR'}
          </TabsTrigger>
          <TabsTrigger value="obowiazki">Obowiązki podatkowe</TabsTrigger>
          <TabsTrigger value="zus">ZUS</TabsTrigger>
          <TabsTrigger value="pit">PIT</TabsTrigger>
        </TabsList>

        <TabsContent value="ewidencja" className="space-y-4">
          <KPiRView 
            businessProfileId={selectedProfile.id}
            isRyczalt={isRyczalt}
          />
        </TabsContent>

        <TabsContent value="obowiazki" className="space-y-4">
          <TaxObligationsTimeline
            businessProfileId={selectedProfile.id}
            entityType="jdg"
            isVatExempt={isVatExempt}
            taxType={selectedProfile.tax_type}
          />
        </TabsContent>

        <TabsContent value="zus" className="space-y-4">
          <ZusPaymentTracker businessProfileId={selectedProfile.id} />
        </TabsContent>

        <TabsContent value="pit" className="space-y-4">
          <PitAdvancesTracker 
            businessProfileId={selectedProfile.id}
            taxType={selectedProfile.tax_type}
            ryczaltRate={ryczaltRate}
          />
        </TabsContent>
      </Tabs>

      {/* Info Alert for VAT Exempt */}
      {isVatExempt && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Jesteś zwolniony z VAT (art. 113). Nie musisz składać deklaracji JPK_V7M.
            System będzie monitorował zbliżanie się do limitu 200 000 PLN.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
