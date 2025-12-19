-- Entity-Based Pricing Model
-- Core principle: The unit of value is the legal entity, not the user
-- JDG = low governance complexity, Spółka = high governance/liability/audit/capital risk

-- ============================================================================
-- SUBSCRIPTION PLANS
-- ============================================================================

-- Subscription plans table (entity-based, not user-based)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identification
  plan_code TEXT NOT NULL UNIQUE CHECK (plan_code IN ('jdg', 'spolka_standard', 'enterprise')),
  plan_name TEXT NOT NULL,
  
  -- Pricing
  monthly_price_pln DECIMAL(10, 2) NOT NULL,
  annual_price_pln DECIMAL(10, 2),
  
  -- Entity type this plan applies to
  entity_type TEXT NOT NULL CHECK (entity_type IN ('jdg', 'sp_zoo', 'sa', 'any')),
  
  -- Features
  features JSONB DEFAULT '[]',
  
  -- Trial
  trial_days INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (plan_code, plan_name, monthly_price_pln, annual_price_pln, entity_type, trial_days, features) VALUES
  ('jdg', 'JDG', 19.00, 190.00, 'jdg', 0, '[
    "Nieograniczone faktury i dokumenty",
    "Podstawowa księgowość",
    "Eksport JPK",
    "Uproszczony system decyzji"
  ]'::jsonb),
  ('spolka_standard', 'Spółka Standard', 89.00, 890.00, 'sp_zoo', 7, '[
    "System uchwał i decyzji",
    "Zarządzanie aktywami (nieruchomości, pojazdy, IP)",
    "Decyzje powiązane z wydatkami",
    "Ścieżka audytu i odpowiedzialność",
    "Śledzenie kapitału i wspólników",
    "Nieograniczone dokumenty",
    "Architektura gotowa na KSeF"
  ]'::jsonb),
  ('enterprise', 'Enterprise', 0.00, 0.00, 'any', 0, '[
    "Wszystko z planu Spółka Standard",
    "Dedykowane wdrożenie",
    "Dostęp offline",
    "Pełna kontrola nad infrastrukturą",
    "Priorytetowe wsparcie"
  ]'::jsonb)
ON CONFLICT (plan_code) DO NOTHING;

-- ============================================================================
-- ENTITY SUBSCRIPTIONS (billing attaches to entities, not accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS entity_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity this subscription is for
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Plan
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- Subscription period
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN (
    'trial',
    'active',
    'past_due',
    'canceled',
    'expired'
  )),
  
  -- Trial tracking
  trial_start_date TIMESTAMPTZ,
  trial_end_date TIMESTAMPTZ,
  
  -- Subscription dates
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Cancellation
  canceled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  
  -- Payment
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create partial unique index for active subscriptions
CREATE UNIQUE INDEX unique_active_subscription_per_entity 
  ON entity_subscriptions(business_profile_id, status) 
  WHERE status IN ('trial', 'active');

-- ============================================================================
-- AUTOMATIC TRIAL CREATION FOR SPÓŁKI
-- ============================================================================

-- Function to create automatic trial when spółka is created
CREATE OR REPLACE FUNCTION create_spolka_trial()
RETURNS TRIGGER AS $$
DECLARE
  spolka_plan_id UUID;
  trial_days INTEGER;
