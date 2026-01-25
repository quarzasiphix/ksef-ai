# Premium Subscription System - Deployment Guide

## ✅ Implementation Complete

All premium subscription system components have been implemented:

### Edge Functions Created
1. **`create-premium-checkout`** - Multi-business Stripe checkout
2. **`handle-premium-webhook`** - Stripe webhook handler for subscription lifecycle
3. **`verify-premium-access`** - Already deployed (server-side premium verification)

### Database Migrations Applied
1. ✅ `stripe_customers` table
2. ✅ `promo_codes` table  
3. ✅ `promo_code_usage` table

### Frontend Components Created
1. **ksef-ai**: `MultiBusinessCheckout.tsx`, `PremiumCheckout.tsx`
2. **admin-ksiegai**: `Subscriptions.tsx`, `PromoCodes.tsx`

## 🚀 Deployment Steps Using MCP Tools

### 1. Edge Functions Are Ready to Deploy

The following functions need to be deployed but require the `_shared/stripe-config.ts` dependency:
- `create-premium-checkout`
- `handle-premium-webhook`

**Note**: MCP deployment tools currently have a limitation with shared dependencies. The functions reference `../_shared/stripe-config.ts` which needs to be bundled.

**Workaround Options**:
1. **Manual deployment** (temporary until MCP supports shared modules):
   ```bash
   cd ksef-ai
   supabase functions deploy create-premium-checkout
   supabase functions deploy handle-premium-webhook
   ```

2. **Inline the shared code** (not recommended - creates duplication)

3. **Wait for MCP enhancement** to support shared module bundling

### 2. Set Environment Variables

In Supabase Dashboard → Settings → Edge Functions:

```bash
# Stripe Keys
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_SECRET_KEY_PROD=sk_live_xxxxx

# Webhook Secrets  
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx
STRIPE_WEBHOOK_SECRET_PROD=whsec_xxxxx

# Premium Token Secret
PREMIUM_TOKEN_SECRET=your_secure_random_string

# App URLs
APP_URL=https://app.ksiegai.pl
APP_URL_DEV=http://localhost:5173
```

### 3. Configure Stripe Webhook

1. Stripe Dashboard → Webhooks → Add endpoint
2. URL: `https://rncrzxjyffxmfbnxlqtm.supabase.co/functions/v1/handle-premium-webhook`
3. Events to select:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to environment variables

### 4. Add Frontend Routes

**ksef-ai** - Add to `src/shared/config/routes.tsx`:
```typescript
const PremiumCheckout = React.lazy(() => 
  import('@/modules/premium/screens/PremiumCheckout')
);

{
  path: '/premium/checkout',
  element: <PremiumCheckout />,
  guard: 'protected',
  hideInNav: true,
}
```

**admin-ksiegai** - Add to `src/App.tsx`:
```typescript
import { Subscriptions } from '@/pages/Subscriptions';
import { PromoCodes } from '@/pages/PromoCodes';

<Route path="/subscriptions" element={
  <ProtectedRoute><Subscriptions /></ProtectedRoute>
} />

<Route path="/promo-codes" element={
  <ProtectedRoute requiredRole="super_admin">
    <PromoCodes />
  </ProtectedRoute>
} />
```

### 5. Update Navigation (admin-ksiegai)

Add menu items for new admin pages.

### 6. Test End-to-End

1. Create test user with multiple business profiles
2. Navigate to `/premium/checkout`
3. Select businesses and billing cycle
4. Use test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify subscriptions created in database
7. Check invoice generated
8. Test premium features access

## 📊 Current Pricing (VAT-Exempt)

| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| JDG Premium | 19.00 PLN | 190.00 PLN | 38 PLN |
| Spółka Standard | 89.00 PLN | 890.00 PLN | 178 PLN |

## 📚 Documentation Location

All documentation is in `tovernet/docs/workspace/premium/`:
- `PREMIUM_SUBSCRIPTION_SYSTEM.md` - Complete system guide
- `DEPLOYMENT_CHECKLIST.md` - Detailed deployment steps
- `QUICK_START_GUIDE.md` - Quick reference
- `VAT_IMPLEMENTATION_GUIDE.md` - Future VAT migration

## 🔧 Files Created

### Edge Functions
- `ksef-ai/supabase/functions/create-premium-checkout/index.ts`
- `ksef-ai/supabase/functions/handle-premium-webhook/index.ts`

### Frontend (ksef-ai)
- `src/modules/premium/components/MultiBusinessCheckout.tsx`
- `src/modules/premium/screens/PremiumCheckout.tsx`

### Admin Panel (admin-ksiegai)
- `src/pages/Subscriptions.tsx`
- `src/pages/PromoCodes.tsx`

## ⚠️ Important Notes

1. **Documentation Location**: All docs are in `tovernet/docs/workspace/`, not project roots
2. **MCP Tools**: Use Supabase MCP tools for database operations and deployments
3. **Shared Dependencies**: Edge Functions use `_shared/stripe-config.ts` - may need manual deployment
4. **VAT Ready**: System supports VAT but currently exempt - see VAT guide for migration

## ✅ Status

- **Database**: ✅ Complete (migrations applied)
- **Edge Functions**: ⚠️ Created, pending deployment (shared module issue)
- **Frontend**: ✅ Complete (routes need to be added)
- **Admin Panel**: ✅ Complete (routes need to be added)
- **Documentation**: ✅ Complete (in correct location)

---

**Next Action**: Deploy Edge Functions manually or wait for MCP shared module support, then add frontend routes.
