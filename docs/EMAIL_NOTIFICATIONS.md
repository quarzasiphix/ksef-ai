# Email Notification System - User Actions

## Overview

The email notification system sends transactional emails to users when they perform important actions in the application. This keeps users informed and provides a paper trail for business operations.

## Architecture

```
User Action → emailService.ts → Edge Function (send-email) → n8n → Gmail
```

### Components

1. **`emailService.ts`** - Core email sending utility with template-specific functions
2. **`emailNotifications.ts`** - Convenience wrappers for common notifications
3. **Edge Function** - `send-email` - Authenticates user, fetches templates, renders variables
4. **n8n Workflow** - Handles actual email delivery via Gmail

## How It Works

### 1. User Performs Action
```typescript
// Example: User creates an invoice
const savedInvoice = await saveInvoice(invoiceData);
```

### 2. Send Email Notification
```typescript
import { sendInvoiceCreatedEmail } from '@/shared/utils/emailService';

await sendInvoiceCreatedEmail({
  invoice_number: 'FV/2024/001',
  client_name: 'ABC Sp. z o.o.',
  total_amount: '1,230.00 PLN',
  issue_date: '07.01.2024',
  due_date: '14.01.2024',
  invoice_url: 'https://app.ksiegai.pl/invoices/123',
  download_pdf_url: 'https://app.ksiegai.pl/invoices/123/pdf',
  items: [
    {
      name: 'Usługa księgowa - styczeń 2024',
      quantity: '1',
      unit_price: '500,00 PLN',
      total: '500,00 PLN'
    }
  ]
});
```

### 3. Edge Function Processes Request
- Validates user authentication
- Fetches email template from database
- Replaces variables in template (e.g., `{{invoice_number}}`)
- Renders array items (e.g., invoice line items)
- Sends to n8n webhook

### 4. Email Delivered
- n8n receives pre-rendered HTML
- Sends via Gmail
- User receives email notification

## Available Notifications

### 📄 Invoice Notifications

#### Invoice Created (sent to creator)
```typescript
import { sendInvoiceCreatedEmail } from '@/shared/utils/emailService';

await sendInvoiceCreatedEmail({
  invoice_number: string,
  client_name: string,
  total_amount: string, // formatted with currency
  issue_date: string, // Polish format: DD.MM.YYYY
  due_date: string,
  invoice_url: string,
  download_pdf_url: string,
  items?: Array<{
    name: string,
    quantity: string,
    unit_price: string,
    total: string
  }>
});
```

#### Invoice Received (sent to recipient)
```typescript
import { sendInvoiceReceivedEmail } from '@/shared/utils/emailService';

await sendInvoiceReceivedEmail(recipientEmail, {
  invoice_number: string,
  sender_name: string,
  total_amount: string,
  issue_date: string,
  due_date: string,
  invoice_url: string,
  download_pdf_url: string
});
```

### 👥 Team Notifications

#### Team Member Added
```typescript
import { notifyTeamMemberAdded } from '@/shared/utils/emailNotifications';

await notifyTeamMemberAdded({
  memberName: 'Jan Kowalski',
  role: 'Księgowy',
  addedBy: 'Anna Nowak',
  companyName: 'ABC Sp. z o.o.'
});
```

#### Team Member Invited
```typescript
import { notifyTeamMemberInvited } from '@/shared/utils/emailNotifications';

await notifyTeamMemberInvited({
  recipientEmail: 'jan@example.com',
  inviterName: 'Anna Nowak',
  companyName: 'ABC Sp. z o.o.',
  role: 'Księgowy',
  inviteUrl: 'https://app.ksiegai.pl/invite/abc123'
});
```

### 📁 Document Notifications

#### Document Uploaded
```typescript
import { notifyDocumentUploaded } from '@/shared/utils/emailNotifications';

await notifyDocumentUploaded({
  documentName: 'Umowa najmu.pdf',
  documentType: 'Umowa',
  uploadedBy: 'Jan Kowalski',
  documentId: 'doc_123',
  category: 'Contractual'
});
```

