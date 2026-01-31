import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Lock, Unlock, Calendar, FileText, Receipt, Banknote, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

interface AccountingPeriodStatusProps {
  businessProfileId: string;
}

interface AccountingPeriod {
  id: string;
  year: number;
  month: number;
  status: 'open' | 'closing' | 'locked';
  is_locked: boolean;
  locked_at: string | null;
}

export function AccountingPeriodStatus({ businessProfileId }: AccountingPeriodStatusProps) {
  const [currentPeriod, setCurrentPeriod] = useState<AccountingPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasFinancialEvents, setHasFinancialEvents] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCurrentPeriod();
  }, [businessProfileId]);

  const loadCurrentPeriod = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Check if period exists
      const { data: periodData, error: periodError } = await supabase
        .from('accounting_periods')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .eq('period_year', year)
        .eq('period_month', month)
        .maybeSingle();

      if (periodError && periodError.code !== 'PGRST116') throw periodError;
      setCurrentPeriod(periodData);

      // Check if any financial events exist for this business
      const { data: hasEvents, error: eventsError } = await supabase
        .rpc('has_financial_events', {
          p_business_profile_id: businessProfileId,
          p_year: year,
          p_month: month
        });

      if (eventsError) {
        console.error('Error checking financial events:', eventsError);
        setHasFinancialEvents(null);
      } else {
        setHasFinancialEvents(hasEvents);
      }
    } catch (error) {
      console.error('Error loading period:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isLocked: boolean) => {
    if (isLocked) {
      return <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" />Zamknięty</Badge>;
    }
    switch (status) {
      case 'closing':
        return <Badge variant="secondary">Zamykanie...</Badge>;
      default:
        return <Badge variant="default" className="bg-green-600"><Unlock className="h-3 w-3 mr-1" />Otwarty</Badge>;
    }
  };

  const currentMonth = format(new Date(), 'LLLL yyyy', { locale: pl });

  return (
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
                {getStatusBadge(currentPeriod.status, currentPeriod.is_locked)}
              </div>
              {currentPeriod.locked_at && (
                <div className="text-sm text-muted-foreground">
                  Zamknięty: {format(new Date(currentPeriod.locked_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                </div>
              )}
              {currentPeriod.is_locked && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-sm">
                  <p className="text-red-900 dark:text-red-100">
                    Okres zamknięty. Nie można księgować dokumentów z tego okresu.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {hasFinancialEvents === false ? (
                // Zero state: No financial events exist
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Brak zdarzeń finansowych
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Okresy księgowe tworzą się automatycznie, gdy dodasz pierwszy dokument w danym miesiącu.
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Dodaj pierwszy dokument
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => navigate('/invoices/income/new')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Faktura sprzedaży
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/invoices/expense/new')}>
                        <Receipt className="h-4 w-4 mr-2" />
                        Faktura zakupu
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/expenses')}>
                        <Banknote className="h-4 w-4 mr-2" />
                        Wydatek
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => navigate('/accounting/chart-of-accounts')}
                  >
                    Zobacz plan kont
                  </Button>
                </>
              ) : (
                // Events exist but period not created - should auto-create
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <p className="text-sm text-amber-900 dark:text-amber-100">
                      Wykryto zdarzenia bez okresu księgowego. System automatycznie utworzy brakujące okresy.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      toast.info('Odśwież stronę - okresy powinny być już utworzone');
                      loadCurrentPeriod();
                    }}
                  >
                    Odśwież
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Okresy są automatycznie zamykane 20. dnia następnego miesiąca
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
