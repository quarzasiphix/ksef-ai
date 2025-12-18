import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBusinessProfile } from '@/context/BusinessProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  Shield,
  FileCheck,
  FileText,
  Receipt,
  ArrowUpCircle,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { getDecision, getDecisionWithUsage } from '@/integrations/supabase/repositories/decisionsRepository';
import type { DecisionWithUsage } from '@/types/decisions';
import { DECISION_CATEGORY_LABELS, DECISION_STATUS_LABELS, DECISION_TYPE_LABELS } from '@/types/decisions';

const DecisionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedProfileId, profiles } = useBusinessProfile();

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);
  const isSpoolka = selectedProfile?.entityType === 'sp_zoo' || selectedProfile?.entityType === 'sa';

  const { data: decision, isLoading } = useQuery({
    queryKey: ['decision-with-usage', id],
    queryFn: async () => {
      if (!id) return null;
      return getDecisionWithUsage(id);
    },
    enabled: !!id,
  });

  const parentDecisionId = (decision as DecisionWithUsage | null)?.parent_decision_id ?? null;

  const { data: parentDecision } = useQuery({
    queryKey: ['decision-parent', parentDecisionId],
    queryFn: async () => {
      if (!parentDecisionId) return null;
      return getDecision(parentDecisionId);
    },
    enabled: !!parentDecisionId,
  });

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

  if (!id) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Brak ID decyzji</p>
      </div>
    );
  }

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

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Nie znaleziono decyzji</p>
      </div>
    );
  }

  const d: DecisionWithUsage = decision;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => navigate('/decisions')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {d.decision_number && (
              <Badge variant="secondary" className="text-xs">{d.decision_number}</Badge>
            )}
            <h1 className="text-2xl font-bold truncate">{d.title}</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {DECISION_CATEGORY_LABELS[d.category]}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => navigate(`/decisions/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edytuj
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Typ decyzji</div>
              <div className="flex items-center gap-2">
                {d.decision_type === 'strategic_shareholders' ? (
                  <Users className="h-4 w-4 text-purple-600" />
                ) : (
                  <Briefcase className="h-4 w-4 text-blue-600" />
                )}
                <span>{DECISION_TYPE_LABELS[d.decision_type]}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
              <div className="flex items-center gap-2">
                {getStatusIcon(d.status)}
                <span>{DECISION_STATUS_LABELS[d.status]}</span>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Limit</div>
              <div className="text-sm">
                {typeof d.amount_limit === 'number' ? `${d.amount_limit.toFixed(2)} ${d.currency || 'PLN'}` : 'Brak'}
              </div>
            </div>
          </div>

          {d.parent_decision_id && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Uchwała strategiczna</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/decisions/${d.parent_decision_id}`)}
              >
                {parentDecision?.decision_number ? `${parentDecision.decision_number} ` : ''}
                {parentDecision?.title || 'Otwórz decyzję nadrzędną'}
              </Button>
            </div>
          )}

          {(d.valid_from || d.valid_to) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Obowiązuje od</div>
                <div className="text-sm">{d.valid_from ? new Date(d.valid_from).toLocaleDateString('pl-PL') : '—'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Obowiązuje do</div>
                <div className="text-sm">{d.valid_to ? new Date(d.valid_to).toLocaleDateString('pl-PL') : '—'}</div>
              </div>
            </div>
          )}

          {d.scope_description && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Zakres</div>
              <p className="text-sm">{d.scope_description}</p>
            </div>
          )}

          {d.description && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Opis</div>
              <p className="text-sm">{d.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {d.contracts && d.contracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Umowy ({d.contracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/contracts/${c.id}`)}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.number}</div>
                    {c.subject && <div className="text-sm text-muted-foreground truncate">{c.subject}</div>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {c.issueDate ? new Date(c.issueDate).toLocaleDateString('pl-PL') : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {d.invoices && d.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-green-600" />
              Faktury ({d.invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => navigate(`/income/${inv.id}`)}
                >
                  <div className="font-medium">{inv.number}</div>
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{inv.totalGrossValue.toFixed(2)} PLN</div>
                    <div className="text-sm text-muted-foreground">
                      {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('pl-PL') : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {d.expenses && d.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5 text-orange-600" />
              Wydatki ({d.expenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.description || 'Wydatek'}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-medium">{e.amount.toFixed(2)} PLN</div>
                    <div className="text-sm text-muted-foreground">
                      {e.date ? new Date(e.date).toLocaleDateString('pl-PL') : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {d.documents && d.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Dokumenty ({d.documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {d.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{doc.title}</div>
                    <div className="text-sm text-muted-foreground truncate">{doc.file_name}</div>
                  </div>
                  {doc.created_at && (
                    <div className="text-sm text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('pl-PL')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!d.contracts?.length && !d.invoices?.length && !d.expenses?.length && !d.documents?.length && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              Brak powiązanych dokumentów dla tej decyzji.
            </p>
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  toast.info('Dodaj dokument (umowa/faktura/wydatek) i wybierz tę decyzję jako podstawę');
                }}
              >
                Jak powiązać?
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DecisionDetails;
