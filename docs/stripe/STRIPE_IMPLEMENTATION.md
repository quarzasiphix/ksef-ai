# Stripe Integration Implementation Guide

**Last Updated**: 2024-01-24  
**Status**: Phase 1 Complete, Phase 2 In Progress

---

## Overview

This document describes the Stripe payment integration for KsięgaI, including both premium subscriptions (billing) and Stripe Connect (for users to accept payments on invoices).

---

## Architecture

### Dual Stripe Integration

**1. Stripe Billing** (Premium Subscriptions)
- Users subscribe to KsięgaI premium plans
- Handled by standard Stripe Checkout
- Revenue goes to KsięgaI

**2. Stripe Connect** (Invoice Payments)
- Users connect their Stripe accounts
- Customers pay invoices via payment links
- Revenue goes to users (with platform fee)
- Enables invoice payment acceptance feature

---

## Centralized Configuration

### stripe-config.ts

**Location**: `supabase/functions/_shared/stripe-config.ts`

**Purpose**: Single source of truth for Stripe initialization

**Key Functions**:
```typescript
// For billing/subscriptions
export async function initializeStripe(): Promise<StripeConfig>

// For Connect/marketplace
export async function initializeStripeConnect(): Promise<StripeConfig>

// Get current mode from database
async function getStripeMode(): Promise<'test' | 'live'>
```

**Mode Selection**:
- Reads from `app_settings.stripe_mode` column
- Admin can toggle via AppSettings.tsx
- All Edge Functions respect this setting

---

## Environment Variables

### Backend (Supabase Edge Functions)

**Required Secrets**:
```
STRIPE_SECRET_KEY_TEST              # Test mode secret key
STRIPE_SECRET_KEY_PROD              # Live mode secret key
STRIPE_WEBHOOK_SECRET_TEST          # Test billing webhook secret
STRIPE_WEBHOOK_SECRET_PROD          # Live billing webhook secret
STRIPE_CONNECT_WEBHOOK_SECRET_TEST  # Test Connect webhook secret
STRIPE_CONNECT_WEBHOOK_SECRET_PROD  # Live Connect webhook secret
```

**Set via**: Supabase Dashboard → Edge Functions → Settings

### Frontend (React App)

**Required Environment Variables**:
```
VITE_STRIPE_PUBLISHABLE_KEY_TEST    # Test mode publishable key
VITE_STRIPE_PUBLISHABLE_KEY_PROD    # Live mode publishable key
```

**Set via**: `.env` file in ksef-ai root

---

## Edge Functions

### Billing Functions

**1. stripe-webhook** (`/stripe-webhook`)
- Handles Stripe webhook events
- Processes subscription lifecycle events
- Updates `premium_subscriptions` table
- Logs to `transactions` table

**2. create-stripe-checkout** (`/create-stripe-checkout`)
- Creates Stripe Checkout session
- Supports card and BLIK payments
- Returns checkout URL

**3. create-stripe-payment-intent** (`/create-stripe-payment-intent`)
- Creates PaymentIntent for BLIK
- Used by BlikPaymentModal component

**4. get-stripe-price** (`/get-stripe-price`)
- Retrieves Stripe price details
- Used for displaying plan information

**5. stripe-create-payment-checkout** (`/stripe-create-payment-checkout`)
- Creates checkout for invoice payments
- Uses Stripe Connect for fund transfer
- Public endpoint (accessed via share link)

### Stripe Connect Functions

**6. stripe-connect-webhook** (`/stripe-connect-webhook`)
- Handles Connect webhook events
- Updates account status
- Processes Connect-specific events

**7. stripe-connect-account** (`/stripe-connect-account`)
- Creates Stripe Connect account
- Links to business profile
- Returns account ID

**8. stripe-connect-onboarding** (`/stripe-connect-onboarding`)
- Generates onboarding link
- Redirects user to Stripe onboarding
- Handles return URLs

**9. stripe-connect-status** (`/stripe-connect-status`)
- Checks Connect account status
- Updates `business_profiles` table
- Returns charges/payouts enabled status

---

## Database Schema

### app_settings

```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY,
  stripe_mode TEXT CHECK (stripe_mode IN ('test', 'live')) DEFAULT 'test',
  stripe_test_enabled BOOLEAN DEFAULT true,
  stripe_live_enabled BOOLEAN DEFAULT false,
  payments_enabled BOOLEAN DEFAULT true,
  stripe_connect_enabled BOOLEAN DEFAULT true,
  premium_subscriptions_enabled BOOLEAN DEFAULT true,
  -- ... other settings
);
```

### business_profiles (Stripe Connect fields)

```sql
ALTER TABLE business_profiles ADD COLUMN
  stripe_connect_account_id TEXT,
  stripe_connect_status TEXT DEFAULT 'not_started',
  stripe_charges_enabled BOOLEAN DEFAULT false,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  stripe_default_currency TEXT DEFAULT 'pln',
  stripe_country TEXT DEFAULT 'PL',
  stripe_onboarding_completed_at TIMESTAMPTZ;
```

### premium_subscriptions

```sql
CREATE TABLE premium_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  is_active BOOLEAN DEFAULT false,
  ends_at TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  transaction_id TEXT,
  transaction_type TEXT,
  payment_system TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### invoice_payments

```sql
CREATE TABLE invoice_payments (
  id UUID PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id),
  business_profile_id UUID REFERENCES business_profiles(id),
  user_id UUID REFERENCES auth.users(id),
  provider TEXT, -- 'stripe'
  provider_checkout_id TEXT,
  amount_minor INTEGER,
  currency TEXT,
  status TEXT, -- 'pending', 'completed', 'failed'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Frontend Integration

