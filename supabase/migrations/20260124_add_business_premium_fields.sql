-- Add premium subscription fields to business_profiles table
-- This enables per-business premium subscriptions instead of user-level only

ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_tier TEXT CHECK (premium_tier IN ('jdg_premium', 'spolka_premium', 'enterprise')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS premium_starts_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS premium_ends_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS premium_status TEXT CHECK (premium_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid')) DEFAULT NULL;

-- Create index for faster premium status lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_premium_status ON business_profiles(is_premium, premium_status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_stripe_subscription ON business_profiles(stripe_subscription_id);

-- Add comment explaining the new fields
COMMENT ON COLUMN business_profiles.is_premium IS 'Whether this business profile has an active premium subscription';
COMMENT ON COLUMN business_profiles.premium_tier IS 'The premium tier for this business (jdg_premium, spolka_premium, enterprise)';
COMMENT ON COLUMN business_profiles.stripe_subscription_id IS 'Stripe subscription ID for this business premium subscription';
COMMENT ON COLUMN business_profiles.premium_starts_at IS 'When the premium subscription started';
COMMENT ON COLUMN business_profiles.premium_ends_at IS 'When the premium subscription ends (for canceled subscriptions)';
COMMENT ON COLUMN business_profiles.premium_status IS 'Stripe subscription status (active, canceled, past_due, etc.)';
