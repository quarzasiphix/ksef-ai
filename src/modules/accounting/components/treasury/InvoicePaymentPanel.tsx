// Invoice Payment Panel - Records payments for invoices using treasury engine
// Supports partial payments, multiple payment methods, and full audit trail

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Badge } from '@/shared/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table';
import {
  CreditCard,
  Banknote,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Landmark,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { useInvoicePayment, usePaymentAccounts } from '@/shared/hooks/useTreasury';
import type { DocumentPayment } from '@/modules/accounting/treasury';

interface InvoicePaymentPanelProps {
  invoiceId: string;
  invoiceType: 'income' | 'expense';
  invoiceTotal: number;
  currency?: string;
  onPaymentRecorded?: () => void;
}

export function InvoicePaymentPanel({
  invoiceId,
  invoiceType,
  invoiceTotal,
  currency = 'PLN',
  onPaymentRecorded,
}: InvoicePaymentPanelProps) {
  const {
    status,
    loading,
    submitting,
    recordPayment,
    isPaid,
    isPartiallyPaid,
    remaining,
  } = useInvoicePayment({ invoiceId, invoiceType, invoiceTotal });

  const { accounts: bankAccounts } = usePaymentAccounts('BANK');
  const { accounts: cashAccounts } = usePaymentAccounts('CASH');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(remaining);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');

  const allAccounts = [...bankAccounts, ...cashAccounts];

  const handleOpenDialog = () => {
    setPaymentAmount(remaining);
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setSelectedAccountId(allAccounts[0]?.id || '');
    setNotes('');
    setDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedAccountId || paymentAmount <= 0) return;

    try {
      await recordPayment(selectedAccountId, paymentAmount, paymentDate, notes || undefined);
      toast.success('Płatność zarejestrowana');
      setDialogOpen(false);
      onPaymentRecorded?.();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error instanceof Error ? error.message : 'Błąd podczas rejestracji płatności');
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;
    switch (status.status) {
      case 'paid':
        return (
          <Badge className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Zapłacona
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <Clock className="h-3 w-3 mr-1" />
            Częściowo zapłacona
          </Badge>
        );
      case 'overpaid':
        return (
          <Badge variant="outline" className="text-red-600 border-red-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Nadpłata
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Oczekuje na płatność
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Płatności
              </CardTitle>
              <CardDescription>
                Historia płatności za {invoiceType === 'income' ? 'fakturę' : 'koszt'}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Do zapłaty</p>
              <p className="text-lg font-semibold">{invoiceTotal.toFixed(2)} {currency}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Zapłacono</p>
              <p className="text-lg font-semibold text-green-600">
                {status?.total_paid.toFixed(2) || '0.00'} {currency}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pozostało</p>
              <p className={`text-lg font-semibold ${remaining > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {remaining.toFixed(2)} {currency}
              </p>
            </div>
          </div>

          {/* Payment History */}
          {status?.payments && status.payments.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Konto</TableHead>
                    <TableHead className="text-right">Kwota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.payments.map((payment: DocumentPayment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'd MMM yyyy', { locale: pl })}
                      </TableCell>
                      <TableCell>{payment.payment_account_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        +{payment.amount.toFixed(2)} {payment.currency}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Add Payment Button */}
          {!isPaid && (
            <Button
              onClick={handleOpenDialog}
              className="w-full"
              variant={isPartiallyPaid ? 'outline' : 'default'}
            >
              <Plus className="h-4 w-4 mr-2" />
              {isPartiallyPaid ? 'Dodaj kolejną płatność' : 'Zarejestruj płatność'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejestracja płatności</DialogTitle>
            <DialogDescription>
              Zarejestruj {isPartiallyPaid ? 'kolejną ' : ''}płatność za {invoiceType === 'income' ? 'fakturę' : 'koszt'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Konto płatności</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz konto" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Landmark className="h-3 w-3" />
                        Konta bankowe
                      </div>
                      {bankAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.balance.toFixed(2)} {account.currency})
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {cashAccounts.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        Kasy
                      </div>
                      {cashAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.balance.toFixed(2)} {account.currency})
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment-amount">Kwota ({currency})</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining}
                  value={paymentAmount || ''}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />
                {remaining > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => setPaymentAmount(remaining)}
                  >
                    Zapłać całość ({remaining.toFixed(2)})
                  </Button>
                )}
              </div>
              <div>
                <Label htmlFor="payment-date">Data płatności</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="payment-notes">Notatki (opcjonalnie)</Label>
              <Input
                id="payment-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="np. numer przelewu, uwagi"
              />
            </div>

            {/* Warning if partial payment */}
            {paymentAmount > 0 && paymentAmount < remaining && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <p className="text-amber-800">
                  Rejestrujesz płatność częściową. Po tej płatności pozostanie do zapłaty:{' '}
                  <strong>{(remaining - paymentAmount).toFixed(2)} {currency}</strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Anuluj
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={!selectedAccountId || paymentAmount <= 0 || submitting}
            >
              {submitting ? 'Rejestrowanie...' : 'Zarejestruj płatność'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InvoicePaymentPanel;
