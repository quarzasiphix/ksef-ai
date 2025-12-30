# Stripe Environment Management System

## Overview

This system provides a clean, centralized way to manage Stripe test/production environments through a database-driven configuration. All Stripe-related Edge Functions automatically use the correct keys based on the `app_settings.stripe_mode` value.

---

## Architecture

### Database Layer
- **`app_settings` table**: Single-row configuration table
- **`admin_audit_log` table**: Tracks all admin changes
- **Helper functions**: `get_stripe_mode()`, `is_feature_enabled()`

### Shared Module
- **`_shared/stripe-config.ts`**: Centralized Stripe initialization
- Automatically reads `stripe_mode` from database
- Selects appropriate keys (test/live)
- Provides helper functions for all Edge Functions

### Edge Functions
All Stripe functions use the shared module:
- `stripe-webhook` (Premium subscriptions)
- `stripe-connect-account`
- `stripe-connect-onboarding`
- `stripe-connect-status`
- `stripe-create-payment-checkout`
- `stripe-connect-webhook`

---

## Environment Variables Setup

### Required Environment Variables

Add these to your Supabase Edge Functions secrets:

```bash
# Stripe Test Keys (Sandbox)
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET_TEST=whsec_...

# Stripe Live Keys (Production)
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET_LIVE=whsec_...

# Application URLs
APP_URL=https://yourdomain.com
APP_URL_DEV=http://localhost:5173

# Supabase (already configured)
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Setting Secrets via CLI

```bash
# Test keys
supabase secrets set STRIPE_SECRET_KEY_TEST=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET_TEST=whsec_...
supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET_TEST=whsec_...

# Live keys
supabase secrets set STRIPE_SECRET_KEY_LIVE=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
supabase secrets set STRIPE_CONNECT_WEBHOOK_SECRET_LIVE=whsec_...

# App URLs
supabase secrets set APP_URL=https://yourdomain.com
supabase secrets set APP_URL_DEV=http://localhost:5173
```

---

## Switching Between Test and Live Mode

### Via Database (Current Method)

```sql
-- Switch to TEST mode
UPDATE app_settings 
SET stripe_mode = 'test' 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Switch to LIVE mode
UPDATE app_settings 
SET stripe_mode = 'live' 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check current mode
SELECT stripe_mode FROM app_settings;
```

### Via Admin Panel (Future)

Once you build the admin panel, you'll have a UI toggle:
- **Test Mode**: Uses `sk_test_...` keys, safe for development
- **Live Mode**: Uses `sk_live_...` keys, processes real money

---

## How It Works

### 1. Edge Function Initialization

Every Stripe function now uses the shared module:

```typescript
import { initializeStripe, initializeStripeConnect } from '../_shared/stripe-config.ts';

// For premium subscriptions (Billing)
const { stripe, mode, webhookSecret } = await initializeStripe();
console.log(`Running in ${mode} mode`); // "test" or "live"

// For Connect (merchant payments)
const { stripe, mode, webhookSecret } = await initializeStripeConnect();
```

### 2. Dynamic Key Selection

The shared module:
1. Queries `app_settings` table for `stripe_mode`
2. Selects appropriate environment variables:
   - **Test mode**: `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_TEST`
   - **Live mode**: `STRIPE_SECRET_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_LIVE`
3. Initializes Stripe SDK with selected keys
4. Returns configured Stripe instance

### 3. Automatic Failsafe

- Defaults to **test mode** if database query fails
- Throws error if required keys are missing
- Logs warnings for missing webhook secrets

---

## App Settings Table Schema

```sql
CREATE TABLE app_settings (
    id UUID PRIMARY KEY, -- Fixed: '00000000-0000-0000-0000-000000000001'
    
    -- Stripe Configuration
    stripe_mode TEXT NOT NULL DEFAULT 'test', -- 'test' or 'live'
    stripe_test_enabled BOOLEAN DEFAULT TRUE,
    stripe_live_enabled BOOLEAN DEFAULT FALSE,
    
    -- Feature Flags
    payments_enabled BOOLEAN DEFAULT TRUE,
    stripe_connect_enabled BOOLEAN DEFAULT TRUE,
    premium_subscriptions_enabled BOOLEAN DEFAULT TRUE,
    
    -- Maintenance Mode
    maintenance_mode BOOLEAN DEFAULT FALSE,
    maintenance_message TEXT,
    
    -- Rate Limiting
    api_rate_limit_per_minute INTEGER DEFAULT 60,
    webhook_rate_limit_per_minute INTEGER DEFAULT 100,
    
    -- Email Configuration
    email_notifications_enabled BOOLEAN DEFAULT TRUE,
    admin_email TEXT,
    
    -- Analytics
    analytics_enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);
