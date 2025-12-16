# Stripe test/live mode system (DB-driven)

This project supports running **both Stripe Test and Stripe Live** keys side-by-side in Supabase secrets, while letting the app choose which environment is active via a **single database setting**.

The goal:
- Keep **all keys in secrets** (never in DB / never in git)
- Switch between **test** and **live** safely using `app_settings.stripe_mode`
- Make all Stripe Edge Functions read the mode and automatically use the correct keys

---

## 1) What’s in the database

### `app_settings` (single row)
You now have a table `app_settings` that stores global application configuration. It’s enforced as **single-row** by a fixed UUID:

- `id = 00000000-0000-0000-0000-000000000001`

Relevant columns:
- `stripe_mode`: `'test' | 'live'`
- `payments_enabled`: global on/off
- `stripe_connect_enabled`: global on/off
- `premium_subscriptions_enabled`: global on/off
- `maintenance_mode`, `maintenance_message`: optional global maintenance switch

There are also helper SQL functions:
- `get_stripe_mode()`
- `is_feature_enabled(feature_name text)`

And:
- `admin_audit_log` table for tracking future admin actions

---

## 2) Where the mode is read (Edge Functions)

### Shared module
File:
- `supabase/functions/_shared/stripe-config.ts`

This module:
1. Reads `app_settings.stripe_mode`
2. Selects the correct secret key + webhook secret based on that mode
3. Returns an initialized Stripe SDK client

There are **two initializers** (intentionally separate):

#### `initializeStripe()`
Use this for **Stripe Billing / Premium subscriptions**.

It selects:
- Test mode:
  - `STRIPE_SECRET_KEY_TEST`
  - `STRIPE_WEBHOOK_SECRET_TEST`
- Live mode:
  - `STRIPE_SECRET_KEY_LIVE`
  - `STRIPE_WEBHOOK_SECRET_LIVE`

#### `initializeStripeConnect()`
Use this for **Stripe Connect / invoice payments**.

It selects:
- Test mode:
  - `STRIPE_SECRET_KEY_TEST`
  - `STRIPE_CONNECT_WEBHOOK_SECRET_TEST`
- Live mode:
  - `STRIPE_SECRET_KEY_LIVE`
  - `STRIPE_CONNECT_WEBHOOK_SECRET_LIVE`

Why both use the same `STRIPE_SECRET_KEY_*`?
- In Stripe, Connect is not a separate API key. It’s the same platform account key. Webhook endpoints differ.

---

## 3) Where keys are stored (Supabase secrets)

### Required secrets
You keep **both sets** of secrets configured at the same time:

#### Stripe Test (sandbox)
- `STRIPE_SECRET_KEY_TEST=sk_test_...`
- `STRIPE_WEBHOOK_SECRET_TEST=whsec_...` (for premium subscription webhook)
- `STRIPE_CONNECT_WEBHOOK_SECRET_TEST=whsec_...` (for connect/invoice-payment webhook)

#### Stripe Live (production)
- `STRIPE_SECRET_KEY_LIVE=sk_live_...`
- `STRIPE_WEBHOOK_SECRET_LIVE=whsec_...`
- `STRIPE_CONNECT_WEBHOOK_SECRET_LIVE=whsec_...`

#### App URLs
- `APP_URL=https://your-production-domain.com`
- `APP_URL_DEV=http://localhost:5173`

Notes:
- The database stores only the **mode**, never secrets.
- The Edge Functions use the Supabase **service role** internally to read `app_settings`.

---

## 4) Switching modes (how you operate it)

### Check current mode
```sql
select stripe_mode from app_settings
where id = '00000000-0000-0000-0000-000000000001';
```

### Switch to test
```sql
update app_settings
set stripe_mode = 'test'
where id = '00000000-0000-0000-0000-000000000001';
```

### Switch to live
```sql
update app_settings
set stripe_mode = 'live'
where id = '00000000-0000-0000-0000-000000000001';
```

Operational recommendation:
- Default to `test`
- Switch to `live` only when:
  - live webhooks are configured
  - live keys are set
  - production domain return URLs are correct

---

## 5) How webhooks fit into this

You’ll typically have **two webhook endpoints** in Stripe:

### A) Premium/Billing webhook
- Endpoint: `.../functions/v1/stripe-webhook`
- Secret stored in:
  - test: `STRIPE_WEBHOOK_SECRET_TEST`
  - live: `STRIPE_WEBHOOK_SECRET_LIVE`

### B) Connect/Invoice-payment webhook
- Endpoint: `.../functions/v1/stripe-connect-webhook`
- Secret stored in:
  - test: `STRIPE_CONNECT_WEBHOOK_SECRET_TEST`
  - live: `STRIPE_CONNECT_WEBHOOK_SECRET_LIVE`

Important:
- Stripe has **separate webhook configs** for test mode vs live mode.
- When you switch `app_settings.stripe_mode`, your Edge Functions will verify signatures using the matching secret.

---

## 6) Feature flags (optional but recommended)

The same system includes global feature flags:
- `payments_enabled`
- `stripe_connect_enabled`
- `premium_subscriptions_enabled`

Edge Functions can enforce:
- If `stripe_connect_enabled = false`, refuse Connect onboarding / checkout creation.

This is useful for:
- staged rollouts
- maintenance
- emergency stop without redeploying

---

## 7) What you still need to do manually

### A) Add secrets
In Supabase Dashboard (or CLI), set ALL secrets listed above.

### B) Configure Stripe Dashboard (both modes)
Do this in **Stripe Test mode** and again in **Stripe Live mode**:
- Enable Connect
- Configure Express accounts
- Add webhooks for:
  - premium webhook endpoint
  - connect webhook endpoint
- Copy webhook signing secrets into the correct Supabase secrets

### C) Deploy Edge Functions
Make sure all Stripe-related functions are deployed.

---

## 8) Quick sanity checks

### Check DB mode
- Confirm `stripe_mode` is what you expect.

### Verify Edge Function logs
- When a function initializes Stripe it should log:
  - `[Stripe Billing] Initializing in test|live mode`
  - or `[Stripe Connect] Initializing in test|live mode`

### Test in test mode end-to-end
- Connect onboarding
- Checkout payment
- Webhook marks invoice paid

Then switch to live.

---

## 9) Files created/used by this system

- Migration:
  - `supabase/migrations/20251216_app_settings.sql`
- Shared module:
  - `supabase/functions/_shared/stripe-config.ts`
- Docs:
  - `STRIPE_ENVIRONMENT_MANAGEMENT.md`
  - `STRIPE_CONNECT_SETUP_GUIDE.md`
  - `STRIPE_MODE_SYSTEM.md` (this file)

---

## Notes about IDE TypeScript errors in Edge Functions

You may see TS errors like “Cannot find name `Deno`” or missing `https://...` imports in the IDE. That’s because these files run in the **Deno Edge runtime**, not Node.

They should work when deployed via Supabase Edge Functions.
