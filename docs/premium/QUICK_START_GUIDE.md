# Premium Subscription System - Quick Start Guide

## 🚀 For Developers

### 1. Deploy Edge Functions

```bash
# Deploy all premium-related Edge Functions
supabase functions deploy verify-premium-access
supabase functions deploy create-premium-checkout
supabase functions deploy handle-premium-webhook
```

### 2. Set Environment Variables

In Supabase Dashboard → Settings → Edge Functions:

```bash
STRIPE_SECRET_KEY_TEST=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET_TEST=whsec_your_secret_here
PREMIUM_TOKEN_SECRET=generate_random_secure_string
APP_URL=https://app.ksiegai.pl
```

### 3. Configure Stripe Webhook

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://[project-ref].supabase.co/functions/v1/handle-premium-webhook`
3. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
4. Copy webhook secret to environment variables

### 4. Add Routes to App

**ksef-ai** (`src/shared/config/routes.tsx`):
```typescript
const PremiumCheckout = React.lazy(() => import('@/modules/premium/screens/PremiumCheckout'));

// Add to routes array
{
  path: '/premium/checkout',
  element: <PremiumCheckout />,
  guard: 'protected',
  title: 'Checkout Premium',
  hideInNav: true,
}
```

**admin-ksiegai** (`src/App.tsx`):
```typescript
import { Subscriptions } from '@/pages/Subscriptions';
import { PromoCodes } from '@/pages/PromoCodes';

// Add routes
<Route path="/subscriptions" element={
  <ProtectedRoute>
    <Subscriptions />
  </ProtectedRoute>
} />

<Route path="/promo-codes" element={
  <ProtectedRoute requiredRole="super_admin">
    <PromoCodes />
  </ProtectedRoute>
} />
```

### 5. Test the Flow

1. Create test user and business profiles
2. Navigate to `/premium/checkout`
3. Select businesses and billing cycle
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify subscription in database
7. Test premium features

## 👤 For Users

### How to Subscribe

1. **Navigate to Premium**
   - Click "Premium" in sidebar
   - Or go to `/premium`

2. **Choose Your Plan**
   - See available plans (JDG, Spółka)
   - Click "Wybierz plan" or "Checkout"

3. **Select Businesses**
   - Check businesses to subscribe
   - Choose monthly or annual billing
   - See total with savings

4. **Complete Payment**
   - Redirected to Stripe
   - Enter payment details
   - Complete checkout

5. **Access Premium Features**
   - Immediately available
   - All selected businesses now premium
   - Invoice sent to email

### Pricing

**JDG Premium**
- Monthly: 19.00 PLN/month
- Annual: 190.00 PLN/year (save 38 PLN)

**Spółka Standard**
- Monthly: 89.00 PLN/month
- Annual: 890.00 PLN/year (save 178 PLN)

### Features Included

**JDG Premium**:
- Unlimited invoices
- Basic accounting
- JPK export
- KSeF integration

**Spółka Standard**:
- All JDG features
- Corporate governance system
- Asset management
- Decision tracking
- Audit trail
- Unlimited documents

## 🛠️ For Admins

### Grant Free Subscription

1. Go to Admin Panel → Subscriptions
2. Click "Przyznaj subskrypcję"
3. Select user and business
4. Set duration (days)
5. Click "Przyznaj"

### Create Promo Code

1. Go to Admin Panel → Promo Codes
2. Click "Nowy kod"
3. Enter code or generate random
4. Set discount type and value
5. Optional: Set max uses and expiry
6. Click "Utwórz kod"

### Monitor Subscriptions

- View all active subscriptions
- Track expiring subscriptions
- See Stripe subscription IDs
- Monitor usage and revenue

## 🔧 Troubleshooting

### Subscription Not Working After Payment

**Check**:
1. Stripe webhook delivered (Stripe Dashboard)
2. Edge Function logs: `supabase functions logs handle-premium-webhook`
3. Database: `SELECT * FROM enhanced_subscriptions WHERE user_id = 'xxx'`

**Fix**:
- Manually trigger webhook from Stripe
- Or manually create subscription in database

### Premium Features Not Accessible

**Check**:
1. Subscription active: `is_active = true`
2. Not expired: `ends_at > now()`
3. Premium sync initialized
4. Clear browser cache

**Fix**:
- Force re-verification: `premiumSyncService.forceVerify()`
- Check browser console for errors

### Invoice Not Generated

**Check**:
1. Webhook `invoice.payment_succeeded` received
2. Edge Function logs for errors
3. `subscription_invoices` table

**Fix**:
- Manually trigger invoice generation
- Check Stripe invoice ID and status

## 📞 Support

- **Technical Issues**: Check Edge Function logs
- **Payment Issues**: Stripe Dashboard
- **Database Issues**: Supabase Dashboard
- **User Support**: Contact admin team

---

**Need Help?** Check the full documentation in `PREMIUM_SUBSCRIPTION_SYSTEM.md`
