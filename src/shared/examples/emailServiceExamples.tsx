/**
 * Examples of how to use the shared email service
 * These are example components showing different use cases
 */

import React from 'react';
import { Button } from '@/shared/ui/button';
import { useEmailService, useInvoiceEmailService, useAdminEmailService } from '@/shared/hooks/useEmailService';
import { EMAIL_TEMPLATES } from '@/shared/services/emailService';

// ============================================================================
// BASIC EMAIL SENDING EXAMPLE
// ============================================================================

export function BasicEmailExample() {
  const { sendEmail, isLoading, error } = useEmailService();

  const handleSendWelcomeEmail = async () => {
    const success = await sendEmail({
      templateKey: 'welcome_email',
      recipientEmail: 'user@example.com',
      variables: {
        userName: 'John Doe',
        companyName: 'Acme Corp',
        loginUrl: 'https://app.example.com/login',
      },
    });

    if (success) {
      console.log('Welcome email sent successfully!');
    }
  };

  return (
    <div className="space-y-4">
      <h3>Basic Email Example</h3>
      <Button 
        onClick={handleSendWelcomeEmail}
        disabled={isLoading}
      >
        {isLoading ? 'Sending...' : 'Send Welcome Email'}
      </Button>
      {error && <p className="text-red-500">Error: {error}</p>}
    </div>
  );
}

// ============================================================================
// INVOICE EMAIL EXAMPLES
// ============================================================================

export function InvoiceEmailExamples() {
  const {
    sendInvoiceToClient,
    sendInvoiceCreatedNotification,
    sendInvoiceReminder,
    isLoading,
    error,
  } = useInvoiceEmailService();

  const invoiceId = 'invoice-uuid-here';

  const handleSendInvoiceToClient = async () => {
    const success = await sendInvoiceToClient({
      invoiceId,
      customMessage: 'Thank you for your business! Please let us know if you have any questions.',
    });

    if (success) {
      console.log('Invoice sent to client successfully!');
    }
  };

  const handleSendInvoiceNotification = async () => {
    const success = await sendInvoiceCreatedNotification(invoiceId);
    if (success) {
      console.log('Invoice notification sent successfully!');
    }
  };

  const handleSendReminder = async () => {
    const success = await sendInvoiceReminder({
      invoiceId,
      customMessage: 'Przypomnienie: Termin płatności zbliża się.',
    });

    if (success) {
      console.log('Invoice reminder sent successfully!');
    }
  };

  return (
    <div className="space-y-4">
      <h3>Invoice Email Examples</h3>
      
      <div className="space-y-2">
        <Button 
          onClick={handleSendInvoiceToClient}
          disabled={isLoading}
          variant="default"
        >
          {isLoading ? 'Sending...' : 'Send Invoice to Client'}
        </Button>
        
        <Button 
          onClick={handleSendInvoiceNotification}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Sending...' : 'Send Invoice Notification'}
        </Button>
        
        <Button 
          onClick={handleSendReminder}
          disabled={isLoading}
          variant="secondary"
        >
          {isLoading ? 'Sending...' : 'Send Invoice Reminder'}
        </Button>
      </div>
      
      {error && <p className="text-red-500">Error: {error}</p>}
    </div>
  );
}

// ============================================================================
// ADMIN EMAIL EXAMPLES
// ============================================================================

export function AdminEmailExamples() {
  const { sendAdminEmail, sendEmailToMultipleRecipients, isLoading, error } = useAdminEmailService();

  const handleSendAdminNotification = async () => {
    const success = await sendAdminEmail({
      templateKey: 'admin_notification',
      recipientEmail: 'admin@example.com',
      variables: {
        subject: 'System Maintenance Scheduled',
        message: 'The system will be under maintenance on Sunday from 2 AM to 4 AM.',
        priority: 'high',
        timestamp: new Date().toLocaleString('pl-PL'),
      },
    });

    if (success) {
      console.log('Admin notification sent successfully!');
    }
  };

  const handleSendToMultipleAdmins = async () => {
    const success = await sendEmailToMultipleRecipients({
      templateKey: 'admin_notification',
      recipients: [
        'admin1@example.com',
        'admin2@example.com',
        'admin3@example.com',
      ],
      variables: {
        subject: 'New User Registration',
        message: 'A new user has registered and requires approval.',
        priority: 'normal',
      },
    });

    if (success) {
      console.log('Emails sent to all admins successfully!');
    }
  };

  return (
    <div className="space-y-4">
      <h3>Admin Email Examples</h3>
      
      <div className="space-y-2">
        <Button 
          onClick={handleSendAdminNotification}
          disabled={isLoading}
          variant="default"
        >
          {isLoading ? 'Sending...' : 'Send Admin Notification'}
        </Button>
        
        <Button 
          onClick={handleSendToMultipleAdmins}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Sending...' : 'Send to All Admins'}
        </Button>
      </div>
      
      {error && <p className="text-red-500">Error: {error}</p>}
    </div>
  );
}

// ============================================================================
// INVOICE DETAIL COMPONENT WITH EMAIL ACTIONS
// ============================================================================

interface InvoiceDetailProps {
  invoice: {
    id: string;
    invoice_number: string;
    customer: {
      name: string;
      email: string;
    };
    status: string;
    total_amount: number;
    currency: string;
  };
}

