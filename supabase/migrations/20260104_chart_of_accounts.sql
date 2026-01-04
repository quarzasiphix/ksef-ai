-- ============================================
-- CHART OF ACCOUNTS (CoA)
-- ============================================
-- First-class module for accounting structure
-- Provides canonical account codes for Wn/Ma assignment
-- Supports synthetic/analytic hierarchy
-- Soft-delete only (cannot delete if referenced)

-- ============================================
-- 1. CHART OF ACCOUNTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS chart_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Account identification
  code TEXT NOT NULL, -- e.g., "201", "400-01", "700-TRANS"
  name TEXT NOT NULL, -- e.g., "Rozrachunki z dostawcami", "Przychody ze sprzedaży"
  
  -- Account classification
  account_type TEXT NOT NULL CHECK (account_type IN (
    'asset',           -- Aktywa (1xx, 2xx)
    'liability',       -- Pasywa (2xx, 3xx)
    'equity',          -- Kapitał (8xx)
    'revenue',         -- Przychody (7xx)
    'expense',         -- Koszty (4xx, 5xx, 6xx)
    'off_balance'      -- Pozabilansowe (0xx, 9xx)
  )),
  
  -- Hierarchy (optional parent for analytic accounts)
  parent_id UUID REFERENCES chart_accounts(id) ON DELETE SET NULL,
  is_synthetic BOOLEAN DEFAULT FALSE, -- Synthetic = has children, cannot post directly
  
  -- VAT behavior hints
  default_vat_rate DECIMAL(5,2), -- e.g., 23.00, 8.00, 0.00, NULL for non-VAT
  vat_exempt BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ,
  deactivated_by TEXT,
  deactivation_reason TEXT,
  
  -- Metadata
  description TEXT,
  tags JSONB DEFAULT '[]'::JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(business_profile_id, code)
);

-- Indexes
CREATE INDEX idx_chart_accounts_profile ON chart_accounts(business_profile_id);
CREATE INDEX idx_chart_accounts_type ON chart_accounts(account_type);
CREATE INDEX idx_chart_accounts_active ON chart_accounts(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_chart_accounts_parent ON chart_accounts(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_chart_accounts_code ON chart_accounts(business_profile_id, code);

-- Updated timestamp trigger
CREATE TRIGGER update_chart_accounts_updated_at
  BEFORE UPDATE ON chart_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE chart_accounts IS 'Chart of Accounts - canonical account structure for posting. Soft-delete only (cannot delete if referenced by events).';

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE chart_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view accounts for their business profiles
CREATE POLICY chart_accounts_select_policy ON chart_accounts
  FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE id = business_profile_id
    )
  );

-- Users can insert accounts for their business profiles
CREATE POLICY chart_accounts_insert_policy ON chart_accounts
  FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE id = business_profile_id
    )
  );

-- Users can update accounts for their business profiles
CREATE POLICY chart_accounts_update_policy ON chart_accounts
  FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE id = business_profile_id
    )
  );

-- No DELETE policy - use soft delete (deactivate) instead
-- Hard deletes blocked by reference checks

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON chart_accounts TO authenticated;

-- ============================================
-- 3. SOFT DELETE / DEACTIVATE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION deactivate_chart_account(
  p_account_id UUID,
  p_actor_name TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_account chart_accounts%ROWTYPE;
  v_event_count INT;
BEGIN
  -- Get account
  SELECT * INTO v_account FROM chart_accounts WHERE id = p_account_id;
  
  IF v_account.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Account not found'
    );
  END IF;
  
  -- Check if already deactivated
  IF NOT v_account.is_active THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Account already deactivated'
    );
  END IF;
  
  -- Check if referenced by events (prevent deactivation if in use)
  SELECT COUNT(*) INTO v_event_count
  FROM events
  WHERE (metadata->>'debit_account' = v_account.code 
     OR metadata->>'credit_account' = v_account.code)
    AND business_profile_id = v_account.business_profile_id;
  
  IF v_event_count > 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot deactivate account - referenced by ' || v_event_count || ' events',
      'event_count', v_event_count
    );
  END IF;
  
  -- Deactivate
  UPDATE chart_accounts
  SET 
    is_active = FALSE,
    deactivated_at = NOW(),
    deactivated_by = p_actor_name,
    deactivation_reason = p_reason
  WHERE id = p_account_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'deactivated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION deactivate_chart_account IS 'Soft-delete a chart account. Prevents deactivation if referenced by events.';

GRANT EXECUTE ON FUNCTION deactivate_chart_account TO authenticated;

-- ============================================
-- 4. REACTIVATE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION reactivate_chart_account(
  p_account_id UUID,
  p_actor_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_account chart_accounts%ROWTYPE;
BEGIN
  -- Get account
  SELECT * INTO v_account FROM chart_accounts WHERE id = p_account_id;
  
  IF v_account.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Account not found'
    );
  END IF;
  
  -- Check if already active
  IF v_account.is_active THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Account already active'
    );
  END IF;
  
  -- Reactivate
  UPDATE chart_accounts
  SET 
    is_active = TRUE,
    deactivated_at = NULL,
    deactivated_by = NULL,
    deactivation_reason = NULL
  WHERE id = p_account_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'reactivated_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reactivate_chart_account IS 'Reactivate a deactivated chart account.';

