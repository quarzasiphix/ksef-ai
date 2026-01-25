# Premium Subscription System - Deployment Checklist

## ✅ Pre-Deployment

### Database Migrations
- [ ] Run `add_stripe_customers_table` migration
- [ ] Run `add_promo_codes_table` migration
- [ ] Verify `enhanced_subscriptions` table exists
- [ ] Verify `subscription_invoices` table exists
- [ ] Verify `subscription_invoice_items` table exists
- [ ] Verify `enterprise_benefits` table exists
- [ ] Verify `premium_access_logs` table exists
- [ ] Check all RLS policies are enabled

### Stripe Configuration
- [ ] Create Stripe account (or use existing)
- [ ] Get test mode API keys
- [ ] Get production mode API keys
- [ ] Create products in Stripe:
  - [ ] JDG Premium (monthly)
  - [ ] JDG Premium (annual)
  - [ ] Spółka Standard (monthly)
  - [ ] Spółka Standard (annual)
- [ ] Note down price IDs for each product

### Environment Variables
Set in Supabase Dashboard → Settings → Edge Functions:

```bash
# Stripe Test Keys
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx

# Stripe Production Keys (when ready)
STRIPE_SECRET_KEY_PROD=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET_PROD=whsec_xxxxx

# Premium Token Secret (generate secure random string)
PREMIUM_TOKEN_SECRET=xxxxx

# App URLs
APP_URL=https://app.ksiegai.pl
APP_URL_DEV=http://localhost:5173
```

## 🚀 Deployment Steps

### 1. Deploy Edge Functions

```bash
# Navigate to project
cd ksef-ai

# Deploy verify-premium-access (if not already deployed)
supabase functions deploy verify-premium-access

# Deploy create-premium-checkout
supabase functions deploy create-premium-checkout

# Deploy handle-premium-webhook
supabase functions deploy handle-premium-webhook
```

Verify deployment:
- [ ] All functions show as deployed
- [ ] No deployment errors
- [ ] Functions accessible via URL

### 2. Configure Stripe Webhooks

**Test Mode**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://[your-project-ref].supabase.co/functions/v1/handle-premium-webhook`
4. Select events:
   - [x] `checkout.session.completed`
   - [x] `customer.subscription.created`
   - [x] `customer.subscription.updated`
   - [x] `customer.subscription.deleted`
   - [x] `invoice.payment_succeeded`
   - [x] `invoice.payment_failed`
5. Copy webhook signing secret
6. Add to Supabase secrets as `STRIPE_WEBHOOK_SECRET_TEST`

**Production Mode** (when ready):
- [ ] Repeat above steps for production
- [ ] Use production webhook secret

### 3. Update App Settings

In `app_settings` table:
```sql
UPDATE app_settings 
SET stripe_mode = 'test' 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

When ready for production:
```sql
UPDATE app_settings 
SET stripe_mode = 'live' 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### 4. Seed Subscription Types

Verify subscription types exist:
```sql
SELECT * FROM subscription_types;
```

Should have:
- [ ] JDG (price_monthly: 1900, price_annual: 19000)
- [ ] Spółka (price_monthly: 8900, price_annual: 89000)
- [ ] Enterprise (custom pricing)

### 5. Deploy Frontend Changes

**ksef-ai**:
- [ ] Add route for `/premium/checkout`
- [ ] Update `routes.tsx` with new route
- [ ] Deploy to production

**admin-ksiegai**:
- [ ] Add route for `/subscriptions`
- [ ] Add route for `/promo-codes`
- [ ] Update navigation menu
- [ ] Deploy to production

## 🧪 Testing

### Test in Development

**Multi-Business Checkout**:
1. [ ] Create test user
2. [ ] Create 2+ business profiles
3. [ ] Navigate to premium checkout
4. [ ] Select businesses
5. [ ] Choose billing cycle
6. [ ] Verify total calculation
7. [ ] Click checkout
8. [ ] Complete with test card: `4242 4242 4242 4242`
9. [ ] Verify redirect to success page
10. [ ] Check database for subscriptions
11. [ ] Verify premium features accessible