#### Document Shared
```typescript
import { notifyDocumentShared } from '@/shared/utils/emailNotifications';

await notifyDocumentShared({
  recipientEmail: 'anna@example.com',
  documentName: 'Raport Q1 2024.pdf',
  sharedBy: 'Jan Kowalski',
  documentId: 'doc_456',
  message: 'Proszę o weryfikację'
});
```

### 📋 Contract Notifications

#### Contract Created
```typescript
import { notifyContractCreated } from '@/shared/utils/emailNotifications';

await notifyContractCreated({
  contractNumber: 'UMW/2024/001',
  contractType: 'Umowa najmu',
  counterpartyName: 'XYZ Sp. z o.o.',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  contractId: 'contract_123'
});
```

#### Contract Expiring
```typescript
import { notifyContractExpiring } from '@/shared/utils/emailNotifications';

await notifyContractExpiring({
  contractNumber: 'UMW/2024/001',
  contractType: 'Umowa najmu',
  counterpartyName: 'XYZ Sp. z o.o.',
  expiryDate: '2024-12-31',
  daysUntilExpiry: 30,
  contractId: 'contract_123'
});
```

### 📨 Inbox Notifications

#### New Message Received
```typescript
import { notifyNewInboxMessage } from '@/shared/utils/emailNotifications';

await notifyNewInboxMessage({
  senderName: 'Jan Kowalski',
  subject: 'Pytanie o fakturę',
  preview: 'Dzień dobry, mam pytanie dotyczące...',
  messageCount: 3
});
```

### 👔 Employee Notifications

#### Employee Added
```typescript
import { notifyEmployeeAdded } from '@/shared/utils/emailNotifications';

await notifyEmployeeAdded({
  employeeName: 'Jan Kowalski',
  position: 'Księgowy',
  department: 'Finanse',
  startDate: '2024-02-01',
  addedBy: 'Anna Nowak'
});
```

## Utility Functions

### Format Date for Emails
```typescript
import { formatEmailDate } from '@/shared/utils/emailService';

const formattedDate = formatEmailDate(new Date()); // "07.01.2024"
const formattedDate2 = formatEmailDate('2024-01-07'); // "07.01.2024"
```

### Format Currency for Emails
```typescript
import { formatEmailCurrency } from '@/shared/utils/emailService';

const formatted = formatEmailCurrency(1230.50); // "1230,50 PLN"
const formatted2 = formatEmailCurrency(100, 'EUR'); // "100,00 EUR"
```

### Generate App URLs
```typescript
import { getAppUrl } from '@/shared/utils/emailService';

const url = getAppUrl('/invoices/123'); // "https://app.ksiegai.pl/invoices/123"
```

## Integration Examples

### Example 1: Invoice Creation (Already Integrated)

`src/modules/invoices/screens/invoices/NewInvoice.tsx`:

```typescript
// After saving invoice
const savedInvoice = await saveInvoice(invoiceData);

if (savedInvoice?.id) {
  // Send email notification
  await sendInvoiceCreatedEmail({
    invoice_number: formValues.number,
    client_name: customerName,
    total_amount: formatEmailCurrency(totals.totalGrossValue),
    issue_date: formatEmailDate(formValues.issueDate),
    due_date: formatEmailDate(formValues.dueDate),
    invoice_url: getAppUrl(`/invoices/${savedInvoice.id}`),
    download_pdf_url: getAppUrl(`/invoices/${savedInvoice.id}/pdf`),
    items: processedItems.map(item => ({
      name: item.name,
      quantity: String(item.quantity),
      unit_price: formatEmailCurrency(item.unitPrice),
      total: formatEmailCurrency(item.totalGrossValue),
    })),
  });
}
```

### Example 2: Document Upload

`src/modules/documents/screens/DocumentUpload.tsx`:

