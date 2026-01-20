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
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { AlertCircle, Lock, Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { listRyczaltAccounts, type RyczaltAccount } from '@/modules/accounting/data/ryczaltRepository';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Invoice } from '@/shared/types';

interface PostInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  businessProfile: {
    id: string;
    entityType: string;
    tax_type?: string;
  };
  onSuccess: (accountInfo?: { accountName: string; accountRate: number }) => void;
}

export function PostInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  businessProfile,
  onSuccess
}: PostInvoiceDialogProps) {
  const [isPosting, setIsPosting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [ryczaltAccounts, setRyczaltAccounts] = useState<RyczaltAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [periodInfo, setPeriodInfo] = useState<{ year: number; month: number; label: string } | null>(null);

  const isJdg = businessProfile.entityType === 'dzialalnosc';
  const isRyczalt = businessProfile.tax_type === 'ryczalt';
  const isIncome = invoice.transactionType === 'income';
  const needsRyczaltCategory = isJdg && isRyczalt && isIncome;

  // Debug logging
  console.log('PostInvoiceDialog debug:', {
    entityType: businessProfile.entityType,
    tax_type: businessProfile.tax_type,
    transactionType: invoice.transactionType,
    isJdg,
    isRyczalt,
    isIncome,
    needsRyczaltCategory
  });

  // Calculate period from invoice date
  useEffect(() => {
    if (invoice.issueDate) {
      const date = new Date(invoice.issueDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthNames = [
        'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
        'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
      ];
      setPeriodInfo({
        year,
        month,
        label: `${monthNames[month - 1]} ${year}`
      });
    }
  }, [invoice.issueDate]);

  // Fetch ryczałt accounts if needed
  useEffect(() => {
    async function fetchAccounts() {
      if (!needsRyczaltCategory || !businessProfile.id) return;
      
      setIsLoadingAccounts(true);
      try {
        const accounts = await listRyczaltAccounts(businessProfile.id);
        setRyczaltAccounts(accounts);
        
        // Pre-select if invoice already has an account
        if ((invoice as any).ryczalt_account_id) {
          setSelectedAccountId((invoice as any).ryczalt_account_id);
        }
      } catch (error) {
        console.error('Failed to load ryczałt accounts:', error);
        toast.error('Nie udało się załadować kont ryczałtowych');
      } finally {
        setIsLoadingAccounts(false);
      }
    }
    
    if (open) {
      fetchAccounts();
    }
  }, [open, needsRyczaltCategory, businessProfile.id, invoice]);

  const handlePost = async () => {
    if (needsRyczaltCategory && !selectedAccountId) {
      toast.error('W ryczałcie musisz wybrać konto ryczałtowe');
      return;
    }

    // Check if invoice is already posted
    if (invoice.accountingStatus === 'posted') {
      toast.error('Ta faktura została już zaksięgowana');
      return;
    }

    setIsPosting(true);
    try {
      // Update invoice with ryczałt account if needed - MUST complete before posting
      if (needsRyczaltCategory && selectedAccountId) {
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ ryczalt_account_id: selectedAccountId })
          .eq('id', invoice.id);

        if (updateError) {
          console.error('Failed to update ryczałt account:', updateError);
          throw new Error('Nie udało się zapisać konta ryczałtowego');
        }

        // Wait a moment to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Call appropriate posting function
      const rpcFunction = isJdg ? 'post_to_jdg_register' : 'auto_post_invoice_unified';
      
      const { data, error } = await supabase.rpc(rpcFunction, {
        p_invoice_id: invoice.id
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      // Check if posting was successful
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        const errorMessage = data.message || data.error || 'Posting failed';
        console.error('Posting failed:', data);
        throw new Error(errorMessage);
      }

      // Pass account info to onSuccess if it's a ryczałt account
      const accountInfo = selectedAccount ? {
        accountName: selectedAccount.account_name,
        accountRate: selectedAccount.category_rate
      } : undefined;
      
      toast.success('Dokument został zaksięgowany');
      onSuccess(accountInfo);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to post invoice:', error);
      const errorMsg = error.message || 'Nieznany błąd';
      toast.error(`Nie udało się zaksięgować: ${errorMsg}`);
    } finally {
      setIsPosting(false);
    }
  };

  const selectedAccount = ryczaltAccounts.find(a => a.id === selectedAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Zaksięgować dokument?
          </DialogTitle>
          <DialogDescription>
            Dokument zostanie zaksięgowany i zablokowany do edycji pól księgowych.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Period Info */}
          {periodInfo && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">Okres księgowy</div>
                <div className="text-sm text-muted-foreground">{periodInfo.label}</div>
              </div>
            </div>
          )}

          {/* Ryczałt Account Selection (JDG + ryczałt + income only) */}
          {needsRyczaltCategory && (
            <div className="space-y-2">
              <Label htmlFor="ryczalt-account" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Konto ryczałtowe *
              </Label>
              {isLoadingAccounts ? (
                <div className="text-sm text-muted-foreground">Ładowanie kont...</div>
              ) : ryczaltAccounts.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nie masz żadnych kont ryczałtowych. Przejdź do Księgowość → Konta ryczałtowe, aby dodać konto.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger id="ryczalt-account">
                      <SelectValue placeholder="Wybierz konto ryczałtowe" />
                    </SelectTrigger>
                    <SelectContent>
                      {ryczaltAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} - {account.category_name} ({account.category_rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedAccount && (
                    <div className="text-xs text-muted-foreground">
                      Konto: {selectedAccount.account_number} • Stawka: {selectedAccount.category_rate}%
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Warning about locking */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Po zaksięgowaniu nie będzie można edytować:
              <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                <li>Dat (wystawienia, sprzedaży, płatności)</li>
                <li>Kwot i stawek VAT</li>
                <li>Danych kontrahenta</li>
                {needsRyczaltCategory && <li>Konta ryczałtowego</li>}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Entity type info */}
          <div className="text-xs text-muted-foreground">
            {isJdg ? (
              <>Dokument zostanie dodany do {isRyczalt ? 'ewidencji przychodów (ryczałt)' : 'KPiR'}.</>
            ) : (
              <>Dokument zostanie zaksięgowany w dzienniku i księdze głównej spółki.</>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPosting}
          >
            Anuluj
          </Button>
          <Button
            onClick={handlePost}
            disabled={isPosting || invoice.accountingStatus === 'posted' || (needsRyczaltCategory && (!selectedAccountId || ryczaltAccounts.length === 0))}
          >
            {invoice.accountingStatus === 'posted' ? 'Już zaksięgowano' : isPosting ? 'Księgowanie...' : 'Zaksięguj'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
