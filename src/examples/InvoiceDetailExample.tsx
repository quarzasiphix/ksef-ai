import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InvoiceEmailButton } from '@/components/InvoiceEmailButton';

interface InvoiceDetailProps {
  invoice: {
    id: string;
    invoice_number?: string;
    status: string;
    total_amount: number;
    currency: string;
    due_date?: string;
    created_at: string;
    customer: {
      name: string;
      email?: string;
      tax_id?: string;
    };
  };
}

export function InvoiceDetailExample({ invoice }: InvoiceDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEmailSent = () => {
    console.log('Invoice email sent successfully!');
    // You could refresh data, show a notification, etc.
  };

  return (
    <div className="space-y-6">
      {/* Invoice Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">
                Invoice #{invoice.invoice_number || invoice.id}
              </CardTitle>
              <p className="text-muted-foreground">
                Created: {new Date(invoice.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status}
              </Badge>
              <InvoiceEmailButton 
                invoice={invoice} 
                onEmailSent={handleEmailSent}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-lg font-semibold">
                {invoice.currency} {invoice.total_amount.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Due Date</p>
              <p className="text-lg">
                {invoice.due_date 
                  ? new Date(invoice.due_date).toLocaleDateString()
                  : 'No due date'
                }
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customer</p>
              <p className="text-lg">{invoice.customer.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm text-muted-foreground">
                {invoice.customer.email || 'No email on file'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{invoice.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{invoice.customer.email || 'Not provided'}</p>
              </div>
              {invoice.customer.tax_id && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tax ID</p>
                  <p>{invoice.customer.tax_id}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Email Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The "Send to Email" button above allows you to securely send this invoice 
              to your customer via email. Here's how it works:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Uses a secure edge function to verify your permissions</li>
              <li>Only users with admin or editor role can send emails</li>
              <li>Automatically includes all invoice details and items</li>
              <li>Supports custom messages to personalize the email</li>
              <li>Logs all email sends for audit purposes</li>
            </ul>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Security Note:</strong> This function uses JWT authentication and 
                verifies that you have access to the invoice before allowing email sending.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
