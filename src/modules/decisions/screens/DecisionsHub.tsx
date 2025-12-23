import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import {
  Shield, Users, Briefcase, TrendingUp, FileText, 
  Plus, Eye, Edit, AlertCircle, CheckCircle2, Clock,
  ArrowUpCircle, ArrowDownCircle, FileCheck, Receipt, ChevronRight
} from 'lucide-react';
import { getDecisions, getDecisionWithUsage } from '@/integrations/supabase/repositories/decisionsRepository';
import type { Decision } from '@/shared/types/decisions';
import { DECISION_TYPE_LABELS, DECISION_CATEGORY_LABELS, DECISION_STATUS_LABELS } from '@/shared/types/decisions';

const DecisionInvoicesPreview: React.FC<{ decisionId: string; totalInvoices: number }> = ({
  decisionId,
  totalInvoices,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['decision-with-usage', decisionId],
    queryFn: async () => getDecisionWithUsage(decisionId),
    enabled: isOpen && totalInvoices > 0,
  });

  if (totalInvoices <= 0) return null;

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="px-0"
        onClick={() => setIsOpen((v) => !v)}
      >
        <Receipt className="h-4 w-4 mr-2" />
        {isOpen ? 'Ukryj faktury' : `Pokaż faktury (${totalInvoices})`}
      </Button>

      {isOpen && (
        <div className="space-y-2">
          {isFetching && (
            <div className="text-sm text-muted-foreground">Ładowanie...</div>
          )}
          {(data?.invoices || []).slice(0, 5).map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
              onClick={() => navigate(`/income/${inv.id}`)}
            >
              <div className="font-medium">{inv.number}</div>
              <div className="text-sm text-muted-foreground">
                {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('pl-PL') : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DecisionsHub = () => {
  const navigate = useNavigate();
  const { selectedProfileId, profiles } = useBusinessProfile();

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

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

  if (!isSpoolka) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Decyzje dostępne tylko dla Spółek</h2>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Decyzje</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Decyzje wspólników i zarządu wymagane do legalnego działania spółki
          </p>
        </div>
        <Button onClick={() => navigate('/decisions/new')} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nowa Decyzja
        </Button>
      </div>


      {/* Strategic Decisions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-purple-600" />
          <h2 className="text-base font-semibold">Decyzje strategiczne <span className="text-muted-foreground font-normal">(uchwały wspólników)</span></h2>
          <Badge variant="secondary" className="text-xs">{strategicDecisions.length}</Badge>
        </div>
        <div className="border rounded-lg divide-y border-l-4 border-l-purple-200">
          {strategicDecisions.map(decision => (
            <div 
              key={decision.id} 
              className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
              onClick={() => navigate(`/decisions/${decision.id}`)}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm truncate">{decision.title}</h3>
                    {decision.status === 'active' ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">Zatwierdzona</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">{DECISION_STATUS_LABELS[decision.status]}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Czy <span className="font-medium">wspólnicy</span> pozwalają {decision.scope_description || DECISION_CATEGORY_LABELS[decision.category]}?
                  </p>
                </div>
                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  {decision.amount_limit && (
                    <div className="text-right">
                      <div className="font-medium text-foreground">{(decision.total_amount_used || 0).toFixed(0)} PLN</div>
                      <div>z {decision.amount_limit.toFixed(0)} PLN</div>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                    Zobacz szczegóły
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Decisions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-blue-600" />
          <h2 className="text-base font-semibold">Decyzje operacyjne <span className="text-muted-foreground font-normal">(uchwały zarządu)</span></h2>
          <Badge variant="secondary" className="text-xs">{operationalDecisions.length}</Badge>
        </div>
        <div className="border rounded-lg divide-y border-l-4 border-l-blue-200">
          {operationalDecisions.map(decision => {
            const parent = decision.parent_decision_id ? decisions.find((d) => d.id === decision.parent_decision_id) : null;
            return (
              <div 
                key={decision.id} 
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/decisions/${decision.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{decision.title}</h3>
                      {decision.status === 'active' ? (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Do sprawdzenia</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{DECISION_STATUS_LABELS[decision.status]}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Czy <span className="font-medium">zarząd</span> może {decision.scope_description || DECISION_CATEGORY_LABELS[decision.category]}?
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    {decision.amount_limit && (
                      <div className="text-right">
                        <div className="font-medium text-foreground">{(decision.total_amount_used || 0).toFixed(0)} PLN</div>
                        <div>z {decision.amount_limit.toFixed(0)} PLN</div>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                      Zobacz szczegóły
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
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
