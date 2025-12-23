-- Create Authorization System for "System Odpowiedzialności i Rozliczalności"
-- This migration implements unified authorization primitive that all sensitive actions consume

-- ============================================================================
-- 1. AUTHORIZATIONS TABLE
-- ============================================================================

CREATE TABLE authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Authorization source
  type TEXT NOT NULL CHECK (type IN ('decision', 'contract', 'policy', 'consent')),
  ref_id UUID NOT NULL, -- Points to decision, contract, or policy
  ref_type TEXT NOT NULL, -- 'decision', 'contract', 'internal_policy'
  
  -- What this authorizes
  scope JSONB NOT NULL DEFAULT '{}',
  -- Structure:
  -- {
  --   action_types: ['kasa_create', 'invoice_approve', 'expense_create'],
  --   amount_limit: 10000,
  --   currency: 'PLN',
  --   valid_from: '2025-01-01',
  --   valid_to: '2026-12-31',
  --   counterparties: ['uuid1', 'uuid2'],
  --   categories: ['operational', 'marketing']
  -- }
  
  -- Approval state
  required_signatures INTEGER NOT NULL DEFAULT 1,
  current_signatures INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Awaiting signatures
    'approved',   -- All signatures received
    'active',     -- Currently valid and in effect
    'expired',    -- Past valid_to date
    'revoked'     -- Manually revoked
  )),
  
  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authorizations_business_profile ON authorizations(business_profile_id);
CREATE INDEX idx_authorizations_ref ON authorizations(ref_id, ref_type);
CREATE INDEX idx_authorizations_status ON authorizations(status);
CREATE INDEX idx_authorizations_type ON authorizations(type);

COMMENT ON TABLE authorizations IS 
'Unified authorization primitive. Every sensitive action references an authorization source (decision/contract/policy).';

COMMENT ON COLUMN authorizations.scope IS 
'JSONB defining what actions are authorized, with limits, dates, and constraints.';

