# VAT Implementation Guide for Premium Subscriptions

## 🎯 Current Status: VAT-Exempt

**Tovernet Sp. z o.o.** is currently **not registered for VAT**, so all subscription invoices are VAT-exempt.

## 📋 When You Register for VAT

### Step 1: Update Database Schema

The schema is already VAT-ready. All necessary fields exist:

```sql
-- subscription_invoice_items already has:
vat_status TEXT DEFAULT 'exempt'
vat_rate NUMERIC DEFAULT 0.23
vat_amount INTEGER DEFAULT 0
net_amount INTEGER DEFAULT 0
gross_amount INTEGER DEFAULT 0
```

### Step 2: Update Invoice Generation Logic

**File**: `supabase/functions/handle-premium-webhook/index.ts`

**Current (VAT-exempt)**:
```typescript
await supabaseClient
  .from('subscription_invoice_items')
  .insert({
    // ... other fields
    vat_status: 'exempt',
    vat_rate: 0,
    vat_amount: 0,
    net_amount: unitPrice,
    gross_amount: unitPrice,
  });
```

**After VAT Registration**:
```typescript
// Calculate VAT
const vatRate = 0.23; // 23% standard VAT in Poland
const netAmount = unitPrice;
const vatAmount = Math.round(netAmount * vatRate);
const grossAmount = netAmount + vatAmount;

await supabaseClient
  .from('subscription_invoice_items')
  .insert({
    // ... other fields
    vat_status: 'standard',
    vat_rate: vatRate,
    vat_amount: vatAmount,
    net_amount: netAmount,
    gross_amount: grossAmount,
  });
```

### Step 3: Update Stripe Prices

**Important**: Stripe prices need to include VAT for Polish customers.

**Current Prices** (VAT-exempt):
- JDG Monthly: 19.00 PLN
- JDG Annual: 190.00 PLN
- Spółka Monthly: 89.00 PLN
- Spółka Annual: 890.00 PLN

**With VAT** (23%):
- JDG Monthly: 23.37 PLN (19.00 + 4.37 VAT)
- JDG Annual: 233.70 PLN (190.00 + 43.70 VAT)
- Spółka Monthly: 109.47 PLN (89.00 + 20.47 VAT)
- Spółka Annual: 1,094.70 PLN (890.00 + 204.70 VAT)

**Option 1: Keep Net Prices Same**
- Update Stripe prices to gross amounts
- Users pay more (with VAT)

**Option 2: Keep Gross Prices Same**
- Reduce net prices
- You receive less (VAT goes to government)

### Step 4: Update Stripe Tax Settings

1. Go to Stripe Dashboard → Settings → Tax
2. Enable automatic tax calculation
3. Set up tax rates for Poland (23%)
4. Configure tax ID collection

**In checkout session**:
```typescript
const session = await stripe.checkout.sessions.create({
  // ... other settings
  automatic_tax: {
    enabled: true,
  },
  customer_update: {
    address: 'auto',
  },
  tax_id_collection: {
    enabled: true,
  },
});
```

### Step 5: Update Invoice Display

**Show VAT Breakdown**:
```typescript
// In invoice display
{
  "Netto": "19.00 PLN",
  "VAT (23%)": "4.37 PLN",
  "Brutto": "23.37 PLN"
}
```

### Step 6: Update Pricing Display in UI

**File**: `src/modules/premium/components/MultiBusinessCheckout.tsx`

**Current**:
```typescript
const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(amount / 100);
};
```

**With VAT**:
```typescript
const formatPrice = (amount: number, includeVat = true) => {
  const vatRate = 0.23;
  const netAmount = amount;
  const grossAmount = includeVat ? Math.round(netAmount * (1 + vatRate)) : netAmount;
  
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(grossAmount / 100);
};

// Display both
<div>
  <span className="text-sm text-gray-500">Netto: {formatPrice(price, false)}</span>
  <span className="font-bold">Brutto: {formatPrice(price, true)}</span>
</div>
```

### Step 7: Legal Requirements

**Invoice Must Include**:
- ✅ Seller VAT ID (NIP with "PL" prefix)
- ✅ Buyer VAT ID (if provided)
- ✅ Net amount
- ✅ VAT rate (23%)
- ✅ VAT amount
- ✅ Gross amount
- ✅ "Faktura VAT" designation

**Update Invoice Template**:
```typescript
{
  seller: {
    name: "Tovernet Sp. z o.o.",
    nip: "PL1234567890", // Add PL prefix
    address: "...",
  },
  buyer: {
    name: "...",
    nip: "...", // From tax_id_collection
    address: "...",
  },
  items: [
    {
      description: "JDG Premium - Firma ABC",
      net: 19.00,
      vat_rate: "23%",
      vat: 4.37,
      gross: 23.37,
    }
  ],
  totals: {
    net: 19.00,
    vat: 4.37,
    gross: 23.37,
  }
}
```