```

### Single Row Constraint

The table enforces only **one row** via:
```sql
CONSTRAINT single_row_check CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
```

This ensures global settings are always consistent.

---

## Feature Flags

### Available Features

```typescript
// Check if feature is enabled
const isEnabled = await isFeatureEnabled('payments');
const isEnabled = await isFeatureEnabled('stripe_connect');
const isEnabled = await isFeatureEnabled('premium_subscriptions');
const isEnabled = await isFeatureEnabled('analytics');
```

### Usage in Edge Functions

```typescript
import { isFeatureEnabled } from '../_shared/stripe-config.ts';

// Check before processing
if (!await isFeatureEnabled('stripe_connect')) {
  return new Response(
    JSON.stringify({ error: 'Stripe Connect is disabled' }),
    { status: 503 }
  );
}
```

---

## Admin Audit Log

All admin actions are automatically logged:

```typescript
import { logAdminAction } from '../_shared/stripe-config.ts';

await logAdminAction(
  adminUserId,
  'stripe_mode_changed',
  'app_settings',
  'stripe_mode',
  { stripe_mode: 'test' },
  { stripe_mode: 'live' },
  ipAddress,
  userAgent
);
```

### Audit Log Schema

```sql
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY,
    admin_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Testing Strategy

### Development Workflow

1. **Start in Test Mode** (default)
   ```sql
   SELECT stripe_mode FROM app_settings; -- Should be 'test'
   ```

2. **Use Stripe Test Cards**
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0027 6000 3184`

3. **Test All Flows**
   - Premium subscription checkout
   - Stripe Connect onboarding
   - Invoice payment checkout
   - Webhook processing

4. **Verify Test Mode Indicators**
   - Check Edge Function logs for `[Stripe Billing] Initializing in test mode`
   - Verify Stripe Dashboard shows test mode transactions

### Pre-Production Checklist

Before switching to live mode:

- [ ] All test flows working correctly
- [ ] Webhook endpoints configured in Stripe Dashboard
- [ ] Live keys added to environment variables
- [ ] Live webhook secrets configured
- [ ] Production domain configured in Stripe
- [ ] Return URLs updated to production domain
- [ ] Team notified of switch
- [ ] Monitoring/alerts configured

### Switching to Live Mode

```sql
-- ⚠️ IMPORTANT: Only do this when ready for production
UPDATE app_settings 
SET 
    stripe_mode = 'live',
    stripe_live_enabled = TRUE,
    updated_by = '[admin-user-id]'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Emergency Rollback

```sql
-- Switch back to test mode immediately
UPDATE app_settings 
SET stripe_mode = 'test' 
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

## Maintenance Mode

### Enable Maintenance Mode

```sql
UPDATE app_settings 
SET 
    maintenance_mode = TRUE,
    maintenance_message = 'System maintenance in progress. Please check back in 30 minutes.'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Check in Edge Functions

```typescript
const { data } = await supabase
  .from('app_settings')
  .select('maintenance_mode, maintenance_message')
  .single();

if (data?.maintenance_mode) {
  return new Response(
    JSON.stringify({ 
      error: 'Maintenance mode',
      message: data.maintenance_message 
    }),
    { status: 503 }
  );
}
```

---

## Public Settings View

Frontend can access safe settings via `public_app_settings` view:

```typescript
const { data } = await supabase
  .from('public_app_settings')
  .select('*')
  .single();

console.log(data.stripe_mode); // 'test' or 'live'
console.log(data.payments_enabled); // true/false
console.log(data.maintenance_mode); // true/false
```

