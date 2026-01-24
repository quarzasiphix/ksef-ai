# Stripe Products Management Guide

**Last Updated**: 2024-01-24  
**Status**: Implemented

---

## Overview

Stripe products are now managed dynamically from the admin panel instead of being hardcoded in the application. This allows you to:

- **Update pricing** without code changes
- **Add new plans** on the fly
- **Manage Stripe IDs** for test and live modes
- **Control product visibility** (active/inactive)
- **Customize features** for each plan

---

## Database Schema

### stripe_products Table

```sql
CREATE TABLE stripe_products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,                    -- Display name (e.g., "Miesięczny")
  description TEXT,                      -- Plan description
  stripe_product_id_test TEXT,          -- Stripe product ID (test mode)
  stripe_product_id_prod TEXT,          -- Stripe product ID (live mode)
  stripe_price_id_test TEXT,            -- Stripe price ID (test mode)
  stripe_price_id_prod TEXT,            -- Stripe price ID (live mode)
  price_amount INTEGER NOT NULL,         -- Price in minor units (grosze)
  currency TEXT DEFAULT 'pln',
  interval TEXT CHECK (interval IN ('month', 'year', 'one_time')),
  interval_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  plan_type TEXT CHECK (plan_type IN ('monthly', 'annual', 'lifetime')),
  features JSONB DEFAULT '[]'::jsonb,   -- Array of feature strings
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields**:
- `price_amount`: Always in minor currency units (100 grosze = 1 PLN)
- `plan_type`: Identifier used in URLs (`/premium/monthly`)
- `stripe_price_id_test` / `stripe_price_id_prod`: Separate IDs for each mode
- `features`: JSON array of feature strings displayed to users

---

## Admin Panel Management

### Location

Admin Panel → App Settings → **Stripe Products** section

### Features

**View Products**:
- List all products with pricing and status
- See which Stripe price IDs are configured
- Check active/inactive status

**Add Product**:
1. Click "Add Product"
2. Fill in details:
   - Product Name (e.g., "Miesięczny")
   - Plan Type (monthly/annual/lifetime)
   - Description
   - Price in grosze (e.g., 1900 for 19 PLN)
   - Interval (month/year/one_time)
   - Stripe Price IDs (test and live)
3. Set active status
4. Save

**Edit Product**:
1. Click edit icon on product
2. Update any fields
3. Save changes

**Delete Product**:
- Click delete icon
- Confirm deletion
- Product removed from database

---

## Setting Up Stripe Products

### Step 1: Create Products in Stripe Dashboard

**For Each Plan (Test Mode)**:
1. Go to Stripe Dashboard → Products
2. Toggle "Test mode" ON
3. Click "Add product"
4. Enter:
   - Name: "Premium Monthly" (or similar)
   - Description: Optional
   - Pricing: Recurring or One-time
   - Price: 19.00 PLN
   - Billing period: Monthly (or appropriate)
5. Save and copy the **Price ID** (starts with `price_test_`)

**Repeat for Live Mode**:
1. Toggle "Test mode" OFF
2. Create identical product
3. Copy **Price ID** (starts with `price_`)

**Important**: Create separate products for each plan:
- Monthly: 19.00 PLN/month
- Annual: 150.00 PLN/year
- Enterprise: 999.00 PLN one-time

### Step 2: Add to Admin Panel

1. Open Admin Panel → App Settings
2. Scroll to "Stripe Products"
3. Click "Add Product"
4. Fill in:
   - Name: "Miesięczny"
   - Plan Type: "monthly"
   - Description: "Pełna kontrola nad spółką..."
   - Price: 1900 (grosze)
   - Interval: "month"
   - Stripe Price ID (Test): `price_test_...` (from Step 1)
   - Stripe Price ID (Live): `price_...` (from Step 1)
   - Active: ON
5. Save

### Step 3: Verify

1. Go to app → `/premium`
2. Products should load from database
3. Click "Kup teraz" to test checkout
4. Verify correct Stripe price ID is used based on mode

---

## How It Works

### Frontend Flow

**1. User visits `/premium` or `/premium/monthly`**:
```typescript
// Fetches products from database
const { data: products } = useStripeProducts();
```

**2. User clicks "Kup teraz"**:
```typescript
// Opens checkout modal with selected product
openPremiumDialog('monthly');
```

**3. Checkout modal loads product**:
```typescript
// Finds product by plan_type
const product = products.find(p => p.plan_type === 'monthly');
```

**4. User proceeds to payment**:
```typescript
// Calls Edge Function with product ID
await supabase.functions.invoke('create-stripe-checkout-subscription', {
  body: { productId: product.id }
});
```

### Backend Flow

**Edge Function: `create-stripe-checkout-subscription`**:

1. Receives `productId` from frontend
2. Fetches product from database
3. Checks current Stripe mode (`app_settings.stripe_mode`)
4. Selects appropriate price ID:
   - Test mode → `stripe_price_id_test`
   - Live mode → `stripe_price_id_prod`
5. Creates Stripe Checkout session
6. Returns checkout URL
7. Logs transaction

---

## Price Management

### Updating Prices

**Option 1: Update Existing Price** (Recommended for subscriptions)
1. Create new price in Stripe Dashboard
2. Update `stripe_price_id_test` / `stripe_price_id_prod` in admin panel
3. Old subscriptions continue with old price
4. New subscriptions use new price

**Option 2: Edit Product Price** (For display only)
1. Update `price_amount` in admin panel
2. This only affects display
3. Actual Stripe price is determined by price ID

### Adding New Plans

1. Create product in Stripe (test + live)
2. Add to admin panel with both price IDs
3. Set unique `plan_type` (e.g., "quarterly")
4. Set `display_order` for positioning
5. Activate product
6. Product appears on `/premium` page

---

## Features Management

### Editing Features

Features are stored as JSON array:

```json
[
  "System decyzji i uchwał — pełna kontrola uprawnień",
  "Nieograniczone dokumenty i eksporty (JPK, KSeF)",
  "Niezależność od księgowej jako gatekeepera"
]
```

**To Update**:
1. Edit product in admin panel
2. Features field (future enhancement - currently set via database)
3. Or update directly in database:

```sql
UPDATE stripe_products
SET features = '[
  "New feature 1",
  "New feature 2",
  "New feature 3"
]'::jsonb
WHERE plan_type = 'monthly';
```

---

## Testing

### Test Mode Checkout

1. Set `app_settings.stripe_mode = 'test'`
2. Go to `/premium`
3. Select plan
4. Click "Kup teraz"
5. Should redirect to Stripe Checkout with test price ID
6. Use test card: `4242 4242 4242 4242`
7. Complete checkout
8. Verify subscription created in Stripe Dashboard (test mode)

### Live Mode Checkout

1. Set `app_settings.stripe_mode = 'live'`
2. Repeat above steps
3. Should use live price ID
4. **Real charges will be made!**

---

## Troubleshooting

### "Product not found or inactive"

**Cause**: Product doesn't exist or `is_active = false`  
**Fix**: Check admin panel, ensure product is active

### "Stripe price ID not configured for [mode] mode"

**Cause**: Missing price ID for current mode  
**Fix**: Add appropriate price ID in admin panel

### Products not loading in app

**Cause**: RLS policy issue or database connection  
**Fix**: 
1. Check browser console for errors
2. Verify RLS policies allow SELECT on `stripe_products`
3. Ensure products have `is_active = true`

### Wrong price displayed

**Cause**: `price_amount` doesn't match Stripe price  
**Fix**: Update `price_amount` to match (in grosze)

---

## Migration from Hardcoded Plans

### Old System (Hardcoded)

```typescript
const plans = [
  {
    id: 'monthly',
    name: 'Miesięczny',
    price: '19 zł',
    // ...
  }
];
```

### New System (Database)

```typescript
const { data: products } = useStripeProducts();
// Products loaded from stripe_products table
```

**Migration Steps**:
1. ✅ Created `stripe_products` table
2. ✅ Inserted default products
3. ✅ Updated `PremiumCheckoutModal` to use database
4. ✅ Updated `PremiumPlanDetails` to use database
5. ✅ Created admin UI for management
6. ⏳ Add Stripe price IDs via admin panel
7. ⏳ Test checkout flow
8. ⏳ Remove old hardcoded plans (already done)

---

## Best Practices

1. **Always set both test and live price IDs** before activating
2. **Test in test mode first** before switching to live
3. **Keep display_order consistent** for predictable ordering
4. **Use descriptive names** that match Stripe Dashboard
5. **Document feature changes** when updating products
6. **Verify webhooks** work with new products
7. **Monitor transactions table** for successful checkouts

---

## Future Enhancements

- [ ] UI for editing features array in admin panel
- [ ] Bulk import/export of products
- [ ] Product analytics (most popular, conversion rates)
- [ ] A/B testing different pricing
- [ ] Promo codes and discounts
- [ ] Trial period configuration per product
- [ ] Custom metadata fields

---

## API Reference

### useStripeProducts Hook

```typescript
import { useStripeProducts } from '@/modules/premium/hooks/useStripeProducts';

const { data: products, isLoading } = useStripeProducts();
// Returns all active products ordered by display_order
```

### useStripeProduct Hook

```typescript
import { useStripeProduct } from '@/modules/premium/hooks/useStripeProducts';

const { data: product, isLoading } = useStripeProduct('monthly');
// Returns single product by plan_type
```

### Helper Functions

```typescript
import { 
  formatPrice,           // Format price for display
  getIntervalLabel,      // Get Polish interval label
  getStripePriceId       // Get price ID for current mode
} from '@/modules/premium/hooks/useStripeProducts';

formatPrice(1900, 'pln');              // "19,00 zł"
getIntervalLabel('month', 1);          // "miesiąc"
await getStripePriceId(product);       // Returns test or live price ID
```

---

## Support

For issues or questions:
1. Check Stripe Dashboard for product/price configuration
2. Verify `app_settings.stripe_mode` is correct
3. Check Edge Function logs in Supabase Dashboard
4. Review `transactions` table for payment attempts
5. Check browser console for frontend errors
