# Stripe Connect Setup Guide

## Complete Step-by-Step Guide for Setting Up Stripe Connect

This guide walks you through setting up Stripe Connect so your users can connect their Stripe accounts and accept payments from their customers.

---

## Prerequisites

- Stripe account (business account recommended)
- Supabase project with Edge Functions enabled
- Domain with SSL (required for production)
- Database migrations applied

---

## Part 1: Stripe Dashboard Configuration

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for a business account
3. Complete business verification (required for Connect)
4. Verify your email and phone number

### Step 2: Enable Stripe Connect

#### Test Mode Setup

1. **Go to Stripe Dashboard** → Switch to **Test Mode** (toggle in top right)
2. **Navigate to Connect** → Settings
3. **Click "Get Started"** on Connect

4. **Configure Platform Settings**:
   - **Platform name**: "KSeF AI" (or your brand name)
   - **Platform description**: "Polish invoicing and accounting platform"
   - **Support email**: your-support@yourdomain.com
   - **Platform URL**: https://yourdomain.com

5. **Branding**:
   - Upload logo (recommended: 512x512px PNG)
   - Choose brand color (hex code)
   - Upload icon (recommended: 128x128px PNG)

6. **Account Types**:
   - ✅ Enable **Express accounts** (recommended for simplicity)
   - Account country: **Poland (PL)**
   - Default currency: **PLN**

7. **Capabilities**:
   - ✅ **card_payments**: Accept card payments
   - ✅ **transfers**: Receive payouts
   - ✅ **blik_payments**: Polish BLIK payments (if available)
   - ✅ **p24_payments**: Przelewy24 (if available)

8. **Save Settings**

#### Live Mode Setup

**Important**: Repeat the above steps in **Live Mode** once you're ready for production.

### Step 3: Configure Webhooks (Test Mode)

1. **Go to Developers** → **Webhooks**
2. **Click "Add endpoint"**

3. **For Premium Subscriptions (Billing)**:
   - **Endpoint URL**: `https://[your-project].supabase.co/functions/v1/stripe-webhook`
   - **Description**: "Premium Subscriptions Webhook"
   - **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - **Click "Add endpoint"**
   - **Copy the signing secret** (starts with `whsec_...`)
   - Save as `STRIPE_WEBHOOK_SECRET_TEST`

4. **For Connect (Merchant Payments)**:
   - **Click "Add endpoint"** again
   - **Endpoint URL**: `https://[your-project].supabase.co/functions/v1/stripe-connect-webhook`
   - **Description**: "Connect Payments Webhook"
   - **Filter events**: Select "Connect" events
   - **Events to send**:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
     - `account.updated`
     - `account.application.deauthorized`
   - **Click "Add endpoint"**
   - **Copy the signing secret**
   - Save as `STRIPE_CONNECT_WEBHOOK_SECRET_TEST`

### Step 4: Get API Keys (Test Mode)

1. **Go to Developers** → **API keys**
2. **Copy the following**:
   - **Publishable key** (starts with `pk_test_...`) - for frontend
   - **Secret key** (starts with `sk_test_...`) - for backend
3. Save secret key as `STRIPE_SECRET_KEY_TEST`

### Step 5: Repeat for Live Mode

**When ready for production**, repeat Steps 3-4 in **Live Mode**:
- Configure webhooks with live endpoint URLs
- Get live API keys (`pk_live_...`, `sk_live_...`)
- Save as `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_LIVE`, `STRIPE_CONNECT_WEBHOOK_SECRET_LIVE`

---

## Part 2: Supabase Configuration

### Step 1: Set Environment Variables

```bash
# Test Mode Keys
supabase secrets set STRIPE_SECRET_KEY_TEST=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET_TEST=whsec_...
supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET_TEST=whsec_...

# Live Mode Keys (when ready)
supabase secrets set STRIPE_SECRET_KEY_LIVE=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET_LIVE=whsec_...

# Application URLs
supabase secrets set APP_URL=https://yourdomain.com
supabase secrets set APP_URL_DEV=http://localhost:5173
```

