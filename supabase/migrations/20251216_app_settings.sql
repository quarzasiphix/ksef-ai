-- App Settings Table for Global Configuration
-- This table stores application-wide settings including Stripe environment mode

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Stripe Configuration
    stripe_mode TEXT NOT NULL DEFAULT 'test' CHECK (stripe_mode IN ('test', 'live')),
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
    updated_by UUID REFERENCES auth.users(id),
    
    -- Ensure only one settings row exists
    CONSTRAINT single_row_check CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Insert default settings (only one row allowed)
INSERT INTO app_settings (id, stripe_mode, stripe_test_enabled, admin_email)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test',
    TRUE,
    NULL
)
ON CONFLICT (id) DO NOTHING;

-- Create function to update settings timestamp
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp
DROP TRIGGER IF EXISTS trigger_update_app_settings_timestamp ON app_settings;
CREATE TRIGGER trigger_update_app_settings_timestamp
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_app_settings_timestamp();

-- RLS Policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for frontend and edge functions)
CREATE POLICY "Anyone can read app settings"
    ON app_settings FOR SELECT
    USING (true);

-- Only service role can update (admin panel will use service role)
CREATE POLICY "Service role can update app settings"
    ON app_settings FOR UPDATE
    USING (auth.jwt()->>'role' = 'service_role');

-- Create view for public settings (hide sensitive data)
CREATE OR REPLACE VIEW public_app_settings AS
SELECT 
    stripe_mode,
    payments_enabled,
    maintenance_mode,
    maintenance_message
FROM app_settings
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- Grant access to view
GRANT SELECT ON public_app_settings TO authenticated;
GRANT SELECT ON public_app_settings TO anon;

-- Create function to get current Stripe mode
CREATE OR REPLACE FUNCTION get_stripe_mode()
RETURNS TEXT AS $$
DECLARE
    current_mode TEXT;
BEGIN
    SELECT stripe_mode INTO current_mode
    FROM app_settings
    WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
    
    RETURN COALESCE(current_mode, 'test');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if feature is enabled
CREATE OR REPLACE FUNCTION is_feature_enabled(feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_enabled BOOLEAN;
BEGIN
    CASE feature_name
        WHEN 'payments' THEN
            SELECT payments_enabled INTO is_enabled FROM app_settings LIMIT 1;
        WHEN 'stripe_connect' THEN
            SELECT stripe_connect_enabled INTO is_enabled FROM app_settings LIMIT 1;
        WHEN 'premium_subscriptions' THEN
            SELECT premium_subscriptions_enabled INTO is_enabled FROM app_settings LIMIT 1;
        WHEN 'analytics' THEN
            SELECT analytics_enabled INTO is_enabled FROM app_settings LIMIT 1;
        ELSE
            RETURN FALSE;
    END CASE;
    
    RETURN COALESCE(is_enabled, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);

-- RLS for audit log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert audit logs"
    ON admin_audit_log FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role can read audit logs"
    ON admin_audit_log FOR SELECT
    USING (auth.jwt()->>'role' = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE app_settings IS 'Global application settings - only one row allowed';
COMMENT ON COLUMN app_settings.stripe_mode IS 'Current Stripe environment: test or live';
COMMENT ON COLUMN app_settings.maintenance_mode IS 'When true, app shows maintenance message';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for admin actions';

-- Grant permissions
GRANT SELECT ON app_settings TO authenticated;
GRANT ALL ON admin_audit_log TO authenticated;
