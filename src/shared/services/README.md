# Shared Email Service

A comprehensive, unified email service for sending emails through Supabase Edge Functions with support for standardized invoice variables and multiple email types.

## 🚀 Quick Start

```typescript
import { useEmailService } from '@/shared/hooks/useEmailService';

function MyComponent() {
  const { sendEmail, isLoading } = useEmailService();

  const handleSendEmail = async () => {
    const success = await sendEmail({
      templateKey: 'welcome_email',
      recipientEmail: 'user@example.com',
      variables: {
        userName: 'John Doe',
        companyName: 'Acme Corp',
      },
    });
  };
}
```

## 📧 Features

### ✅ **Core Functionality**
- **Unified Interface**: Single service for all email sending
- **Multiple Edge Functions**: Routes to appropriate edge functions automatically
- **Standardized Variables**: 50+ invoice variables available automatically
- **Error Handling**: Built-in error handling and toast notifications
- **Loading States**: Automatic loading state management
- **Type Safety**: Full TypeScript support

### ✅ **Email Types**
- **Transactional Emails**: User notifications, confirmations
- **Invoice Emails**: Send invoices to clients with full details
- **Admin Emails**: System notifications to admin users
- **Bulk Emails**: Send to multiple recipients
- **Custom Emails**: Full control over variables and content

### ✅ **Edge Function Integration**
- **send-email**: Default edge function for general emails
- **send-admin-email**: Admin-only emails with elevated permissions
- **send-client-invoice-email**: Client invoice emails with standardized variables

## 🏗️ Architecture

```
React Components
       ↓
useEmailService Hook
       ↓
EmailService Class
       ↓
Supabase Edge Functions
       ↓
Email Templates + N8N
       ↓
Client Email
```

## 📋 Available Functions

### **Basic Email Sending**
```typescript
// Send any email template
sendEmail({
  templateKey: 'welcome_email',
  recipientEmail: 'user@example.com',
  variables: { userName: 'John' },
  invoiceId: 'optional-invoice-id', // For standardized variables
  customMessage: 'Optional custom message'
});
```

### **Invoice Emails**
```typescript
// Send invoice to client (uses standardized variables)
sendInvoiceToClient({
  invoiceId: 'invoice-uuid',
  recipientEmail: 'client@example.com', // Optional
  customMessage: 'Thank you for your business!'
});

// Send invoice notification to user
sendInvoiceCreatedNotification('invoice-uuid');

// Send invoice reminder
sendInvoiceReminder({
  invoiceId: 'invoice-uuid',
  customMessage: 'Friendly reminder'
});

// Send overdue notice
sendOverdueInvoiceNotification('invoice-uuid');
```

### **Admin Emails**
```typescript
// Send admin notification
sendAdminEmail({
  templateKey: 'admin_notification',
  recipientEmail: 'admin@example.com',
  variables: { subject: 'System Alert', message: '...' },
  invoiceId: 'optional-invoice-id'
});
```

### **Bulk Emails**
```typescript
// Send to multiple recipients
sendEmailToMultipleRecipients({
  templateKey: 'newsletter',
  recipients: ['user1@example.com', 'user2@example.com'],
  variables: { month: 'January' },
  invoiceId: 'optional-invoice-id',
  customMessage: 'Optional'
});
```

## 🎯 React Hooks

### **useEmailService**
Main hook for all email operations:
```typescript
const {
  sendEmail,
  sendAdminEmail,
  sendInvoiceEmail,
  sendInvoiceToClient,
  sendInvoiceCreatedNotification,
  sendInvoiceReminder,
  sendOverdueInvoiceNotification,
  sendEmailToMultipleRecipients,
  isLoading,
  error,
  clearError
} = useEmailService();
```

### **useInvoiceEmailService**
Specialized hook for invoice operations:
```typescript
const {
  sendInvoiceToClient,
  sendInvoiceCreatedNotification,
  sendInvoiceReminder,
  sendOverdueInvoiceNotification,
  isLoading,
  error,
  clearError
} = useInvoiceEmailService();
```

### **useAdminEmailService**
Specialized hook for admin operations:
```typescript
const {
  sendAdminEmail,
  sendEmailToMultipleRecipients,
  isLoading,
  error,
  clearError
} = useAdminEmailService();
```

## 📊 Standardized Invoice Variables

When you use `invoiceId` parameter, the service automatically fetches 50+ standardized variables:

### **Basic Invoice Info**
- `invoice_number`, `invoice_date`, `due_date`, `status`
- `total_amount_formatted`, `currency`

### **Customer Information**
- `customer_name`, `customer_email`, `customer_address`
- `customer_tax_id`, `customer_city`, `customer_country`

