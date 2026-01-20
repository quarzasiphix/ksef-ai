import React, { useState } from 'react';
import { Lock, Clock, AlertTriangle, CheckCircle, RefreshCw, Shield, Calendar } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Progress } from '@/shared/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/shared/ui/dialog';
import { format, differenceInDays } from 'date-fns';
import { pl } from 'date-fns/locale';
import { usePeriodLocking } from '../hooks/usePeriodLocking';
import { toast } from 'sonner';

interface PeriodLockingWidgetProps {
  compact?: boolean;
  showCriticalOnly?: boolean;
  autoLockEnabled?: boolean;
}

export function PeriodLockingWidget({
  compact = false,
  showCriticalOnly = false,
  autoLockEnabled = true
}: PeriodLockingWidgetProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  
  const {
    periodsNeedingAttention,
    isChecking,
    isLocking,
    lastCheckTime,
    checkPeriods,
    lockPeriods,
    runAutoLock,
    hasOverduePeriods,
    totalOverduePeriods,
    criticalPeriods,
  } = usePeriodLocking({
    autoCheck: autoLockEnabled,
    checkInterval: 30, // Check every 30 minutes
    showToast: true,
  });

  const displayPeriods = showCriticalOnly ? criticalPeriods : periodsNeedingAttention;
  const hasCriticalPeriods = criticalPeriods.length > 0;

  const handleLockPeriods = async () => {
    const result = await lockPeriods({ dryRun });
    
    if (dryRun) {
      toast.info(
        `Symulacja: ${result.lockedPeriods.length} okresów zostałoby zablokowanych`,
        { duration: 4000 }
      );
    } else {
      if (result.success && result.lockedPeriods.length > 0) {
        toast.success(
          `Zablokowano ${result.lockedPeriods.length} okresów`,
          { duration: 4000 }
        );
      }
    }
    
    setShowLockDialog(false);
  };

  const getUrgencyColor = (daysOverdue: number) => {
    if (daysOverdue > 60) return 'text-red-600 bg-red-50 border-red-200';
    if (daysOverdue > 30) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getUrgencyIcon = (daysOverdue: number) => {
    if (daysOverdue > 60) return <AlertTriangle className="h-4 w-4" />;
    if (daysOverdue > 30) return <Clock className="h-4 w-4" />;
    return <Lock className="h-4 w-4" />;
  };

  if (compact) {
    if (!hasOverduePeriods) return null;

    return (
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${hasCriticalPeriods ? 'bg-red-100' : 'bg-amber-100'}`}>
                {hasCriticalPeriods ? (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-600" />
                )}
              </div>
              <div>
                <div className="font-medium text-sm">
                  {hasCriticalPeriods ? 'Krytyczne okresy' : 'Okresy do zablokowania'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalOverduePeriods} okresów wymaga uwagi
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(true)}
            >
              Szczegóły
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Blokada okresów rozliczeniowych</CardTitle>
                <CardDescription>
                  Automatyczna blokada okresów po terminie płatności podatku (20. dnia następnego miesiąca)
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkPeriods}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? 'animate-spin' : ''}`} />
                Odśwież
              </Button>
              {lastCheckTime && (
                <span className="text-xs text-muted-foreground">
                  Sprawdzono: {format(lastCheckTime, 'HH:mm')}
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!hasOverduePeriods ? (
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-800">Wszystko w porządku</div>
                <div className="text-sm text-green-600">
                  Brak okresów wymagających blokady
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Alert */}
              <Alert className={hasCriticalPeriods ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {hasCriticalPeriods ? (
                    <>
                      <strong>Uwaga:</strong> {criticalPeriods.length} krytycznych okresów wymaga natychmiastowej blokady.
                      {' '}Okresy są opóźnione o ponad 30 dni!
                    </>
                  ) : (
                    <>
                      {totalOverduePeriods} okresów wymaga blokady po terminie płatności podatku.
                      {' '}Zalecane jest zablokowanie tych okresów w celu zachowania integralności danych.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {/* Periods List */}
              <div className="space-y-2">
                {displayPeriods.map((period) => (
                  <div
                    key={`${period.year}-${period.month}`}
                    className={`flex items-center justify-between p-3 rounded-lg border ${getUrgencyColor(period.daysOverdue)}`}
                  >
                    <div className="flex items-center gap-3">
                      {getUrgencyIcon(period.daysOverdue)}
                      <div>
                        <div className="font-medium">
                          {format(new Date(period.year, period.month - 1, 1), 'LLLL yyyy', { locale: pl })}
                        </div>
                        <div className="text-sm opacity-75">
                          Termin: {format(period.deadline, 'dd MMMM yyyy', { locale: pl })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">
                        {period.daysOverdue > 0 ? `+${period.daysOverdue} dni` : 'Dziś'}
                      </Badge>
                      {period.hasUnpostedInvoices && (
                        <div className="text-xs text-amber-600 mt-1">
                          ⚠️ Niezaksięgowane faktury
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowLockDialog(true)}
                  disabled={isLocking || displayPeriods.every(p => p.hasUnpostedInvoices)}
                  className="flex-1"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {isLocking ? 'Blokowanie...' : 'Zablokuj okresy'}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={runAutoLock}
                  disabled={isLocking}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Auto-blokada
                </Button>
              </div>

              {displayPeriods.every(p => p.hasUnpostedInvoices) && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Wszystkie okresy mają niezaksięgowane faktury. Zablokowanie nie jest możliwe
                    do czasu zaksięgowania wszystkich dokumentów.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Auto-lock Status */}
          {autoLockEnabled && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Auto-blokada włączona - okresy są automatycznie blokowane po terminie</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lock Confirmation Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zablokuj okresy rozliczeniowe</DialogTitle>
            <DialogDescription>
              Zablokowane okresy nie mogą być modyfikowane. Ta operacja zapewnia integralność danych
              po upływie terminu płatności podatku.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Do zablokowania:</label>
              {displayPeriods.map((period) => (
                <div key={`${period.year}-${period.month}`} className="flex justify-between text-sm">
                  <span>
                    {format(new Date(period.year, period.month - 1, 1), 'LLLL yyyy', { locale: pl })}
                  </span>
                  <span className="text-muted-foreground">
                    +{period.daysOverdue} dni po terminie
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="dryRun" className="text-sm">
                Tylko symulacja (nie blokuj naprawdę)
              </label>
            </div>

            {dryRun && (
              <Alert className="border-blue-200 bg-blue-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  W trybie symulacji zobaczysz, które okresy zostałyby zablokowane,
                  ale żadne zmiany nie zostaną zapisane.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLockDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={handleLockPeriods} disabled={isLocking}>
              {isLocking ? 'Blokowanie...' : dryRun ? 'Symuluj blokadę' : 'Zablokuj okresy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