### Step 8: Update Subscription Types

**File**: Database `subscription_types` table

**Option 1: Update Existing Prices**
```sql
-- If keeping net prices same
UPDATE subscription_types
SET 
  price_monthly = ROUND(price_monthly * 1.23),
  price_annual = ROUND(price_annual * 1.23)
WHERE name IN ('jdg', 'spolka');
```

**Option 2: Add New VAT-Inclusive Prices**
```sql
-- Add new columns for gross prices
ALTER TABLE subscription_types
ADD COLUMN price_monthly_gross INTEGER,
ADD COLUMN price_annual_gross INTEGER;

-- Calculate gross prices
UPDATE subscription_types
SET 
  price_monthly_gross = ROUND(price_monthly * 1.23),
  price_annual_gross = ROUND(price_annual * 1.23);
```

### Step 9: Communication Plan

**Notify Users**:
1. Email announcement 30 days before
2. In-app notification
3. Update pricing page
4. FAQ about VAT changes

**Email Template**:
```
Temat: Ważna zmiana - Rejestracja VAT

Szanowni Państwo,

Od [DATA] Tovernet Sp. z o.o. będzie zarejestrowana jako podatnik VAT.

Zmiany w cenach:
- JDG Premium: 19.00 PLN → 23.37 PLN (zawiera 23% VAT)
- Spółka Standard: 89.00 PLN → 109.47 PLN (zawiera 23% VAT)

Faktury będą zawierać rozliczenie VAT.

Pozdrawiamy,
Zespół KsięgaI
```

### Step 10: Testing Checklist

Before going live with VAT:

- [ ] Test invoice generation with VAT
- [ ] Verify VAT calculations correct
- [ ] Check Stripe tax collection
- [ ] Test with Polish VAT ID
- [ ] Test with EU VAT ID (reverse charge)
- [ ] Test with non-EU (no VAT)
- [ ] Verify invoice PDF displays VAT
- [ ] Check accounting integration
- [ ] Test refunds with VAT
- [ ] Verify VAT reporting

## 🌍 International Customers

### EU Customers with VAT ID

**Reverse Charge Mechanism**:
- No Polish VAT charged
- Customer pays VAT in their country
- Invoice shows "Reverse charge" note

```typescript
if (customerCountry !== 'PL' && hasValidVatId) {
  vat_status = 'reverse_charge';
  vat_rate = 0;
  vat_amount = 0;
  note = 'Reverse charge - VAT payable by recipient';
}
```

### Non-EU Customers

- No VAT charged
- Export of services

```typescript
if (!isEU(customerCountry)) {
  vat_status = 'export';
  vat_rate = 0;
  vat_amount = 0;
  note = 'Export of services - no VAT';
}
```

## 📊 VAT Reporting

### Monthly VAT Declaration

Query for VAT summary:
```sql
SELECT 
  DATE_TRUNC('month', billing_period_start) as month,
  SUM(net_amount) as total_net,
  SUM(vat_amount) as total_vat,
  SUM(gross_amount) as total_gross
FROM subscription_invoice_items
WHERE vat_status = 'standard'
  AND billing_period_start >= '2024-01-01'
GROUP BY month
ORDER BY month;
```

### JPK_V7 Export

For Polish VAT reporting, generate JPK_V7 file:
- Include all VAT invoices
- Separate by VAT rate
- Include reverse charge transactions

## 🔄 Migration Strategy

### Gradual Rollout

**Phase 1: Preparation** (2 weeks before)
- Update code with VAT logic
- Test thoroughly
- Prepare communication

**Phase 2: Announcement** (1 week before)
- Email all users
- Update pricing page
- In-app notifications

**Phase 3: Go Live**
- Enable VAT on specific date
- Monitor first invoices
- Support team ready

**Phase 4: Post-Launch**
- Monitor for issues
- Gather feedback
- Adjust as needed

### Existing Subscriptions

**Option 1: Grandfather Old Prices**
- Existing subscriptions keep old prices
- New subscriptions get VAT prices
- Communicate clearly

**Option 2: Apply to All**
- All subscriptions get VAT
- Give 30 days notice
- Allow cancellation without penalty

## 📞 Support

For VAT-related questions:
- Consult with tax advisor
- Check Polish VAT regulations
- Review Stripe tax documentation

---

**Important**: This is a guide only. Consult with a qualified tax advisor before implementing VAT changes.
