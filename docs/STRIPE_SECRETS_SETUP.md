# Stripe Secrets Configuration for Supabase

**Date**: 2024-01-24  
**Purpose**: Complete list of Stripe secrets to add to Supabase Edge Functions

---

## 🔑 Required Secrets - Add to Supabase Dashboard

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

### 1. Stripe Billing Secrets (Premium Subscriptions)

#### Test Mode
```
STRIPE_SECRET_KEY_TEST
Value: sk_test_... (from Stripe Dashboard → Developers → API keys → Test mode)

STRIPE_WEBHOOK_SECRET_TEST
Value: whsec_... (from Stripe Dashboard → Developers → Webhooks → Test mode endpoint)
```

#### Live Mode
```
STRIPE_SECRET_KEY_PROD
Value: sk_live_... (from Stripe Dashboard → Developers → API keys → Live mode)

STRIPE_WEBHOOK_SECRET_PROD
Value: whsec_... (from Stripe Dashboard → Developers → Webhooks → Live mode endpoint)
```

---

### 2. Stripe Connect Secrets (Marketplace/Invoice Payments)

#### Test Mode
```
STRIPE_CONNECT_WEBHOOK_SECRET_TEST
Value: whsec_... (separate webhook endpoint for Connect events in test mode)
```

#### Live Mode
```
STRIPE_CONNECT_WEBHOOK_SECRET_PROD
Value: whsec_... (separate webhook endpoint for Connect events in live mode)
```

---

## 📋 Complete Secret List Summary

**Total: 6 secrets**

| Secret Name | Mode | Purpose | Where to Get |
|------------|------|---------|--------------|
| `STRIPE_SECRET_KEY_TEST` | Test | API calls (subscriptions, checkout) | Stripe Dashboard → API keys (test) |
| `STRIPE_SECRET_KEY_PROD` | Live | API calls (subscriptions, checkout) | Stripe Dashboard → API keys (live) |
| `STRIPE_WEBHOOK_SECRET_TEST` | Test | Verify webhook signatures (billing) | Stripe Dashboard → Webhooks (test) |
| `STRIPE_WEBHOOK_SECRET_PROD` | Live | Verify webhook signatures (billing) | Stripe Dashboard → Webhooks (live) |
| `STRIPE_CONNECT_WEBHOOK_SECRET_TEST` | Test | Verify Connect webhook signatures | Stripe Dashboard → Webhooks (test) |
| `STRIPE_CONNECT_WEBHOOK_SECRET_PROD` | Live | Verify Connect webhook signatures | Stripe Dashboard → Webhooks (live) |

---

## 🎯 Step-by-Step Setup Guide

### Step 1: Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **API keys**
3. Toggle **Test mode** ON
4. Copy **Secret key** (starts with `sk_test_`)
5. Toggle **Test mode** OFF
6. Copy **Secret key** (starts with `sk_live_`)

### Step 2: Create Webhook Endpoints

#### For Billing (Premium Subscriptions)

**Test Mode Webhook**:
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Toggle **Test mode** ON
3. Click **Add endpoint**
4. Endpoint URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
5. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **Add endpoint**
7. Copy **Signing secret** (starts with `whsec_`)

**Live Mode Webhook**:
1. Toggle **Test mode** OFF
2. Repeat steps above with same URL
3. Copy **Signing secret** (different from test)

#### For Stripe Connect (Optional - if using marketplace features)

**Test Mode Connect Webhook**:
1. Toggle **Test mode** ON
2. Click **Add endpoint**
3. Endpoint URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-connect-webhook`
4. Select events:
   - `account.updated`
   - `account.external_account.created`
   - `account.external_account.updated`
   - `capability.updated`
5. Click **Add endpoint**
6. Copy **Signing secret**

**Live Mode Connect Webhook**:
1. Toggle **Test mode** OFF
2. Repeat steps above
3. Copy **Signing secret**

### Step 3: Add Secrets to Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** → **Edge Functions**
4. Scroll to **Secrets** section
5. Click **Add new secret**
6. Add each secret one by one:

```bash
# Example format:
Name: STRIPE_SECRET_KEY_TEST
Value: sk_test_51St1ynLN4PiX51am...
```

**Add all 6 secrets** (or 4 if not using Connect):
- ✅ STRIPE_SECRET_KEY_TEST
- ✅ STRIPE_SECRET_KEY_PROD
- ✅ STRIPE_WEBHOOK_SECRET_TEST
- ✅ STRIPE_WEBHOOK_SECRET_PROD
- ✅ STRIPE_CONNECT_WEBHOOK_SECRET_TEST (optional)
- ✅ STRIPE_CONNECT_WEBHOOK_SECRET_PROD (optional)

---

## 🔄 How Dynamic Switching Works

The system automatically selects the correct secrets based on `app_settings.stripe_mode`:

### When `stripe_mode = 'test'`:
```typescript
// Backend uses:
STRIPE_SECRET_KEY_TEST
STRIPE_WEBHOOK_SECRET_TEST
STRIPE_CONNECT_WEBHOOK_SECRET_TEST

