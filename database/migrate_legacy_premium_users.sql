-- Migration: Migrate existing premium users to new subscription system
-- This ensures backward compatibility for existing premium customers

-- First, let's identify users who currently have premium access
-- This assumes there's a way to identify premium users (adjust based on your current system)

-- Option 1: If you have a premium_users table or similar
-- CREATE TEMPORARY TABLE legacy_premium_users AS
-- SELECT user_id FROM premium_users WHERE status = 'active';

-- Option 2: If premium status is stored in the users table
-- CREATE TEMPORARY TABLE legacy_premium_users AS
-- SELECT id as user_id FROM users WHERE is_premium = true;

-- Option 3: If you need to check premium status from another service/table
-- Adjust this query based on your current premium detection logic

-- For this example, I'll use a placeholder approach
-- You should replace this with your actual premium user detection logic

-- Step 1: Identify legacy premium users (customize this query)
WITH legacy_premium_users AS (
    -- Replace this with your actual logic to identify premium users
    -- Examples:
    -- SELECT user_id FROM user_subscriptions WHERE status = 'active' AND plan_type = 'premium'
    -- SELECT id FROM users WHERE premium_expires_at > NOW()
    -- SELECT user_id FROM payments WHERE amount >= 19 AND status = 'completed'
    
    -- Placeholder - replace with actual logic
    SELECT DISTINCT user_id 
    FROM invoices 
    WHERE totalAmount >= 19 
    AND status = 'paid'
    AND created_at > NOW() - INTERVAL '1 year'
)
-- Step 2: Update users table to set legacy_premium flag
UPDATE users 
SET legacy_premium = true,
    subscription_tier = 'premium'
WHERE id IN (SELECT user_id FROM legacy_premium_users)
AND legacy_premium = false;

-- Step 3: For businesses owned by premium users, set them to premium tier
-- This maintains the current behavior where all businesses under a premium user are premium
UPDATE business_profiles bp
SET subscription_tier = 'premium',
    subscription_status = 'active',
    subscription_ends_at = NOW() + INTERVAL '1 month' -- Give them a month to transition
FROM users u
WHERE bp.user_id = u.id
AND u.legacy_premium = true
AND (bp.subscription_tier = 'free' OR bp.subscription_tier IS NULL);

-- Step 4: Set up trial periods for new businesses (optional)
-- This gives non-premium users a taste of premium features
UPDATE business_profiles
SET subscription_tier = 'premium',
    subscription_status = 'trial',
    trial_until = NOW() + INTERVAL '7 days'
WHERE subscription_tier IS NULL
AND created_at > NOW() - INTERVAL '30 days'
AND id NOT IN (
    SELECT bp.id 
    FROM business_profiles bp
    JOIN users u ON bp.user_id = u.id
    WHERE u.legacy_premium = true
);

-- Step 5: Create a log of the migration
CREATE TABLE IF NOT EXISTS subscription_migration_log (
    id SERIAL PRIMARY KEY,
    migration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    users_migrated INTEGER DEFAULT 0,
    businesses_migrated INTEGER DEFAULT 0,
    trials_created INTEGER DEFAULT 0,
    notes TEXT
);

INSERT INTO subscription_migration_log (users_migrated, businesses_migrated, trials_created, notes)
SELECT 
    COUNT(DISTINCT u.id) as users_migrated,
    COUNT(DISTINCT bp.id) as businesses_migrated,
    COUNT(DISTINCT CASE WHEN bp.subscription_status = 'trial' THEN bp.id END) as trials_created,
    'Migrated legacy premium users to new subscription system with backward compatibility'
FROM users u
LEFT JOIN business_profiles bp ON u.id = bp.user_id
WHERE u.legacy_premium = true;

-- Step 6: Verify the migration
-- These queries can be used to verify the migration worked correctly

-- Count of users with legacy premium flag
-- SELECT COUNT(*) as legacy_premium_users FROM users WHERE legacy_premium = true;

-- Count of businesses with premium access
-- SELECT COUNT(*) as premium_businesses FROM business_profiles WHERE subscription_tier = 'premium';

-- Count of active trials
-- SELECT COUNT(*) as active_trials FROM business_profiles WHERE subscription_status = 'trial' AND trial_until > NOW();

-- Sample of the subscription status view
-- SELECT * FROM business_subscription_status LIMIT 10;

-- Step 7: Clean up (optional)
-- DROP TABLE IF EXISTS legacy_premium_users;

-- Notes for implementation:
-- 1. Replace the placeholder query in Step 1 with your actual premium user detection logic
-- 2. Adjust the trial period in Step 4 if needed (currently 7 days)
-- 3. Review the subscription_ends_at value in Step 3 (currently 1 month)
-- 4. Test the migration thoroughly in a staging environment first
-- 5. Consider adding notifications to users about the subscription changes

-- Backward compatibility notes:
-- - Users with legacy_premium = true will maintain premium access across all businesses
-- - New businesses created by premium users will automatically get premium access
-- - The get_effective_subscription_tier function handles the hierarchy correctly
-- - Existing premium users should not experience any disruption in service
