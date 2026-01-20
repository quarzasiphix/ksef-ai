import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { ScrollArea } from '@/shared/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Loader2, CheckCircle2, AlertCircle, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/invoice-utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useGlobalData } from '@/shared/hooks/use-global-data';
import { useQueryClient } from '@tanstack/react-query';

interface RyczaltAccount {
  id: string;
  account_name: string;
  account_number: string;
  category_rate: number;
}

interface InvoiceAssignment {
  id: string;
  number: string;
  issue_date: string;
  customer_name: string;
  total_gross_value: number;
  ryczalt_account_id: string | null;
}

interface RyczaltAccountAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessProfileId: string;
  periodStart: Date;
  periodEnd: Date;
  onAssignmentsComplete: () => void;
  invoiceIds?: string[]; // Optional: specific invoice IDs that need assignment
}

export function RyczaltAccountAssignmentModal({
  open,
  onOpenChange,
  businessProfileId,
  periodStart,
  periodEnd,
  onAssignmentsComplete,
  invoiceIds,
}: RyczaltAccountAssignmentModalProps) {
  const [ryczaltAccounts, setRyczaltAccounts] = useState<RyczaltAccount[]>([]);
  const [invoiceAssignments, setInvoiceAssignments] = useState<InvoiceAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Use sync manager to get invoices efficiently
  const { invoices: invoicesQuery } = useGlobalData();
  const invoices = invoicesQuery.data || [];
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, businessProfileId, periodStart, periodEnd]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load ryczalt accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('ryczalt_accounts')
        .select('id, account_name, account_number, ryczalt_categories(rate)')
        .eq('business_profile_id', businessProfileId)
        .order('account_number');

      if (accountsError) throw accountsError;

      // Transform accounts data
      const transformedAccounts = (accounts || []).map((acc: any) => ({
        id: acc.id,
        account_name: acc.account_name,
        account_number: acc.account_number,
        category_rate: acc.ryczalt_categories?.rate || 0,
      }));

      setRyczaltAccounts(transformedAccounts);

      let targetInvoices: any[] = [];

      if (invoiceIds && invoiceIds.length > 0) {
        // Fetch specific invoices that need assignment
        const { data: specificInvoices, error: specificError } = await supabase
          .from('invoices')
          .select('id, number, issue_date, total_gross_value, customers!inner(name)')
          .eq('business_profile_id', businessProfileId)
          .in('id', invoiceIds);

        if (specificError) throw specificError;
        targetInvoices = specificInvoices || [];
      } else {
        // Filter invoices from sync manager cache by period and missing account
        targetInvoices = invoices.filter(inv => {
          const invoiceDate = new Date(inv.issueDate);
          return (
            inv.businessProfileId === businessProfileId &&
            inv.accountingStatus === 'unposted' &&
            (inv.acceptanceStatus === 'accepted' || inv.acceptanceStatus === 'auto_accepted') &&
            inv.transactionType === 'income' &&
            !(inv as any).ryczalt_account_id &&
            invoiceDate >= periodStart &&
            invoiceDate <= periodEnd
          );
        });
      }

      // Transform to assignment format
      const assignments: InvoiceAssignment[] = targetInvoices.map((inv: any) => ({
        id: inv.id,
        number: inv.number,
        issue_date: inv.issue_date || inv.issueDate,
        customer_name: inv.customers?.name || inv.customerName || inv.buyer?.name || 'Nieznany klient',
        total_gross_value: inv.total_gross_value || inv.totalGrossValue || inv.totalAmount || 0,
        ryczalt_account_id: null,
      }));

      setInvoiceAssignments(assignments);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Błąd podczas ładowania danych');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (invoiceId: string, accountId: string) => {
    setInvoiceAssignments(prev =>
      prev.map(inv =>
        inv.id === invoiceId
          ? { ...inv, ryczalt_account_id: accountId }
          : inv
      )
    );
  };

  const handleSaveAssignments = async () => {
    // Validate all invoices have accounts assigned
    const unassigned = invoiceAssignments.filter(inv => !inv.ryczalt_account_id);
    if (unassigned.length > 0) {
      toast.error('Przypisz konta', {
        description: `${unassigned.length} faktur nie ma przypisanego konta ryczałtowego`,
      });
      return;
    }

    setSaving(true);
    try {
      // Update all invoices with their assigned accounts
      const updates = invoiceAssignments.map(inv =>
        supabase
          .from('invoices')
          .update({ ryczalt_account_id: inv.ryczalt_account_id })
          .eq('id', inv.id)
      );

      await Promise.all(updates);

      toast.success('Zapisano przypisania', {
        description: `Przypisano ${invoiceAssignments.length} faktur do kont ryczałtowych`,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });

      onAssignmentsComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Błąd podczas zapisywania');
    } finally {
      setSaving(false);
    }
  };

  const allAssigned = invoiceAssignments.every(inv => inv.ryczalt_account_id);
  const assignedCount = invoiceAssignments.filter(inv => inv.ryczalt_account_id).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Przypisz faktury do kont ryczałtowych
          </DialogTitle>
          <DialogDescription>
            Wybierz konto ryczałtowe dla każdej faktury przed zaksięgowaniem.
            Okres: {format(periodStart, 'MMMM yyyy', { locale: pl })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : invoiceAssignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>Wszystkie faktury mają już przypisane konta ryczałtowe</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Badge variant={allAssigned ? 'default' : 'secondary'}>
                {assignedCount} / {invoiceAssignments.length} przypisanych
              </Badge>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {invoiceAssignments.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="border rounded-lg p-4 space-y-3 bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{invoice.number}</span>
                          {invoice.ryczalt_account_id && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                          </span>
                          <span>{invoice.customer_name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 font-semibold">
                          <DollarSign className="h-4 w-4" />
                          {formatCurrency(invoice.total_gross_value)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Konto ryczałtowe</label>
                      <Select
                        value={invoice.ryczalt_account_id || ''}
                        onValueChange={(value) => handleAccountChange(invoice.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz konto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ryczaltAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              <div className="flex items-center justify-between gap-4">
                                <span>
                                  {account.account_number} - {account.account_name}
                                </span>
                                <Badge variant="outline" className="ml-2">
                                  {account.category_rate}%
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSaveAssignments}
            disabled={!allAssigned || saving || invoiceAssignments.length === 0}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zapisz i kontynuuj księgowanie
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
