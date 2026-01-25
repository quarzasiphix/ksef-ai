# Premium Subscription System - Complete Implementation Guide

## 🎯 Overview

This document describes the complete premium subscription system for KsięgaI, supporting multi-business subscriptions, Stripe integration, automated invoicing, and admin management.

## 📋 Features

### User-Facing Features
- ✅ Multi-business subscription checkout
- ✅ Dynamic pricing based on business type (JDG vs Spółka)
- ✅ Monthly and annual billing cycles
- ✅ Automatic invoice generation
- ✅ Promo code support
- ✅ Real-time subscription status
- ✅ Secure token-based verification

### Admin Features
- ✅ Subscription management dashboard
- ✅ Grant free subscriptions
- ✅ Promo code creation and management
- ✅ Subscription analytics
- ✅ Invoice viewing
- ✅ User subscription history

## 🏗️ Architecture

### Database Schema

#### Core Tables

**enhanced_subscriptions**
- Tracks individual business subscriptions
- Links to user, business profile, and subscription type
- Stores Stripe subscription ID
- Manages subscription lifecycle (starts_at, ends_at, is_active)

**subscription_types**
- Defines available subscription plans (JDG, Spółka, Enterprise)
- Stores pricing for monthly and annual cycles
- Lists features for each plan

**subscription_invoices**
- Consolidated monthly invoices for all user subscriptions
- Tracks payment status and Stripe integration
- Supports VAT calculations (ready for future VAT registration)

**subscription_invoice_items**
- Line items for each business in the invoice
- Links to specific subscriptions
- Stores VAT details per item

**stripe_customers**
- Maps users to Stripe customer IDs
- Enables subscription management

**promo_codes**
- Admin-managed promotional codes
- Supports percentage, fixed amount, and free months
- Usage tracking and limits

**enterprise_benefits**
- Special benefits for enterprise users
- Can grant premium access without payment

### Edge Functions

#### create-premium-checkout
**Purpose**: Create Stripe checkout session for multi-business subscriptions

**Input**:
```typescript
{
  businessProfileIds: string[];
  billingCycle: 'monthly' | 'annual';
}
```

**Process**:
1. Validates user owns all selected businesses
2. Determines subscription type for each business (JDG vs Spółka)
3. Calculates total price
4. Creates or retrieves Stripe customer
5. Generates Stripe checkout session with line items
6. Logs transaction

**Output**:
```typescript
{
  url: string;              // Stripe checkout URL
  sessionId: string;        // Session ID for tracking
  totalAmount: number;      // Total in grosze
  businessCount: number;    // Number of businesses
}
```

#### handle-premium-webhook
**Purpose**: Process Stripe webhook events for subscription lifecycle

**Events Handled**:
- `checkout.session.completed` - Create subscriptions after successful payment
- `customer.subscription.created/updated` - Update subscription status
- `customer.subscription.deleted` - Handle cancellations
- `invoice.payment_succeeded` - Generate subscription invoices
- `invoice.payment_failed` - Handle failed payments

**Process Flow**:
1. Verify webhook signature
2. Parse event type
3. Update database accordingly
4. Generate invoices for successful payments
5. Send notifications (future)

#### verify-premium-access
**Purpose**: Server-side verification of premium status

**Features**:
- Multi-layer verification (enterprise benefits → enhanced subscriptions → business profiles)
- Date-based active calculation
- 5-minute encrypted JWT tokens
- Audit logging

## 💳 Stripe Integration

### Checkout Flow

1. **User Selection**
   - User selects businesses to subscribe
   - Chooses billing cycle (monthly/annual)
   - Sees total price with savings calculation

2. **Checkout Creation**
   - Frontend calls `create-premium-checkout` Edge Function
   - Backend creates Stripe checkout session
   - User redirected to Stripe payment page

3. **Payment Processing**
   - User completes payment on Stripe
   - Stripe sends webhook to `handle-premium-webhook`
   - Subscriptions created in database

4. **Confirmation**
   - User redirected to success page
   - Premium features immediately available
   - Invoice generated and accessible

### Pricing Structure

**JDG Premium** (Jednoosobowa Działalność Gospodarcza)
- Monthly: 19.00 PLN
- Annual: 190.00 PLN (2 months free)

