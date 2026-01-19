import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Lock, Unlock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { toast } from 'sonner';

interface AccountingPeriodStatusProps {
  businessProfileId: string;
}

interface AccountingPeriod {
  id: string;
  period_year: number;
  period_month: number;
  status: 'open' | 'closing' | 'locked';
  locked_at: string | null;
}

export function AccountingPeriodStatus({ businessProfileId }: AccountingPeriodStatusProps) {
  const [currentPeriod, setCurrentPeriod] = useState<AccountingPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCurrentPeriod();
  }, [businessProfileId]);

  const loadCurrentPeriod = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const { data, error } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .eq('period_year', year)
        .eq('period_month', month)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      setCurrentPeriod(data);
    } catch (error) {
      console.error('Error loading period:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPeriod = async () => {
    setCreating(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // First, migrate legacy invoices
      const { data: migrateResult, error: migrateError } = await supabase.rpc('migrate_legacy_invoices', {
        p_business_profile_id: businessProfileId
      });

      if (migrateError) throw migrateError;

      if (migrateResult?.updated_count > 0) {
        toast.success(`Zaktualizowano ${migrateResult.updated_count} starszych faktur`);
      }

      // Create period
      const { data, error } = await supabase.rpc('create_accounting_period', {
        p_business_profile_id: businessProfileId,
        p_year: year,
        p_month: month
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Okres księgowy utworzony');
        setShowCreateDialog(false);
        loadCurrentPeriod();
      } else {
        toast.error(data?.error || 'Nie udało się utworzyć okresu');
      }
    } catch (error) {
      console.error('Error creating period:', error);
      toast.error('Błąd podczas tworzenia okresu');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'locked':
        return <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Zamknięty</Badge>;
      case 'closing':
        return <Badge variant="secondary">Zamykanie...</Badge>;
      default:
        return <Badge variant="default" className="bg-green-600"><Unlock className="h-3 w-3 mr-1" />Otwarty</Badge>;
    }
  };

  const currentMonth = format(new Date(), 'LLLL yyyy', { locale: pl });

  return (
    <>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Utwórz okres księgowy</DialogTitle>
            <DialogDescription>
              Utworzysz okres księgowy dla {currentMonth}. System automatycznie zaktualizuje starsze faktury, aby były zgodne z nowym systemem księgowym.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>Migracja starszych faktur:</strong> System automatycznie ustawi status akceptacji i księgowania dla wszystkich wcześniejszych faktur.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Po utworzeniu okresu będziesz mógł:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Księgować dokumenty z tego okresu</li>
                <li>Zamknąć okres po zakończeniu miesiąca</li>
                <li>Generować raporty i deklaracje</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
              Anuluj
            </Button>
            <Button onClick={createPeriod} disabled={creating}>
              {creating ? 'Tworzenie...' : 'Utwórz okres'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Okres księgowy
        </CardTitle>
        <CardDescription>
          {currentMonth}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Ładowanie...</p>
          ) : currentPeriod ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status okresu:</span>
                {getStatusBadge(currentPeriod.status)}
              </div>
              {currentPeriod.locked_at && (
                <div className="text-sm text-muted-foreground">
                  Zamknięty: {format(new Date(currentPeriod.locked_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                </div>
              )}
              {currentPeriod.status === 'locked' && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-sm">
                  <p className="text-red-900 dark:text-red-100">
                    Okres zamknięty. Nie można księgować dokumentów z tego okresu.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Okres nie został jeszcze utworzony
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}>
                Utwórz okres
              </Button>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Okresy są automatycznie zamykane 20. dnia miesiąca
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
