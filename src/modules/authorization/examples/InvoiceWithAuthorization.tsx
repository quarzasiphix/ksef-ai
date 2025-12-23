/**
 * Example: Invoice Details Screen with Authorization Integration
 * 
 * This example shows how to integrate the authorization system into an invoice screen:
 * 1. Display "Why is this allowed?" context
 * 2. Validate before approval
 * 3. Record authorization checks
 * 4. Handle blocking scenarios
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import {
  AuthorizationExplainer,
  AuthorizationBlockingAlert,
  useAuthorizationCheck,
  useRecordAuthorizationCheck,
  showAuthorizationError,
} from '@/modules/authorization';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  customer_name: string;
  total: number;
  currency: string;
  category: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'issued';
  created_at: string;
}

export function InvoiceWithAuthorizationExample({ invoiceId }: { invoiceId: string }) {
  const [isApproving, setIsApproving] = useState(false);
  
  // Fetch invoice data
  const { data: invoice } = useQuery<Invoice>({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      // Your invoice fetch logic
      return {} as Invoice;
    },
  });

  // Check if invoice approval is authorized
  const { data: authCheck, isLoading: checkingAuth } = useAuthorizationCheck({
    actionType: 'invoice_approve',
    amount: invoice?.total,
    currency: invoice?.currency,
    category: invoice?.category,
  });

  // Hook to record authorization checks
  const recordCheck = useRecordAuthorizationCheck();

  const handleApprove = async () => {
    if (!invoice || !authCheck) return;

    // Record the authorization check for audit trail
    await recordCheck.mutateAsync({
      authorization_id: authCheck.authorization_id || '',
      action_type: 'invoice_approve',
      entity_type: 'invoice',
      entity_id: invoice.id,
      result: authCheck.is_authorized ? 'allowed' : 'blocked',
      reason: authCheck.reason,
      checked_amount: invoice.total,
      checked_currency: invoice.currency,
      checked_category: invoice.category,
    });

    if (!authCheck.is_authorized) {
      showAuthorizationError(authCheck.reason || 'Brak zgody');
      return;
    }

    setIsApproving(true);
    try {
      // Your approval logic here
      // await approveInvoice(invoice.id);
      console.log('Invoice approved');
    } finally {
      setIsApproving(false);
    }
  };

  if (!invoice) return null;

  return (
    <div className="space-y-6">
      {/* Invoice Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Faktura {invoice.number}</CardTitle>
            <Badge
              variant={
                invoice.status === 'approved' ? 'default' :
                invoice.status === 'pending_approval' ? 'secondary' :
                'outline'
              }
            >
              {invoice.status === 'approved' ? 'Zatwierdzona' :
               invoice.status === 'pending_approval' ? 'Oczekuje' :
               invoice.status === 'issued' ? 'Wystawiona' :
               'Szkic'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Kontrahent</p>
              <p className="font-medium">{invoice.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kwota</p>
              <p className="font-medium text-lg">
                {invoice.total.toLocaleString('pl-PL')} {invoice.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Kategoria</p>
              <p className="font-medium">{invoice.category}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data utworzenia</p>
              <p className="font-medium">
                {new Date(invoice.created_at).toLocaleDateString('pl-PL')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-2">
            {invoice.status === 'draft' && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={!authCheck?.is_authorized || isApproving || checkingAuth}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isApproving ? 'Zatwierdzanie...' : 'Zatwierdź i zablokuj'}
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Edytuj
                </Button>
              </>
            )}
            
            {invoice.status === 'approved' && (
              <Button>
                <FileText className="h-4 w-4 mr-2" />
                Wystaw fakturę
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Authorization Blocking Alert */}
      {authCheck && !authCheck.is_authorized && invoice.status === 'draft' && (
        <AuthorizationBlockingAlert
          reason={authCheck.reason || 'Brak aktywnej zgody'}
          authorizationId={authCheck.authorization_id}
          severity="error"
        />
      )}

      {/* Authorization Explainer - "Why is this allowed?" */}
      {invoice.status !== 'draft' && (
        <AuthorizationExplainer
          actionType="invoice_approve"
          amount={invoice.total}
          currency={invoice.currency}
          category={invoice.category}
        />
      )}

      {/* Additional invoice sections... */}
    </div>
  );
}
