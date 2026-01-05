/**
 * Orphaned Event Banner
 * 
 * Shows when an event is not assigned to a chain
 * Provides auto-attach and manual attach options
 */

import React, { useState } from 'react';
import { AlertCircle, Link2, Search, Plus, Loader2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { autoAttachEvent } from '../data/orphanedEventsRepository';
import { getMethodDescription, getConfidenceColor } from '../types/orphanedEvents';
import type { AttachEventResult } from '../types/orphanedEvents';

interface OrphanedEventBannerProps {
  eventId: string;
  onAttached?: (result: AttachEventResult) => void;
  onChooseChain?: () => void;
  onCreateChain?: () => void;
}

export function OrphanedEventBanner({
  eventId,
  onAttached,
  onChooseChain,
  onCreateChain,
}: OrphanedEventBannerProps) {
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachResult, setAttachResult] = useState<AttachEventResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAutoAttach = async () => {
    setIsAttaching(true);
    setError(null);
    
    try {
      const result = await autoAttachEvent(eventId);
      
      if (result.success) {
        setAttachResult(result);
        onAttached?.(result);
      } else {
        setError(result.error || 'Nie udało się przypisać zdarzenia');
      }
    } catch (err) {
      console.error('Error auto-attaching event:', err);
      setError('Wystąpił błąd podczas przypisywania zdarzenia');
    } finally {
      setIsAttaching(false);
    }
  };

  // If successfully attached, show success message
  if (attachResult?.success) {
    return (
      <Alert className="mb-4 border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="ml-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-green-900">
                Zdarzenie zostało przypisane do łańcucha
              </p>
              <p className="text-sm text-green-700 mt-1">
                {getMethodDescription(attachResult.method || 'manual')}
                {attachResult.created_new_chain && ' (utworzono nowy łańcuch)'}
              </p>
            </div>
            <Badge 
              variant="outline" 
              className={`bg-${getConfidenceColor(attachResult.confidence || 0.5)}-100 text-${getConfidenceColor(attachResult.confidence || 0.5)}-800 border-${getConfidenceColor(attachResult.confidence || 0.5)}-300`}
            >
              Pewność: {Math.round((attachResult.confidence || 0) * 100)}%
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="ml-2">
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                Nieprzypisane do łańcucha
              </Badge>
            </div>
            <p className="text-sm text-orange-900">
              To zdarzenie jest starszego typu lub zostało utworzone bez łańcucha. 
              Przypisz je, aby widzieć pełną historię.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleAutoAttach}
              disabled={isAttaching}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isAttaching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Przypisywanie...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-2" />
                  Przypisz automatycznie
                </>
              )}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onChooseChain}
              disabled={isAttaching}
            >
              <Search className="h-4 w-4 mr-2" />
              Wybierz łańcuch
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onCreateChain}
              disabled={isAttaching}
            >
              <Plus className="h-4 w-4 mr-2" />
              Utwórz nowy łańcuch
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