GRANT EXECUTE ON FUNCTION reactivate_chart_account TO authenticated;

-- ============================================
-- 5. GET ACCOUNTS FOR PICKER (ACTIVE ONLY)
-- ============================================

CREATE OR REPLACE FUNCTION get_chart_accounts_for_picker(
  p_business_profile_id UUID,
  p_account_type TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  account_type TEXT,
  is_synthetic BOOLEAN,
  parent_code TEXT,
  default_vat_rate DECIMAL,
  full_label TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.code,
    ca.name,
    ca.account_type,
    ca.is_synthetic,
    parent.code AS parent_code,
    ca.default_vat_rate,
    (ca.code || ' - ' || ca.name) AS full_label
  FROM chart_accounts ca
  LEFT JOIN chart_accounts parent ON ca.parent_id = parent.id
  WHERE ca.business_profile_id = p_business_profile_id
    AND ca.is_active = TRUE
    AND ca.is_synthetic = FALSE  -- Only postable accounts
    AND (p_account_type IS NULL OR ca.account_type = p_account_type)
    AND (
      p_search_query IS NULL 
      OR ca.code ILIKE '%' || p_search_query || '%'
      OR ca.name ILIKE '%' || p_search_query || '%'
    )
  ORDER BY ca.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_chart_accounts_for_picker IS 'Get active, postable accounts for Wn/Ma pickers in drawer. Excludes synthetic accounts.';

GRANT EXECUTE ON FUNCTION get_chart_accounts_for_picker TO authenticated;

-- ============================================
-- 6. SEED DATA (Polish CoA basics)
-- ============================================
-- This is a minimal starter set for a small sp. z o.o.
-- Users can extend/customize via Settings UI

CREATE OR REPLACE FUNCTION seed_chart_accounts(
  p_business_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check if already seeded
  SELECT COUNT(*) INTO v_count
  FROM chart_accounts
  WHERE business_profile_id = p_business_profile_id;
  
  IF v_count > 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Chart of accounts already exists for this profile'
    );
  END IF;
  
  -- Insert basic Polish CoA structure
  INSERT INTO chart_accounts (business_profile_id, code, name, account_type, is_synthetic, default_vat_rate) VALUES
  -- Assets
  (p_business_profile_id, '100', 'Środki trwałe', 'asset', TRUE, NULL),
  (p_business_profile_id, '130', 'Rachunek bankowy', 'asset', FALSE, NULL),
  (p_business_profile_id, '140', 'Kasa', 'asset', FALSE, NULL),
  (p_business_profile_id, '201', 'Rozrachunki z dostawcami', 'asset', FALSE, NULL),
  (p_business_profile_id, '202', 'Rozrachunki z odbiorcami', 'asset', FALSE, NULL),
  (p_business_profile_id, '221', 'Należności z tytułu VAT', 'asset', FALSE, NULL),
  (p_business_profile_id, '222', 'Zobowiązania z tytułu VAT', 'liability', FALSE, NULL),
  (p_business_profile_id, '229', 'Rozrachunki publicznoprawne', 'liability', FALSE, NULL),
  (p_business_profile_id, '231', 'Rozrachunki z ZUS', 'liability', FALSE, NULL),
  (p_business_profile_id, '234', 'Rozrachunki z US', 'liability', FALSE, NULL),
  
  -- Equity
  (p_business_profile_id, '800', 'Kapitał podstawowy', 'equity', FALSE, NULL),
  (p_business_profile_id, '820', 'Kapitał zapasowy', 'equity', FALSE, NULL),
  (p_business_profile_id, '860', 'Wynik finansowy', 'equity', FALSE, NULL),
  
  -- Expenses
  (p_business_profile_id, '400', 'Koszty według rodzajów', 'expense', TRUE, NULL),
  (p_business_profile_id, '401', 'Zużycie materiałów', 'expense', FALSE, 23.00),
  (p_business_profile_id, '402', 'Usługi obce', 'expense', FALSE, 23.00),
  (p_business_profile_id, '403', 'Podatki i opłaty', 'expense', FALSE, NULL),
  (p_business_profile_id, '404', 'Wynagrodzenia', 'expense', FALSE, NULL),
  (p_business_profile_id, '405', 'Ubezpieczenia społeczne', 'expense', FALSE, NULL),
  (p_business_profile_id, '409', 'Pozostałe koszty', 'expense', FALSE, 23.00),
  
  -- Revenues
  (p_business_profile_id, '700', 'Przychody ze sprzedaży', 'revenue', TRUE, NULL),
  (p_business_profile_id, '701', 'Sprzedaż produktów', 'revenue', FALSE, 23.00),
  (p_business_profile_id, '702', 'Sprzedaż towarów', 'revenue', FALSE, 23.00),
  (p_business_profile_id, '703', 'Sprzedaż usług', 'revenue', FALSE, 23.00),
  (p_business_profile_id, '750', 'Pozostałe przychody operacyjne', 'revenue', FALSE, 23.00),
  (p_business_profile_id, '760', 'Przychody finansowe', 'revenue', FALSE, NULL);
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'accounts_created', 26
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_chart_accounts IS 'Seed basic Polish CoA for a new business profile. Only runs if no accounts exist.';

GRANT EXECUTE ON FUNCTION seed_chart_accounts TO authenticated;