**Webhook Processing**:
1. [ ] Complete test checkout
2. [ ] Check Stripe webhook logs
3. [ ] Verify webhook delivered successfully
4. [ ] Check Edge Function logs
5. [ ] Verify subscriptions created in DB
6. [ ] Verify invoice generated

**Admin Features**:
1. [ ] Login to admin panel
2. [ ] Navigate to Subscriptions
3. [ ] Verify list loads
4. [ ] Grant free subscription to test user
5. [ ] Verify subscription created
6. [ ] Navigate to Promo Codes
7. [ ] Create test promo code
8. [ ] Verify code saved

**Premium Verification**:
1. [ ] User with active subscription
2. [ ] Access premium feature
3. [ ] Verify token generated
4. [ ] Check `premium_access_logs`
5. [ ] Verify access granted

### Test Edge Cases

**Expired Subscription**:
1. [ ] Manually set `ends_at` to past date
2. [ ] Verify premium access denied
3. [ ] Check verification logs

**Failed Payment**:
1. [ ] Use decline test card: `4000 0000 0000 0002`
2. [ ] Verify webhook received
3. [ ] Check error handling
4. [ ] Verify subscription not created

**Multiple Businesses**:
1. [ ] Select 5+ businesses
2. [ ] Verify all line items in Stripe
3. [ ] Complete payment
4. [ ] Verify all subscriptions created

**Promo Code**:
1. [ ] Create 20% discount code
2. [ ] Apply during checkout
3. [ ] Verify discount in Stripe
4. [ ] Check usage tracking

## 📊 Monitoring

### Set Up Monitoring

**Supabase**:
- [ ] Enable Edge Function logs
- [ ] Set up log retention
- [ ] Configure alerts for errors

**Stripe**:
- [ ] Enable webhook monitoring
- [ ] Set up failed payment alerts
- [ ] Configure revenue notifications

**Database**:
- [ ] Monitor `enhanced_subscriptions` growth
- [ ] Track `subscription_invoices` creation
- [ ] Watch `premium_access_logs` for anomalies

### Key Metrics to Track

- [ ] Subscription conversion rate
- [ ] Monthly recurring revenue (MRR)
- [ ] Annual recurring revenue (ARR)
- [ ] Churn rate
- [ ] Average revenue per user (ARPU)
- [ ] Promo code usage
- [ ] Failed payment rate

## 🔒 Security Checks

- [ ] RLS enabled on all tables
- [ ] Admin routes protected
- [ ] Webhook signature verification working
- [ ] Premium token encryption working
- [ ] Audit logging enabled
- [ ] No sensitive data in logs
- [ ] HTTPS enforced
- [ ] CORS configured correctly

## 📝 Documentation

- [ ] Update user documentation
- [ ] Create admin guide
- [ ] Document promo code process
- [ ] Write troubleshooting guide
- [ ] Update API documentation

## 🎯 Go-Live Checklist

### Before Production

- [ ] All tests passing
- [ ] No critical bugs
- [ ] Performance tested
- [ ] Security audit completed
- [ ] Backup strategy in place
- [ ] Rollback plan ready

### Switch to Production

1. [ ] Update Stripe mode to 'live'
2. [ ] Update webhook endpoints
3. [ ] Verify production keys
4. [ ] Test with real card (small amount)
5. [ ] Monitor for 24 hours
6. [ ] Announce to users

### Post-Launch

- [ ] Monitor error rates
- [ ] Check webhook delivery
- [ ] Verify invoices generating
- [ ] Track first subscriptions
- [ ] Gather user feedback
- [ ] Document any issues

## 🆘 Rollback Plan

If critical issues occur:

1. [ ] Set Stripe mode back to 'test'
2. [ ] Disable checkout in UI
3. [ ] Investigate issue
4. [ ] Fix and redeploy
5. [ ] Re-test thoroughly
6. [ ] Re-enable when stable

## 📞 Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Supabase Support**: https://supabase.com/support
- **Development Team**: [your contact]

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Production Go-Live**: _______________  
**Status**: ⬜ Pending / ⬜ In Progress / ⬜ Complete