### Dynamic Publishable Key Loading

**Pattern** (to be implemented in Phase 2):
```typescript
import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';

// Fetch current mode
const { data: settings } = await supabase
  .from('app_settings')
  .select('stripe_mode')
  .single();

// Select appropriate key
const publishableKey = settings?.stripe_mode === 'live'
  ? import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_PROD
  : import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST;

const stripePromise = loadStripe(publishableKey);
```

### Components Using Stripe

**BlikPaymentModal** (`src/modules/premium/components/BlikPaymentModal.tsx`)
- BLIK payment interface
- Uses Stripe Elements
- Currently has hardcoded live key (to be fixed)

**PremiumCheckoutModal** (`src/modules/premium/components/PremiumCheckoutModal.tsx`)
- Premium subscription checkout
- Redirects to Stripe Checkout

---

## Webhook Configuration

### Billing Webhooks

**Endpoint**: `https://rncrzxjyffxmfbnxlqtm.functions.supabase.co/stripe-webhook`

**Events to Subscribe**:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

**Webhook Secret**: Store in `STRIPE_WEBHOOK_SECRET_TEST` / `STRIPE_WEBHOOK_SECRET_PROD`

### Connect Webhooks

**Endpoint**: `https://rncrzxjyffxmfbnxlqtm.functions.supabase.co/stripe-connect-webhook`

**Events to Subscribe**:
- `account.updated`
- `account.external_account.created`
- `account.external_account.updated`
- `capability.updated`

**Webhook Secret**: Store in `STRIPE_CONNECT_WEBHOOK_SECRET_TEST` / `STRIPE_CONNECT_WEBHOOK_SECRET_PROD`

---

## Admin Panel Controls

### Current (AppSettings.tsx)

**Stripe Mode Toggle**:
- Test Mode / Live Mode buttons
- Updates `app_settings.stripe_mode`
- All Edge Functions respect this setting

**Feature Toggles**:
- Stripe Test Enabled
- Stripe Live Enabled
- Payments Enabled
- Stripe Connect Enabled
- Premium Subscriptions Enabled

### Planned (Phase 3)

**Secret Management**:
- View configured secrets (masked)
- Add/update secrets
- Test connection button
- Webhook endpoint viewer

---

## Testing

### Test Mode

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

**BLIK Test Code**: `777123` (in test mode)

**Test Connect Account**:
- Use Stripe test mode onboarding
- No real bank account needed

### Live Mode

**Requirements**:
- Real Stripe account
- Live API keys
- Webhook endpoints configured
- SSL certificate (handled by Supabase)

---

## Deployment Checklist

### Before Deploying

- [ ] All Edge Functions refactored to use stripe-config.ts ✅
- [ ] Frontend hardcoded keys removed
- [ ] Environment variables set in Supabase
- [ ] Webhook endpoints configured in Stripe Dashboard
- [ ] Test mode verified working
- [ ] Live mode keys added (when ready)

### Deploy Edge Functions

```bash
cd ksef-ai
supabase functions deploy stripe-webhook
supabase functions deploy create-stripe-checkout
supabase functions deploy create-stripe-payment-intent
supabase functions deploy get-stripe-price
supabase functions deploy stripe-create-payment-checkout
supabase functions deploy stripe-connect-webhook
supabase functions deploy stripe-connect-account
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-connect-status
```

### Verify Deployment

- [ ] Check function logs for mode confirmation
- [ ] Test subscription checkout
- [ ] Test BLIK payment
- [ ] Test Connect account creation
- [ ] Verify webhook delivery

---

## Troubleshooting

### "Stripe secret key not configured"

**Cause**: Environment variable not set  
**Fix**: Add secret via Supabase Dashboard → Edge Functions → Settings

### "Webhook signature verification failed"

**Cause**: Webhook secret mismatch  
**Fix**: Ensure webhook secret matches Stripe Dashboard configuration

### "Mode not switching"

**Cause**: app_settings not updated or Edge Functions not reading correctly  
**Fix**: Verify `app_settings.stripe_mode` value, check function logs

### "Hardcoded key still being used"

**Cause**: Frontend not updated or environment variables missing  
**Fix**: Complete Phase 2 implementation, add VITE_STRIPE_PUBLISHABLE_KEY_* vars

---

## Security Best Practices

1. **Never commit API keys** to Git
2. **Use test mode** by default
3. **Validate webhook signatures** (already implemented)
4. **Log all operations** for audit trail
5. **Encrypt sensitive data** at rest
6. **Use HTTPS** for all endpoints (Supabase handles this)
7. **Implement rate limiting** on public endpoints

---

## Future Enhancements

### Phase 3: Admin UI
- Secret management interface
- Connection testing
- Webhook log viewer
- Revenue analytics

### Phase 4: Invoice Payment Links
- Generate payment links for invoices
- Custom payment pages
- Payment status tracking
- Automatic invoice marking as paid

### Phase 5: Advanced Features
- Subscription plan management from admin
- Usage-based billing
- Proration handling
- Refund management

---

## References

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**For questions or issues, check**:
- Edge Function logs in Supabase Dashboard
- `ksef_audit_log` table for operation history
- Stripe Dashboard for webhook delivery status
