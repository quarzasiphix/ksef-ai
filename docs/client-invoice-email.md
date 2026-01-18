# Client Invoice Email System

A secure, client-side invoice email sending system that integrates with the existing admin email template system.

## Overview

This system allows authenticated users to send invoices to their clients via email through a secure edge function. It leverages the **same email template system used by the admin panel**, ensuring consistency and maintainability.

- **Secure Edge Function**: `send-client-invoice-email` with JWT authentication and permission checks
- **React Component**: `InvoiceEmailButton` for easy integration
- **Shared Email Templates**: Uses the same `email_templates` table as admin system
- **Audit Logging**: Track all email sends for compliance

## Integration with Admin System

### 🔄 Shared Template System
The client email system uses the **exact same template infrastructure** as the admin email system:

- **Same Database Table**: `email_templates` 
- **Same Template Variables**: `{{variable}}` syntax with array support
- **Same Processing Logic**: Variable replacement and array rendering
- **Same N8N Integration**: Identical webhook format and structure

### 📋 Template Structure
Templates follow the admin system structure:
```sql
email_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  template_key TEXT UNIQUE NOT NULL,  -- 'invoice_email'
  subject TEXT,
  subject_pl TEXT,                   -- Polish subject
  html_content TEXT,
  body_html_pl TEXT,                  -- Polish HTML content
  text_content TEXT,
  is_active BOOLEAN DEFAULT true,
  category TEXT,                      -- 'invoice'
  description TEXT,
  variables TEXT[],                   -- Available variables
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Security Features

### 🔐 Authentication & Authorization
- **JWT Verification**: Uses Supabase JWT authentication
- **Permission Checks**: Only users with `admin` or `editor` role can send emails
- **Invoice Access Control**: Verifies user has access to the specific invoice
- **Workspace Isolation**: Users can only send invoices from their workspaces

### 🛡️ Data Protection
- **Input Validation**: Validates all input parameters
- **SQL Injection Prevention**: Uses parameterized queries
- **CORS Protection**: Proper CORS headers for cross-origin requests
- **Rate Limiting**: Can be implemented at the edge function level

## Architecture

```
Client Panel (React)
       ↓
   InvoiceEmailButton Component
       ↓
   Supabase Edge Function
       ↓
   Permission & Data Validation
       ↓
   Email Template Processing
       ↓
   N8N Email Service
       ↓
   Client Email
