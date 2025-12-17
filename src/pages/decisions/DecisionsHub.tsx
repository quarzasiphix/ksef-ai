import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield, Users, Briefcase, TrendingUp, FileText, 
  Plus, Eye, Edit, AlertCircle, CheckCircle2, Clock,
  ArrowUpCircle, ArrowDownCircle, FileCheck, Receipt
} from 'lucide-react';
import { getDecisions } from '@/integrations/supabase/repositories/decisionsRepository';
import type { Decision } from '@/types/decisions';
import { DECISION_TYPE_LABELS, DECISION_CATEGORY_LABELS, DECISION_STATUS_LABELS } from '@/types/decisions';

const DecisionsHub = () => {
  const navigate = useNavigate();
  const { selectedProfileId, profiles } = useBusinessProfile();

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];
      return getDecisions(selectedProfileId);
    },
    enabled: !!selectedProfileId,
  });

  const activeDecisions = decisions.filter(d => d.status === 'active');
  const strategicDecisions = activeDecisions.filter(d => d.decision_type === 'strategic_shareholders');
  const operationalDecisions = activeDecisions.filter(d => d.decision_type === 'operational_board');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'revoked':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getUsagePercentage = (decision: Decision): number => {
    if (!decision.amount_limit || !decision.total_amount_used) return 0;
    return Math.min((decision.total_amount_used / decision.amount_limit) * 100, 100);
  };

  if (!selectedProfile) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Wybierz profil biznesowy</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Decyzje i Mandaty</h1>
          <p className="text-muted-foreground mt-1">
            Źródło autoryzacji dla wszystkich operacji spółki
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/contracts')}>
            <FileText className="h-4 w-4 mr-2" />
            Dokumenty
          </Button>
          <Button onClick={() => navigate('/decisions/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nowa decyzja
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktywne decyzje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDecisions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Strategiczne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div className="text-2xl font-bold">{strategicDecisions.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Operacyjne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold">{operationalDecisions.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Całkowite wykorzystanie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {decisions.reduce((sum, d) => sum + (d.total_amount_used || 0), 0).toFixed(0)} PLN
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Decisions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-purple-600" />
          <h2 className="text-xl font-semibold">Decyzje strategiczne (Uchwały wspólników)</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {strategicDecisions.map(decision => (
            <Card key={decision.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{decision.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {DECISION_CATEGORY_LABELS[decision.category]}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(decision.status)}
                    <Badge variant={decision.status === 'active' ? 'default' : 'secondary'}>
                      {DECISION_STATUS_LABELS[decision.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {decision.scope_description && (
                  <p className="text-sm text-muted-foreground">
                    {decision.scope_description}
                  </p>
                )}
                
                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {decision.total_contracts || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Umowy</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {decision.total_invoices || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Faktury</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {decision.total_expenses || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Wydatki</div>
                  </div>
                </div>

                {/* Amount Limit Progress */}
                {decision.amount_limit && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Wykorzystanie limitu</span>
                      <span className="font-medium">
                        {(decision.total_amount_used || 0).toFixed(0)} / {decision.amount_limit.toFixed(0)} {decision.currency}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(decision)} />
                  </div>
                )}

                {/* Validity Period */}
                {(decision.valid_from || decision.valid_to) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {decision.valid_from && `Od ${new Date(decision.valid_from).toLocaleDateString('pl-PL')}`}
                      {decision.valid_from && decision.valid_to && ' - '}
                      {decision.valid_to && `Do ${new Date(decision.valid_to).toLocaleDateString('pl-PL')}`}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/decisions/${decision.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Szczegóły
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/decisions/${decision.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Operational Decisions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Decyzje operacyjne (Uchwały zarządu)</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {operationalDecisions.map(decision => (
            <Card key={decision.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{decision.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {DECISION_CATEGORY_LABELS[decision.category]}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(decision.status)}
                    <Badge variant={decision.status === 'active' ? 'default' : 'secondary'}>
                      {DECISION_STATUS_LABELS[decision.status]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {decision.scope_description && (
                  <p className="text-sm text-muted-foreground">
                    {decision.scope_description}
                  </p>
                )}
                
                {/* Usage Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {decision.total_contracts || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Umowy</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {decision.total_invoices || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Faktury</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {decision.total_expenses || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Wydatki</div>
                  </div>
                </div>

                {/* Amount Limit Progress */}
                {decision.amount_limit && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Wykorzystanie limitu</span>
                      <span className="font-medium">
                        {(decision.total_amount_used || 0).toFixed(0)} / {decision.amount_limit.toFixed(0)} {decision.currency}
                      </span>
                    </div>
                    <Progress value={getUsagePercentage(decision)} />
                  </div>
                )}

                {/* Validity Period */}
                {(decision.valid_from || decision.valid_to) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      {decision.valid_from && `Od ${new Date(decision.valid_from).toLocaleDateString('pl-PL')}`}
                      {decision.valid_from && decision.valid_to && ' - '}
                      {decision.valid_to && `Do ${new Date(decision.valid_to).toLocaleDateString('pl-PL')}`}
                    </span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/decisions/${decision.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Szczegóły
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/decisions/${decision.id}/edit`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {decisions.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Brak decyzji</h3>
            <p className="text-muted-foreground mb-4">
              Decyzje to fundament autoryzacji w systemie. Każda operacja musi być powiązana z decyzją.
            </p>
            <Button onClick={() => navigate('/decisions/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Utwórz pierwszą decyzję
            </Button>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default DecisionsHub;
