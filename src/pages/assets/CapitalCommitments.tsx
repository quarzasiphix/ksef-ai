// Capital Commitments - Decision → Asset flow
// UI shows "Capital Commitments" first, not "Assets list"
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield, Users, Briefcase, TrendingUp, FileText,
  Plus, Eye, ArrowRight, Building, Coins, AlertCircle,
  CheckCircle2, Clock, ChevronRight, Info
} from 'lucide-react';
import { getCapitalCommitmentsByBusinessProfile } from '@/integrations/supabase/repositories/assetsRepository';
import { ASSET_CLASS_LABELS, ASSET_STATUS_LABELS } from '@/types/assets';
import { formatCurrency } from '@/lib/invoice-utils';

const CapitalCommitments = () => {
  const navigate = useNavigate();
  const { selectedProfileId, profiles } = useBusinessProfile();

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const { data: commitments = [], isLoading } = useQuery({
    queryKey: ['capital-commitments', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      return getCapitalCommitmentsByBusinessProfile(selectedProfileId);
    },
    enabled: !!selectedProfileId,
  });

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
          <h2 className="text-2xl font-bold mb-2">Zarządzanie aktywami dostępne tylko dla Spółek</h2>
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

  const totalCommitted = commitments.reduce((sum, c) => sum + c.total_committed, 0);
  const totalDeployed = commitments.reduce((sum, c) => sum + c.total_deployed, 0);
  const deploymentRate = totalCommitted > 0 ? (totalDeployed / totalCommitted) * 100 : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Zaangażowanie kapitału</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Decyzje wiążące kapitał i aktywa spółki
          </p>
        </div>
        <Button onClick={() => navigate('/decisions/new')} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nowa Decyzja
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">
                Aktywa nie istnieją, bo zostały kupione
              </p>
              <p className="text-blue-700">
                Istnieją, bo spółka <span className="font-semibold">podjęła decyzję</span> o związaniu kapitału lub praw.
                Każdy składnik majątkowy musi być autoryzowany przez uchwałę wspólników lub decyzję zarządu.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kapitał zaangażowany
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommitted)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Suma zobowiązań z aktywnych decyzji
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kapitał wykorzystany
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDeployed)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Zrealizowane zobowiązania
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stopień realizacji
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deploymentRate.toFixed(1)}%</div>
            <Progress value={deploymentRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Capital Commitments by Decision */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Decyzje wiążące kapitał</h2>
          <Badge variant="secondary">{commitments.length}</Badge>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Ładowanie...</p>
            </CardContent>
          </Card>
        ) : commitments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Coins className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Brak zaangażowania kapitału</h3>
              <p className="text-muted-foreground mb-4">
                Każda decyzja o nabyciu, leasingu lub związaniu kapitału powinna być tutaj widoczna.
              </p>
              <Button onClick={() => navigate('/decisions/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Utwórz pierwszą decyzję
              </Button>
            </CardContent>
          </Card>
        ) : (
          commitments.map((commitment) => (
            <Card key={commitment.decision_id} className="border-l-4 border-l-purple-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {commitment.decision_type === 'strategic_shareholders' ? (
                        <Users className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Briefcase className="h-4 w-4 text-blue-600" />
                      )}
                      <CardTitle className="text-base">{commitment.decision_title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {commitment.decision_type === 'strategic_shareholders' ? 'Wspólnicy' : 'Zarząd'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Decyzja z {new Date(commitment.decision_date).toLocaleDateString('pl-PL')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/decisions/${commitment.decision_id}`)}
                  >
                    Zobacz decyzję
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Financial Summary */}
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Zobowiązania</p>
                    <p className="text-lg font-semibold">{formatCurrency(commitment.total_committed)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Wykorzystano</p>
                    <p className="text-lg font-semibold">{formatCurrency(commitment.total_deployed)}</p>
                  </div>
                </div>

                {/* Assets */}
                {commitment.assets.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Aktywa ({commitment.assets.length})</p>
                    <div className="space-y-2">
                      {commitment.assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/assets/${asset.id}`)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{asset.internal_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{ASSET_CLASS_LABELS[asset.asset_class]}</span>
                                <span>•</span>
                                <Badge variant="outline" className="text-xs">
                                  {ASSET_STATUS_LABELS[asset.status]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {asset.current_valuation && (
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {formatCurrency(asset.current_valuation.amount)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {asset.current_valuation.valuation_type}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Obligations */}
                {commitment.obligations.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Zobowiązania ({commitment.obligations.length})</p>
                    <div className="space-y-2">
                      {commitment.obligations.slice(0, 3).map((obligation) => (
                        <div
                          key={obligation.id}
                          className="flex items-center justify-between p-2 border rounded text-xs"
                        >
                          <div className="flex items-center gap-2">
                            {obligation.status === 'fulfilled' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : obligation.status === 'pending' ? (
                              <Clock className="h-3 w-3 text-orange-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-gray-600" />
                            )}
                            <span className="font-medium">{obligation.description}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(obligation.amount)}</span>
                        </div>
                      ))}
                      {commitment.obligations.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{commitment.obligations.length - 3} więcej
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-neutral-50 to-neutral-100 border-neutral-200">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Następne kroki</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate('/decisions/new')}
            >
              <div className="flex items-start gap-3 text-left">
                <Plus className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Utwórz nową decyzję</p>
                  <p className="text-xs text-muted-foreground">
                    Autoryzuj nabycie lub związanie kapitału
                  </p>
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto py-3"
              onClick={() => navigate('/assets/new')}
            >
              <div className="flex items-start gap-3 text-left">
                <Building className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Zarejestruj składnik majątkowy</p>
                  <p className="text-xs text-muted-foreground">
                    Powiąż aktywo z istniejącą decyzją
                  </p>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CapitalCommitments;
