-- ============================================
-- ACCOUNT KEYS + RULE PACKS SYSTEM
-- ============================================
-- Replaces hardcoded account codes with flexible keys
-- Enables complexity-based rule packs (Starter/Standard/Advanced)

-- ============================================
-- 1. ACCOUNT KEYS ENUM
-- ============================================

-- Core account keys that rules reference
CREATE TYPE account_key AS ENUM (
  -- Assets
  'BANK_MAIN',
  'CASH_MAIN',
  'AR_CUSTOMERS',
  'AP_SUPPLIERS',
  
  -- Revenue
  'REVENUE_MAIN',
  'REVENUE_SAAS',
  'REVENUE_TRANSPORT',
  'REVENUE_OTHER',
  
  -- Costs
  'COST_OPEX',
  'COST_HOSTING',
  'COST_ADS',
  'COST_FUEL',
  'COST_TOLLS',
  'COST_INSURANCE',
  'COST_FIXED_ASSET',
  
  -- VAT
  'VAT_OUTPUT',
  'VAT_INPUT',
  'VAT_PAYABLE',
  
  -- Tax
  'CIT_EXPENSE',
  'CIT_PAYABLE',
  
  -- Equity
  'EQUITY_CAPITAL',
  'EQUITY_RETAINED'
);

-- ============================================
-- 2. COMPANY ACCOUNT KEY MAPPING
-- ============================================

CREATE TABLE IF NOT EXISTS company_account_key_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  account_key account_key NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_accounts(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_key_per_company UNIQUE (business_profile_id, account_key)
);

CREATE INDEX idx_account_key_map_profile ON company_account_key_map(business_profile_id);
CREATE INDEX idx_account_key_map_key ON company_account_key_map(account_key);

COMMENT ON TABLE company_account_key_map IS 'Maps account keys to actual chart accounts per company. Base mapping without overrides.';

-- ============================================
-- 3. ACCOUNT KEY OVERRIDES (ADVANCED)
-- ============================================

CREATE TABLE IF NOT EXISTS company_account_key_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  account_key account_key NOT NULL,
  account_id UUID NOT NULL REFERENCES chart_accounts(id) ON DELETE CASCADE,
  
  -- Context filters
  department_id UUID,
  project_id UUID,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_override_per_context UNIQUE (business_profile_id, account_key, department_id, project_id)
);

CREATE INDEX idx_account_key_override_profile ON company_account_key_overrides(business_profile_id);
CREATE INDEX idx_account_key_override_dept ON company_account_key_overrides(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_account_key_override_project ON company_account_key_overrides(project_id) WHERE project_id IS NOT NULL;

COMMENT ON TABLE company_account_key_overrides IS 'Department/project-specific overrides for account keys. Only for Advanced complexity level.';

-- ============================================
-- 4. RULE PACKS
-- ============================================

CREATE TABLE IF NOT EXISTS rule_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pack identification
  pack_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pack classification
  complexity_level TEXT NOT NULL CHECK (complexity_level IN ('starter', 'standard', 'advanced', 'enterprise')),
  industry TEXT CHECK (industry IN ('saas', 'transport', 'construction', 'ecommerce', 'agency', 'general')),
  
  -- Features
  supports_vat BOOLEAN DEFAULT FALSE,
  supports_payroll BOOLEAN DEFAULT FALSE,
  supports_departments BOOLEAN DEFAULT FALSE,
  supports_projects BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rule_packs_complexity ON rule_packs(complexity_level);
CREATE INDEX idx_rule_packs_industry ON rule_packs(industry);

COMMENT ON TABLE rule_packs IS 'Predefined rule packs based on company complexity and industry. Users select pack, not individual rules.';

-- ============================================
-- 5. RULE PACK RULES (MANY-TO-MANY)
-- ============================================

CREATE TABLE IF NOT EXISTS rule_pack_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_pack_id UUID NOT NULL REFERENCES rule_packs(id) ON DELETE CASCADE,
  posting_rule_id UUID NOT NULL REFERENCES posting_rules(id) ON DELETE CASCADE,
  
  -- Grouping for UI
  rule_group TEXT NOT NULL CHECK (rule_group IN ('sales', 'purchases', 'payments', 'taxes', 'payroll', 'internal')),
  is_optional BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_rule_in_pack UNIQUE (rule_pack_id, posting_rule_id)
);

