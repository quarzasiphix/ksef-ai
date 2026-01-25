-- Migration: Add subscription fields to business_profiles and users tables
-- This enables business-level subscriptions with enterprise umbrella support

-- Add subscription fields to business_profiles table
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
ADD COLUMN IF NOT EXISTS subscription_status TEXT CHECK (subscription_status IN ('active', 'trial', 'expired', 'cancelled')),
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_until TIMESTAMP WITH TIME ZONE;

-- Add enterprise umbrella fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS enterprise_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS legacy_premium BOOLEAN DEFAULT FALSE, -- For backward compatibility
ADD COLUMN IF NOT EXISTS subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_subscription_tier ON business_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_business_profiles_subscription_status ON business_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_enterprise_active ON users(enterprise_active);
CREATE INDEX IF NOT EXISTS idx_users_legacy_premium ON users(legacy_premium);

-- Set default values for existing businesses
UPDATE business_profiles 
SET subscription_tier = 'free', subscription_status = 'expired'
WHERE subscription_tier IS NULL;

-- Set default values for existing users
UPDATE users 
SET subscription_tier = 'free'
WHERE subscription_tier IS NULL;

-- RLS policies for subscription fields (if RLS is enabled)
-- These policies ensure users can only see their own subscription data

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own subscription info" ON users;
DROP POLICY IF EXISTS "Users can update own subscription info" ON users;
DROP POLICY IF EXISTS "Business profiles subscription select policy" ON business_profiles;
DROP POLICY IF EXISTS "Business profiles subscription update policy" ON business_profiles;

-- Create RLS policies for users table subscription fields
CREATE POLICY "Users can view own subscription info" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own subscription info" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for business_profiles table subscription fields
CREATE POLICY "Business profiles subscription select policy" ON business_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Business profiles subscription update policy" ON business_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON COLUMN business_profiles.subscription_tier IS 'Subscription tier for this business: free, premium, or enterprise';
COMMENT ON COLUMN business_profiles.subscription_status IS 'Current subscription status: active, trial, expired, or cancelled';
COMMENT ON COLUMN business_profiles.subscription_ends_at IS 'When the current subscription expires';
COMMENT ON COLUMN business_profiles.trial_until IS 'When the trial period ends';

COMMENT ON COLUMN users.enterprise_active IS 'Enterprise umbrella - gives premium access to all businesses under this user';
COMMENT ON COLUMN users.legacy_premium IS 'Backward compatibility flag for users who had premium before business-level subscriptions';
COMMENT ON COLUMN users.subscription_tier IS 'User-level subscription tier (for enterprise users)';

-- Create a function to get effective subscription tier
CREATE OR REPLACE FUNCTION get_effective_subscription_tier(
    user_enterprise_active BOOLEAN DEFAULT FALSE,
    user_legacy_premium BOOLEAN DEFAULT FALSE,
    business_subscription_tier TEXT DEFAULT 'free'
) RETURNS TEXT AS $$
BEGIN
    -- Enterprise umbrella overrides everything
    IF user_enterprise_active THEN
        RETURN 'enterprise';
    END IF;
    
    -- Legacy premium for backward compatibility
    IF user_legacy_premium THEN
        RETURN 'premium';
    END IF;
    
    -- Use business-level subscription
    RETURN COALESCE(business_subscription_tier, 'free');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a view for easy subscription status queries
CREATE OR REPLACE VIEW business_subscription_status AS
SELECT 
    bp.id as business_profile_id,
    bp.name as business_name,
    bp.entity_type,
    bp.subscription_tier,
    bp.subscription_status,
    bp.subscription_ends_at,
    bp.trial_until,
    u.id as user_id,
    u.enterprise_active,
    u.legacy_premium,
    get_effective_subscription_tier(u.enterprise_active, u.legacy_premium, bp.subscription_tier) as effective_tier,
    CASE 
        WHEN u.enterprise_active OR u.legacy_premium THEN true
        WHEN bp.subscription_status = 'active' AND (bp.subscription_ends_at IS NULL OR bp.subscription_ends_at > NOW()) THEN true
        WHEN bp.subscription_status = 'trial' AND bp.trial_until > NOW() THEN true
        ELSE false
    END as has_access,
    CASE 
        WHEN bp.trial_until > NOW() THEN GREATEST(0, EXTRACT(DAYS FROM bp.trial_until - NOW())::INTEGER)
        WHEN bp.subscription_ends_at > NOW() THEN GREATEST(0, EXTRACT(DAYS FROM bp.subscription_ends_at - NOW())::INTEGER)
        ELSE 0
    END as days_remaining
FROM business_profiles bp
LEFT JOIN users u ON bp.user_id = u.id
WHERE bp.user_id IS NOT NULL;

COMMENT ON VIEW business_subscription_status IS 'View for checking subscription access and status across all businesses';