// Frontend uses:
VITE_STRIPE_PUBLISHABLE_KEY_TEST (from .env)
```

### When `stripe_mode = 'live'`:
```typescript
// Backend uses:
STRIPE_SECRET_KEY_PROD
STRIPE_WEBHOOK_SECRET_PROD
STRIPE_CONNECT_WEBHOOK_SECRET_PROD

// Frontend uses:
VITE_STRIPE_PUBLISHABLE_KEY_PROD (from .env)
```

**Switch modes** via Admin Panel → App Settings → Stripe Mode toggle

---

## 🧪 Testing Your Setup

### Test Mode Verification

1. Set mode to test in admin panel
2. Go to `/premium` in your app
3. Select a plan and click "Kup teraz"
4. Should redirect to Stripe Checkout (test mode)
5. Use test card: `4242 4242 4242 4242`
6. Complete checkout
7. Check Supabase Edge Function logs for webhook delivery
8. Verify subscription created in database

### Webhook Testing

```bash
# Test webhook endpoint is accessible
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# Should return 200 or authentication error (not 404)
```

### Check Logs

1. Go to Supabase Dashboard → Edge Functions
2. Click on `stripe-webhook` function
3. View logs to see webhook events
4. Look for: `[Stripe Billing] Initializing in test mode`

---

## ⚠️ Important Security Notes

1. **Never commit secrets to git**
2. **Keep test and live secrets separate**
3. **Rotate secrets if exposed**
4. **Use restricted API keys** when possible
5. **Monitor webhook delivery** in Stripe Dashboard
6. **Test in test mode first** before going live

---

## 🔍 Troubleshooting

### "Stripe secret key not configured"
- **Cause**: Secret not added to Supabase or wrong name
- **Fix**: Double-check secret name matches exactly (case-sensitive)

### "Webhook signature verification failed"
- **Cause**: Wrong webhook secret or endpoint URL mismatch
- **Fix**: Verify webhook secret matches the endpoint you created

### "No such price"
- **Cause**: Using test price ID in live mode (or vice versa)
- **Fix**: Ensure products have correct price IDs for current mode

### Webhook not receiving events
- **Cause**: Endpoint URL incorrect or webhook not created
- **Fix**: 
  1. Check Stripe Dashboard → Webhooks
  2. Verify endpoint URL is correct
  3. Test endpoint with "Send test webhook"

---

## 📝 Checklist

Before going live, ensure:

- [ ] All 6 secrets added to Supabase
- [ ] Test mode webhooks configured and working
- [ ] Live mode webhooks configured (but not tested with real money yet)
- [ ] Frontend `.env` file has both test and live publishable keys
- [ ] Products in admin panel have test AND live price IDs
- [ ] Test checkout flow works in test mode
- [ ] Webhook events are being received and processed
- [ ] Premium access is granted after successful payment
- [ ] Mode switching works (test ↔ live)

---

## 🚀 Quick Reference

### Supabase Secrets (Backend)
```
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_SECRET_KEY_PROD=sk_live_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_WEBHOOK_SECRET_PROD=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET_PROD=whsec_...
```

### Frontend .env (ksef-ai/.env)
```
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY_PROD=pk_live_...
```

### Webhook URLs
```
Billing: https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
Connect: https://YOUR_PROJECT.supabase.co/functions/v1/stripe-connect-webhook
```

---

## 📞 Next Steps

1. ✅ Add all 6 secrets to Supabase
2. ✅ Create webhook endpoints in Stripe
3. ✅ Add publishable keys to frontend `.env`
4. ✅ Create products in Stripe Dashboard
5. ✅ Add price IDs to admin panel
6. ✅ Test checkout in test mode
7. ✅ Verify webhook delivery
8. ✅ Test premium access granting
9. ⏳ Switch to live mode when ready
10. ⏳ Monitor first live transaction

**You're ready to configure your new Stripe account!** 🎉
