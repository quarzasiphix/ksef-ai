# Stripe Webhook Architecture - Separate Endpoints

**Date**: 2024-01-24  
**Recommendation**: ✅ **Use separate endpoints for test and live**

---

## 🎯 Why Separate Endpoints Are Better

### 1. **Complete Isolation**
- Test events can never accidentally hit live database
- Live events can never accidentally hit test database
- Zero risk of cross-contamination

### 2. **Clear Debugging**
- Logs clearly show `[TEST]` vs `[LIVE]` 
- Easy to identify which mode received events
- Separate monitoring and alerting

### 3. **Security**
- Test endpoint can have relaxed logging for debugging
- Live endpoint can have stricter monitoring
- Different rate limiting if needed

### 4. **Deployment Safety**
- Can deploy test endpoint without affecting live
- Can test webhook changes safely
- Rollback one mode without affecting the other

---

## 🏗️ Architecture Overview

```
Stripe Dashboard
├── Test Mode Webhook → https://your-project.supabase.co/functions/v1/stripe-webhook-test
└── Live Mode Webhook → https://your-project.supabase.co/functions/v1/stripe-webhook-live

Supabase Edge Functions
├── stripe-webhook-test/ (uses TEST secrets)
└── stripe-webhook-live/ (uses LIVE secrets)
```

---

## 📋 Implementation Details

### Test Webhook Endpoint
**URL**: `/functions/v1/stripe-webhook-test`
**Purpose**: Handle test mode events only
**Secret**: `STRIPE_WEBHOOK_SECRET_TEST`
**Logs**: `[Stripe Webhook TEST]`

### Live Webhook Endpoint  
**URL**: `/functions/v1/stripe-webhook-live`
**Purpose**: Handle live mode events only
**Secret**: `STRIPE_WEBHOOK_SECRET_PROD`
**Logs**: `[Stripe Webhook LIVE]`

---

## 🔧 Configuration Steps

### Step 1: Deploy Both Endpoints

```bash
# Deploy test webhook
supabase functions deploy stripe-webhook-test

# Deploy live webhook  
supabase functions deploy stripe-webhook-live
```

### Step 2: Configure Stripe Webhooks

**Test Mode Webhook**:
1. Stripe Dashboard → Developers → Webhooks
2. Toggle **Test mode** ON
3. Endpoint URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook-test`
4. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
5. Copy signing secret → `STRIPE_WEBHOOK_SECRET_TEST`

**Live Mode Webhook**:
1. Toggle **Test mode** OFF
2. Endpoint URL: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook-live`
3. Same events as test
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET_PROD`

### Step 3: Add Secrets to Supabase

```bash
# Test webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET_TEST=whsec_test_...

# Live webhook secret
supabase secrets set STRIPE_WEBHOOK_SECRET_PROD=whsec_live_...
```

---

## 🔄 How It Works

### Test Mode Flow
```
User Checkout (test) → Stripe Test → Test Webhook → Test Database
```

### Live Mode Flow  
```
User Checkout (live) → Stripe Live → Live Webhook → Live Database
```

**No cross-communication possible!**

---

## 📊 Comparison

| Feature | Single Endpoint | Separate Endpoints |
|---------|----------------|-------------------|
| **Isolation** | ❌ Risk of cross-contamination | ✅ Complete isolation |
| **Debugging** | ❌ Hard to identify mode | ✅ Clear mode identification |
| **Safety** | ❌ Mode switching errors possible | ✅ Zero mode switching in webhooks |
| **Monitoring** | ❌ Mixed logs | ✅ Separate monitoring |
| **Deployment** | ❌ Affects both modes | ✅ Deploy independently |
| **Complexity** | ✅ Simpler setup | ⚠️ Slightly more complex |

---

## 🚀 Benefits You Get

### 1. **Zero Risk of Test Data in Live**
- Test subscriptions can never create live premium access
- Test payments never affect live transaction records
- Safe to test with real Stripe test cards

### 2. **Clear Monitoring**
```bash
# Test webhook logs
[Stripe Webhook TEST] Received event: checkout.session.completed
[Stripe Webhook TEST] Premium access granted to user: test-user-id

# Live webhook logs  
[Stripe Webhook LIVE] Received event: checkout.session.completed
[Stripe Webhook LIVE] Premium access granted to user: real-user-id
```

### 3. **Independent Deployment**
- Can update test webhook without affecting live
- Can test new webhook logic safely
- Can rollback one mode if issues

---

## 🛠️ Migration from Single Endpoint

If you have existing single endpoint:

1. **Deploy new endpoints** (`-test` and `-live`)
2. **Create new webhooks** in Stripe Dashboard
3. **Add new secrets** to Supabase
4. **Test both endpoints** independently
5. **Delete old webhook** from Stripe (optional)
6. **Delete old endpoint** (optional)

---

## 📝 Code Differences

### Single Endpoint (Old)
```typescript
// Dynamic secret selection based on app_settings
const mode = await getStripeMode();
const webhookSecret = mode === 'live' 
  ? Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD')
  : Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');
```

### Separate Endpoints (New)
```typescript
// Test endpoint - always uses test secret
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST');

// Live endpoint - always uses live secret  
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET_PROD');
```

---

## ✅ Recommendation Summary

**Go with separate endpoints!** The benefits far outweigh the minimal additional complexity:

- ✅ **Complete isolation** - zero risk of test/live mix-up
- ✅ **Clear debugging** - easy to identify issues
- ✅ **Independent deployment** - safer updates
- ✅ **Better monitoring** - separate logs and alerts
- ✅ **Future-proof** - can add mode-specific logic

---

## 🎯 Next Steps

1. ✅ Deploy both webhook endpoints
2. ✅ Configure webhooks in Stripe Dashboard  
3. ✅ Add secrets to Supabase
4. ✅ Test test endpoint with test checkout
5. ✅ Verify logs show `[TEST]` prefix
6. ✅ When ready, test live endpoint
7. ✅ Monitor both endpoints independently

**Your webhook system will be bulletproof!** 🛡️
