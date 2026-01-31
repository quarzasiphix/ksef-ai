import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessProfile } from '@/shared/context/BusinessProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { AlertCircle, FileText, Calendar, DollarSign, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { PostingEditor } from '../components/posting/PostingEditor';
import { formatCurrency } from '@/shared/lib/invoice-utils';

interface UnpostedInvoice {
  id: string;
  number: string;
  issue_date: string;
  transaction_type: string;
  total_gross_value: number;
  posting_status: string;
  accounting_error_reason?: string;
  customer_name?: string;
}

export default function PostingQueue() {
  const { selectedProfileId } = useBusinessProfile();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Fetch unposted invoices
  const { data: invoices = [], isLoading } = useQuery<UnpostedInvoice[]>({
    queryKey: ['unposted-invoices', selectedProfileId],
    queryFn: async () => {
      if (!selectedProfileId) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          number,
          issue_date,
          transaction_type,
          total_gross_value,
          posting_status,
          accounting_error_reason,
          customers (name)
        `)
        .eq('business_profile_id', selectedProfileId)
        .in('posting_status', ['unposted', 'needs_review', 'error'])
        .eq('acceptance_status', 'accepted')
        .order('issue_date', { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map(inv => ({
        ...inv,
        customer_name: (inv as any).customers?.name,
      })) as UnpostedInvoice[];
    },
    enabled: !!selectedProfileId,
  });

  const selectedInvoice = invoices.find(inv => inv.id === selectedInvoiceId);

  const needsReviewCount = invoices.filter(inv => inv.posting_status === 'needs_review').length;
  const errorCount = invoices.filter(inv => inv.posting_status === 'error').length;
  const unpostedCount = invoices.filter(inv => inv.posting_status === 'unposted').length;

  const handleOpenEditor = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedInvoiceId(null);
  };

  if (!selectedProfileId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Select a business profile</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Posting Queue</h1>
          <p className="text-muted-foreground">
            Invoices waiting for Chart of Accounts assignment
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Needs Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{needsReviewCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Auto-posting uncertain
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{errorCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Failed to post
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unposted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unpostedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Not yet processed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoices Requiring Action</CardTitle>
            <CardDescription>
              Click "Post" to manually assign Chart of Accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  No invoices waiting for posting
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.posting_status === 'error'
                              ? 'destructive'
                              : invoice.posting_status === 'needs_review'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {invoice.posting_status === 'needs_review'
                            ? 'Review'
                            : invoice.posting_status === 'error'
                            ? 'Error'
                            : 'Unposted'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{invoice.number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(invoice.issue_date), 'dd MMM yyyy', { locale: pl })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {invoice.transaction_type === 'income' ? 'Sale' : 'Expense'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {invoice.customer_name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total_gross_value)}
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        {invoice.accounting_error_reason ? (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground line-clamp-2">
                              {invoice.accounting_error_reason}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleOpenEditor(invoice.id)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Post
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Posting Editor Sheet */}
      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Post Invoice: {selectedInvoice?.number}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedInvoice && (
              <PostingEditor
                businessProfileId={selectedProfileId}
                sourceType="invoice"
                sourceId={selectedInvoice.id}
                initialDate={selectedInvoice.issue_date}
                initialDescription={`${selectedInvoice.transaction_type === 'income' ? 'Sprzedaż' : 'Zakup'} - ${selectedInvoice.number}`}
                initialReference={selectedInvoice.number}
                onSuccess={handleCloseEditor}
                onCancel={handleCloseEditor}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
