-- ============================================
-- POSTING RULES SYSTEM
-- ============================================
-- Replaces manual account selection with rule-based posting
-- Supports multi-line journal entries (e.g., invoice with VAT)

-- ============================================
-- 1. POSTING RULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS posting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Rule identification
  name TEXT NOT NULL,
  description TEXT,
  rule_code TEXT, -- e.g., 'SALES_VAT_23', 'PURCHASE_OPEX'
  
  -- Matching criteria
  document_type TEXT NOT NULL, -- sales_invoice, purchase_invoice, payment, etc.
  transaction_type TEXT, -- income, expense, transfer
  payment_method TEXT, -- cash, bank, card, unpaid
  vat_scheme TEXT, -- vat, no_vat, reverse_charge, oss, eu
  vat_rate DECIMAL(5,2), -- 23, 8, 5, 0
  
  -- Optional filters
  project_id UUID REFERENCES projects(id),
  department_id UUID,
  currency TEXT DEFAULT 'PLN',
  
  -- Rule metadata
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE, -- system rules can't be deleted
  priority INTEGER DEFAULT 100, -- lower = higher priority
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_rule_per_profile UNIQUE (business_profile_id, rule_code)
);

CREATE INDEX idx_posting_rules_profile ON posting_rules(business_profile_id);
CREATE INDEX idx_posting_rules_document_type ON posting_rules(document_type);
CREATE INDEX idx_posting_rules_active ON posting_rules(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE posting_rules IS 'Posting rules define how documents are automatically posted to accounts. Each rule contains multiple account mappings (lines).';

-- ============================================
-- 2. POSTING RULE LINES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS posting_rule_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_rule_id UUID NOT NULL REFERENCES posting_rules(id) ON DELETE CASCADE,
  
  -- Line details
  line_order INTEGER NOT NULL, -- display order
  side TEXT NOT NULL CHECK (side IN ('debit', 'credit')), -- Wn or Ma
  account_code TEXT NOT NULL, -- references chart_accounts.code
  
  -- Amount calculation
  amount_type TEXT NOT NULL CHECK (amount_type IN ('gross', 'net', 'vat', 'fixed', 'formula')),
  amount_formula TEXT, -- e.g., 'gross - vat', 'net * 0.23'
  fixed_amount DECIMAL(15,2), -- for fixed amounts
  
  -- Description
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_line_order UNIQUE (posting_rule_id, line_order)
);

CREATE INDEX idx_posting_rule_lines_rule ON posting_rule_lines(posting_rule_id);

COMMENT ON TABLE posting_rule_lines IS 'Individual account mappings for a posting rule. Each line represents one side of a journal entry (Wn or Ma).';

-- ============================================
-- 3. RLS POLICIES
-- ============================================

ALTER TABLE posting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE posting_rule_lines ENABLE ROW LEVEL SECURITY;

-- Posting rules policies
CREATE POLICY posting_rules_select ON posting_rules
  FOR SELECT USING (
    business_profile_id IN (
      SELECT business_profile_id FROM business_profile_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY posting_rules_insert ON posting_rules
  FOR INSERT WITH CHECK (
    business_profile_id IN (
      SELECT business_profile_id FROM business_profile_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY posting_rules_update ON posting_rules
  FOR UPDATE USING (
    business_profile_id IN (
      SELECT business_profile_id FROM business_profile_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    AND is_system = FALSE -- can't update system rules
  );

CREATE POLICY posting_rules_delete ON posting_rules
  FOR DELETE USING (
    business_profile_id IN (
      SELECT business_profile_id FROM business_profile_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND is_system = FALSE -- can't delete system rules
  );

-- Posting rule lines policies
CREATE POLICY posting_rule_lines_select ON posting_rule_lines
  FOR SELECT USING (
    posting_rule_id IN (
      SELECT id FROM posting_rules 
      WHERE business_profile_id IN (
        SELECT business_profile_id FROM business_profile_members 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY posting_rule_lines_insert ON posting_rule_lines
  FOR INSERT WITH CHECK (
    posting_rule_id IN (
      SELECT id FROM posting_rules 
      WHERE business_profile_id IN (
        SELECT business_profile_id FROM business_profile_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
      AND is_system = FALSE
    )
  );

CREATE POLICY posting_rule_lines_update ON posting_rule_lines
  FOR UPDATE USING (
    posting_rule_id IN (
      SELECT id FROM posting_rules 
      WHERE business_profile_id IN (
        SELECT business_profile_id FROM business_profile_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
      AND is_system = FALSE
    )
  );

CREATE POLICY posting_rule_lines_delete ON posting_rule_lines
  FOR DELETE USING (
    posting_rule_id IN (
      SELECT id FROM posting_rules 
      WHERE business_profile_id IN (
        SELECT business_profile_id FROM business_profile_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
      AND is_system = FALSE
    )
  );

-- ============================================
-- 4. FIND POSTING RULE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION find_posting_rule(
  p_business_profile_id UUID,
  p_document_type TEXT,
  p_transaction_type TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_vat_scheme TEXT DEFAULT NULL,
  p_vat_rate DECIMAL DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  rule_code TEXT,
  description TEXT,
  lines JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.name,
    pr.rule_code,
    pr.description,
    jsonb_agg(
      jsonb_build_object(
        'line_order', prl.line_order,
        'side', prl.side,
        'account_code', prl.account_code,
        'account_name', ca.name,
        'amount_type', prl.amount_type,
        'amount_formula', prl.amount_formula,
        'fixed_amount', prl.fixed_amount,
        'description', prl.description
      ) ORDER BY prl.line_order
    ) as lines
  FROM posting_rules pr
  JOIN posting_rule_lines prl ON prl.posting_rule_id = pr.id
  LEFT JOIN chart_accounts ca ON ca.code = prl.account_code AND ca.business_profile_id = p_business_profile_id
  WHERE pr.business_profile_id = p_business_profile_id
    AND pr.is_active = TRUE
    AND pr.document_type = p_document_type
    AND (pr.transaction_type IS NULL OR pr.transaction_type = p_transaction_type)
    AND (pr.payment_method IS NULL OR pr.payment_method = p_payment_method)
    AND (pr.vat_scheme IS NULL OR pr.vat_scheme = p_vat_scheme)
    AND (pr.vat_rate IS NULL OR pr.vat_rate = p_vat_rate)
    AND (pr.project_id IS NULL OR pr.project_id = p_project_id)
    AND (pr.department_id IS NULL OR pr.department_id = p_department_id)
  GROUP BY pr.id, pr.name, pr.rule_code, pr.description, pr.priority
  ORDER BY pr.priority ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_posting_rule IS 'Find the best matching posting rule for a document based on criteria. Returns rule with expanded account lines.';

GRANT EXECUTE ON FUNCTION find_posting_rule TO authenticated;