### Step 2: Verify Database Migrations

Ensure these migrations are applied:
```bash
# Check migrations
supabase migration list

# Should see:
# - 20251216_stripe_connect_payments.sql ✅
# - 20251216_app_settings.sql ✅
```

### Step 3: Set Stripe Mode

```sql
-- Start in test mode (default)
SELECT stripe_mode FROM app_settings;
-- Should return: 'test'

-- When ready for production:
UPDATE app_settings 
SET stripe_mode = 'live' 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Step 4: Deploy Edge Functions

```bash
# Deploy all Stripe-related functions
supabase functions deploy stripe-webhook
supabase functions deploy stripe-connect-account
supabase functions deploy stripe-connect-onboarding
supabase functions deploy stripe-connect-status
supabase functions deploy stripe-create-payment-checkout
supabase functions deploy stripe-connect-webhook
```

### Step 5: Test Webhook Endpoints

```bash
# Test that webhooks are reachable
curl https://[your-project].supabase.co/functions/v1/stripe-webhook
curl https://[your-project].supabase.co/functions/v1/stripe-connect-webhook

# Should return 400 (missing signature) - this is expected
```

---

## Part 3: User Flow Setup

### Merchant Onboarding Flow

This is how your users will connect their Stripe accounts:

#### 1. User Initiates Connection

**Frontend** (Business Profile Settings):
```typescript
const handleConnectStripe = async () => {
  try {
    // Step 1: Create Stripe Connect account
    const { data: account } = await supabase.functions.invoke(
      'stripe-connect-account',
      { body: { businessProfileId } }
    );

    if (account.status === 'enabled') {
      toast.success('Stripe already connected!');
      return;
    }

    // Step 2: Get onboarding link
    const { data: onboarding } = await supabase.functions.invoke(
      'stripe-connect-onboarding',
      { body: { businessProfileId } }
    );

    // Step 3: Redirect to Stripe
    window.location.href = onboarding.url;
  } catch (error) {
    toast.error('Failed to connect Stripe');
  }
};
```

#### 2. User Completes Stripe Onboarding

- User is redirected to Stripe
- Fills out business information
- Verifies identity (ID, bank account)
- Accepts Stripe Terms of Service
- Redirected back to your app

#### 3. Return URL Handling

**Frontend** (Business Profile Settings):
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  
  if (params.get('stripe_success') === '1') {
    // Refresh account status
    checkStripeStatus();
    toast.success('Stripe connected successfully!');
  }
  
  if (params.get('stripe_refresh') === '1') {
    toast.info('Please complete Stripe onboarding');
  }
}, []);

const checkStripeStatus = async () => {
  const { data } = await supabase.functions.invoke(
    'stripe-connect-status',
    { body: { businessProfileId } }
  );
  
  setStripeStatus(data.status); // 'enabled', 'pending', or 'not_started'
};
```

#### 4. Status Indicators

Show merchant their connection status:

```typescript
{stripeStatus === 'enabled' && (
  <Badge variant="success">
    <CheckCircle className="h-4 w-4 mr-1" />
    Stripe Connected
  </Badge>
)}

{stripeStatus === 'pending' && (
  <Badge variant="warning">
    <Clock className="h-4 w-4 mr-1" />
    Verification Pending
  </Badge>
)}

{stripeStatus === 'not_started' && (
  <Button onClick={handleConnectStripe}>
    <CreditCard className="h-4 w-4 mr-2" />
    Connect Stripe
  </Button>
)}
```

### Customer Payment Flow

This is how customers pay invoices:

#### 1. Merchant Enables Payments

**Frontend** (Invoice Detail):
```typescript
const handleTogglePayments = async () => {
  // Check if Stripe is connected
  if (!businessProfile.stripe_charges_enabled) {
    toast.error('Please connect Stripe first');
    navigate('/settings/business-profiles');
    return;
  }

  // Enable payments on invoice
  await supabase
    .from('invoices')
    .update({ payments_enabled: true })
    .eq('id', invoiceId);
    
  toast.success('Online payments enabled!');
};
```

