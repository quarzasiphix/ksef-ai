-- ============================================
-- GENERAL LEDGER: JOURNAL ENTRIES
-- ============================================
-- Implements the accounting interpretation layer (Wn/Ma)
-- Linked to events (source of truth)
-- Balance sheet derives from posted journal lines ONLY
-- No money duplication - just accounting interpretation

-- ============================================
-- 1. JOURNAL ENTRIES (Header)
-- ============================================

CREATE TABLE IF NOT EXISTS gl_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Link to source event (immutable fact)
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  
  -- Accounting period
  period TEXT NOT NULL, -- YYYY-MM format
  entry_date DATE NOT NULL,
  
  -- Description
  description TEXT,
  reference_number TEXT, -- e.g., "JE-2025-001"
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'void')),
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  UNIQUE(event_id) -- One journal entry per event
);

CREATE INDEX idx_gl_journal_entries_profile ON gl_journal_entries(business_profile_id);
CREATE INDEX idx_gl_journal_entries_event ON gl_journal_entries(event_id);
CREATE INDEX idx_gl_journal_entries_period ON gl_journal_entries(period);
CREATE INDEX idx_gl_journal_entries_status ON gl_journal_entries(status);

CREATE TRIGGER update_gl_journal_entries_updated_at
  BEFORE UPDATE ON gl_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE gl_journal_entries IS 'Journal entry headers - one per closed event. Links events to accounting interpretation (Wn/Ma).';

-- ============================================
-- 2. JOURNAL LINES (Detail)
-- ============================================

CREATE TABLE IF NOT EXISTS gl_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES gl_journal_entries(id) ON DELETE CASCADE,
  
  -- Account reference
  account_id UUID NOT NULL REFERENCES chart_accounts(id) ON DELETE RESTRICT,
  account_code TEXT NOT NULL, -- Denormalized for reporting speed
  
  -- Debit/Credit (one must be NULL, one must have value)
  debit DECIMAL(15,2),
  credit DECIMAL(15,2),
  
  -- Line description
  description TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (
    (debit IS NOT NULL AND credit IS NULL) OR
    (debit IS NULL AND credit IS NOT NULL)
  ),
  CHECK (debit >= 0 OR debit IS NULL),
  CHECK (credit >= 0 OR credit IS NULL)
);

CREATE INDEX idx_gl_journal_lines_entry ON gl_journal_lines(journal_entry_id);
CREATE INDEX idx_gl_journal_lines_account ON gl_journal_lines(account_id);
CREATE INDEX idx_gl_journal_lines_account_code ON gl_journal_lines(account_code);

COMMENT ON TABLE gl_journal_lines IS 'Journal entry lines - 2+ per entry. Implements double-entry bookkeeping (Wn/Ma).';

-- ============================================
-- 3. RLS POLICIES
-- ============================================

ALTER TABLE gl_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_journal_lines ENABLE ROW LEVEL SECURITY;

-- Journal entries
CREATE POLICY gl_journal_entries_select_policy ON gl_journal_entries
  FOR SELECT USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE id = business_profile_id
    )
  );

CREATE POLICY gl_journal_entries_insert_policy ON gl_journal_entries
  FOR INSERT WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE id = business_profile_id
    )
  );

CREATE POLICY gl_journal_entries_update_policy ON gl_journal_entries
  FOR UPDATE USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE id = business_profile_id
    )
  );

-- Journal lines (inherit from entry)
CREATE POLICY gl_journal_lines_select_policy ON gl_journal_lines
  FOR SELECT USING (
    journal_entry_id IN (
      SELECT id FROM gl_journal_entries
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE id = business_profile_id
      )
    )
  );

