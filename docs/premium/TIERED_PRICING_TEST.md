# Tiered Pricing Test Guide 🎯

## ✅ Current Setup Status

### **JDG Premium (Tiered Pricing)**
- ✅ Uses tiered pricing: `true`
- ✅ Stripe Price ID: `price_1StTFKLN4PiX51amudmuApMq`
- ✅ Price per business: **5 EUR** (500 cents)
- ✅ Currency: EUR

### **Spółka Standard (Legacy Pricing)**
- ❌ Uses tiered pricing: `false` 
- ❌ Stripe Price ID: placeholder
- ❌ Price per business: not set
- ⚠️ Still uses old pricing model

## 🧪 Testing Scenarios

### **Test 1: Single JDG Business**
1. Select 1 JDG business
2. Expected total: **5 EUR**
3. Stripe should receive: `quantity: 1` of `price_1StTFKLN4PiX51amudmuApMq`

### **Test 2: Multiple JDG Businesses**
1. Select 3 JDG businesses
2. Expected total: **15 EUR** (3 × 5 EUR)
3. Stripe should receive: `quantity: 3` of `price_1StTFKLN4PiX51amudmuApMq`

### **Test 3: Mixed Businesses**
1. Select 2 JDG + 1 Spółka
2. Expected total: **10 EUR + 21 EUR = 31 EUR**
3. Stripe should receive:
   - `quantity: 2` of JDG price (tiered)
   - `quantity: 1` of Spółka price (legacy)

## 🚀 How It Works

### **Tiered Pricing Logic**
```typescript
// JDG uses tiered pricing
if (subscriptionType.uses_tiered_pricing) {
  lineItems.push({
    price: 'price_1StTFKLN4PiX51amudmuApMq',
    quantity: businessCount, // 2, 3, 4, etc.
  });
  totalAmount += 500 * businessCount; // 5 EUR per business
}
```

### **Legacy Pricing Logic**
```typescript
// Spółka uses legacy pricing (one line item per business)
for (let i = 0; i < businessCount; i++) {
  lineItems.push({
    price: 'price_spolka_monthly_eur_placeholder',
    quantity: 1,
  });
  totalAmount += 2100; // 21 EUR per business
}
```

## 📊 Expected Results

| Business Count | JDG Total | Spółka Total | Combined Total |
|----------------|-----------|--------------|----------------|
| 1 JDG | 5 EUR | - | 5 EUR |
| 2 JDG | 10 EUR | - | 10 EUR |
| 3 JDG | 15 EUR | - | 15 EUR |
| 1 Spółka | - | 21 EUR | 21 EUR |
| 2 JDG + 1 Spółka | 10 EUR | 21 EUR | 31 EUR |

## 🔧 Debug Information

### **Frontend Console**
Look for these logs:
```javascript
console.log('Business groups:', businessGroups);
console.log('Using tiered pricing:', subscriptionType.uses_tiered_pricing);
console.log('Line items:', lineItems);
```

### **Edge Function Logs**
Check Supabase logs for:
```javascript
[create-premium-checkout] Creating checkout for X businesses
[create-premium-checkout] Pricing model: tiered/individual
```

### **Stripe Dashboard**
Verify:
- Line items show correct quantities
- Total amount matches expected calculation
- Currency is EUR

## ⚠️ Known Issues

1. **Spółka Pricing**: Still uses placeholder price ID
2. **Annual Billing**: Not implemented for tiered pricing yet
3. **PLN Migration**: Will need new Stripe prices for PLN

## 🎯 Next Steps

1. **Test JDG tiered pricing** with multiple businesses
2. **Create Spółka tiered pricing** in Stripe
3. **Update Spółka database** with new price ID
4. **Test PLN migration** when ready

## 📝 Test Checklist

- [ ] Single JDG business shows 5 EUR
- [ ] Multiple JDG businesses show correct multiplication
- [ ] Stripe checkout receives correct quantities
- [ ] Payment completes successfully
- [ ] Subscription activates for all businesses
- [ ] Webhook processes tiered subscriptions correctly

The tiered pricing system is ready for testing! 🚀
