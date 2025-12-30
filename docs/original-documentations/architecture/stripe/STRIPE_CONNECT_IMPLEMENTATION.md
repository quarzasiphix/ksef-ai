# Stripe Connect Payment Gateway - Implementation Guide

## Overview
This document describes the complete Stripe Connect implementation for accepting invoice payments in the Polish invoicing application.

## Architecture

### Database Schema
- **business_profiles**: Added Stripe Connect account fields
- **invoices**: Added payment tracking fields
- **invoice_payments**: New table for detailed payment records

### Backend (Supabase Edge Functions)
1. **stripe-connect-account**: Create/retrieve Stripe Connect account
2. **stripe-connect-onboarding**: Generate onboarding link
3. **stripe-connect-status**: Check account status
4. **stripe-create-payment-checkout**: Create payment session (public)
5. **stripe-connect-webhook**: Handle payment webhooks

### Frontend Components
1. **ShareDocuments.tsx**: Public payment page
2. **InvoiceDetail.tsx**: Merchant payment enablement
3. **Business Profile Settings**: Stripe Connect onboarding
4. **Accounting.tsx**: Payment reconciliation

## Setup Instructions

### 1. Environment Variables
Add to Supabase Edge Functions secrets:
```bash
STRIPE_SECRET_KEY_PROD=sk_live_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
APP_URL=https://yourdomain.com
```

### 2. Stripe Dashboard Configuration

#### Create Connect Platform
1. Go to Stripe Dashboard → Connect → Settings
2. Enable Express accounts
3. Set brand name and colors
4. Configure webhook endpoint: `https://[project].supabase.co/functions/v1/stripe-connect-webhook`
5. Subscribe to events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`

#### Get Webhook Secret
1. Go to Developers → Webhooks
2. Add endpoint for Connect events
3. Copy webhook signing secret to `STRIPE_CONNECT_WEBHOOK_SECRET`

### 3. Deploy Edge Functions
```bash
supabase functions deploy stripe-connect-account
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-connect-status
supabase functions deploy stripe-create-payment-checkout
supabase functions deploy stripe-connect-webhook
```

### 4. Database Migration
Already applied via MCP. Includes:
- Stripe Connect fields on business_profiles
- Payment tracking fields on invoices
- invoice_payments table
- Triggers for automatic status updates
- RLS policies

## User Flow

### Merchant Onboarding
1. Merchant goes to Business Profile settings
2. Clicks "Połącz Stripe" (Connect Stripe)
3. Redirected to Stripe onboarding
4. Completes identity verification
5. Returns to app with enabled status

### Invoice Payment Enablement
1. Merchant views invoice detail
2. Toggles "Włącz płatności online" (Enable online payments)
3. System checks if Stripe Connect is enabled
4. If not, prompts to connect Stripe first

### Customer Payment
1. Customer receives share link
2. Views invoice with "Zapłać Online" button
3. Clicks button → redirected to Stripe Checkout
4. Completes payment (card/BLIK/P24)
5. Redirected back with success message
6. Invoice automatically marked as paid

### Webhook Processing
1. Stripe sends `checkout.session.completed` event
2. Webhook verifies signature
3. Creates/updates invoice_payment record
4. Trigger automatically updates invoice status
5. Merchant sees paid status in dashboard

## Polish UI Text

### Payment Button
- **Zapłać Online** - Pay Online
- **Płatność Online** - Online Payment

### Status Messages
- **Opłacone** - Paid
- **Nieopłacone** - Unpaid
- **Oczekuje na płatność** - Awaiting payment
- **Płatność zakończona sukcesem!** - Payment successful!
- **Płatność została anulowana** - Payment was cancelled

### Benefits
- **Bezpieczeństwo** - Security: Stripe trusted partner
- **Wygoda** - Convenience: Card, BLIK, or P24
- **Szybkość** - Speed: Instant confirmation
- **Księgowość** - Accounting: Auto-marked as paid

### Errors
- **Nie udało się utworzyć sesji płatności** - Failed to create payment session
- **Płatności nie są włączone dla tej faktury** - Payments not enabled for this invoice
- **Faktura została już opłacona** - Invoice already paid
- **Sprzedawca nie ma aktywnego konta płatności** - Seller doesn't have active payment account

## Accounting Integration

### Payment Records
All payments stored in `invoice_payments` table with:
- Provider (stripe/manual/bank_transfer)
- Amount in minor units (grosze)
- Status tracking
- Metadata for reconciliation

### Reconciliation View
Accounting dashboard shows:
- Payment method: "Stripe"
- Payment date
- Amount received
- Link to invoice

### Payout Tracking
Future enhancement: Track Stripe payouts that bundle multiple payments

## Security Considerations

### Webhook Verification
- All webhooks verify Stripe signature
- Events processed idempotently using `provider_event_id`
- Service role key used for database updates

### Public Endpoint Security
- `stripe-create-payment-checkout` is public (no auth)
- Validates share slug exists and is valid
- Checks payment enablement and merchant status
- Prevents duplicate sessions within 30 minutes

### RLS Policies
- Users can only view their own payment records
- Service role has full access for webhooks
- Public cannot directly access payment tables

## Testing

### Test Mode
1. Use Stripe test keys: `sk_test_...`
2. Use test webhook secret
3. Test cards:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
   - 3D Secure: 4000 0027 6000 3184

### Test Flow
1. Create test business profile
2. Connect test Stripe account
3. Create test invoice
4. Enable payments
5. Share link
6. Complete test payment
7. Verify webhook processing
8. Check invoice marked as paid

## Monitoring

### Logs to Check
- Edge Function logs in Supabase dashboard
- Stripe webhook logs in Stripe dashboard
- Database triggers via Postgres logs

### Key Metrics
- Payment success rate
- Average time to payment
- Failed payment reasons
- Webhook processing time

## Troubleshooting

### Payment Not Marked as Paid
1. Check webhook logs in Stripe
2. Verify webhook secret is correct
3. Check Edge Function logs
4. Verify RLS policies allow service role
5. Check trigger function executed

### Onboarding Fails
1. Verify redirect URLs are correct
2. Check Stripe Connect settings
3. Ensure Express accounts enabled
4. Verify country is Poland (PL)

### Checkout Session Creation Fails
1. Check merchant has charges_enabled
2. Verify amount is positive integer
3. Check currency is valid (PLN/EUR/USD)
4. Verify destination account exists

## Future Enhancements

### Phase 2
- Application fees (platform commission)
- Payout reconciliation dashboard
- Refund handling UI
- Payment analytics

### Phase 3
- Recurring payments for subscriptions
- Payment plans/installments
- Multi-currency support
- Custom payment methods

## Support

### Stripe Documentation
- Connect: https://stripe.com/docs/connect
- Checkout: https://stripe.com/docs/payments/checkout
- Webhooks: https://stripe.com/docs/webhooks

### Polish Market
- BLIK integration: Enabled by default
- Przelewy24: Enabled by default
- VAT handling: Automatic in invoice amounts
- Currency: PLN primary, EUR/USD supported

## Compliance

### GDPR
- Customer payment data stored by Stripe
- Only transaction IDs stored in database
- No card details stored locally

### Polish Regulations
- Invoices marked paid automatically
- Payment records for accounting
- VAT properly calculated before payment
- Compliant with Polish e-commerce law

---

**Implementation Status**: ✅ Complete
**Last Updated**: 2025-12-16
**Version**: 1.0.0