**Note**: Sensitive data is hidden from this view.

---

## Future Admin Panel Features

### Settings Management
- Toggle Stripe mode (test/live) with confirmation
- Enable/disable features
- Configure rate limits
- Set maintenance mode
- Update admin email

### Monitoring Dashboard
- Current Stripe mode indicator
- Active users count
- Payment success rate
- Webhook processing status
- Error logs

### User Management
- View all users
- User activity logs
- Premium subscription status
- Stripe Connect account status
- Manual actions (refunds, etc.)

### Audit Trail
- All admin actions logged
- Filterable by action type
- Exportable reports
- IP and user agent tracking

### Analytics
- Revenue metrics (test vs live)
- Payment method breakdown
- Geographic distribution
- Conversion rates
- Failed payment analysis

---

## Security Considerations

### RLS Policies

```sql
-- Anyone can READ settings (needed for Edge Functions)
CREATE POLICY "Anyone can read app settings"
    ON app_settings FOR SELECT
    USING (true);

-- Only service role can UPDATE (admin panel uses service role)
CREATE POLICY "Service role can update app settings"
    ON app_settings FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');
```

### Admin Panel Access

Future admin panel should:
1. Require special admin role/permission
2. Use service role key for updates
3. Log all actions to audit trail
4. Require 2FA for sensitive operations
5. Show confirmation dialogs for mode switches

### Key Management

- **Never commit keys to git**
- Store in Supabase secrets only
- Rotate keys periodically
- Use different keys for test/live
- Monitor Stripe Dashboard for suspicious activity

---

## Troubleshooting

### "Stripe key not configured" Error

**Cause**: Missing environment variable for current mode

**Solution**:
```bash
# Check current mode
supabase sql "SELECT stripe_mode FROM app_settings"

# If test mode, ensure test keys are set
supabase secrets list | grep STRIPE_SECRET_KEY_TEST

# If missing, set it
supabase secrets set STRIPE_SECRET_KEY_TEST=sk_test_...
```

### Functions Using Wrong Keys

**Cause**: Functions not using shared module

**Solution**: Update function to import and use shared module:
```typescript
import { initializeStripe } from '../_shared/stripe-config.ts';
const { stripe, mode } = await initializeStripe();
```

### Mode Not Switching

**Cause**: Edge Functions may cache database connection

**Solution**: Redeploy functions after mode change:
```bash
supabase functions deploy [function-name]
```

### Webhooks Failing After Mode Switch

**Cause**: Webhook secret doesn't match current mode

**Solution**: Ensure webhook endpoints are configured in both test and live Stripe dashboards with correct secrets.

---

## Best Practices

### Development
1. Always start in test mode
2. Use test cards for all testing
3. Verify logs show correct mode
4. Test mode switches in staging first

### Production
1. Switch to live mode only when ready
2. Monitor closely after switch
3. Have rollback plan ready
4. Keep test mode available for debugging

### Monitoring
1. Set up alerts for mode changes
2. Monitor webhook success rates
3. Track failed payments
4. Review audit logs regularly

### Security
1. Limit admin panel access
2. Require confirmations for mode switches
3. Log all admin actions
4. Rotate keys periodically
5. Use 2FA for admin accounts

---

## Migration Checklist

- [x] Create `app_settings` table
- [x] Create `admin_audit_log` table
- [x] Create helper functions
- [x] Create shared Stripe config module
- [ ] Update all Edge Functions to use shared module
- [ ] Add environment variables (test + live keys)
- [ ] Configure Stripe webhooks (test + live)
- [ ] Test mode switching
- [ ] Build admin panel UI
- [ ] Add monitoring/alerts
- [ ] Document for team

---

## Summary

This system provides:
- ✅ Centralized Stripe configuration
- ✅ Database-driven mode switching
- ✅ Automatic key selection
- ✅ Feature flags
- ✅ Audit logging
- ✅ Maintenance mode
- ✅ Safe defaults (test mode)
- ✅ Future admin panel ready

**Current Status**: Database and shared module ready. Next step is to update Edge Functions and build admin panel.
