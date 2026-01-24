# Stripe Account Migration - Cleanup Guide

**Purpose**: Clean up all previous Stripe secrets and prepare for fresh Stripe account setup  
**Date**: 2024-01-24  

---

## ✅ Database Cleanup Completed

The following database tables have been cleaned of all Stripe references:

### 1. Stripe Products
- ✅ Cleared `stripe_product_id_test` and `stripe_product_id_prod`
- ✅ Cleared `stripe_price_id_test` and `stripe_price_id_prod`
- **Status**: Ready for new Stripe price IDs

### 2. Business Profiles (Stripe Connect)
- ✅ Cleared `stripe_connect_account_id`
- ✅ Reset `stripe_connect_status` to 'not_started'
- ✅ Reset `stripe_charges_enabled` to false
- ✅ Reset `stripe_payouts_enabled` to false
- ✅ Cleared `stripe_onboarding_completed_at`
- **Status**: Ready for fresh Stripe Connect setup

### 3. Subscriptions
- ✅ Cleared `stripe_customer_id` from `entity_subscriptions`
- ✅ Cleared `stripe_subscription_id` from both subscription tables
- **Status**: Ready for new subscriptions

### 4. Invoices
- ✅ Cleared `stripe_checkout_session_id`
- ✅ Cleared `stripe_payment_intent_id`
- **Status**: Historical invoices preserved, payment links removed

---

## 🔧 Environment Variables to Update

### Supabase Edge Functions (Backend)
```bash
# Remove old keys and add new ones
STRIPE_SECRET_KEY_TEST=sk_test_... (NEW)
STRIPE_SECRET_KEY_PROD=sk_live_... (NEW)
STRIPE_WEBHOOK_SECRET_TEST=whsec_... (NEW)
STRIPE_WEBHOOK_SECRET_PROD=whsec_... (NEW)

# Stripe Connect (if using)
STRIPE_CONNECT_CLIENT_ID=ca_... (NEW)
STRIPE_CONNECT_SECRET_KEY=sk_live_... (NEW)
```

### Frontend (ksef-ai)
```bash
# .env file
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_... (NEW)
VITE_STRIPE_PUBLISHABLE_KEY_PROD=pk_live_... (NEW)
```

---

## 📋 Migration Steps

### Step 1: Create New Stripe Account
1. Sign up for new Stripe account
2. Complete business verification
3. Enable Poland (PL) as supported country

### Step 2: Create Products in New Stripe
1. Go to Stripe Dashboard → Products
2. Create products for each plan:
   - **Monthly**: 19.00 PLN/month
   - **Annual**: 150.00 PLN/year  
   - **Enterprise**: 999.00 PLN one-time
3. Copy price IDs for both test and live modes

### Step 3: Update Environment Variables
```bash
cd ksef-ai
# Edit .env file with new keys
nano .env

# Deploy to Supabase
supabase secrets set STRIPE_SECRET_KEY_TEST=sk_test_NEW_KEY
supabase secrets set STRIPE_SECRET_KEY_PROD=sk_live_NEW_KEY
supabase secrets set STRIPE_WEBHOOK_SECRET_TEST=whsec_NEW_WEBHOOK
supabase secrets set STRIPE_WEBHOOK_SECRET_PROD=whsec_NEW_WEBHOOK
```

### Step 4: Update Admin Panel
1. Go to Admin Panel → App Settings → Stripe Products
2. Edit each product and add new Stripe price IDs
3. Test with test mode first
4. Switch to live mode when ready

### Step 5: Configure Webhooks
1. In Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Add events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret to environment variables

### Step 6: Test Integration
1. Set `app_settings.stripe_mode = 'test'`
2. Test checkout flow with test card: `4242 4242 4242 4242`
3. Verify webhook delivery
4. Check database for subscription creation
5. Test premium access granting

---

## 🗑️ Files to Review/Clean

### Code Files (Already Cleaned)
- ✅ `stripe-config.ts` - Uses environment variables only
- ✅ `BlikPaymentModal.tsx` - Uses dynamic key loading
- ✅ All Edge Functions - Use centralized config
- ✅ Premium components - Load from database

### Documentation Files (May contain old examples)
- 📝 `STRIPE_PRODUCTS_GUIDE.md` - Update with new price IDs
- 📝 `FRONTEND_SETUP.md` - Update with new publishable keys
- 📝 Various architecture docs - Review for old key references

---

## 🚀 Quick Start Commands

```bash
# 1. Update environment variables
cd ksef-ai
cp .env.example .env
# Edit .env with your new Stripe keys

# 2. Deploy Edge Functions
supabase functions deploy stripe-webhook
supabase functions deploy create-stripe-checkout-subscription
supabase functions deploy create-stripe-payment-intent

# 3. Test webhook endpoint
curl -X POST https://your-project.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# 4. Check app settings
# Go to admin panel → App Settings → Stripe Payment Settings
# Verify mode switching works
```

---

## ⚠️ Important Notes

1. **Test First**: Always test with test keys before going live
2. **Webhook Security**: Keep webhook secrets secure
3. **Environment Separation**: Never mix test and live keys
4. **Backup**: Keep old keys archived for reference
5. **Monitor**: Check Stripe Dashboard for webhook delivery

---

## 📞 Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify webhook endpoint is accessible
3. Confirm environment variables are set correctly
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/webhook`

---

## ✅ Migration Checklist

- [ ] Create new Stripe account
- [ ] Get new API keys (test + live)
- [ ] Create products in Stripe Dashboard
- [ ] Update environment variables
- [ ] Deploy Edge Functions
- [ ] Configure webhooks
- [ ] Add price IDs to admin panel
- [ ] Test checkout flow
- [ ] Verify premium access
- [ ] Switch to live mode
- [ ] Monitor first live transaction

---

**Status**: Database cleaned ✅ | Ready for new Stripe account setup 🚀
