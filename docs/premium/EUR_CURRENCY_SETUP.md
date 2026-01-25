# EUR Currency Setup Guide 🇪🇺

## 🎯 Overview

The premium system now supports dynamic currency configuration with EUR as the default currency. This was implemented because Revolut Business with LT IBAN only allows EUR payments through Stripe.

## ✅ What Was Implemented

### **1. Database Changes**

#### **app_settings Table**
Added currency configuration fields:
```sql
ALTER TABLE app_settings ADD COLUMN currency TEXT DEFAULT 'EUR';
ALTER TABLE app_settings ADD COLUMN currency_symbol TEXT DEFAULT '€';
ALTER TABLE app_settings ADD COLUMN blik_enabled BOOLEAN DEFAULT false;
```

#### **subscription_types Table**
Added EUR pricing columns:
```sql
ALTER TABLE subscription_types ADD COLUMN price_monthly_eur INTEGER;
ALTER TABLE subscription_types ADD COLUMN price_annual_eur INTEGER;
ALTER TABLE subscription_types ADD COLUMN stripe_price_id_eur TEXT;
ALTER TABLE subscription_types ADD COLUMN stripe_annual_price_id_eur TEXT;
```

**Current EUR Pricing:**
- **JDG Premium**: 4.50 EUR/month, 45 EUR/year
- **Spółka Standard**: 21 EUR/month, 210 EUR/year

### **2. Edge Function Updates**

#### **create-premium-checkout (v7)**
- Fetches currency settings from `app_settings`
- Uses EUR or PLN pricing based on configuration
- Validates Blik is not used with EUR
- Only allows card payments for EUR

**Key Changes:**
```typescript
// Get currency settings
const currencySettings = await getCurrencySettings();
const currency = currencySettings.currency.toLowerCase();

// Validate Blik not used with EUR
if (paymentMethod === 'blik' && currency === 'eur') {
  return error('Blik is not available for EUR payments');
}

// Get price based on currency
if (currency === 'eur') {
  priceId = billingCycle === 'annual' 
    ? subscriptionType.stripe_annual_price_id_eur 
    : subscriptionType.stripe_price_id_eur;
}
```

### **3. Frontend Updates**

#### **MultiBusinessCheckout.tsx**
- Fetches currency settings from database
- Passes currency info to PaymentMethodDialog
- Caches currency settings for 5 minutes

#### **PaymentMethodDialog.tsx**
- Conditionally shows/hides Blik option based on `blikEnabled`
- Displays prices in correct currency
- Shows EUR-specific messaging

**Blik Visibility:**
```typescript
{blikEnabled && (
  <Card>
    {/* Blik payment option */}
  </Card>
)}
```

### **4. Admin Panel**

#### **AppSettings.tsx**
Added currency management section:
- **EUR/PLN Toggle**: Switch between currencies
- **Blik Control**: Enable/disable Blik (auto-disabled for EUR)
- **Visual Indicators**: Badges showing current currency
- **Warning**: Reminder to update Stripe price IDs

**Features:**
- ✅ One-click currency switching
- ✅ Automatic Blik disable for EUR
- ✅ Clear visual feedback
- ✅ Helpful warnings and notes

## 🚀 Setup Instructions

### **Step 1: Create EUR Products in Stripe**

1. **Go to Stripe Dashboard** → **Products**
2. **Create JDG Premium EUR:**
   - Monthly: 4.50 EUR
   - Annual: 45 EUR
3. **Create Spółka Standard EUR:**
   - Monthly: 21 EUR
   - Annual: 210 EUR

### **Step 2: Update Database with EUR Price IDs**

```sql
-- Update with your actual Stripe EUR price IDs
UPDATE subscription_types SET 
  stripe_price_id_eur = 'price_xxx_jdg_monthly_eur',
  stripe_annual_price_id_eur = 'price_xxx_jdg_annual_eur'
WHERE name = 'jdg';

UPDATE subscription_types SET 
  stripe_price_id_eur = 'price_xxx_spolka_monthly_eur',
  stripe_annual_price_id_eur = 'price_xxx_spolka_annual_eur'
WHERE name = 'spolka';
```

### **Step 3: Verify Currency Settings**

