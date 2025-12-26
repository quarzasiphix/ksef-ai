import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { syncManager, type SyncStatus } from '@/shared/services/syncManager';
import { Button } from '@/shared/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/tooltip';
import { cn } from '@/shared/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export const SyncStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Subscribe to sync status changes
    const unsubscribe = syncManager.subscribe((newStatus, newLastSync) => {
      setStatus(newStatus);
      setLastSync(newLastSync);
    });

    return unsubscribe;
  }, []);

  const handleForceSync = () => {
    syncManager.forceSync();
  };

  const getIcon = () => {
    switch (status) {
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'offline':
        return <CloudOff className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'idle':
      default:
        return lastSync ? <Check className="h-4 w-4" /> : <Cloud className="h-4 w-4" />;
    }
  };

  const getTooltipText = () => {
    switch (status) {
      case 'syncing':
        return 'Synchronizacja danych...';
      case 'offline':
        return 'Tryb offline - dane mogą być nieaktualne';
      case 'error':
        return 'Błąd synchronizacji - kliknij aby spróbować ponownie';
      case 'idle':
      default:
        if (lastSync) {
          return `Zsynchronizowano ${formatDistanceToNow(lastSync, { 
            addSuffix: true, 
            locale: pl 
          })}`;
        }
        return 'Dane zsynchronizowane';
    }
  };

  const getColorClass = () => {
    switch (status) {
      case 'syncing':
        return 'text-blue-500';
      case 'offline':
        return 'text-orange-500';
      case 'error':
        return 'text-red-500';
      case 'idle':
      default:
        return 'text-green-500';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0',
            status === 'error' && 'hover:bg-red-50 dark:hover:bg-red-950'
          )}
          onClick={status === 'error' ? handleForceSync : undefined}
          disabled={status === 'syncing'}
        >
          <span className={cn('transition-colors', getColorClass())}>
            {getIcon()}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <p className="text-sm font-medium">{getTooltipText()}</p>
          {status === 'offline' && (
            <p className="text-xs text-muted-foreground">
              Pracujesz w trybie offline. Zmiany zostaną zsynchronizowane po przywróceniu połączenia.
            </p>
          )}
          {status === 'error' && (
            <p className="text-xs text-muted-foreground">
              Kliknij aby spróbować ponownie
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