**Spółka Standard** (Sp. z o.o., SA)
- Monthly: 89.00 PLN
- Annual: 890.00 PLN (2 months free)

**Enterprise**
- Custom pricing
- Managed via enterprise_benefits table

### VAT Handling

Currently **VAT-exempt** (Tovernet Sp. z o.o. not registered for VAT).

**Future VAT Support**:
```typescript
// Invoice items include VAT fields
{
  vat_status: 'exempt' | 'zero' | 'reduced' | 'standard',
  vat_rate: 0.23,        // 23% for standard
  vat_amount: 437,       // In grosze
  net_amount: 1900,      // In grosze
  gross_amount: 2337,    // In grosze
}
```

To enable VAT:
1. Update `vat_status` to 'standard'
2. Set `vat_rate` to 0.23
3. Calculate amounts accordingly
4. Update invoice generation logic

## 📊 Invoice Generation

### Automatic Invoice Creation

**Trigger**: `invoice.payment_succeeded` webhook from Stripe

**Process**:
1. Create `subscription_invoices` record
2. Generate unique invoice number: `SUB-YYYY-XXXXXX`
3. Create `subscription_invoice_items` for each business
4. Store Stripe invoice PDF URL
5. Mark as paid with payment timestamp

**Invoice Structure**:
```typescript
{
  invoice_number: "SUB-2024-123456",
  subtotal_amount: 19000,      // In grosze
  tax_amount: 0,               // VAT when applicable
  total_amount: 19000,
  currency: "pln",
  status: "paid",
  billing_period_start: "2024-01-01T00:00:00Z",
  billing_period_end: "2024-02-01T00:00:00Z",
  stripe_invoice_id: "in_xxxxx",
  pdf_url: "https://...",
}
```

### User Access to Invoices

Users can view their invoices in the app:
- List of all subscription invoices
- Download PDF from Stripe
- View line items per business
- Payment history

## 🎁 Promo Codes

### Types of Discounts

1. **Percentage Discount**
   - Example: 20% off
   - Applied to total amount

2. **Fixed Amount**
   - Example: 50 PLN off
   - Deducted from total

3. **Free Months**
   - Example: 1 month free
   - Extends subscription period

### Admin Management

**Create Promo Code**:
```typescript
{
  code: "PROMO2024",
  description: "New Year Promotion",
  discount_type: "percentage",
  discount_value: 20,
  max_uses: 100,
  valid_until: "2024-12-31",
  applicable_to: ["jdg", "spolka"],
}
```

**Features**:
- Auto-generate random codes
- Set usage limits
- Expiration dates
- Plan-specific codes
- Usage tracking
- Enable/disable codes

## 🔐 Security

### Multi-Layer Verification

1. **Real-Time Sync** - WebSocket monitors subscription changes
2. **Server Verification** - Edge Function validates status
3. **Encrypted Tokens** - 5-minute JWT tokens with HMAC
4. **Database RLS** - Final security layer
5. **Audit Logging** - All access attempts tracked

### Premium Access Flow

```typescript
// Client-side
const { isActive, token } = usePremiumSync();

// Makes API call with token
await fetch('/api/premium-feature', {
  headers: { 'X-Premium-Token': token }
});

// Server-side verification
const verified = await verifyPremiumToken(token);
if (!verified) return 403;
```

## 🛠️ Admin Panel

### Subscription Management

**Features**:
- View all subscriptions
- Filter by status (active/inactive)
- Search by user or business
- Grant free subscriptions
- View subscription details
- Track Stripe subscription IDs

**Grant Free Subscription**:
1. Select user
2. Select business profile
3. Set duration (days)
4. System creates subscription without Stripe
5. Marked as admin-granted in metadata

### Promo Code Management

**Features**:
- Create new codes
- View usage statistics
- Enable/disable codes
- Copy codes to clipboard
- Track expiration
- Monitor usage limits

### Analytics (Future)

- Revenue tracking
- Subscription growth
- Churn rate
- Popular plans
- Promo code effectiveness

## 📱 User Interface

### Multi-Business Checkout Component

**Location**: `src/modules/premium/components/MultiBusinessCheckout.tsx`

**Features**:
- List all user's businesses
- Show current subscription status
- Select multiple businesses
- Choose billing cycle
- Display savings for annual
- Show total price
- One-click checkout