### **Business Information**
- `business_name`, `business_email`, `business_address`
- `business_tax_id`, `business_bank_account`

### **Invoice Items**
- `items` (array), `items_count`

### **Calculated Fields**
- `is_paid`, `is_overdue`, `days_until_due`

### **Additional Fields**
- `notes`, `description`, `invoice_url`, `download_pdf_url`

## 🔧 Configuration

### **Environment Variables**
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
N8N_EMAIL_WEBHOOK_URL=your-n8n-webhook-url
```

### **Edge Functions**
The service automatically routes to the correct edge function:
- **Invoice templates** → `send-client-invoice-email`
- **Admin templates** → `send-admin-email`
- **General templates** → `send-email`

## 📝 Template Keys

```typescript
import { EMAIL_TEMPLATES } from '@/shared/services/emailService';

// Available templates
EMAIL_TEMPLATES.INVOICE_TO_CLIENT        // 'send_invoice_to_client'
EMAIL_TEMPLATES.INVOICE_GENERATED         // 'invoice_generated'
EMAIL_TEMPLATES.INVOICE_OVERDUE           // 'invoice_overdue'
EMAIL_TEMPLATES.ADMIN_WELCOME             // 'admin_welcome'
EMAIL_TEMPLATES.WELCOME_FIRMO             // 'witaj_firmo'
EMAIL_TEMPLATES.TEAM_MEMBER_INVITE        // 'team_member_invite'
```

## 🎨 Usage Examples

### **Invoice Detail Component**
```typescript
function InvoiceDetail({ invoice }) {
  const { sendInvoiceToClient, isLoading } = useInvoiceEmailService();

  return (
    <div>
      <h3>Invoice #{invoice.invoice_number}</h3>
      <Button 
        onClick={() => sendInvoiceToClient({
          invoiceId: invoice.id,
          customMessage: 'Thank you for your business!'
        })}
        disabled={isLoading}
      >
        Send to Client
      </Button>
    </div>
  );
}
```

### **Admin Notification**
```typescript
function SystemAlert() {
  const { sendAdminEmail } = useAdminEmailService();

  const handleSendAlert = async () => {
    await sendAdminEmail({
      templateKey: 'admin_notification',
      recipientEmail: 'admin@example.com',
      variables: {
        subject: 'System Alert',
        message: 'Disk space running low',
        priority: 'high'
      }
    });
  };
}
```

### **Bulk Newsletter**
```typescript
function NewsletterSender() {
  const { sendEmailToMultipleRecipients } = useEmailService();

  const handleSendNewsletter = async () => {
    await sendEmailToMultipleRecipients({
      templateKey: 'monthly_newsletter',
      recipients: customerEmails,
      variables: {
        month: 'January',
        featuredProduct: 'Premium Plan'
      }
    });
  };
}
```

## 🛡️ Security & Permissions

### **Authentication**
- All email functions require JWT authentication
- User must be logged in to send emails
- Session is validated before sending

### **Authorization**
- **Invoice Emails**: Users can only send invoices they have access to
- **Admin Emails**: Only admin users can send admin emails
- **General Emails**: Users can send emails to themselves

### **Data Validation**
- Email addresses are validated
- Template keys are validated
- Variables are sanitized

## 🔍 Error Handling

### **Automatic Error Handling**
The hooks automatically handle errors:
- Show toast notifications for errors
- Set loading states appropriately
- Return boolean success indicators

### **Custom Error Handling**
```typescript
const { sendEmail, error, clearError } = useEmailService();

const handleSend = async () => {
  clearError(); // Clear previous errors
  const success = await sendEmail(params);
  
  if (!success) {
    // Custom error logic
    console.error('Failed to send:', error);
  }
};
```

### **Common Errors**
- `NOT_AUTHENTICATED`: User not logged in
- `INSUFFICIENT_PERMISSIONS`: User lacks permissions
- `TEMPLATE_NOT_FOUND`: Template doesn't exist
- `INVALID_RECIPIENT`: Invalid email address
- `EDGE_FUNCTION_ERROR`: Edge function failed

## 🧪 Testing

### **Mock Service for Testing**
```typescript
// In your test setup
vi.mock('@/shared/services/emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendInvoiceToClient: vi.fn().mockResolvedValue({ success: true }),
}));

// In your test
import { renderHook, waitFor } from '@testing-library/react';
import { useEmailService } from '@/shared/hooks/useEmailService';

