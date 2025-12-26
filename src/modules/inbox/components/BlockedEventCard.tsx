import React from 'react';
import { AlertTriangle, Shield, ExternalLink } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';

interface BlockedEventCardProps {
  blockedBy: string;
  blockedReason: string;
  onCreateDecision?: () => void;
  onViewRequirements?: () => void;
}

/**
 * Card showing why an event is blocked and what to do about it
 */
export const BlockedEventCard: React.FC<BlockedEventCardProps> = ({
  blockedBy,
  blockedReason,
  onCreateDecision,
  onViewRequirements,
}) => {
  return (
    <Alert variant="destructive" className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-red-900 dark:text-red-100">
        Zdarzenie zablokowane
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div className="text-sm text-red-800 dark:text-red-200">
          <div className="font-medium mb-1">Brak decyzji: {blockedBy}</div>
          <div className="text-xs">{blockedReason}</div>
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          {onCreateDecision && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCreateDecision}
              className="border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Utwórz decyzję
            </Button>
          )}
          {onViewRequirements && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewRequirements}
              className="text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              Zobacz wymagania
              <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