```

## Implementation Details

### 1. Edge Function: `send-client-invoice-email`

**Location**: Supabase Functions → `send-client-invoice-email`

**Security Flow**:
1. Validate JWT token
2. Verify user exists and is active
3. Check user has access to the invoice workspace
4. Verify user role (admin/editor)
5. Fetch invoice and customer data
6. Process email template
7. Send via N8N webhook
8. Log the email send

**Request Body**:
```typescript
{
  invoiceId: string;
  recipientEmail?: string; // Optional - uses customer email if not provided
  customMessage?: string;  // Optional - personal message
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  data?: {
    invoice_id: string;
    recipient_email: string;
    customer_name: string;
  };
  result?: any; // N8N response
}
```

### 2. React Component: `InvoiceEmailButton`

**Props**:
```typescript
interface InvoiceEmailButtonProps {
  invoice: {
    id: string;
    invoice_number?: string;
    customer: {
      name: string;
      email?: string;
    };
  };
  onEmailSent?: () => void;
}
```

**Features**:
- Modal dialog for email configuration
- Custom recipient email (defaults to customer email)
- Optional custom message
- Loading states and error handling
- Success notifications

### 3. Email Template: `invoice_email`

**Uses Same Template System as Admin**:
- Located in the same `email_templates` table
- Managed through the admin panel at `/admin/email-templates`
- Supports Polish (`subject_pl`, `body_html_pl`) and English versions
- Variable system identical to admin templates

**Template Variables**:
- Invoice details: `invoice_number`, `invoice_date`, `due_date`, `total_amount`, `status`
- Customer info: `customer_name`, `customer_email`, `customer_address`, etc.
- Business profile: `business_name`, `business_address`, `business_email`, etc.
- Invoice items: `items` array with `description`, `quantity`, `unit_price`, `total_price`
- Custom: `custom_message`, `notes`

**Template Features**:
- **Admin-Managed**: Templates can be edited through the admin panel
- **Variable Support**: Full `{{variable}}` and `{{#array}}...{{/array}}` syntax
- **Multi-language**: Polish and English template versions
- **Professional Design**: Responsive HTML with invoice item tables
- **Conditional Blocks**: Custom messages and notes rendered conditionally

**Template Management**:
```sql
-- Template is managed through admin panel
-- Template key: 'invoice_email'
-- Category: 'invoice'
-- Variables: ['invoice_number', 'customer_name', 'business_name', 'items', ...]
```

## Database Schema

### Email Templates Table
```sql
email_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT,
  subject_pl TEXT,
  html_content TEXT,
  body_html_pl TEXT,
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  description TEXT
)
```

### Email Send Logs Table
```sql
email_send_logs (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  user_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  recipient_email TEXT NOT NULL,
  template_key TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB
)
```

## Usage Examples

### Basic Integration
```tsx
import { InvoiceEmailButton } from '@/components/InvoiceEmailButton';

function InvoiceDetail({ invoice }) {
  return (
    <div>
      <h1>Invoice {invoice.invoice_number}</h1>
      <InvoiceEmailButton 
        invoice={invoice} 
        onEmailSent={() => console.log('Email sent!')}
      />
    </div>
  );
}
```

### Advanced Usage with Custom Styling
```tsx
function InvoiceActions({ invoice }) {
  return (
    <div className="flex gap-2">
      <InvoiceEmailButton 
        invoice={invoice}
        onEmailSent={() => {
          // Refresh invoice data
          refetch();
          // Show success notification
          toast.success('Invoice sent successfully!');
        }}
      />
      <Button variant="outline">Download PDF</Button>
      <Button variant="outline">Print</Button>
    </div>
  );
}
```

## Environment Variables

Required for the edge function:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
N8N_EMAIL_WEBHOOK_URL=your_n8n_webhook_url
```

## Deployment

### 1. Deploy Edge Function
```bash
supabase functions deploy send-client-invoice-email
```

### 2. Set Environment Variables
```bash
supabase secrets set N8N_EMAIL_WEBHOOK_URL=your_webhook_url
```

### 3. Run Database Migration
```bash
supabase db push
```

## Monitoring & Logging

### Email Send Logs
All email sends are logged in the `email_send_logs` table with:
- User and workspace information
- Recipient email
- Template used
- Send status
- Timestamp
- Error details (if any)

### Monitoring Queries
```sql
-- Recent email sends
SELECT * FROM email_send_logs 
ORDER BY sent_at DESC 
LIMIT 10;

-- Email sends by user
SELECT user_id, COUNT(*) as send_count
FROM email_send_logs 
GROUP BY user_id;

-- Failed email sends
SELECT * FROM email_send_logs 
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

## Error Handling

### Common Errors
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: Insufficient permissions or invoice access denied
- `404 Not Found`: Invoice not found or email template missing
- `400 Bad Request`: Missing required parameters
- `502 Bad Gateway`: N8N webhook failure

### Error Response Format
```typescript
{
  error: string;
  details?: string; // Additional error context
}
```

## Best Practices

### Security
1. **Always validate JWT tokens** in edge functions
2. **Check user permissions** before allowing actions
3. **Use parameterized queries** to prevent SQL injection
4. **Log all actions** for audit purposes
5. **Implement rate limiting** if needed

### Performance
1. **Cache email templates** in the edge function
2. **Use efficient database queries** with proper indexes
3. **Implement retry logic** for N8N webhook failures
4. **Monitor function execution time**

### User Experience
1. **Provide clear feedback** with loading states
2. **Show success/error notifications**
3. **Allow custom messages** for personalization
4. **Use customer's default email** when available
5. **Handle edge cases** gracefully

## Troubleshooting

### Common Issues

**Email not sending:**
1. Check N8N webhook URL is accessible
2. Verify email template exists and is active
3. Check user has proper permissions
4. Review edge function logs

**Permission denied:**
1. Verify user role in workspace_users table
2. Check invoice belongs to user's workspace
3. Ensure JWT token is valid

**Template not rendering:**
1. Check template variables are correctly named
2. Verify HTML syntax in template
3. Test with different invoice data

### Debug Mode
Add logging to the edge function for debugging:
```typescript
console.log('Invoice data:', invoice);
console.log('Template variables:', templateVariables);
console.log('N8N response:', n8nResponse);
```

## Future Enhancements

1. **Email Templates Editor**: UI for managing email templates
2. **Bulk Email Sending**: Send multiple invoices at once
3. **Email Scheduling**: Schedule emails for later delivery
4. **Email Tracking**: Track opens and clicks
5. **Multi-language Support**: More language templates
6. **PDF Attachments**: Include PDF version of invoice
7. **Email History**: View email history per invoice
8. **Custom Email Domains**: Use custom sending domains