The system is already set to EUR by default:
```sql
SELECT currency, currency_symbol, blik_enabled 
FROM app_settings 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

Expected result:
```
currency: EUR
currency_symbol: €
blik_enabled: false
```

## 💳 Payment Flow

### **EUR Payment Flow (Current)**
```
User selects businesses → 
Checkout shows EUR prices → 
Click "Przejdź do płatności" → 
Payment dialog shows ONLY card option (no Blik) → 
Stripe checkout with EUR → 
Subscription activated
```

### **PLN Payment Flow (Future)**
```
User selects businesses → 
Checkout shows PLN prices → 
Click "Przejdź do płatności" → 
Payment dialog shows card AND Blik options → 
Choose payment method → 
Stripe checkout with PLN → 
Subscription activated
```

## 🔄 Switching from EUR to PLN

When you get Polish IBAN from mBank:

### **Step 1: Create PLN Products in Stripe**
- JDG: 19 PLN/month, 190 PLN/year
- Spółka: 89 PLN/month, 890 PLN/year

### **Step 2: Update Database with PLN Price IDs**
```sql
UPDATE subscription_types SET 
  stripe_price_id = 'price_xxx_jdg_monthly_pln',
  stripe_annual_price_id = 'price_xxx_jdg_annual_pln'
WHERE name = 'jdg';

UPDATE subscription_types SET 
  stripe_price_id = 'price_xxx_spolka_monthly_pln',
  stripe_annual_price_id = 'price_xxx_spolka_annual_pln'
WHERE name = 'spolka';
```

### **Step 3: Switch Currency in Admin Panel**
1. Go to **Admin Panel** → **App Settings**
2. Click **PLN (zł)** button
3. System automatically:
   - Sets currency to PLN
   - Enables Blik payments
   - Updates currency symbol

## 📊 Current System State

### **Database Configuration**
- ✅ Currency: **EUR**
- ✅ Currency Symbol: **€**
- ✅ Blik Enabled: **false**

### **Pricing (EUR)**
- ✅ JDG: 4.50 EUR/month, 45 EUR/year
- ✅ Spółka: 21 EUR/month, 210 EUR/year

### **Payment Methods**
- ✅ Card: **Enabled**
- ❌ Blik: **Disabled** (EUR only supports card)

### **Edge Functions**
- ✅ create-premium-checkout (v7): EUR support
- ✅ handle-premium-webhook (v2): Currency tracking
- ✅ create-blik-payment (v1): Ready for PLN

## 🎯 Benefits

### **Dynamic Currency System**
- ✅ Switch currencies without code changes
- ✅ Admin panel control
- ✅ Automatic payment method adjustment
- ✅ Future-proof for PLN migration

### **EUR Support**
- ✅ Works with Revolut Business LT IBAN
- ✅ Card-only payments (no Blik)
- ✅ Professional Stripe integration
- ✅ Proper currency display

### **Easy Migration to PLN**
- ✅ One-click switch in admin panel
- ✅ Blik automatically enabled
- ✅ Just update Stripe price IDs
- ✅ No code changes needed

## 🔧 Technical Details

### **Currency Detection Flow**
```typescript
// Edge Function
const currencySettings = await getCurrencySettings();
const currency = currencySettings.currency.toLowerCase(); // 'eur' or 'pln'

// Frontend
const { data: currencySettings } = useQuery({
  queryKey: ['currency-settings'],
  queryFn: async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('currency, currency_symbol, blik_enabled')
      .single();
    return data;
  },
});
```

### **Price Selection Logic**
```typescript
// EUR pricing
if (currency === 'eur') {
  priceId = billingCycle === 'annual' 
    ? subscriptionType.stripe_annual_price_id_eur 
    : subscriptionType.stripe_price_id_eur;
  price = billingCycle === 'annual' 
    ? subscriptionType.price_annual_eur 
    : subscriptionType.price_monthly_eur;
}
// PLN pricing
else {
  priceId = billingCycle === 'annual' 
    ? subscriptionType.stripe_annual_price_id 
    : subscriptionType.stripe_price_id;
  price = billingCycle === 'annual' 
    ? subscriptionType.price_annual 
    : subscriptionType.price_monthly;
}
```

## 🎉 Status

✅ **Fully Implemented and Ready for EUR Payments!**

The system is now configured for EUR with card-only payments. When you get your Polish IBAN from mBank, simply switch to PLN in the admin panel and Blik will be automatically enabled! 🚀