export function InvoiceDetailWithEmailActions({ invoice }: InvoiceDetailProps) {
  const {
    sendInvoiceToClient,
    sendInvoiceReminder,
    sendOverdueInvoiceNotification,
    isLoading,
    error,
  } = useInvoiceEmailService();

  const handleSendInvoice = async () => {
    const success = await sendInvoiceToClient({
      invoiceId: invoice.id,
      customMessage: 'Thank you for your business!',
    });

    if (success) {
      // You could refresh invoice data or show a success message
      alert('Invoice sent successfully!');
    }
  };

  const handleSendReminder = async () => {
    const success = await sendInvoiceReminder({
      invoiceId: invoice.id,
      customMessage: 'This is a friendly reminder about your outstanding invoice.',
    });

    if (success) {
      alert('Reminder sent successfully!');
    }
  };

  const handleSendOverdueNotice = async () => {
    const success = await sendOverdueInvoiceNotification(invoice.id);

    if (success) {
      alert('Overdue notice sent successfully!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h4 className="font-semibold mb-2">Invoice #{invoice.invoice_number}</h4>
        <div className="space-y-1 text-sm">
          <p>Customer: {invoice.customer.name}</p>
          <p>Email: {invoice.customer.email}</p>
          <p>Status: {invoice.status}</p>
          <p>Amount: {invoice.total_amount} {invoice.currency}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button 
          onClick={handleSendInvoice}
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? 'Sending...' : 'Send Invoice'}
        </Button>
        
        {invoice.status !== 'paid' && (
          <Button 
            onClick={handleSendReminder}
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            {isLoading ? 'Sending...' : 'Send Reminder'}
          </Button>
        )}
        
        {invoice.status === 'overdue' && (
          <Button 
            onClick={handleSendOverdueNotice}
            disabled={isLoading}
            size="sm"
            variant="destructive"
          >
            {isLoading ? 'Sending...' : 'Send Overdue Notice'}
          </Button>
        )}
      </div>
      
      {error && <p className="text-red-500 text-sm">Error: {error}</p>}
    </div>
  );
}

// ============================================================================
// BULK EMAIL OPERATIONS
// ============================================================================

export function BulkEmailOperations() {
  const { sendEmailToMultipleRecipients, isLoading } = useEmailService();

  const handleSendBulkNewsletter = async () => {
    const recipients = [
      'customer1@example.com',
      'customer2@example.com',
      'customer3@example.com',
      'customer4@example.com',
      'customer5@example.com',
    ];

    const success = await sendEmailToMultipleRecipients({
      templateKey: 'monthly_newsletter',
      recipients,
      variables: {
        month: 'January',
        year: '2024',
        featuredProduct: 'Premium Plan',
        discountCode: 'JAN2024',
      },
    });

    if (success) {
      alert(`Newsletter sent to ${recipients.length} recipients!`);
    }
  };

  const handleSendBulkInvoiceReminders = async () => {
    const overdueInvoices = [
      { id: 'inv-1', customerEmail: 'customer1@example.com' },
      { id: 'inv-2', customerEmail: 'customer2@example.com' },
      { id: 'inv-3', customerEmail: 'customer3@example.com' },
    ];

    // Send to each overdue invoice
    const results = await Promise.all(
      overdueInvoices.map(invoice =>
        sendEmailToMultipleRecipients({
          templateKey: 'invoice_overdue',
          recipients: [invoice.customerEmail],
          invoiceId: invoice.id,
          customMessage: 'Your invoice is overdue. Please make payment as soon as possible.',
        })
      )
    );

    const successCount = results.filter(r => r).length;
    alert(`Sent ${successCount} out of ${overdueInvoices.length} overdue reminders`);
  };

  return (
    <div className="space-y-4">
      <h3>Bulk Email Operations</h3>
      
      <div className="space-y-2">
        <Button 
          onClick={handleSendBulkNewsletter}
          disabled={isLoading}
          variant="default"
        >
          {isLoading ? 'Sending...' : 'Send Newsletter to All Customers'}
        </Button>
        
        <Button 
          onClick={handleSendBulkInvoiceReminders}
          disabled={isLoading}
          variant="outline"
        >
          {isLoading ? 'Sending...' : 'Send Overdue Reminders'}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// EMAIL SERVICE WITH CUSTOM ERROR HANDLING
// ============================================================================

export function EmailServiceWithErrorHandling() {
  const { sendEmail, isLoading, error, clearError } = useEmailService();

  const handleSendEmailWithCustomHandling = async () => {
    clearError(); // Clear any previous errors
    
    const success = await sendEmail({
      templateKey: 'welcome_email',
      recipientEmail: 'user@example.com',
      variables: {
        userName: 'John Doe',
      },
    });

    if (success) {
      // Custom success handling
      console.log('✅ Email sent successfully');
      // You could redirect, show a success modal, etc.
    } else {
      // Custom error handling is already handled by the hook
      // But you could add additional logic here
      console.error('❌ Email failed to send');
    }
  };

  return (
    <div className="space-y-4">
      <h3>Email Service with Custom Error Handling</h3>
      
      <Button 
        onClick={handleSendEmailWithCustomHandling}
        disabled={isLoading}
      >
        {isLoading ? 'Sending...' : 'Send with Custom Handling'}
      </Button>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">Error: {error}</p>
          <Button 
            onClick={clearError}
            size="sm"
            variant="outline"
            className="mt-2"
          >
            Clear Error
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN EXAMPLE COMPONENT
// ============================================================================

export default function EmailServiceExamples() {
  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Email Service Examples</h1>
      
      <div className="grid gap-8">
        <BasicEmailExample />
        <InvoiceEmailExamples />
        <AdminEmailExamples />
        <InvoiceDetailWithEmailActions 
          invoice={{
            id: 'inv-123',
            invoice_number: 'INV-2024-001',
            customer: {
              name: 'Acme Corporation',
              email: 'billing@acme.com',
            },
            status: 'pending',
            total_amount: 1500.00,
            currency: 'PLN',
          }}
        />
        <BulkEmailOperations />
        <EmailServiceWithErrorHandling />
      </div>
    </div>
  );
}