-- ============================================================================
-- 2. AUTHORIZATION_CHECKS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE authorization_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorization_id UUID NOT NULL REFERENCES authorizations(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- What was checked
  action_type TEXT NOT NULL, -- 'kasa_create', 'invoice_approve', etc.
  entity_type TEXT NOT NULL, -- 'invoice', 'expense', 'kasa', etc.
  entity_id UUID NOT NULL,
  
  -- Check result
  result TEXT NOT NULL CHECK (result IN ('allowed', 'blocked', 'warning')),
  reason TEXT, -- Why blocked/warned
  
  -- Context
  checked_amount NUMERIC,
  checked_currency TEXT,
  checked_category TEXT,
  checked_counterparty UUID,
  
  -- Metadata
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_authorization_checks_authorization ON authorization_checks(authorization_id);
CREATE INDEX idx_authorization_checks_entity ON authorization_checks(entity_type, entity_id);
CREATE INDEX idx_authorization_checks_result ON authorization_checks(result);

COMMENT ON TABLE authorization_checks IS 
'Audit trail of all authorization checks. Records every validation attempt with result and context.';

-- ============================================================================
-- 3. MIGRATE EXISTING DECISIONS TO AUTHORIZATIONS
-- ============================================================================

-- Create authorizations from active decisions
INSERT INTO authorizations (
  business_profile_id,
  type,
  ref_id,
  ref_type,
  scope,
  required_signatures,
  current_signatures,
  status,
  title,
  description,
  created_at
)
SELECT 
  d.business_profile_id,
  'decision' as type,
  d.id as ref_id,
  'decision' as ref_type,
  jsonb_build_object(
    'action_types', ARRAY['general'],
    'amount_limit', d.amount_limit,
    'currency', d.currency,
    'valid_from', d.valid_from,
    'valid_to', d.valid_to,
    'categories', CASE 
      WHEN d.category IS NOT NULL THEN ARRAY[d.category]
      ELSE ARRAY[]::text[]
    END
  ) as scope,
  1 as required_signatures,
  CASE WHEN d.status = 'active' THEN 1 ELSE 0 END as current_signatures,
  CASE 
    WHEN d.status = 'active' AND (d.valid_to IS NULL OR d.valid_to > NOW()) THEN 'active'
    WHEN d.status = 'active' AND d.valid_to < NOW() THEN 'expired'
    WHEN d.status = 'pending_approval' THEN 'pending'
    WHEN d.status = 'revoked' THEN 'revoked'
    ELSE 'pending'
  END as status,
  d.title,
  d.description,
  d.created_at
FROM decisions d
WHERE d.status IN ('active', 'pending_approval', 'revoked');

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if action is authorized
CREATE OR REPLACE FUNCTION check_authorization(
  p_business_profile_id UUID,
  p_action_type TEXT,
  p_amount NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_counterparty UUID DEFAULT NULL
)
RETURNS TABLE (
  is_authorized BOOLEAN,
  authorization_id UUID,
  reason TEXT
) AS $$
DECLARE
  v_auth RECORD;
  v_scope JSONB;
BEGIN
  -- Find matching active authorizations
  FOR v_auth IN
    SELECT a.id, a.scope, a.title
    FROM authorizations a
    WHERE a.business_profile_id = p_business_profile_id
      AND a.status = 'active'
      AND (
        a.scope->'action_types' @> to_jsonb(ARRAY[p_action_type])
        OR a.scope->'action_types' @> to_jsonb(ARRAY['general'])
      )
    ORDER BY a.created_at DESC
  LOOP
    v_scope := v_auth.scope;
    
    -- Check amount limit
    IF p_amount IS NOT NULL AND v_scope->>'amount_limit' IS NOT NULL THEN
      IF p_amount > (v_scope->>'amount_limit')::NUMERIC THEN
        RETURN QUERY SELECT 
          FALSE,
          v_auth.id,
          format('Przekracza limit uchwały "%s" (%s %s)', 
            v_auth.title, 
            v_scope->>'amount_limit', 
            v_scope->>'currency'
          );
        RETURN;
      END IF;
    END IF;
    
    -- Check date range
    IF v_scope->>'valid_to' IS NOT NULL THEN
      IF NOW() > (v_scope->>'valid_to')::TIMESTAMPTZ THEN
        RETURN QUERY SELECT 
          FALSE,
          v_auth.id,
          format('Uchwała "%s" wygasła %s', 
            v_auth.title, 
            to_char((v_scope->>'valid_to')::TIMESTAMPTZ, 'DD.MM.YYYY')
          );
        RETURN;
      END IF;
    END IF;
    
    -- Check category
    IF p_category IS NOT NULL AND jsonb_array_length(v_scope->'categories') > 0 THEN
      IF NOT (v_scope->'categories' @> to_jsonb(ARRAY[p_category])) THEN
        RETURN QUERY SELECT 
          FALSE,
          v_auth.id,
          format('Kategoria "%s" nie jest objęta uchwałą "%s"', 
            p_category, 
            v_auth.title
          );
        RETURN;
      END IF;
    END IF;
    
    -- If all checks pass, authorized
    RETURN QUERY SELECT TRUE, v_auth.id, NULL::TEXT;
    RETURN;
  END LOOP;
  
  -- No matching authorization found
  RETURN QUERY SELECT 
    FALSE, 
    NULL::UUID, 
    'Brak aktywnej uchwały zezwalającej na tę operację';
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to update authorization status based on date
CREATE OR REPLACE FUNCTION update_authorization_status()
RETURNS void AS $$
BEGIN
  -- Mark expired authorizations
  UPDATE authorizations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'active'
    AND scope->>'valid_to' IS NOT NULL
    AND (scope->>'valid_to')::TIMESTAMPTZ < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_authorization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_authorizations_updated_at
  BEFORE UPDATE ON authorizations
  FOR EACH ROW
  EXECUTE FUNCTION update_authorization_updated_at();

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

ALTER TABLE authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorization_checks ENABLE ROW LEVEL SECURITY;

-- Authorizations: same access as business profile
CREATE POLICY authorizations_select ON authorizations
  FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY authorizations_insert ON authorizations
  FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY authorizations_update ON authorizations
  FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Authorization checks: same access as business profile
CREATE POLICY authorization_checks_select ON authorization_checks
  FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY authorization_checks_insert ON authorization_checks
  FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. SCHEDULED JOB (Optional - requires pg_cron extension)
-- ============================================================================

-- Uncomment if pg_cron is available
-- SELECT cron.schedule(
--   'update-authorization-status',
--   '0 0 * * *', -- Daily at midnight
--   $$SELECT update_authorization_status()$$
-- );
