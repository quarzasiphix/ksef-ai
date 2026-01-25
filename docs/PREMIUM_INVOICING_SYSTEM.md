# Premium Invoicing System - Design Document

## 🎯 Overview

Multi-company invoicing system where users receive ONE consolidated invoice for ALL their premium business profiles.

## 📊 Business Logic

### Billing Model
- **One invoice per user per billing period**
- **Multiple line items** - one per premium company
- **Aggregated total** - sum of all company subscriptions
- **Billing cycles**: Monthly or Annual per company
- **Payment**: Single payment covers all companies

### Example Scenario
User has 3 companies:
1. Company A: JDG Premium (19 PLN/month)
2. Company B: Spółka Premium (89 PLN/month)
3. Company C: Spółka Premium (89 PLN/month)

**Invoice Total**: 197 PLN/month

## 🗄️ Database Schema

### `subscription_invoices` Table
```sql
CREATE TABLE subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  invoice_number TEXT NOT NULL UNIQUE, -- Format: INV-2026-01-001
  
  -- Amounts
  subtotal_amount INTEGER NOT NULL, -- In grosze (cents)
  tax_amount INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'pln',
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'cancelled')),
  
  -- Dates
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  
  -- Payment
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  payment_method TEXT, -- 'stripe', 'bank_transfer', 'blik'
  
  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_invoices_user_id ON subscription_invoices(user_id);
CREATE INDEX idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX idx_subscription_invoices_due_date ON subscription_invoices(due_date);
```

### `subscription_invoice_items` Table
```sql
CREATE TABLE subscription_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES subscription_invoices(id) ON DELETE CASCADE,
  
  -- Company reference
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  subscription_id UUID NOT NULL REFERENCES enhanced_subscriptions(id),
  
  -- Item details
  description TEXT NOT NULL, -- "Premium JDG - Company Name"
  subscription_type TEXT NOT NULL, -- 'jdg_premium', 'spolka_premium'
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  
  -- Pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL, -- In grosze
  amount INTEGER NOT NULL, -- quantity * unit_price
  
  -- Period covered
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id ON subscription_invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_business_profile ON subscription_invoice_items(business_profile_id);
```

### `invoice_payment_attempts` Table
```sql
CREATE TABLE invoice_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES subscription_invoices(id),
  
  -- Payment details
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'pln',
  payment_method TEXT NOT NULL,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- External IDs
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_attempts_invoice_id ON invoice_payment_attempts(invoice_id);
```

## 🔄 Invoice Generation Flow

### 1. Automatic Monthly Generation
```typescript
// Runs on 1st of each month
async function generateMonthlyInvoices() {
  // Get all users with active premium subscriptions
  const usersWithPremium = await getActiveSubscriptionUsers();
  
  for (const user of usersWithPremium) {
    // Get all premium companies for this user
    const premiumCompanies = await getPremiumCompanies(user.id);
    
    // Calculate total
    const items = premiumCompanies.map(company => ({
      business_profile_id: company.id,
      subscription_id: company.subscription_id,
      description: `Premium ${company.subscription_type} - ${company.name}`,
      unit_price: getPrice(company.subscription_type, company.billing_cycle),
      amount: getPrice(company.subscription_type, company.billing_cycle),
      period_start: startOfMonth,
      period_end: endOfMonth
    }));
    
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    
    // Create invoice
    await createInvoice({
      user_id: user.id,
      items,
      total_amount: total,
      due_date: addDays(new Date(), 7) // 7 days to pay
    });
  }
}
```

### 2. Checkout Flow
```typescript
// User initiates payment
async function createCheckoutSession(invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  const items = await getInvoiceItems(invoiceId);
  
  // Create Stripe checkout with all line items
  const session = await stripe.checkout.sessions.create({
    customer: invoice.stripe_customer_id,
    line_items: items.map(item => ({
      price_data: {
        currency: 'pln',
        product_data: {
          name: item.description,
        },
        unit_amount: item.unit_price,
      },
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: `${baseUrl}/invoices/${invoiceId}/success`,
    cancel_url: `${baseUrl}/invoices/${invoiceId}`,
    metadata: {
      invoice_id: invoiceId,
      user_id: invoice.user_id
    }
  });
  
  return session;
}
```

