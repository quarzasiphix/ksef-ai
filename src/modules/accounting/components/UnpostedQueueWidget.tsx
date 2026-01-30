import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { AlertCircle, FileText, Lock, Tag, User, Calendar } from 'lucide-react';
import { AutoPostingButton } from './AutoPostingButton';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useAccountingPeriod } from '../hooks/useAccountingPeriod';
import type { PeriodKey } from '../hooks/useAccountingPeriod';

interface UnpostedInvoice {
  id: string;
  number: string;
  issue_date: string;
  customer_name: string;
  total_gross_value: number;
  accounting_error_reason: string | null;
}

interface UnpostedQueueWidgetProps {
  businessProfileId: string;
  onNavigateToInvoice?: (invoiceId: string) => void;
}

export function UnpostedQueueWidget({ businessProfileId, onNavigateToInvoice }: UnpostedQueueWidgetProps) {
  const [unpostedInvoices, setUnpostedInvoices] = useState<UnpostedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  
  // Get current period from hook
  const { period } = useAccountingPeriod();
  const periodKey = period.key;

  // Calculate period boundaries for date filtering
  const periodStart = new Date(periodKey.year, periodKey.month - 1, 1);
  const periodEnd = new Date(periodKey.year, periodKey.month, 0, 23, 59, 59);

  useEffect(() => {
    loadUnpostedInvoices();
  }, [businessProfileId, periodKey.year, periodKey.month]);

  const loadUnpostedInvoices = async () => {
    setLoading(true);
    try {

      // Fetch unposted invoices for the period
      const { data, error } = await supabase
        .from('invoices')
        .select('id, number, issue_date, total_gross_value, accounting_error_reason, customers!inner(name)')
        .eq('business_profile_id', businessProfileId)
        .eq('accounting_status', 'unposted')
        .gte('issue_date', periodStart.toISOString())
        .lte('issue_date', periodEnd.toISOString())
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedData = (data || []).map((invoice: any) => ({
        id: invoice.id,
        number: invoice.number,
        issue_date: invoice.issue_date,
        customer_name: invoice.customers?.[0]?.name || 'Nieznany',
        total_gross_value: invoice.total_gross_value,
        accounting_error_reason: invoice.accounting_error_reason
      }));

      setUnpostedInvoices(transformedData);
    } catch (error) {
      console.error('Error loading unposted invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group by error reason
  const groupedByReason = unpostedInvoices.reduce((groups, invoice) => {
    const reason = invoice.accounting_error_reason || 'ready_to_post';
    if (!groups[reason]) {
      groups[reason] = [];
    }
    groups[reason].push(invoice);
    return groups;
  }, {} as Record<string, UnpostedInvoice[]>);

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, { label: string; icon: any; color: string }> = {
      'ready_to_post': { label: 'Gotowe do zaksięgowania', icon: FileText, color: 'text-green-600' },
      'MISSING_CATEGORY': { label: 'Brak kategorii ryczałtu', icon: Tag, color: 'text-orange-600' },
      'LOCKED_PERIOD': { label: 'Okres zamknięty', icon: Lock, color: 'text-red-600' },
      'PENDING_ACCEPTANCE': { label: 'Oczekuje na akceptację', icon: User, color: 'text-blue-600' },
      'MISSING_PERIOD': { label: 'Brak okresu księgowego', icon: Calendar, color: 'text-amber-600' }
    };
    return labels[reason] || { label: reason, icon: AlertCircle, color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (unpostedInvoices.length === 0) {
    return null; // Don't show widget if no unposted invoices
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Niezaksięgowane dokumenty
            </CardTitle>
            <CardDescription>
              {unpostedInvoices.length} {unpostedInvoices.length === 1 ? 'dokument' : unpostedInvoices.length < 5 ? 'dokumenty' : 'dokumentów'} w okresie {format(new Date(periodKey.year, periodKey.month - 1), 'MMMM yyyy', { locale: pl })}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Zwiń' : 'Rozwiń'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary by reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(groupedByReason).map(([reason, invoices]) => {
              const reasonInfo = getReasonLabel(reason);
              const ReasonIcon = reasonInfo.icon;
              return (
                <div key={reason} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <ReasonIcon className={`h-4 w-4 ${reasonInfo.color}`} />
                    <span className="text-sm font-medium">{reasonInfo.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                </div>
              );
            })}
          </div>

          {/* Expanded list */}
          {expanded && (
            <div className="space-y-3 pt-3 border-t">
              {Object.entries(groupedByReason).map(([reason, invoices]) => {
                const reasonInfo = getReasonLabel(reason);
                const ReasonIcon = reasonInfo.icon;
                return (
                  <div key={reason} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ReasonIcon className={`h-4 w-4 ${reasonInfo.color}`} />
                      {reasonInfo.label}
                    </div>
                    <div className="space-y-1 ml-6">
                      {invoices.map(invoice => (
                        <div
                          key={invoice.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => onNavigateToInvoice?.(invoice.id)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{invoice.number}</p>
                            <p className="text-xs text-muted-foreground">{(invoice as any).customers?.[0]?.name || 'Nieznany'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{invoice.total_gross_value.toFixed(2)} PLN</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(invoice.issue_date), 'dd.MM.yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action button */}
          {groupedByReason['ready_to_post'] && groupedByReason['ready_to_post'].length > 0 && (
            <div className="pt-3 border-t">
              <AutoPostingButton
                mode="batch"
                businessProfileId={businessProfileId}
                onPosted={loadUnpostedInvoices}
                startDate={periodStart}
                endDate={periodEnd}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
