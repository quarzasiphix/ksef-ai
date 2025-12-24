import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Shield, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DecisionStateCardProps {
  decisionId?: string;
  decisionReference?: string;
  isSpoolka?: boolean;
  hasRequiredDecision?: boolean;
  isAutoApproved?: boolean;
  transactionType?: 'income' | 'expense';
  amount?: number;
  currency?: string;
}

const DecisionStateCard: React.FC<DecisionStateCardProps> = ({
  decisionId,
  decisionReference,
  isSpoolka,
  hasRequiredDecision,
  isAutoApproved,
  transactionType,
  amount,
  currency = 'PLN',
}) => {
  // Determine decision state
  const getDecisionState = () => {
    if (!isSpoolka) {
      return {
        status: 'not_required',
        label: 'Nie wymaga decyzji',
        icon: CheckCircle,
        color: 'text-gray-600 border-gray-300',
        bgColor: 'bg-gray-50 dark:bg-gray-900/20',
        explanation: 'Dokument dla działalności jednoosobowej - nie wymaga formalnej decyzji zarządu.',
      };
    }

    if (decisionId && hasRequiredDecision) {
      return {
        status: 'approved',
        label: 'Zaakceptowana przez zarząd',
        icon: Shield,
        color: 'text-green-600 border-green-600',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        explanation: 'Dokument zatwierdzony formalną decyzją zarządu. Wpływa na rozliczenia podatkowe po zatwierdzeniu.',
      };
    }

    if (isAutoApproved) {
      return {
        status: 'auto_approved',
        label: 'Automatycznie zaakceptowana',
        icon: CheckCircle,
        color: 'text-blue-600 border-blue-600',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        explanation: 'Dokument poniżej progu wymagającego decyzji zarządu. Zaakceptowany automatycznie zgodnie z regulaminem.',
      };
    }

    return {
      status: 'pending',
      label: 'Wymaga decyzji księgowego',
      icon: AlertTriangle,
      color: 'text-orange-600 border-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      explanation: 'Dokument wymaga zatwierdzenia przez księgowego lub zarząd przed ujęciem w rozliczeniach.',
    };
  };

  const state = getDecisionState();
  const Icon = state.icon;

  return (
    <Card className={`${state.bgColor} border-2 ${state.color.replace('text-', 'border-')}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${state.color}`} />
            <CardTitle className="text-base">Status decyzyjny dokumentu</CardTitle>
          </div>
          <Badge variant="outline" className={state.color}>
            {state.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {state.explanation}
        </p>

        {decisionId && decisionReference && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Powiązana decyzja:</span>
              <Link 
                to={`/decisions/${decisionId}`}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                {decisionReference}
              </Link>
            </div>
          </div>
        )}

        {state.status === 'pending' && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="font-medium">Wymagane działanie:</span>
              <span className="text-muted-foreground">
                Przypisz decyzję zarządu lub zatwierdź jako księgowy
              </span>
            </div>
          </div>
        )}

        {isSpoolka && amount && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            💡 Dokumenty spółki z o.o. wymagają śledzenia decyzji dla celów audytowych i KSeF.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DecisionStateCard;