test('sends email successfully', async () => {
  const { result } = renderHook(() => useEmailService());
  
  await act(async () => {
    const success = await result.current.sendEmail({
      templateKey: 'test',
      recipientEmail: 'test@example.com'
    });
    
    expect(success).toBe(true);
  });
});
```

## 📈 Performance

### **Optimizations**
- **Session Caching**: User session cached during hook lifecycle
- **Batch Operations**: Multiple emails sent in parallel
- **Error Boundaries**: Errors don't crash the application
- **Loading States**: Prevent duplicate requests

### **Best Practices**
- Use the hooks instead of calling the service directly
- Handle loading states in your UI
- Check success/failure before proceeding
- Use appropriate email templates for each use case

## 🔮 Advanced Usage

### **Custom Email Service**
```typescript
import { EmailService } from '@/shared/services/emailService';

class CustomEmailService extends EmailService {
  async sendWelcomeSequence(userEmail: string) {
    await this.sendEmail({
      templateKey: 'welcome_step1',
      recipientEmail: userEmail,
      variables: { step: 1 }
    });
    
    // Send second email after delay
    setTimeout(async () => {
      await this.sendEmail({
        templateKey: 'welcome_step2',
        recipientEmail: userEmail,
        variables: { step: 2 }
      });
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}
```

### **Email Templates with Conditions**
```typescript
const sendConditionalEmail = async (user: User) => {
  const templateKey = user.isPremium ? 'premium_welcome' : 'basic_welcome';
  
  await sendEmail({
    templateKey,
    recipientEmail: user.email,
    variables: {
      userName: user.name,
      plan: user.plan,
      features: user.features
    }
  });
};
```

## 📚 API Reference

### **EmailService Class**
```typescript
class EmailService {
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>
  sendAdminEmail(params: SendAdminEmailParams): Promise<EmailSendResult>
  sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<EmailSendResult>
  sendEmailToMultipleRecipients(params: BatchEmailParams): Promise<EmailSendBatchResult>
  getInvoiceVariables(invoiceId: string): Promise<StandardizedInvoiceVariables | null>
}
```

### **Interfaces**
```typescript
interface SendEmailParams {
  templateKey: string;
  recipientEmail?: string;
  variables?: EmailVariables;
  invoiceId?: string;
  customMessage?: string;
}

interface SendInvoiceEmailParams {
  invoiceId: string;
  recipientEmail?: string;
  customMessage?: string;
}

interface SendAdminEmailParams {
  templateKey: string;
  recipientEmail: string;
  variables?: EmailVariables;
  invoiceId?: string;
}
```

## 🐛 Troubleshooting

### **Common Issues**

**Email not sending:**
1. Check user is authenticated
2. Verify template exists and is active
3. Check edge function logs
4. Verify N8N webhook is working

**Variables not appearing:**
1. Ensure `invoiceId` is provided for invoice templates
2. Check template uses correct variable names
3. Verify invoice exists and user has access

**Permission errors:**
1. Check user role for admin emails
2. Verify user has access to invoice
3. Check workspace permissions

### **Debug Mode**
```typescript
// Enable debug logging
const debugMode = process.env.NODE_ENV === 'development';
if (debugMode) {
  console.log('Sending email:', params);
}
```

## 🚀 Migration Guide

### **From Old Email Service**
```typescript
// Old way
import { sendTransactionalEmail } from '@/utils/emailService';
sendTransactionalEmail({
  templateName: 'welcome',
  variables: { name: 'John' }
});

// New way
import { useEmailService } from '@/shared/hooks/useEmailService';
const { sendEmail } = useEmailService();
sendEmail({
  templateKey: 'welcome',
  variables: { name: 'John' }
});
```

### **From Direct Edge Function Calls**
```typescript
// Old way
const { data } = await supabase.functions.invoke('send-email', {
  body: { templateKey, variables }
});

// New way
const success = await sendEmail({ templateKey, variables });
```

## 📄 File Structure

```
src/shared/
├── services/
│   └── emailService.ts          # Main email service class
├── hooks/
│   └── useEmailService.ts        # React hooks
├── types/
│   └── email.ts                  # TypeScript types
├── examples/
│   └── emailServiceExamples.tsx  # Usage examples
└── services/
    └── README.md                 # This file
```

## 🎉 Summary

The shared email service provides a comprehensive, type-safe, and easy-to-use interface for sending emails through your Supabase application. With support for standardized invoice variables, multiple edge functions, and built-in error handling, it's the perfect solution for all your email needs.

**Key Benefits:**
- ✅ **Easy to Use**: Simple hooks with automatic error handling
- ✅ **Type Safe**: Full TypeScript support
- ✅ **Flexible**: Support for multiple email types
- ✅ **Powerful**: 50+ standardized variables
- ✅ **Secure**: Proper authentication and authorization
- ✅ **Reliable**: Built-in error handling and retries

Start using it today and simplify your email sending logic! 🚀