**UX Considerations**:
- Disabled checkboxes for active subscriptions
- Visual indication of active plans
- Clear pricing per business
- Savings calculation for annual
- Loading states during checkout

### Premium Checkout Screen

**Location**: `src/modules/premium/screens/PremiumCheckout.tsx`

**Flow**:
1. User navigates from Premium page
2. Sees all businesses with pricing
3. Selects businesses and billing cycle
4. Reviews total
5. Clicks "Przejdź do płatności"
6. Redirected to Stripe
7. Completes payment
8. Returns to success page

## 🚀 Deployment

### Edge Functions

Deploy all Edge Functions:
```bash
# Deploy checkout function
supabase functions deploy create-premium-checkout

# Deploy webhook handler
supabase functions deploy handle-premium-webhook

# Deploy verification function (if not already deployed)
supabase functions deploy verify-premium-access
```

### Environment Variables

Set in Supabase dashboard:
```bash
# Stripe Keys
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_SECRET_KEY_PROD=sk_live_...

# Webhook Secrets
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_WEBHOOK_SECRET_PROD=whsec_...

# Premium Token Secret
PREMIUM_TOKEN_SECRET=your-secure-random-string

# App URL
APP_URL=https://app.ksiegai.pl
```

### Stripe Webhook Configuration

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://[project-ref].supabase.co/functions/v1/handle-premium-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to environment variables

### Database Migrations

All migrations applied:
- ✅ `add_stripe_customers_table`
- ✅ `add_promo_codes_table`
- ✅ Enhanced subscriptions (existing)
- ✅ Subscription invoices (existing)
- ✅ Enterprise benefits (existing)

## 🧪 Testing

### Test Scenarios

**Multi-Business Checkout**:
1. Create multiple business profiles
2. Select 2+ businesses
3. Choose monthly billing
4. Verify total calculation
5. Complete checkout
6. Verify subscriptions created

**Annual Billing**:
1. Select businesses
2. Choose annual billing
3. Verify savings displayed
4. Complete checkout
5. Verify correct end date (1 year)

**Promo Codes**:
1. Create promo code in admin
2. Apply during checkout
3. Verify discount applied
4. Check usage tracking

**Invoice Generation**:
1. Complete subscription payment
2. Wait for webhook
3. Verify invoice created
4. Check line items
5. Download PDF

**Admin Grant**:
1. Admin selects user
2. Selects business
3. Sets duration
4. Verify subscription created
5. Check metadata for admin flag

### Test Cards (Stripe Test Mode)

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

## 📈 Future Enhancements

### Short Term
- [ ] Email notifications for subscription events
- [ ] Subscription renewal reminders
- [ ] Failed payment retry logic
- [ ] Subscription upgrade/downgrade
- [ ] Self-service cancellation

### Medium Term
- [ ] VAT registration and collection
- [ ] Multiple payment methods (BLIK, P24)
- [ ] Subscription analytics dashboard
- [ ] Revenue reporting
- [ ] Customer portal

### Long Term
- [ ] Usage-based billing
- [ ] Add-on features
- [ ] Partner/reseller program
- [ ] API access for Enterprise
- [ ] White-label options

## 🐛 Troubleshooting

### Subscription Not Created After Payment

**Check**:
1. Webhook delivery in Stripe dashboard
2. Edge Function logs: `supabase functions logs handle-premium-webhook`
3. Database: `enhanced_subscriptions` table
4. Transaction log in `transactions` table

### Premium Features Not Accessible

**Check**:
1. Subscription `is_active` = true
2. `ends_at` is in the future
3. Premium sync service initialized
4. Token verification working
5. RLS policies correct

### Invoice Not Generated

**Check**:
1. `invoice.payment_succeeded` webhook received
2. Edge Function logs for errors
3. `subscription_invoices` table
4. Stripe invoice ID in metadata

### Promo Code Not Working

**Check**:
1. Code is active (`is_active` = true)
2. Not expired (`valid_until` > now)
3. Usage limit not reached
4. Applicable to selected plans

## 📞 Support

For issues or questions:
- Check Edge Function logs
- Review database audit logs
- Check Stripe dashboard
- Contact development team

---

**Last Updated**: January 2024  
**Version**: 1.0  
**Status**: Production Ready