### 3. Payment Webhook Handler
```typescript
// Stripe webhook: payment_intent.succeeded
async function handlePaymentSuccess(paymentIntent) {
  const invoiceId = paymentIntent.metadata.invoice_id;
  
  // Mark invoice as paid
  await updateInvoice(invoiceId, {
    status: 'paid',
    paid_at: new Date(),
    stripe_payment_intent_id: paymentIntent.id
  });
  
  // Update all subscriptions to active
  const items = await getInvoiceItems(invoiceId);
  for (const item of items) {
    await updateSubscription(item.subscription_id, {
      status: 'active',
      current_period_start: item.period_start,
      current_period_end: item.period_end
    });
  }
  
  // Generate PDF invoice
  await generateInvoicePDF(invoiceId);
  
  // Send email with invoice
  await sendInvoiceEmail(invoiceId);
}
```

## 📄 Invoice PDF Format

### Polish VAT Invoice (Faktura VAT)
```
FAKTURA VAT
Nr: INV-2026-01-001

Sprzedawca:                    Nabywca:
KsięgAI Sp. z o.o.            Jan Kowalski
ul. Przykładowa 1             ul. Testowa 2
00-001 Warszawa               00-002 Warszawa
NIP: 1234567890               NIP: 0987654321

Data wystawienia: 2026-01-01
Data sprzedaży: 2026-01-01
Termin płatności: 2026-01-08

Lp | Nazwa                              | Ilość | Cena jedn. | Wartość
1  | Premium JDG - Firma A              | 1     | 19,00 zł   | 19,00 zł
2  | Premium Spółka - Firma B           | 1     | 89,00 zł   | 89,00 zł
3  | Premium Spółka - Firma C           | 1     | 89,00 zł   | 89,00 zł

Suma netto: 197,00 zł
VAT (23%): 45,31 zł
SUMA BRUTTO: 242,31 zł

Sposób płatności: Przelew bankowy
Numer konta: PL XX XXXX XXXX XXXX XXXX XXXX XXXX
```

## 🎨 UI Components

### Invoice List View
- Show all invoices for user
- Filter by status (pending, paid, overdue)
- Quick pay button for pending invoices
- Download PDF button

### Invoice Detail View
- Invoice header with number and dates
- List of all companies included
- Payment status badge
- Pay now button (if pending)
- Download PDF button

### Checkout Modal
- Show invoice summary
- List all companies being paid for
- Total amount prominent
- Stripe payment form
- Alternative payment methods (bank transfer, BLIK)

## 🔔 Notifications

### Email Notifications
1. **Invoice Generated** - "Your monthly invoice is ready"
2. **Payment Due Soon** - 3 days before due date
3. **Payment Overdue** - Day after due date
4. **Payment Successful** - With PDF attachment
5. **Payment Failed** - With retry instructions

### In-App Notifications
- Badge on user menu showing unpaid invoices
- Banner on dashboard if payment overdue
- Success toast after payment

## 🔐 Security & RLS Policies

```sql
-- Users can only see their own invoices
CREATE POLICY "Users can view own invoices" ON subscription_invoices
  FOR SELECT USING (user_id = auth.uid());

-- Users can only see their own invoice items
CREATE POLICY "Users can view own invoice items" ON subscription_invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM subscription_invoices WHERE user_id = auth.uid()
    )
  );
```

## 📊 Pricing Reference

| Plan | Monthly | Annual |
|------|---------|--------|
| JDG Premium | 19 PLN | 190 PLN |
| Spółka Premium | 89 PLN | 890 PLN |
| Enterprise | Custom | Custom |

## 🚀 Implementation Priority

1. ✅ Database schema creation
2. ✅ Invoice generation Edge Function
3. ✅ Checkout session Edge Function
4. ✅ Payment webhook handler
5. ✅ Invoice PDF generator
6. ✅ UI components
7. ✅ Email notifications
8. ✅ Automated monthly generation (cron)

## 🔄 Recurring Billing Logic

### Monthly Subscriptions
- Invoice generated on 1st of month
- Covers current month
- Due date: 7 days from issue
- Auto-renewal if payment successful

### Annual Subscriptions
- Invoice generated on anniversary date
- Covers next 12 months
- Due date: 14 days from issue
- Reminder 30 days before renewal

### Mixed Billing
- User can have companies on different cycles
- Each company billed according to its cycle
- Invoice shows prorated amounts if mid-cycle changes
