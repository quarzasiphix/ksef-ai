# Premium Invoicing System - Implementation Summary

## ✅ What's Been Implemented

### 1. Database Schema ✅
**Tables Created:**
- `subscription_invoices` - Main invoice records
- `subscription_invoice_items` - Line items per company
- `invoice_payment_attempts` - Payment tracking

**Key Features:**
- Multi-company billing support
- RLS policies for user data security
- Automatic invoice number generation
- Payment status tracking
- Metadata for extensibility

### 2. Edge Functions ✅

#### `generate-subscription-invoice`
**Purpose:** Automatically generate invoices for users with premium subscriptions

**Features:**
- Aggregates ALL premium companies for a user
- Calculates subtotal, tax (23% VAT), and total
- Creates invoice with unique number (INV-YYYY-MM-NNNN)
- Generates line items for each company
- Sets due date (7 days default)

**Usage:**
```typescript
// Auto-generate for current user
const response = await supabase.functions.invoke('generate-subscription-invoice');

// Generate for specific period
const response = await supabase.functions.invoke('generate-subscription-invoice', {
  body: {
    billingPeriodStart: '2026-01-01',
    billingPeriodEnd: '2026-01-31'
  }
});
```

#### `create-invoice-checkout`
**Purpose:** Create Stripe checkout session for invoice payment

**Features:**
- Multi-company line items in checkout
- Polish payment methods (card, BLIK, Przelewy24)
- VAT included in checkout
- Automatic customer creation
- Payment attempt logging

**Usage:**
```typescript
const response = await supabase.functions.invoke('create-invoice-checkout', {
  body: {
    invoiceId: 'uuid-here',
    successUrl: 'https://app.com/success',
    cancelUrl: 'https://app.com/cancel'
  }
});

// Redirect user to checkout
window.location.href = response.data.checkout_url;
```

## 🎯 How It Works

### Invoice Generation Flow
```
1. User has 3 companies with premium subscriptions:
   - Company A: JDG Premium (19 PLN/month)
   - Company B: Spółka Premium (89 PLN/month)  
   - Company C: Spółka Premium (89 PLN/month)

2. System generates ONE invoice:
   Invoice Number: INV-2026-01-0001
   
   Line Items:
   - Premium JDG - Company A: 19.00 PLN
   - Premium Spółka - Company B: 89.00 PLN
   - Premium Spółka - Company C: 89.00 PLN
   
   Subtotal: 197.00 PLN
   VAT (23%): 45.31 PLN
   Total: 242.31 PLN
   
   Due Date: 2026-01-08

3. User clicks "Pay Now" → Stripe checkout
4. Payment successful → Invoice marked as paid
5. All subscriptions updated to active
```

### Payment Flow
```
User → Invoice List → Select Invoice → Pay Now
  ↓
Create Checkout Session (Edge Function)
  ↓
Stripe Checkout (card/BLIK/P24)
  ↓
Payment Success Webhook
  ↓
Update Invoice Status → paid
Update Subscriptions → active
Generate PDF Invoice
Send Email with PDF
```

## 📊 Database Structure

### Invoice Record
```typescript
{
  id: "uuid",
  user_id: "uuid",
  invoice_number: "INV-2026-01-0001",
  subtotal_amount: 19700, // in grosze (197.00 PLN)
  tax_amount: 4531,       // in grosze (45.31 PLN)
  total_amount: 24231,    // in grosze (242.31 PLN)
  currency: "pln",
  status: "pending", // draft, pending, paid, failed, cancelled, overdue
  billing_period_start: "2026-01-01T00:00:00Z",
  billing_period_end: "2026-01-31T23:59:59Z",
  due_date: "2026-01-08T00:00:00Z",
  issued_at: "2026-01-01T10:00:00Z",
  paid_at: null,
  stripe_checkout_session_id: "cs_xxx",
  pdf_url: null
}
```

### Invoice Items
```typescript
[
  {
    id: "uuid",
    invoice_id: "invoice-uuid",
    business_profile_id: "company-a-uuid",
    subscription_id: "sub-a-uuid",
    description: "Premium JDG - Company A",
    subscription_type: "jdg_premium",
    billing_cycle: "monthly",
    quantity: 1,
    unit_price: 1900, // in grosze
    amount: 1900,
    period_start: "2026-01-01T00:00:00Z",
    period_end: "2026-01-31T23:59:59Z"
  },
  // ... more items for other companies
]
```

## 🚀 Next Steps to Complete

### 1. Payment Webhook Handler ⏳
**File:** `supabase/functions/invoice-payment-webhook/index.ts`

**Purpose:** Handle Stripe payment success/failure

**Key Actions:**
- Listen for `checkout.session.completed`
- Update invoice status to `paid`
- Update all subscriptions to `active`
- Trigger PDF generation
- Send confirmation email

### 2. Invoice PDF Generator ⏳
**File:** `supabase/functions/generate-invoice-pdf/index.ts`

**Purpose:** Generate Polish VAT invoice PDF