#### 2. Customer Views Invoice

Public share page (`/share/:slug`) shows:
- Invoice details
- "Zapłać Online" button (if payments enabled)
- Payment benefits section
- Stripe trust indicators

#### 3. Customer Clicks Pay

```typescript
const handlePayOnline = async () => {
  const { data } = await supabase.functions.invoke(
    'stripe-create-payment-checkout',
    { body: { shareSlug } }
  );

  // Redirect to Stripe Checkout
  window.location.href = data.url;
};
```

#### 4. Stripe Checkout

Customer sees Stripe-hosted checkout page with:
- Invoice details
- Amount to pay
- Payment methods (card, BLIK, P24)
- Secure payment form
- Polish language

#### 5. Payment Completion

- Customer completes payment
- Stripe processes payment
- Sends webhook to your backend
- Invoice automatically marked as paid
- Customer redirected back with success message

#### 6. Webhook Processing

**Backend** (automatic):
1. Receives `checkout.session.completed` event
2. Verifies webhook signature
3. Creates payment record in `invoice_payments`
4. Trigger updates `invoices` table
5. Invoice status → "paid"
6. Merchant sees updated status

---

## Part 4: Testing

### Test Mode Testing

#### 1. Test Merchant Onboarding

```bash
# Use Stripe test mode
# Test business details:
# - Business name: Test Business
# - Tax ID: Any valid format
# - Bank account: Use Stripe test bank account
```

#### 2. Test Payment Flow

Use Stripe test cards:

**Successful Payment**:
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

**Declined Payment**:
```
Card: 4000 0000 0000 0002
```

**3D Secure Required**:
```
Card: 4000 0027 6000 3184
```

**BLIK Test** (if enabled):
```
Code: 777777
```

#### 3. Test Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select `checkout.session.completed`
5. Check Edge Function logs for processing

#### 4. Verify Database Updates

```sql
-- Check payment record created
SELECT * FROM invoice_payments ORDER BY created_at DESC LIMIT 1;

-- Check invoice marked as paid
SELECT id, number, payment_status, paid_at 
FROM invoices 
WHERE payment_status = 'paid';

-- Check business profile status
SELECT 
  name,
  stripe_connect_status,
  stripe_charges_enabled,
  stripe_payouts_enabled
FROM business_profiles
WHERE stripe_connect_account_id IS NOT NULL;
```

---

## Part 5: Going Live

### Pre-Launch Checklist

- [ ] All test flows working correctly
- [ ] Webhooks tested and processing correctly
- [ ] Live Stripe account verified
- [ ] Live API keys configured
- [ ] Live webhooks configured
- [ ] Production domain configured
- [ ] SSL certificate valid
- [ ] Return URLs point to production
- [ ] Terms of Service updated
- [ ] Privacy Policy updated
- [ ] Support email configured
- [ ] Monitoring/alerts set up

### Launch Steps

1. **Switch to Live Mode in Stripe Dashboard**
   - Configure Connect settings (same as test)
   - Set up webhooks (same endpoints, live mode)
   - Get live API keys

2. **Update Environment Variables**
   ```bash
   supabase secrets set STRIPE_SECRET_KEY_LIVE=sk_live_...
   supabase secrets set STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
   supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET_LIVE=whsec_...
   ```

3. **Switch Database to Live Mode**
   ```sql
   UPDATE app_settings 
   SET stripe_mode = 'live' 
   WHERE id = '00000000-0000-0000-0000-000000000001';
   ```

4. **Redeploy Edge Functions** (to pick up new mode)
   ```bash
   supabase functions deploy --all
   ```

5. **Test with Real Card** (small amount)
   - Use your own card
   - Complete full payment flow
   - Verify webhook processing
   - Check payout in Stripe Dashboard

6. **Monitor Closely**
   - Watch Edge Function logs
   - Check Stripe Dashboard for events
   - Monitor webhook success rate
   - Review error logs

### Post-Launch

