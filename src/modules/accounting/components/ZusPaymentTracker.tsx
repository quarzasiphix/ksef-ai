import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Plus, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ZusPaymentTrackerProps {
  businessProfileId: string;
}

interface ZusPayment {
  id: string;
  month: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
}

export function ZusPaymentTracker({ businessProfileId }: ZusPaymentTrackerProps) {
  const [payments, setPayments] = useState<ZusPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [businessProfileId]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zus_payments')
        .select('*')
        .eq('business_profile_id', businessProfileId)
        .order('month', { ascending: false })
        .limit(12);

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading ZUS payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (payment: ZusPayment) => {
    if (payment.is_paid) {
      return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Opłacone</Badge>;
    }
    return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Nieopłacone</Badge>;
  };

  // Default ZUS amounts for JDG (2024 rates)
  const defaultZusAmounts = {
    pension: 1380.48, // Emerytalne
    disability: 540.00, // Rentowe
    sickness: 320.00, // Chorobowe (optional)
    health: 450.00, // Zdrowotne
    total: 2690.48
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Płatności ZUS</CardTitle>
            <CardDescription>
              Składki społeczne i zdrowotne
            </CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj płatność
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Default amounts info */}
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Standardowe składki ZUS (2024)</h4>
            <Badge variant="outline" className="text-xs">Przykład (do konfiguracji)</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Emerytalne</p>
              <p className="font-medium">{defaultZusAmounts.pension.toFixed(2)} PLN</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rentowe</p>
              <p className="font-medium">{defaultZusAmounts.disability.toFixed(2)} PLN</p>
            </div>
            <div>
              <p className="text-muted-foreground">Chorobowe</p>
              <p className="font-medium">{defaultZusAmounts.sickness.toFixed(2)} PLN</p>
            </div>
            <div>
              <p className="text-muted-foreground">Zdrowotne</p>
              <p className="font-medium">{defaultZusAmounts.health.toFixed(2)} PLN</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm font-semibold">Razem: {defaultZusAmounts.total.toFixed(2)} PLN miesięcznie</p>
          </div>
        </div>

        {/* Payments list */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Ładowanie...</p>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Brak zarejestrowanych płatności ZUS
            </p>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{payment.month}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.amount.toFixed(2)} PLN
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {payment.paid_at && (
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(payment.paid_at), 'dd.MM.yyyy', { locale: pl })}
                    </span>
                  )}
                  {getStatusBadge(payment)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
          <p className="text-blue-900 dark:text-blue-100">
            <strong>Termin płatności:</strong> Do 10. dnia następnego miesiąca przez PUE ZUS (platforma.zus.pl)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
