import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { CheckCircle2, AlertCircle, XCircle, ExternalLink } from 'lucide-react';
import type { DecisionReference } from '@/modules/decisions/decisions';

interface DecisionAuthorityBadgeProps {
  decisionRef?: DecisionReference | null;
  onNavigate?: () => void;
  compact?: boolean;
}

export const DecisionAuthorityBadge: React.FC<DecisionAuthorityBadgeProps> = ({
  decisionRef,
  onNavigate,
  compact = false
}) => {
  if (!decisionRef) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div className="flex items-center gap-1.5 text-amber-600">
          <AlertCircle className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
          <span className="font-medium">Brak decyzji</span>
        </div>
        <span className="text-muted-foreground">– wymagane zatwierdzenie</span>
      </div>
    );
  }

  const isValid = decisionRef.is_valid && decisionRef.decision_status === 'active';

  if (compact) {
    return (
      <Badge 
        variant={isValid ? "outline" : "destructive"}
        className={isValid ? "bg-green-50 text-green-700 border-green-200" : ""}
      >
        {isValid ? (
          <>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Zgodne
          </>
        ) : (
          <>
            <XCircle className="h-3 w-3 mr-1" />
            Nieważne
          </>
        )}
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground font-medium">Podstawa decyzyjna:</span>
        {isValid ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Zgodne
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Nieważne
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <div className="text-sm">
          <span className="font-medium">{decisionRef.decision_title}</span>
          {decisionRef.decision_number && (
            <span className="text-muted-foreground ml-2">
              {decisionRef.decision_number}
            </span>
          )}
        </div>
        {onNavigate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onNavigate}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Zobacz decyzję
          </Button>
        )}
      </div>
      
      {!isValid && decisionRef.validation_message && (
        <p className="text-xs text-red-600">
          {decisionRef.validation_message}
        </p>
      )}
    </div>
  );
};
