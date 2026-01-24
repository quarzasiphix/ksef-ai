# Stripe Integration Testing Guide

**Date**: 2024-01-24  
**Status**: Ready for testing with new Stripe account

---

## ✅ Current System Status

### Database State
- **App Settings**: ✅ `stripe_mode = 'test'`, payments enabled
- **Products**: ✅ 3 products exist, but **no price IDs configured**
- **Webhooks**: ✅ Both test and live endpoints deployed

### Deployed Functions
- ✅ `stripe-webhook-test` - Test webhook endpoint
- ✅ `stripe-webhook-live` - Live webhook endpoint  
- ✅ `create-stripe-checkout-subscription` - New checkout function

### Secrets Status
- ✅ Frontend publishable keys configured in `.env`
- ✅ Backend secrets added to Supabase (you did this)
- ⏳ **Need to verify webhook secrets are working**

---

## 🚀 Step-by-Step Testing Guide

### Step 1: Create Products in Stripe Dashboard

**Go to Stripe Dashboard → Products**

#### Create Test Mode Products
1. Toggle **Test mode** ON
2. Create these products:

**Monthly Plan**:
- Name: "Premium Monthly"
- Description: "Pełna kontrola nad spółką - miesięczna subskrypcja"
- Price: 19.00 PLN
- Billing: Monthly recurring
- Copy **Price ID** (starts with `price_test_`)

**Annual Plan**:
- Name: "Premium Annual"  
- Description: "Pełna kontrola nad spółką - roczna subskrypcja"
- Price: 150.00 PLN
- Billing: Annual recurring
- Copy **Price ID** (starts with `price_test_`)

**Enterprise Plan**:
- Name: "Enterprise One-Time"
- Description: "Pełna kontrola nad spółką - jednorazowa płatność"
- Price: 999.00 PLN
- Billing: One-time
- Copy **Price ID** (starts with `price_test_`)

#### Create Live Mode Products (Optional for now)
1. Toggle **Test mode** OFF
2. Create identical products with live prices
3. Copy live price IDs (starts with `price_`)

---

### Step 2: Add Price IDs to Admin Panel

1. Go to **Admin Panel → App Settings → Stripe Products**
2. Edit each product and add price IDs:

**Monthly Product**:
- Stripe Price ID (Test): `price_test_...` (from Step 1)
- Stripe Price ID (Live): `price_...` (from live mode, or leave empty for now)

**Annual Product**:
- Stripe Price ID (Test): `price_test_...` 
- Stripe Price ID (Live): `price_...` (or leave empty)

**Enterprise Product**:
- Stripe Price ID (Test): `price_test_...`
- Stripe Price ID (Live): `price_...` (or leave empty)

3. Save all products

---

### Step 3: Configure Webhooks in Stripe

**Test Mode Webhook**:
1. Stripe Dashboard → Developers → Webhooks
2. Toggle **Test mode** ON
3. Click **Add endpoint**
4. Endpoint URL: `https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/stripe-webhook-test`
5. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Click **Add endpoint**
7. Copy **Signing secret** (starts with `whsec_`)
8. Verify it matches `STRIPE_WEBHOOK_SECRET_TEST` in Supabase

**Live Mode Webhook** (when ready):
- Same steps with live mode
- URL: `https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/stripe-webhook-live`

---

### Step 4: Test the Checkout Flow

#### 4.1 Test Product Loading
1. Go to your app → `/premium`
2. Should see 3 products loaded from database
3. Check browser console for any errors

#### 4.2 Test Checkout Creation
1. Click "Kup teraz" on any plan
2. Should open checkout modal
3. Click "Przejdź do płatności"
4. Should redirect to Stripe Checkout (test mode)

#### 4.3 Test Payment
1. Use test card: `4242 4242 4242 4242`
2. Use any future expiry date
3. Use any 3-digit CVC
4. Use any postal code
5. Complete payment

#### 4.4 Verify Webhook Processing
1. Check Supabase Edge Function logs
2. Should see: `[Stripe Webhook TEST] Checkout completed: cs_...`
3. Should see: `[Stripe Webhook TEST] Premium access granted to user: ...`

#### 4.5 Verify Database Updates
```sql
-- Check subscription was created
SELECT * FROM premium_subscriptions WHERE user_id = 'YOUR_USER_ID';

-- Check premium status was granted
SELECT * FROM user_subscription_status WHERE user_id = 'YOUR_USER_ID';

-- Check transaction was logged
SELECT * FROM transactions WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 1;
```

---

## 🔍 Debugging Tools

### Check Webhook Delivery
```bash
# Test webhook endpoint is accessible
curl -X POST https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/stripe-webhook-test \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

### Check Function Logs
1. Go to Supabase Dashboard → Edge Functions
2. Click on `stripe-webhook-test`
3. View logs for recent activity

### Verify Stripe Mode
```sql
SELECT stripe_mode FROM app_settings WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Check Product Configuration
```sql
SELECT name, plan_type, stripe_price_id_test, stripe_price_id_prod, is_active 
FROM stripe_products 
WHERE is_active = true;
```

---

## ⚠️ Common Issues & Solutions

### "Product not found or inactive"
**Cause**: Product doesn't exist or `is_active = false`  
**Fix**: Check admin panel, ensure product is active

### "Stripe price ID not configured for test mode"
**Cause**: Missing `stripe_price_id_test` for current mode  
**Fix**: Add test price ID in admin panel

### "Webhook signature verification failed"
**Cause**: Wrong webhook secret or endpoint URL mismatch  
**Fix**: Verify webhook secret matches Stripe Dashboard

### "No such price"
**Cause**: Using wrong price ID or mode mismatch  
**Fix**: Ensure test price ID is used in test mode

### Premium access not granted
**Cause**: Webhook not processed or user ID mismatch  
**Fix**: Check webhook logs, verify `client_reference_id` matches user ID

---

## 📊 Success Indicators

### ✅ Successful Test Flow
1. Products load from database
2. Checkout redirects to Stripe
3. Payment completes with test card
4. Webhook receives event
5. Database shows premium subscription
6. User has premium access

### ✅ Log Messages to Look For
```
[Stripe Webhook TEST] Received event: checkout.session.completed
[Stripe Webhook TEST] Checkout completed: cs_test_...
[Stripe Webhook TEST] Premium access granted to user: ...
```

---

## 🚀 Going Live Checklist

Before switching to live mode:

- [ ] All test flows working perfectly
- [ ] Live products created in Stripe
- [ ] Live price IDs added to admin panel
- [ ] Live webhook endpoint configured
- [ ] Live webhook secret added to Supabase
- [ ] Test with small amount first
- [ ] Monitor first live transaction

---

## 📞 Quick Commands

### Switch to Live Mode
```sql
UPDATE app_settings 
SET stripe_mode = 'live' 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Check Recent Transactions
```sql
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check User Premium Status
```sql
SELECT * FROM user_subscription_status 
WHERE user_id = 'YOUR_USER_ID';
```

---

## 🎯 Next Steps

1. **Create Stripe products** (Step 1)
2. **Add price IDs to admin panel** (Step 2)  
3. **Configure webhooks** (Step 3)
4. **Test checkout flow** (Step 4)
5. **Verify premium access works**
6. **Go live when ready**

**Your Stripe integration is ready to test!** 🎉