CREATE POLICY gl_journal_lines_insert_policy ON gl_journal_lines
  FOR INSERT WITH CHECK (
    journal_entry_id IN (
      SELECT id FROM gl_journal_entries
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE id = business_profile_id
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON gl_journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON gl_journal_lines TO authenticated;

-- ============================================
-- 4. HELPER: GET ACCOUNT BALANCE
-- ============================================

CREATE OR REPLACE FUNCTION get_account_balance(
  p_business_profile_id UUID,
  p_account_code TEXT,
  p_period_end TEXT DEFAULT NULL -- YYYY-MM-DD
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_total_debit DECIMAL(15,2);
  v_total_credit DECIMAL(15,2);
  v_balance DECIMAL(15,2);
BEGIN
  -- Sum debits and credits for posted entries only
  SELECT 
    COALESCE(SUM(jl.debit), 0),
    COALESCE(SUM(jl.credit), 0)
  INTO v_total_debit, v_total_credit
  FROM gl_journal_lines jl
  JOIN gl_journal_entries je ON jl.journal_entry_id = je.id
  WHERE je.business_profile_id = p_business_profile_id
    AND je.status = 'posted'
    AND jl.account_code = p_account_code
    AND (p_period_end IS NULL OR je.entry_date <= p_period_end::DATE);
  
  -- Balance = debits - credits
  v_balance := v_total_debit - v_total_credit;
  
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_account_balance IS 'Get account balance from posted journal lines only. Balance = Σ debits - Σ credits.';
GRANT EXECUTE ON FUNCTION get_account_balance TO authenticated;

-- ============================================
-- 5. HELPER: GET TRIAL BALANCE
-- ============================================

CREATE OR REPLACE FUNCTION get_trial_balance(
  p_business_profile_id UUID,
  p_period_end TEXT DEFAULT NULL -- YYYY-MM-DD
)
RETURNS TABLE (
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  debit_total DECIMAL(15,2),
  credit_total DECIMAL(15,2),
  balance DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.code AS account_code,
    ca.name AS account_name,
    ca.account_type,
    COALESCE(SUM(jl.debit), 0) AS debit_total,
    COALESCE(SUM(jl.credit), 0) AS credit_total,
    COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) AS balance
  FROM chart_accounts ca
  LEFT JOIN gl_journal_lines jl ON ca.code = jl.account_code
  LEFT JOIN gl_journal_entries je ON jl.journal_entry_id = je.id
    AND je.business_profile_id = p_business_profile_id
    AND je.status = 'posted'
    AND (p_period_end IS NULL OR je.entry_date <= p_period_end::DATE)
  WHERE ca.business_profile_id = p_business_profile_id
    AND ca.is_active = TRUE
  GROUP BY ca.code, ca.name, ca.account_type
  HAVING COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0) != 0
  ORDER BY ca.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_trial_balance IS 'Get trial balance (all accounts with non-zero balances) from posted journal lines.';
GRANT EXECUTE ON FUNCTION get_trial_balance TO authenticated;

-- ============================================
-- 6. HELPER: VERIFY JOURNAL ENTRY BALANCE
-- ============================================

CREATE OR REPLACE FUNCTION verify_journal_entry_balance(
  p_journal_entry_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_total_debit DECIMAL(15,2);
  v_total_credit DECIMAL(15,2);
  v_difference DECIMAL(15,2);
BEGIN
  -- Sum debits and credits
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM gl_journal_lines
  WHERE journal_entry_id = p_journal_entry_id;
  
  v_difference := v_total_debit - v_total_credit;
  
  IF ABS(v_difference) < 0.01 THEN
    RETURN jsonb_build_object(
      'balanced', TRUE,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit,
      'difference', v_difference
    );
  ELSE
    RETURN jsonb_build_object(
      'balanced', FALSE,
      'total_debit', v_total_debit,
      'total_credit', v_total_credit,
      'difference', v_difference,
      'error', 'Journal entry is not balanced. Debits must equal credits.'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_journal_entry_balance IS 'Verify that journal entry debits = credits (fundamental accounting equation).';
GRANT EXECUTE ON FUNCTION verify_journal_entry_balance TO authenticated;