```typescript
import { notifyDocumentUploaded } from '@/shared/utils/emailNotifications';

const handleDocumentUpload = async (file: File, category: string) => {
  const uploadedDoc = await uploadDocument(file, category);
  
  // Send notification
  await notifyDocumentUploaded({
    documentName: file.name,
    documentType: getDocumentType(file),
    uploadedBy: user.name,
    documentId: uploadedDoc.id,
    category: category,
  });
  
  toast.success('Document uploaded and notification sent');
};
```

### Example 3: Team Member Invitation

`src/modules/settings/screens/TeamSettings.tsx`:

```typescript
import { notifyTeamMemberInvited } from '@/shared/utils/emailNotifications';

const handleInviteTeamMember = async (email: string, role: string) => {
  const invite = await createInvitation(email, role);
  
  // Send invitation email
  await notifyTeamMemberInvited({
    recipientEmail: email,
    inviterName: user.name,
    companyName: company.name,
    role: role,
    inviteUrl: getAppUrl(`/invite/${invite.token}`),
  });
  
  toast.success(`Invitation sent to ${email}`);
};
```

### Example 4: Contract Expiry Check (Scheduled Job)

`src/modules/contracts/jobs/checkExpiringContracts.ts`:

```typescript
import { notifyContractExpiring } from '@/shared/utils/emailNotifications';

export async function checkExpiringContracts() {
  const expiringContracts = await getContractsExpiringInDays(30);
  
  for (const contract of expiringContracts) {
    await notifyContractExpiring({
      contractNumber: contract.number,
      contractType: contract.type,
      counterpartyName: contract.counterparty,
      expiryDate: contract.endDate,
      daysUntilExpiry: calculateDaysUntil(contract.endDate),
      contractId: contract.id,
    });
  }
}
```

## Error Handling

All email functions are designed to fail gracefully:

```typescript
try {
  await sendInvoiceCreatedEmail(data);
  console.log('Email sent successfully');
} catch (error) {
  console.error('Email failed, but invoice was created:', error);
  // Don't block the main operation if email fails
}
```

## Email Templates

Email templates are stored in the `email_templates` table and managed via the admin panel.

### Required Template Fields:
- `template_key` - Unique identifier (e.g., `invoice_generated`)
- `name` - Display name
- `subject_pl` - Email subject with variables
- `body_html_pl` - HTML body with variables
- `is_active` - Enable/disable template

### Variable Syntax:
- Simple: `{{variable_name}}`
- Arrays: `{{#items}}...{{/items}}`
- Array fields: `{{item.field_name}}`

## Security

- ✅ User authentication required (JWT token)
- ✅ Rate limiting (40 emails per user per minute)
- ✅ IP-based rate limiting (25 emails per IP per minute)
- ✅ User can only send emails as themselves
- ✅ Templates fetched from database (not user input)
- ✅ Variable replacement server-side only

## Testing

### Test Email Sending:
```typescript
import { sendTransactionalEmail } from '@/shared/utils/emailService';

// Send test email
await sendTransactionalEmail({
  templateName: 'invoice_generated',
  variables: {
    invoice_number: 'TEST-001',
    client_name: 'Test Client',
    total_amount: '100,00 PLN',
    // ... other variables
  }
});
```

## Troubleshooting

### Email not received?
1. Check spam folder
2. Verify template is active in admin panel
3. Check edge function logs in Supabase
4. Verify n8n workflow is running
5. Check rate limits not exceeded

### Variables not replaced?
1. Ensure variable names match exactly (case-sensitive)
2. Check template uses correct syntax: `{{variable}}`
3. Verify variables passed to email function

### Authentication errors?
1. User must be logged in
2. Valid session token required
3. Check Supabase auth status

## Future Enhancements

- [ ] Email preferences per user (opt-in/opt-out)
- [ ] Digest emails (daily/weekly summaries)
- [ ] Email templates in multiple languages
- [ ] Attachment support
- [ ] Email tracking (opened, clicked)
- [ ] Scheduled emails
- [ ] Email queuing for batch operations
