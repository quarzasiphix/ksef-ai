# Stripe Setup Guide for Premium Subscriptions 🚀

## 🎯 Overview

This guide explains how to set up Stripe products and pricing for your premium subscription system. You have two options:

1. **Products with Prices** (Recommended) - Standard Stripe approach
2. **Custom Pricing** - Direct pricing in code (not recommended)

## 📋 Option 1: Products with Prices (Recommended)

### **Step 1: Create Products in Stripe Dashboard**

1. **Go to Stripe Dashboard** → **Products**
2. **Create JDG Premium Product:**
   - **Name**: `JDG Premium`
   - **Description**: `Premium subscription for jednoosobowe działalności gospodarcze`
   - **Image**: Add your app logo (optional)
   - **Unit Label**: `miesiąc`

3. **Create Spółka Standard Product:**
   - **Name**: `Spółka Standard`
   - **Description**: `Premium subscription for spółki z o.o. i S.A.`
   - **Image**: Add your app logo (optional)
   - **Unit Label**: `miesiąc`

### **Step 2: Add Prices to Each Product**

#### **JDG Premium Prices:**
- **Monthly**: `19.00 PLN/month`
- **Annual**: `190.00 PLN/year` (discount from 228 PLN)

#### **Spółka Standard Prices:**
- **Monthly**: `89.00 PLN/month`
- **Annual**: `890.00 PLN/year` (discount from 1068 PLN)

### **Step 3: Get Your Price IDs**

After creating prices, you'll see IDs like:
```
JDG Monthly: price_1abc2def3ghi4jkl
JDG Annual: price_5mno6pqr7stu8vwx
Spółka Monthly: price_9xyz1abc2def3ghi
Spółka Annual: price_0pqr1stu2vwx3yz
```

### **Step 4: Update Database with Real Price IDs**

Replace the placeholder IDs in your database:

```sql
-- Update with your actual Stripe price IDs
UPDATE subscription_types SET 
  stripe_price_id = 'price_1abc2def3ghi4jkl',  -- Replace with real JDG monthly ID
  stripe_annual_price_id = 'price_5mno6pqr7stu8vwx'  -- Replace with real JDG annual ID
WHERE name = 'jdg';

UPDATE subscription_types SET 
  stripe_price_id = 'price_9xyz1abc2def3ghi',  -- Replace with real Spółka monthly ID
  stripe_annual_price_id = 'price_0pqr1stu2vwx3yz'  -- Replace with real Spółka annual ID
WHERE name = 'spolka';
```

## 📋 Option 2: Custom Pricing (Alternative)

If you prefer not to use Stripe products, you can modify the Edge Function to use custom pricing:

```typescript
// Replace price_data with custom pricing
lineItems.push({
  price_data: {
    currency: 'pln',
    product_data: {
      name: `${subscriptionType.display_name} - ${profile.name}`,
      description: `${billingCycle === 'annual' ? 'Roczny' : 'Miesięczny'} plan premium`,
    },
    unit_amount: price, // Direct pricing in cents
    recurring: { interval: billingCycle === 'annual' ? 'year' : 'month' },
  },
  quantity: 1,
});
```


## 🎯 How It Works

### **With Stripe Products (Recommended):**
1. **Database** stores subscription types with Stripe price IDs
2. **Edge Function** uses price IDs to create Stripe checkout
3. **Stripe** handles all billing, renewals, and webhooks
4. **Benefits**: Full Stripe dashboard, automatic renewals, proper invoicing

### **Current System Flow:**
```
User selects businesses → Choose payment method → 
Edge Function gets subscription types → Uses Stripe price IDs → 
Creates Stripe checkout → User pays → Webhook activates subscription
```

## 🚀 Testing Your Setup

### **Test Mode Setup:**
1. Use test Stripe keys
2. Create test products
3. Use test card: `4242 4242 4242 4242`

### **Test the Flow:**
1. Go to dashboard → Click "Kup Premium"
2. Select businesses → Choose payment method
3. Should redirect to Stripe checkout
4. Complete payment → Should activate premium

## 📊 Database Schema

Your `subscription_types` table now includes:
```sql
CREATE TABLE subscription_types (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,  -- in cents
  price_annual INTEGER NOT NULL,     -- in cents
  stripe_price_id TEXT,              -- Stripe monthly price ID
  stripe_annual_price_id TEXT,       -- Stripe annual price ID
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎯 Benefits of Products Approach

✅ **Professional Setup** - Uses Stripe's recommended pattern
✅ **Dashboard Management** - Full control in Stripe dashboard
✅ **Automatic Renewals** - Stripe handles everything
✅ **Proper Invoicing** - Automatic invoice generation
✅ **Tax Compliance** - Built-in tax handling
✅ **Customer Management** - Stripe manages customer data

## 🔧 Troubleshooting

### **"Stripe price ID not configured" Error:**
1. Make sure you've created products and prices in Stripe
2. Update database with real price IDs (not placeholders)
3. Check that price IDs match your billing cycle (monthly vs annual)

### **"No products found" Error:**
1. Check if products are marked as "active" in Stripe
2. Verify RLS policies on `stripe_products` table
3. Ensure you're using the correct Stripe mode (test vs live)

## 🎉 Next Steps

1. **Create your Stripe products** following the guide above
2. **Get your price IDs** from Stripe dashboard
3. **Update the database** with real price IDs
4. **Test the flow** with Stripe test mode
5. **Deploy to production** when ready

Your premium system will work seamlessly with Stripe's professional subscription management! 🚀