CREATE INDEX idx_rule_pack_rules_pack ON rule_pack_rules(rule_pack_id);
CREATE INDEX idx_rule_pack_rules_rule ON rule_pack_rules(posting_rule_id);
CREATE INDEX idx_rule_pack_rules_group ON rule_pack_rules(rule_group);

COMMENT ON TABLE rule_pack_rules IS 'Links posting rules to rule packs. Defines which rules are included in each pack.';

-- ============================================
-- 6. COMPANY RULE PACK SELECTION
-- ============================================

ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS active_rule_pack_id UUID REFERENCES rule_packs(id),
ADD COLUMN IF NOT EXISTS complexity_level TEXT DEFAULT 'starter' CHECK (complexity_level IN ('starter', 'standard', 'advanced', 'enterprise')),
ADD COLUMN IF NOT EXISTS industry TEXT CHECK (industry IN ('saas', 'transport', 'construction', 'ecommerce', 'agency', 'general', 'multi'));

COMMENT ON COLUMN business_profiles.active_rule_pack_id IS 'Currently active rule pack for this company';
COMMENT ON COLUMN business_profiles.complexity_level IS 'Company size/complexity level';
COMMENT ON COLUMN business_profiles.industry IS 'Primary industry/activity type';

-- ============================================
-- 7. UPDATE POSTING RULE LINES TO USE KEYS
-- ============================================

ALTER TABLE posting_rule_lines 
ADD COLUMN IF NOT EXISTS account_key account_key,
ADD COLUMN IF NOT EXISTS use_key_mapping BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN posting_rule_lines.account_key IS 'Account key to resolve via company mapping. If set, account_code is ignored.';
COMMENT ON COLUMN posting_rule_lines.use_key_mapping IS 'If true, use account_key instead of account_code';

-- ============================================
-- 8. RLS POLICIES
-- ============================================

ALTER TABLE company_account_key_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_account_key_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_pack_rules ENABLE ROW LEVEL SECURITY;

-- Account key map policies
CREATE POLICY account_key_map_select ON company_account_key_map
  FOR SELECT USING (
    business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY account_key_map_manage ON company_account_key_map
  FOR ALL USING (
    business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid())
  );

-- Account key overrides policies
CREATE POLICY account_key_override_select ON company_account_key_overrides
  FOR SELECT USING (
    business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY account_key_override_manage ON company_account_key_overrides
  FOR ALL USING (
    business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid())
  );

-- Rule packs policies (read-only for users)
CREATE POLICY rule_packs_select ON rule_packs
  FOR SELECT USING (TRUE);

CREATE POLICY rule_pack_rules_select ON rule_pack_rules
  FOR SELECT USING (TRUE);

-- ============================================
-- 9. RESOLVE ACCOUNT KEY FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION resolve_account_key(
  p_business_profile_id UUID,
  p_account_key account_key,
  p_department_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Try department override first
  IF p_department_id IS NOT NULL THEN
    SELECT account_id INTO v_account_id
    FROM company_account_key_overrides
    WHERE business_profile_id = p_business_profile_id
      AND account_key = p_account_key
      AND department_id = p_department_id
      AND project_id IS NULL
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
      RETURN v_account_id;
    END IF;
  END IF;
  
  -- Try project override
  IF p_project_id IS NOT NULL THEN
    SELECT account_id INTO v_account_id
    FROM company_account_key_overrides
    WHERE business_profile_id = p_business_profile_id
      AND account_key = p_account_key
      AND project_id = p_project_id
      AND department_id IS NULL
    LIMIT 1;
    
    IF v_account_id IS NOT NULL THEN
      RETURN v_account_id;
    END IF;
  END IF;
  
  -- Fall back to base mapping
  SELECT account_id INTO v_account_id
  FROM company_account_key_map
  WHERE business_profile_id = p_business_profile_id
    AND account_key = p_account_key
  LIMIT 1;
  
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION resolve_account_key IS 'Resolve account key to actual account ID, checking overrides first, then base mapping.';

GRANT EXECUTE ON FUNCTION resolve_account_key TO authenticated;