BEGIN
  -- Only for spółki (sp_zoo or sa)
  IF NEW.entity_type IN ('sp_zoo', 'sa') THEN
    -- Get spółka plan
    SELECT id, subscription_plans.trial_days 
    INTO spolka_plan_id, trial_days
    FROM subscription_plans 
    WHERE plan_code = 'spolka_standard' 
    AND is_active = true
    LIMIT 1;
    
    IF spolka_plan_id IS NOT NULL AND trial_days > 0 THEN
      -- Create trial subscription
      INSERT INTO entity_subscriptions (
        business_profile_id,
        plan_id,
        billing_cycle,
        status,
        trial_start_date,
        trial_end_date
      ) VALUES (
        NEW.id,
        spolka_plan_id,
        'monthly',
        'trial',
        NOW(),
        NOW() + (trial_days || ' days')::INTERVAL
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create trial for new spółki
CREATE TRIGGER auto_create_spolka_trial
  AFTER INSERT ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_spolka_trial();

-- ============================================================================
-- SUBSCRIPTION HISTORY (audit trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  entity_subscription_id UUID NOT NULL REFERENCES entity_subscriptions(id) ON DELETE CASCADE,
  
  -- Event
  event_type TEXT NOT NULL CHECK (event_type IN (
    'trial_started',
    'trial_ended',
    'subscription_started',
    'subscription_renewed',
    'subscription_canceled',
    'subscription_expired',
    'payment_succeeded',
    'payment_failed'
  )),
  
  -- Details
  from_status TEXT,
  to_status TEXT,
  metadata JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_entity_subscriptions_business_profile ON entity_subscriptions(business_profile_id);
CREATE INDEX idx_entity_subscriptions_status ON entity_subscriptions(status);
CREATE INDEX idx_entity_subscriptions_trial_end ON entity_subscriptions(trial_end_date) WHERE status = 'trial';
CREATE INDEX idx_entity_subscriptions_period_end ON entity_subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX idx_subscription_history_entity ON subscription_history(entity_subscription_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Plans are public (read-only)
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

-- Entity subscriptions
CREATE POLICY "Users can view subscriptions for their entities"
  ON entity_subscriptions FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update subscriptions for their entities"
  ON entity_subscriptions FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Subscription history
CREATE POLICY "Users can view subscription history for their entities"
  ON subscription_history FOR SELECT
  USING (
    entity_subscription_id IN (
      SELECT id FROM entity_subscriptions WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entity_subscriptions_updated_at
  BEFORE UPDATE ON entity_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Log subscription status changes
CREATE OR REPLACE FUNCTION log_subscription_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO subscription_history (
      entity_subscription_id,
      event_type,
      from_status,
      to_status,
      metadata
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'trial' THEN 'trial_started'
        WHEN OLD.status = 'trial' AND NEW.status = 'active' THEN 'subscription_started'
        WHEN NEW.status = 'canceled' THEN 'subscription_canceled'
        WHEN NEW.status = 'expired' THEN 'subscription_expired'
        ELSE 'subscription_renewed'
      END,
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'billing_cycle', NEW.billing_cycle,
        'plan_id', NEW.plan_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_status_change_logger
  AFTER UPDATE ON entity_subscriptions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_subscription_status_change();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if entity has active subscription or trial
CREATE OR REPLACE FUNCTION has_active_subscription(entity_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM entity_subscriptions
    WHERE business_profile_id = entity_id
    AND status IN ('trial', 'active')
    AND (
      (status = 'trial' AND trial_end_date > NOW()) OR
      (status = 'active' AND current_period_end > NOW())
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Get entity subscription status
CREATE OR REPLACE FUNCTION get_entity_subscription_status(entity_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  status TEXT,
  plan_name TEXT,
  days_remaining INTEGER,
  is_trial BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as has_subscription,
    es.status,
    sp.plan_name,
    CASE 
      WHEN es.status = 'trial' THEN EXTRACT(DAY FROM (es.trial_end_date - NOW()))::INTEGER
      WHEN es.status = 'active' THEN EXTRACT(DAY FROM (es.current_period_end - NOW()))::INTEGER
      ELSE 0
    END as days_remaining,
    (es.status = 'trial') as is_trial
  FROM entity_subscriptions es
  JOIN subscription_plans sp ON es.plan_id = sp.id
  WHERE es.business_profile_id = entity_id
  AND es.status IN ('trial', 'active')
  ORDER BY es.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subscription_plans IS 'Entity-based subscription plans. Billing is per legal entity (JDG/Spółka), not per user.';
COMMENT ON TABLE entity_subscriptions IS 'Subscriptions attached to business entities. Each spółka gets automatic 7-day trial.';
COMMENT ON COLUMN entity_subscriptions.business_profile_id IS 'The legal entity this subscription is for (not the user account).';
COMMENT ON FUNCTION create_spolka_trial() IS 'Automatically creates 7-day trial for new spółki (sp_zoo/sa).';
COMMENT ON FUNCTION has_active_subscription(UUID) IS 'Check if entity has active subscription or valid trial.';
