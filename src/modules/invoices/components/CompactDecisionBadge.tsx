import React, { useState } from 'react';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/shared/lib/invoice-utils';

interface CompactDecisionBadgeProps {
  decisionId?: string;
  decisionReference?: string;
  isSpoolka: boolean;
  hasRequiredDecision: boolean;
  transactionType: 'income' | 'expense';
  amount: number;
  currency: string;
}

const CompactDecisionBadge: React.FC<CompactDecisionBadgeProps> = ({
  decisionId,
  decisionReference,
  isSpoolka,
  hasRequiredDecision,
  transactionType,
  amount,
  currency,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show for JDG
  if (!isSpoolka) {
    return null;
  }

  const getDecisionStatus = () => {
    if (decisionId) {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Zatwierdzona przez zarząd',
        variant: 'default' as const,
        color: 'text-green-700 dark:text-green-300',
      };
    }
    
    if (amount < 3500) {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Automatycznie zatwierdzona',
        variant: 'secondary' as const,
        color: 'text-blue-700 dark:text-blue-300',
      };
    }

    return {
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Wymaga decyzji księgowego',
      variant: 'outline' as const,
      color: 'text-orange-700 dark:text-orange-300',
    };
  };

  const status = getDecisionStatus();

  return (
    <div className="space-y-2">
      {/* Compact Badge */}
      <div className="flex items-center gap-2">
        <Badge variant={status.variant} className="flex items-center gap-1.5">
          {status.icon}
          <span>Decyzja: {status.label}</span>
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2"
        >
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {status.icon}
              <span className={status.color}>{status.label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {decisionId ? (
              <>
                <p className="text-muted-foreground">
                  Dokument został formalnie zatwierdzony przez zarząd spółki.
                </p>
                {decisionReference && (
                  <div>
                    <Link 
                      to={`/decisions/${decisionId}`}
                      className="text-primary hover:underline font-medium"
                    >
                      Zobacz decyzję {decisionReference} →
                    </Link>
                  </div>
                )}
              </>
            ) : amount < 3500 ? (
              <p className="text-muted-foreground">
                Kwota poniżej progu {formatCurrency(3500, currency)} — dokument nie wymaga formalnej decyzji zarządu.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Kwota przekracza próg {formatCurrency(3500, currency)} — dokument wymaga zatwierdzenia przez księgowego przed ujęciem w rozliczeniach.
              </p>
            )}
            
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Ten dokument wpływa na rozliczenia podatkowe (VAT, CIT) po zatwierdzeniu.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CompactDecisionBadge;
