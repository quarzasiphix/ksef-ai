import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PitAdvancesTrackerProps {
  businessProfileId: string;
  taxType?: string;
  ryczaltRate?: number;
}

interface PitAdvance {
  id: string;
  year: number;
  quarter: number;
  revenue_base: number;
  computed_tax_due: number;
  paid_amount: number;
  status: string;
  due_date: string;
}

export function PitAdvancesTracker({ businessProfileId, taxType, ryczaltRate }: PitAdvancesTrackerProps) {
  const [advances, setAdvances] = useState<PitAdvance[]>([]);
  const [loading, setLoading] = useState(true);

  const isRyczalt = taxType === 'ryczalt';
  const isLiniowy = taxType === 'liniowy';
  const isSkala = taxType === 'skala';

  useEffect(() => {
    loadAdvances();
  }, [businessProfileId]);

  const loadAdvances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pit_advances')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .order('year', { ascending: false })
        .order('quarter', { ascending: false })
        .limit(8);

      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      console.error('Error loading PIT advances:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuarterLabel = (quarter: number) => {
    return `Q${quarter}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-600">Opłacone</Badge>;
      case 'partial':
        return <Badge variant="secondary">Częściowo</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Zaległe</Badge>;
      default:
        return <Badge variant="outline">Nieopłacone</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Zaliczki PIT</CardTitle>
            <CardDescription>
              {isRyczalt && 'Ryczałt - rozliczenie kwartalne (PIT-28)'}
              {isLiniowy && 'Podatek liniowy 19% - rozliczenie miesięczne (PIT-36L)'}
              {isSkala && 'Skala podatkowa - rozliczenie miesięczne (PIT-36)'}
              {!taxType && 'Nie ustawiono formy opodatkowania'}
            </CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj zaliczkę
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Info about calculation - tax regime aware */}
        {isRyczalt && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <h4 className="font-semibold mb-2">Jak liczyć zaliczkę ryczałt?</h4>
            <p className="text-sm text-muted-foreground">
              Zaliczka = Przychód brutto × stawka ryczałtu (zależna od kategorii)
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Przykład: Usługi IT (12%): 50 000 PLN × 12% = 6 000 PLN
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Przykład: Handel (3%): 50 000 PLN × 3% = 1 500 PLN
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Formularz: PIT-28 (roczne zeznanie), zaliczki kwartalne
            </p>
          </div>
        )}
        {isLiniowy && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-semibold mb-2">Podatek liniowy 19%</h4>
            <p className="text-sm text-muted-foreground">
              Zaliczka = (Przychód - Koszty) × 19%
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Formularz: PIT-36L (roczne zeznanie), zaliczki miesięczne
            </p>
          </div>
        )}
        {isSkala && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
            <h4 className="font-semibold mb-2">Skala podatkowa (progresywna)</h4>
            <p className="text-sm text-muted-foreground">
              Zaliczka wg skali: 12% lub 32% (zależnie od dochodu)
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Formularz: PIT-36 (roczne zeznanie), zaliczki miesięczne
            </p>
          </div>
        )}

        {/* Advances list */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Ładowanie...</p>
          ) : advances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Brak zarejestrowanych zaliczek PIT
              </p>
              <p className="text-sm text-muted-foreground">
                System automatycznie obliczy zaliczki na podstawie przychodów w ewidencji
              </p>
            </div>
          ) : (
            advances.map((advance) => (
              <div key={advance.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {getQuarterLabel(advance.quarter)} {advance.year}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Przychód: {advance.revenue_base.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-semibold">
                    {advance.computed_tax_due.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
                  </p>
                  {getStatusBadge(advance.status)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <p className="text-blue-900 dark:text-blue-100">
            <strong>Termin płatności:</strong> 20. dzień miesiąca następującego po kwartale przez e-Urząd Skarbowy
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