- Set up alerts for failed payments
- Monitor webhook processing times
- Review audit logs weekly
- Check payout schedules
- Gather user feedback

---

## Part 6: Troubleshooting

### Common Issues

#### "Account not found" Error

**Cause**: Stripe Connect account not created

**Solution**:
```typescript
// Call stripe-connect-account first
await supabase.functions.invoke('stripe-connect-account', {
  body: { businessProfileId }
});
```

#### "Charges not enabled" Error

**Cause**: Merchant hasn't completed onboarding

**Solution**: Direct merchant to complete Stripe onboarding via the onboarding link.

#### Webhook Not Processing

**Cause**: Webhook secret mismatch or endpoint unreachable

**Solution**:
1. Check webhook secret matches environment variable
2. Verify endpoint URL is correct
3. Check Edge Function logs for errors
4. Test webhook in Stripe Dashboard

#### Payment Not Marked as Paid

**Cause**: Webhook not received or trigger not firing

**Solution**:
1. Check webhook logs in Stripe Dashboard
2. Verify webhook endpoint is receiving events
3. Check `invoice_payments` table for record
4. Verify trigger function is enabled

#### Wrong Stripe Mode

**Cause**: Database mode doesn't match intended mode

**Solution**:
```sql
-- Check current mode
SELECT stripe_mode FROM app_settings;

-- Switch if needed
UPDATE app_settings SET stripe_mode = 'test'; -- or 'live'
```

---

## Part 7: Monitoring & Maintenance

### Key Metrics to Monitor

1. **Merchant Onboarding**
   - Onboarding start rate
   - Onboarding completion rate
   - Time to complete onboarding
   - Drop-off points

2. **Payment Processing**
   - Payment success rate
   - Average payment amount
   - Payment method breakdown
   - Failed payment reasons

3. **Webhooks**
   - Webhook success rate
   - Processing time
   - Retry attempts
   - Error types

4. **Payouts**
   - Payout schedule adherence
   - Failed payouts
   - Payout amounts

### Logging

Check Edge Function logs:
```bash
supabase functions logs stripe-connect-webhook --tail
supabase functions logs stripe-create-payment-checkout --tail
```

### Stripe Dashboard

Monitor:
- **Connect** → Accounts → View all connected accounts
- **Developers** → Webhooks → Event logs
- **Payments** → All payments
- **Reports** → Custom reports

---

## Part 8: Security Best Practices

### API Keys
- ✅ Never commit keys to git
- ✅ Use environment variables only
- ✅ Rotate keys periodically (every 90 days)
- ✅ Use different keys for test/live
- ✅ Restrict key permissions if possible

### Webhooks
- ✅ Always verify webhook signatures
- ✅ Use HTTPS only
- ✅ Implement idempotency
- ✅ Log all webhook events
- ✅ Monitor for suspicious activity

### User Data
- ✅ Never store card details
- ✅ Use Stripe Customer IDs
- ✅ Encrypt sensitive data
- ✅ Implement RLS policies
- ✅ Audit access logs

### Compliance
- ✅ PCI DSS: Stripe handles this
- ✅ GDPR: Document data processing
- ✅ Polish regulations: Ensure compliance
- ✅ Terms of Service: Keep updated
- ✅ Privacy Policy: Disclose Stripe usage

---

## Summary

You now have a complete Stripe Connect setup that:

- ✅ Allows merchants to connect their Stripe accounts
- ✅ Enables customers to pay invoices online
- ✅ Automatically processes payments via webhooks
- ✅ Switches between test/live modes via database
- ✅ Logs all admin actions
- ✅ Provides feature flags
- ✅ Supports Polish payment methods (BLIK, P24)
- ✅ Handles errors gracefully
- ✅ Scales with your platform

**Next Steps**:
1. Complete frontend UI for merchant onboarding
2. Build admin panel for monitoring
3. Set up alerts and monitoring
4. Test thoroughly in test mode
5. Launch in live mode when ready

**Questions?** Check the troubleshooting section or Stripe's documentation.