**Features:**
- Polish invoice format (Faktura VAT)
- Company details
- Line items with VAT
- Legal requirements
- Store in Supabase Storage

### 3. Frontend Components ⏳

#### Invoice List Component
**File:** `src/modules/invoices/components/InvoiceList.tsx`

**Features:**
- Display all user invoices
- Filter by status
- Sort by date
- Quick pay button
- Download PDF

#### Invoice Detail Component
**File:** `src/modules/invoices/components/InvoiceDetail.tsx`

**Features:**
- Invoice header
- Line items table
- Payment status
- Pay now button
- Download PDF

#### Checkout Modal
**File:** `src/modules/invoices/components/InvoiceCheckoutModal.tsx`

**Features:**
- Invoice summary
- Company list
- Total amount
- Stripe checkout integration

### 4. Automated Monthly Generation ⏳
**File:** `supabase/functions/cron-generate-invoices/index.ts`

**Purpose:** Auto-generate invoices on 1st of each month

**Setup:**
```sql
-- Supabase Edge Function Cron
SELECT cron.schedule(
  'generate-monthly-invoices',
  '0 0 1 * *', -- 1st of every month at midnight
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/cron-generate-invoices',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

### 5. Email Notifications ⏳
**Templates Needed:**
- Invoice generated
- Payment due reminder (3 days before)
- Payment overdue
- Payment successful (with PDF)
- Payment failed

## 💡 Usage Examples

### Generate Invoice for Current Month
```typescript
import { supabase } from '@/shared/lib/supabaseClient';

async function generateMonthlyInvoice() {
  const { data, error } = await supabase.functions.invoke(
    'generate-subscription-invoice'
  );
  
  if (error) {
    console.error('Failed to generate invoice:', error);
    return;
  }
  
  console.log('Invoice generated:', data.invoice.invoice_number);
  console.log('Total:', data.summary.total, 'PLN');
}
```

### Create Checkout Session
```typescript
async function payInvoice(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke(
    'create-invoice-checkout',
    {
      body: {
        invoiceId,
        successUrl: `${window.location.origin}/invoices/${invoiceId}/success`,
        cancelUrl: `${window.location.origin}/invoices/${invoiceId}`
      }
    }
  );
  
  if (error) {
    console.error('Failed to create checkout:', error);
    return;
  }
  
  // Redirect to Stripe checkout
  window.location.href = data.checkout_url;
}
```

### Fetch User Invoices
```typescript
async function getUserInvoices() {
  const { data: invoices, error } = await supabase
    .from('subscription_invoices')
    .select(`
      *,
      items:subscription_invoice_items (
        *,
        business_profile:business_profiles (
          id,
          name
        )
      )
    `)
    .order('issued_at', { ascending: false });
  
  return invoices;
}
```

## 🔐 Security Considerations

### RLS Policies
- ✅ Users can only see their own invoices
- ✅ Users can only see their own invoice items
- ✅ Service role can manage all invoices
- ✅ Payment attempts are user-scoped

### Payment Security
- ✅ Stripe handles all payment processing
- ✅ No card details stored in database
- ✅ Webhook signature verification required
- ✅ Invoice IDs in metadata for verification

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Total invoices generated per month
- Payment success rate
- Average time to payment
- Overdue invoice count
- Revenue per user
- Companies per invoice (average)

### Queries for Analytics
```sql
-- Monthly revenue
SELECT 
  DATE_TRUNC('month', issued_at) as month,
  COUNT(*) as invoice_count,
  SUM(total_amount) / 100.0 as total_revenue_pln
FROM subscription_invoices
WHERE status = 'paid'
GROUP BY month
ORDER BY month DESC;

-- Average companies per invoice
SELECT 
  AVG(item_count) as avg_companies_per_invoice
FROM (
  SELECT 
    invoice_id,
    COUNT(*) as item_count
  FROM subscription_invoice_items
  GROUP BY invoice_id
) subquery;

-- Payment success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM subscription_invoices
GROUP BY status;
```

## 🎯 Deployment Checklist

- [x] Database schema created
- [x] `generate-subscription-invoice` Edge Function created
- [x] `create-invoice-checkout` Edge Function created
- [ ] Deploy Edge Functions via MCP
- [ ] Set Stripe secret key in Supabase Dashboard
- [ ] Create payment webhook handler
- [ ] Deploy webhook handler
- [ ] Configure Stripe webhook URL
- [ ] Create PDF generator function
- [ ] Create frontend components
- [ ] Set up cron job for monthly generation
- [ ] Create email templates
- [ ] Test end-to-end flow
- [ ] Document in AGENT_GUIDE.md

## 📚 Related Documentation

- [Premium Security Implementation](./PREMIUM_SECURITY_IMPLEMENTATION.md)
- [Subscription Types](../src/shared/types/subscriptions.ts)
- [Stripe Integration](../src/shared/lib/stripeClient.ts)
- [Invoicing System Design](./PREMIUM_INVOICING_SYSTEM.md)
