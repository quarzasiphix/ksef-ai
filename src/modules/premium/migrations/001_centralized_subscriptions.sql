-- Centralized Subscription System Migration
-- This replaces the old enhanced_subscriptions and enterprise_benefits tables

-- Create new subscription_types table
CREATE TABLE IF NOT EXISTS subscription_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  level 'user' | 'business' | 'enterprise' NOT NULL,
  
  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  annual_price DECIMAL(10,2),
  per_business_price DECIMAL(10,2),
  
  -- Features and permissions
  features JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '{}',
  
  -- Display
  icon VARCHAR(50),
  color VARCHAR(20),
  sort_order INTEGER DEFAULT 0,
  
  status 'active' | 'inactive' DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unified_subscriptions table
CREATE TABLE IF NOT EXISTS unified_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_profile_id UUID REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Subscription details
  subscription_type_id UUID NOT NULL REFERENCES subscription_types(id),
  subscription_level 'user' | 'business' | 'enterprise' NOT NULL,
  
  -- Pricing and billing
  base_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PLN',
  billing_interval 'month' | 'year' DEFAULT 'month',
  
  -- Status and dates
  status 'active' | 'inactive' | 'cancelled' | 'trial' DEFAULT 'inactive',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Stripe integration
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  
  -- Metadata and features
  features JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT check_business_required_for_business_level 
    CHECK (subscription_level != 'business' OR business_profile_id IS NOT NULL),
  CONSTRAINT check_business_null_for_user_enterprise 
    CHECK (subscription_level IN ('user', 'enterprise') OR business_profile_id IS NOT NULL),
  CONSTRAINT check_valid_status 
    CHECK (status IN ('active', 'inactive', 'cancelled', 'trial')),
  CONSTRAINT check_valid_level 
    CHECK (subscription_level IN ('user', 'business', 'enterprise')),
  CONSTRAINT check_valid_interval 
    CHECK (billing_interval IN ('month', 'year'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_user_id ON unified_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_business_id ON unified_subscriptions(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_status ON unified_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_level ON unified_subscriptions(subscription_level);
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_type_id ON unified_subscriptions(subscription_type_id);
CREATE INDEX IF NOT EXISTS idx_unified_subscriptions_user_business ON unified_subscriptions(user_id, business_profile_id) WHERE business_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_types_name ON subscription_types(name);
CREATE INDEX IF NOT EXISTS idx_subscription_types_level ON subscription_types(level);
CREATE INDEX IF NOT EXISTS idx_subscription_types_status ON subscription_types(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_subscriptions_updated_at 
    BEFORE UPDATE ON unified_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_types_updated_at 
    BEFORE UPDATE ON subscription_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription types
INSERT INTO subscription_types (name, display_name, description, level, base_price, annual_price, per_business_price, features, permissions, sort_order) VALUES
-- User-level subscriptions
('admin', 'Admin Access', 'Full administrative access to all features', 'user', 0, 0, NULL, 
 '{"all_features": true, "unlimited_businesses": true, "priority_support": true}', 
 '{"can_manage_users": true, "can_manage_subscriptions": true, "can_access_all_features": true}', 
1),

('manual_client', 'Manual Client', 'High-value manual client with premium features', 'user', 9900, 99000, NULL,
 '{"premium_features": true, "unlimited_businesses": true, "priority_support": true}',
 '{"can_access_premium": true, "unlimited_businesses": true}', 
2),

-- Business-level subscriptions
('business_jdg', 'JDG Premium', 'Premium features for sole proprietorship', 'business', 1900, 19000, NULL,
 '{"premium_features": true, "advanced_reports": true, "api_access": true}',
 '{"can_access_premium": true, "entity_types": ["dzialalnosc"]}', 
10),

('business_spolka', 'Spółka Premium', 'Premium features for limited liability companies', 'business', 8900, 89000, NULL,
 '{"premium_features": true, "advanced_reports": true, "api_access": true, "governance_features": true}',
 '{"can_access_premium": true, "entity_types": ["sp_zoo", "sa"]}', 
11),

-- Enterprise subscription
('enterprise', 'Enterprise', 'Complete solution for all businesses', 'enterprise', 5000, 50000, 0,
 '{"all_features": true, "unlimited_businesses": true, "priority_support": true, "custom_branding": true}',
 '{"can_manage_users": true, "unlimited_businesses": true, "covers_all_businesses": true}', 
20)

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  base_price = EXCLUDED.base_price,
  annual_price = EXCLUDED.annual_price,
  per_business_price = EXCLUDED.per_business_price,
  features = EXCLUDED.features,
  permissions = EXCLUDED.permissions,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Migration data transfer from old tables
-- This will migrate existing data from enhanced_subscriptions and enterprise_benefits

-- Migrate user-level and enterprise subscriptions
INSERT INTO unified_subscriptions (
  id, user_id, business_profile_id, subscription_type_id, subscription_level,
  base_price, total_price, currency, billing_interval, status, starts_at, ends_at,
  stripe_customer_id, stripe_subscription_id, features, metadata, created_at, updated_at
)
SELECT 
  es.id,
  es.user_id,
  es.business_profile_id,
  st.id as subscription_type_id,
  es.subscription_level,
  COALESCE(es.metadata->>'current_price', st.base_price)::DECIMAL(10,2) as base_price,
  COALESCE(es.metadata->>'current_price', st.base_price)::DECIMAL(10,2) as total_price,
  'PLN' as currency,
  COALESCE(es.metadata->>'billing_interval', 'month')::VARCHAR as billing_interval,
  CASE WHEN es.is_active THEN 'active' ELSE 'inactive' END as status,
  es.starts_at,
  es.ends_at,
  es.stripe_customer_id,
  es.stripe_subscription_id,
  COALESCE(es.metadata, '{}') as features,
  es.metadata,
  es.created_at,
  es.updated_at
FROM enhanced_subscriptions es
LEFT JOIN subscription_types st ON st.name = CASE 
  WHEN es.subscription_level = 'enterprise' THEN 'enterprise'
  WHEN es.subscription_level = 'company' THEN 
    CASE 
      WHEN EXISTS (SELECT 1 FROM business_profiles bp WHERE bp.id = es.business_profile_id AND bp.entity_type = 'dzialalnosc') THEN 'business_jdg'
      WHEN EXISTS (SELECT 1 FROM business_profiles bp WHERE bp.id = es.business_profile_id AND bp.entity_type IN ('sp_zoo', 'sa')) THEN 'business_spolka'
      ELSE 'business_jdg' -- default
    END
  ELSE 'business_jdg' -- fallback
END
WHERE es.subscription_level IN ('user', 'enterprise')
OR (es.subscription_level = 'company' AND es.is_active = true);

-- Note: Business-level subscriptions from enhanced_subscriptions will be handled separately
-- as they need proper business type detection

-- Create a view for easy access to current premium status
CREATE OR REPLACE VIEW premium_status AS
SELECT 
  u.id as user_id,
  bp.id as business_profile_id,
  bp.name as business_name,
  bp.entity_type,
  CASE 
    WHEN us.status = 'active' THEN 
      CASE us.subscription_level
        WHEN 'enterprise' THEN 'enterprise'
        WHEN 'user' THEN 'user'
        ELSE 'free'
      END
    WHEN bs.status = 'active' THEN 'business'
    ELSE 'free'
  END as premium_level,
  CASE 
    WHEN us.status = 'active' THEN us.subscription_type_id
    WHEN bs.status = 'active' THEN bs.subscription_type_id
    ELSE NULL
  END as current_subscription_type_id,
  CASE 
    WHEN us.status = 'active' THEN us.ends_at
    WHEN bs.status = 'active' THEN bs.ends_at
    ELSE NULL
  END as expires_at,
  CASE 
    WHEN us.status = 'active' THEN us.features
    WHEN bs.status = 'active' THEN bs.features
    ELSE '{}'
  END as features
FROM auth.users u
LEFT JOIN business_profiles bp ON bp.user_id = u.id
LEFT JOIN unified_subscriptions us ON us.user_id = u.id AND us.business_profile_id IS NULL AND us.status = 'active'
LEFT JOIN unified_subscriptions bs ON bs.business_profile_id = bp.id AND bs.status = 'active';

COMMENT ON TABLE unified_subscriptions IS 'Centralized subscription table for all subscription types';
COMMENT ON TABLE subscription_types IS 'Subscription type definitions with features and pricing';
COMMENT ON VIEW premium_status IS 'View for easy access to current premium status across users and businesses';
