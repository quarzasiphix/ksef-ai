/**
 * Unaccounted Queue Panel - Control Center for Compliance Tasks
 * 
 * Shows invoices that need attention:
 * 1. Paid but unposted
 * 2. Missing category assignment
 * 3. Posting errors
 * 
 * Each item has a single "Fix" CTA
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { AlertTriangle, DollarSign, Tag, XCircle, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

interface UnaccountedInvoice {
  id: string;
  number: string;
  issue_date: string;
  customer_name: string;
  total_gross_value: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  payment_date?: string;
  accounting_status: 'unposted' | 'error';
  error_reason?: string;
  missing_category?: boolean;
}

interface UnaccountedQueuePanelProps {
  businessProfileId: string;
  periodYear: number;
  periodMonth: number;
  onAssignCategories?: (invoiceIds: string[]) => void;
  onViewInvoice?: (invoiceId: string) => void;
  onFixError?: (invoiceId: string) => void;
}

export function UnaccountedQueuePanel({
  businessProfileId,
  periodYear,
  periodMonth,
  onAssignCategories,
  onViewInvoice,
  onFixError,
}: UnaccountedQueuePanelProps) {
  const [paidUnposted, setPaidUnposted] = React.useState<UnaccountedInvoice[]>([]);
  const [missingCategory, setMissingCategory] = React.useState<UnaccountedInvoice[]>([]);
  const [errors, setErrors] = React.useState<UnaccountedInvoice[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUnaccountedInvoices();
  }, [businessProfileId, periodYear, periodMonth]);

  const loadUnaccountedInvoices = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual data fetching
      // For now, using mock data structure
      
      // Separate into categories:
      // 1. Paid but unposted
      // 2. Missing category
      // 3. Posting errors
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading unaccounted invoices:', error);
      setLoading(false);
    }
  };

  const totalUnaccounted = paidUnposted.length + missingCategory.length + errors.length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Ładowanie...</div>
        </CardContent>
      </Card>
    );
  }

  if (totalUnaccounted === 0) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <div className="h-8 w-8 rounded-full bg-green-200 flex items-center justify-center">
              ✓
            </div>
            <div>
              <p className="font-semibold">Wszystko zaksięgowane</p>
              <p className="text-sm text-green-700 dark:text-green-200">
                Brak dokumentów wymagających uwagi w tym okresie
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Paid but Unposted */}
      {paidUnposted.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <DollarSign className="h-4 w-4" />
                Opłacone, ale niezaksięgowane
                <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                  {paidUnposted.length}
                </Badge>
              </CardTitle>
              {onAssignCategories && (
                <Button
                  size="sm"
                  onClick={() => onAssignCategories(paidUnposted.map(inv => inv.id))}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Przypisz konta
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {paidUnposted.slice(0, 3).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{invoice.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {invoice.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                    </span>
                    <span className="font-medium text-amber-800">
                      {formatCurrency(invoice.total_gross_value)}
                    </span>
                    {invoice.payment_date && (
                      <span className="text-green-700">
                        Opłacona: {format(new Date(invoice.payment_date), 'dd MMM', { locale: pl })}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewInvoice?.(invoice.id)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {paidUnposted.length > 3 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                i {paidUnposted.length - 3} więcej...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Missing Category */}
      {missingCategory.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Tag className="h-4 w-4" />
                Brak przypisanego konta
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700">
                  {missingCategory.length}
                </Badge>
              </CardTitle>
              {onAssignCategories && (
                <Button
                  size="sm"
                  onClick={() => onAssignCategories(missingCategory.map(inv => inv.id))}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Przypisz konta
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingCategory.slice(0, 3).map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border border-blue-200 dark:border-blue-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{invoice.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {invoice.customer_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(invoice.total_gross_value)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewInvoice?.(invoice.id)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {missingCategory.length > 3 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                i {missingCategory.length - 3} więcej...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Posting Errors */}
      {errors.length > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-900 dark:text-red-100">
              <XCircle className="h-4 w-4" />
              Błędy księgowania
              <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700">
                {errors.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {errors.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg border border-red-200 dark:border-red-800"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{invoice.number}</span>
                    <span className="text-xs text-muted-foreground">
                      {invoice.customer_name}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-red-700">
                    {invoice.error_reason || 'Nieznany błąd'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onFixError?.(invoice.id)}
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Napraw
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Compact summary badge for showing in header
 */
export function UnaccountedSummaryBadge({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
      <AlertTriangle className="h-3 w-3 mr-1" />
      {count} do zaksięgowania
    </Badge>
  );
}
