import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Nip8FormHelper from '@/components/spolka/Nip8FormHelper';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const CompanyRegistry = () => {
  const navigate = useNavigate();
  const { profiles, selectedProfileId } = useBusinessProfile();
  const selectedProfile = profiles?.find(p => p.id === selectedProfileId);

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

  const complianceStatus = {
    nip8: {
      filed: selectedProfile.nip_8_filed || false,
      date: selectedProfile.nip_8_filed_date,
    },
    vatR: {
      filed: selectedProfile.vat_status === 'vat' || selectedProfile.vat_status === 'vat_ue',
      date: null,
    },
    krs: {
      complete: !!(selectedProfile.krs_number && selectedProfile.court_registry),
    },
  };

  const allCompliant = complianceStatus.nip8.filed && complianceStatus.krs.complete;

  return (
    <div className="space-y-6 pb-20 px-4 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Rejestr Spółki
            </h1>
            <p className="text-muted-foreground text-sm">
              Oficjalne dane rejestrowe i formularze zgłoszeniowe
            </p>
          </div>
        </div>

      {/* Compliance Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Status zgodności rejestrowej</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* NIP-8 Status */}
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              {complianceStatus.nip8.filed ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div>
                <p className="font-medium">NIP-8</p>
                <p className="text-sm text-muted-foreground">
                  {complianceStatus.nip8.filed ? (
                    <>
                      Złożony
                      {complianceStatus.nip8.date && (
                        <span className="block text-xs">
                          {format(new Date(complianceStatus.nip8.date), 'dd.MM.yyyy')}
                        </span>
                      )}
                    </>
                  ) : (
                    'Nie złożony'
                  )}
                </p>
              </div>
            </div>

            {/* KRS Status */}
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              {complianceStatus.krs.complete ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              )}
              <div>
                <p className="font-medium">KRS</p>
                <p className="text-sm text-muted-foreground">
                  {complianceStatus.krs.complete ? (
                    <>
                      Zarejestrowany
                      {selectedProfile.krs_number && (
                        <span className="block text-xs font-mono">
                          {selectedProfile.krs_number}
                        </span>
                      )}
                    </>
                  ) : (
                    'Brak danych'
                  )}
                </p>
              </div>
            </div>

            {/* VAT Status */}
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              {complianceStatus.vatR.filed ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              )}
              <div>
                <p className="font-medium">VAT</p>
                <p className="text-sm text-muted-foreground">
                  {complianceStatus.vatR.filed ? (
                    'Czynny podatnik VAT'
                  ) : selectedProfile.is_vat_exempt ? (
                    'Zwolniony z VAT'
                  ) : (
                    'Nie dotyczy'
                  )}
                </p>
              </div>
            </div>
          </div>

          {allCompliant && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-900 font-medium">
                ✓ Wszystkie wymagane formularze zostały złożone
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="nip8" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="nip8">
            <FileText className="h-4 w-4 mr-2" />
            NIP-8
          </TabsTrigger>
          <TabsTrigger value="registry">
            <Building2 className="h-4 w-4 mr-2" />
            Dane KRS
          </TabsTrigger>
          <TabsTrigger value="vat">
            <FileText className="h-4 w-4 mr-2" />
            VAT-R
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nip8" className="mt-6">
          <Nip8FormHelper profile={selectedProfile} />
        </TabsContent>

        <TabsContent value="registry" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Dane z Krajowego Rejestru Sądowego</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Numer KRS</p>
                  <p className="text-lg font-mono">{selectedProfile.krs_number || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sąd rejestrowy</p>
                  <p className="text-lg">{selectedProfile.court_registry || '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data wpisu</p>
                  <p className="text-lg">
                    {selectedProfile.establishment_date
                      ? format(new Date(selectedProfile.establishment_date), 'dd.MM.yyyy')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kapitał zakładowy</p>
                  <p className="text-lg">
                    {selectedProfile.share_capital
                      ? `${selectedProfile.share_capital.toLocaleString('pl-PL')} PLN`
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Dane KRS są pobierane z profilu biznesowego. Aby je zaktualizować, przejdź do ustawień profilu.
                </p>
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  Edytuj dane KRS
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vat" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Status VAT</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Status podatnika VAT</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProfile.vat_status === 'vat' || selectedProfile.vat_status === 'vat_ue'
                        ? 'Czynny podatnik VAT'
                        : selectedProfile.is_vat_exempt
                        ? 'Zwolniony z VAT (art. 113)'
                        : 'Nie dotyczy'}
                    </p>
                  </div>
                  <Badge variant={selectedProfile.vat_status === 'vat' ? 'default' : 'secondary'}>
                    {selectedProfile.vat_status === 'vat' ? 'VAT' : 'Zwolniony'}
                  </Badge>
                </div>

                {selectedProfile.is_vat_exempt && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-900">
                      <strong>Podstawa prawna:</strong>{' '}
                      {selectedProfile.vat_exemption_reason || 'art. 113 ust. 1 ustawy o VAT'}
                    </p>
                    <p className="text-sm text-blue-900 mt-2">
                      <strong>Limit zwolnienia:</strong>{' '}
                      {selectedProfile.vat_threshold_pln?.toLocaleString('pl-PL') || '200 000'} PLN
                    </p>
                  </div>
                )}

                {(selectedProfile.vat_status === 'vat' || selectedProfile.vat_status === 'vat_ue') && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-900">
                      Spółka jest zarejestrowana jako czynny podatnik VAT.
                      Formularz VAT-R został złożony w Urzędzie Skarbowym.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Aby zmienić status VAT, przejdź do ustawień profilu biznesowego.
                </p>
                <Button variant="outline" onClick={() => navigate('/settings')}>
                  Zarządzaj VAT
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CompanyRegistry;
