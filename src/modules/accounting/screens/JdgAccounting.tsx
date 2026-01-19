import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { FileText, Calculator, CreditCard, Shield, CheckCircle2 } from 'lucide-react';
import { EmptyStateAccounting } from '../components/EmptyStateAccounting';
import { getAccountingSetupState, SetupState } from '../domain/setupState';
import type { BusinessProfile } from '@/shared/types';

export default function JdgAccounting() {
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);
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
          <FileText className="h-4 w-4" />
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

      {/* Ryczałt Accounts Management Card - Only for ryczał users */}
      {isRyczalt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              Konta ryczałtowe
            </CardTitle>
            <CardDescription>
              Zarządzaj swoimi kontami ryczałtowymi do grupowania przychodów
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Badge 
                className="cursor-pointer hover:bg-amber-100"
                onClick={() => navigate('/accounting/ryczalt-accounts')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Zarządzaj kontami
              </Badge>
              <Badge 
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => navigate('/accounting/ewidencja')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ewidencja przychodów
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Stwórz konta dla różnych usług (np. "Usługi IT", "Konsulting") i grupuj przychody według Twoich potrzeb.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/ewidencja')}>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-medium">{isRyczalt ? 'Ewidencja' : 'KPiR'}</h3>
            <p className="text-sm text-muted-foreground">
              {isRyczalt ? 'Ewidencja przychodów' : 'Podatkowa księga przychodów'}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/vat')}>
          <CardContent className="p-4 text-center">
            <Calculator className="h-8 w-8 mx-auto mb-2 text-violet-600" />
            <h3 className="font-medium">VAT</h3>
            <p className="text-sm text-muted-foreground">
              Podatek od towarów i usług
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/pit')}>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <h3 className="font-medium">PIT</h3>
            <p className="text-sm text-muted-foreground">
              Podatek dochodowy
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/accounting/zus')}>
          <CardContent className="p-4 text-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <h3 className="font-medium">ZUS</h3>
            <p className="text-sm text-muted-foreground">
              Składki ubezpieczeniowe
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert for VAT Exempt */}
      {isVatExempt && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Jesteś zwolniony z VAT (art. 113). Nie musisz składać deklaracji JPK_V7M.
            System będzie monitorował zbliżanie się do limitu 200 000 PLN.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}