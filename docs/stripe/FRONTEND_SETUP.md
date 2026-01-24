# Stripe Frontend Setup Guide

## Environment Variables

Create a `.env` file in the `ksef-ai` root directory:

```bash
# Copy the example file
cp .env.example .env
```

Add your Stripe publishable keys:

```env
# Test Mode (for development)
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_51xxxxx

# Live Mode (for production)
VITE_STRIPE_PUBLISHABLE_KEY_PROD=pk_live_51xxxxx
```

### Getting Your Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. **Test Mode**: Toggle "Test mode" ON, copy "Publishable key"
3. **Live Mode**: Toggle "Test mode" OFF, copy "Publishable key"

**Important**: Never commit the `.env` file to Git. It's already in `.gitignore`.

---

## How It Works

### Dynamic Key Loading

The app automatically selects the correct Stripe publishable key based on the `app_settings.stripe_mode` value in the database.

**File**: `src/shared/lib/stripeClient.ts`

```typescript
import { getStripe } from '@/shared/lib/stripeClient';

// This will load the correct key (test or live) automatically
const stripe = await getStripe();
```

### Mode Selection Flow

1. Admin toggles mode in **AppSettings.tsx** (Admin Panel)
2. Updates `app_settings.stripe_mode` to `'test'` or `'live'`
3. Frontend calls `getStripe()` which:
   - Fetches current mode from database
   - Selects appropriate publishable key from env vars
   - Initializes Stripe.js with that key

### Components Using Stripe

**BlikPaymentModal** (`src/modules/premium/components/BlikPaymentModal.tsx`)
- ✅ Now uses dynamic key loading
- ✅ No hardcoded keys
- ✅ Respects app_settings mode

**PremiumCheckoutModal** (`src/modules/premium/components/PremiumCheckoutModal.tsx`)
- Uses Edge Function to create checkout session
- Edge Function handles Stripe initialization
- No frontend Stripe.js needed

---

## Testing

### Test Mode

1. Set `app_settings.stripe_mode = 'test'` (via Admin Panel)
2. Use test card: `4242 4242 4242 4242`
3. Any future date, any CVC
4. BLIK test code: `777123`

### Live Mode

1. Set `app_settings.stripe_mode = 'live'` (via Admin Panel)
2. Real cards will be charged
3. Real money will be processed
4. **Use with caution!**

---

## Troubleshooting

### "Stripe publishable key not configured"

**Cause**: Environment variable not set  
**Fix**: 
1. Check `.env` file exists in `ksef-ai/` root
2. Verify `VITE_STRIPE_PUBLISHABLE_KEY_TEST` and `VITE_STRIPE_PUBLISHABLE_KEY_PROD` are set
3. Restart dev server: `npm run dev`

### "Invalid API key"

**Cause**: Wrong key format or test/live mismatch  
**Fix**:
1. Verify key starts with `pk_test_` (test) or `pk_live_` (live)
2. Check mode in database matches key type
3. Ensure no extra spaces in `.env` file

### "Mode not switching"

**Cause**: Stripe client cached with old mode  
**Fix**: Refresh the page - `getStripe()` will fetch new mode

---

## Security Notes

1. **Publishable keys are safe to expose** in frontend code
2. **Secret keys must NEVER be in frontend** (only in Edge Functions)
3. **`.env` file is gitignored** - never commit it
4. **Use test mode by default** for development

---

## Build Configuration

### Development

```bash
npm run dev
```

Vite automatically loads `.env` file and makes `VITE_*` variables available.

### Production Build

```bash
npm run build
```

**Important**: Set environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Build & Deploy → Environment
- Custom: Set `VITE_STRIPE_PUBLISHABLE_KEY_TEST` and `VITE_STRIPE_PUBLISHABLE_KEY_PROD`

---

## Migration from Hardcoded Keys

### Before (❌ Insecure)

```typescript
const stripePromise = loadStripe("pk_live_51RUBwr...");
```

**Problems**:
- Live key exposed in Git history
- Can't switch modes without code change
- Security risk

### After (✅ Secure)

```typescript
import { getStripe } from '@/shared/lib/stripeClient';

const stripe = await getStripe();
```

**Benefits**:
- No keys in code
- Dynamic mode switching
- Secure and flexible

---

## Next Steps

After setting up frontend:
1. Test payment flow in test mode
2. Verify mode switching works
3. Configure live keys when ready for production
4. Set up webhook endpoints in Stripe Dashboard
