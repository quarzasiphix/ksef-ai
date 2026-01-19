-- ============================================
-- ACCOUNTING AUTOMATION FOUNDATION
-- ============================================
-- Phase 1: Tax regime support, expense acceptance, posting automation
-- Implements deterministic event → journal posting pipeline

-- ============================================
-- 1. TAX REGIME SUPPORT (Ryczałt, Liniowy, Skala)
-- ============================================

-- Add tax regime fields to business_profiles
DO $$ 
BEGIN
  -- Tax type (already exists in types, ensure column exists)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'tax_type') THEN
    ALTER TABLE business_profiles ADD COLUMN tax_type TEXT 
      CHECK (tax_type IN ('skala', 'liniowy', 'ryczalt'));
  END IF;
  
  -- Ryczałt rates configuration (JSONB for flexibility)
  -- Example: {"services_it": 12, "services_consulting": 8.5, "trade": 3, "services_other": 5.5}
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'ryczalt_rates') THEN
    ALTER TABLE business_profiles ADD COLUMN ryczalt_rates JSONB DEFAULT '{}'::JSONB;
  END IF;
  
  -- Default ryczałt rate (for quick calculations)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'default_ryczalt_rate') THEN
    ALTER TABLE business_profiles ADD COLUMN default_ryczalt_rate DECIMAL(5,2);
  END IF;
  
  -- Linear tax rate (14% or 19% for liniowy)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'linear_tax_rate') THEN
    ALTER TABLE business_profiles ADD COLUMN linear_tax_rate DECIMAL(5,2) DEFAULT 19.00;
  END IF;
END $$;

COMMENT ON COLUMN business_profiles.tax_type IS 'Tax regime: skala (progressive), liniowy (flat 19%), ryczalt (flat rate by activity type)';
COMMENT ON COLUMN business_profiles.ryczalt_rates IS 'Ryczałt rates by activity type (PKD-based). Example: {"services_it": 12, "trade": 3}';
COMMENT ON COLUMN business_profiles.default_ryczalt_rate IS 'Default ryczałt rate if activity type not specified';

-- ============================================
-- 2. EXPENSE ACCEPTANCE WORKFLOW
-- ============================================

-- Add acceptance and payment tracking to expenses (invoices table)
DO $$
BEGIN
  -- Acceptance tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'accepted_at') THEN
    ALTER TABLE invoices ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'accepted_by') THEN
    ALTER TABLE invoices ADD COLUMN accepted_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'acceptance_status') THEN
    ALTER TABLE invoices ADD COLUMN acceptance_status TEXT 
      CHECK (acceptance_status IN ('pending', 'accepted', 'rejected', 'auto_accepted'))
      DEFAULT 'auto_accepted';
  END IF;
  
  -- Payment tracking (enhanced)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'payment_date') THEN
    ALTER TABLE invoices ADD COLUMN payment_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'payment_method_used') THEN
    ALTER TABLE invoices ADD COLUMN payment_method_used TEXT 
      CHECK (payment_method_used IN ('cash', 'bank', 'card', 'other'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'payment_account_id') THEN
    ALTER TABLE invoices ADD COLUMN payment_account_id UUID; -- Links to cash_accounts or bank_accounts
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'cash_transaction_id') THEN
    ALTER TABLE invoices ADD COLUMN cash_transaction_id UUID REFERENCES cash_transactions(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'account_movement_id') THEN
    ALTER TABLE invoices ADD COLUMN account_movement_id UUID REFERENCES account_movements(id);
  END IF;
  
  -- Accounting status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'accounting_status') THEN
    ALTER TABLE invoices ADD COLUMN accounting_status TEXT 
      CHECK (accounting_status IN ('unposted', 'posted', 'needs_review', 'rejected'))
      DEFAULT 'unposted';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'posted_at') THEN
    ALTER TABLE invoices ADD COLUMN posted_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'journal_entry_id') THEN
    ALTER TABLE invoices ADD COLUMN journal_entry_id UUID REFERENCES journal_entries(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_acceptance_status ON invoices(acceptance_status) WHERE acceptance_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invoices_accounting_status ON invoices(accounting_status) WHERE accounting_status = 'unposted';
CREATE INDEX IF NOT EXISTS idx_invoices_accepted_at ON invoices(accepted_at) WHERE accepted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_payment_date ON invoices(payment_date) WHERE payment_date IS NOT NULL;

COMMENT ON COLUMN invoices.acceptance_status IS 'Expense acceptance status: pending (needs review), accepted (approved for accounting), rejected, auto_accepted (own invoices)';
COMMENT ON COLUMN invoices.accounting_status IS 'Posting status: unposted (not in ledger), posted (in ledger), needs_review (rule match failed), rejected (invalid)';

-- ============================================
-- 3. PERIOD LOCKING SYSTEM
-- ============================================

-- Create accounting_periods table if not exists
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Period definition
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Locking
  status TEXT NOT NULL CHECK (status IN ('open', 'closing', 'locked')) DEFAULT 'open',
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  lock_reason TEXT,
  
  -- Auto-lock configuration
  auto_lock_enabled BOOLEAN DEFAULT TRUE,
  auto_lock_day INTEGER DEFAULT 20 CHECK (auto_lock_day BETWEEN 1 AND 31),
  
  -- Financial summary (calculated on lock)
  total_revenue DECIMAL(15,2),
  total_expenses DECIMAL(15,2),
  net_result DECIMAL(15,2),
  total_vat_due DECIMAL(15,2),
  total_vat_deductible DECIMAL(15,2),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_period_per_profile UNIQUE (business_profile_id, period_year, period_month)
);

CREATE INDEX idx_accounting_periods_profile ON accounting_periods(business_profile_id);
CREATE INDEX idx_accounting_periods_status ON accounting_periods(status);
CREATE INDEX idx_accounting_periods_date ON accounting_periods(period_year, period_month);
CREATE INDEX idx_accounting_periods_unlocked ON accounting_periods(business_profile_id, status) WHERE status = 'open';

COMMENT ON TABLE accounting_periods IS 'Monthly accounting periods with locking mechanism. Locked periods prevent new postings and modifications.';

-- RLS for accounting_periods
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounting_periods_select ON accounting_periods
  FOR SELECT USING (
    business_profile_id IN (
      SELECT business_profile_id FROM business_profile_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY accounting_periods_insert ON accounting_periods
  FOR INSERT WITH CHECK (
    business_profile_id IN (
      SELECT business_profile_id FROM business_profile_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY accounting_periods_update ON accounting_periods
  FOR UPDATE USING (
    business_profile_id IN (
      SELECT business_profile_id FROM business_profile_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE ON accounting_periods TO authenticated;

-- ============================================
-- 4. AUTO-LOCK PERIOD FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION auto_lock_previous_month()
RETURNS JSONB AS $$
DECLARE
  v_profile RECORD;
  v_period RECORD;
  v_lock_date DATE;
  v_prev_month_start DATE;
  v_prev_month_end DATE;
  v_locked_count INTEGER := 0;
BEGIN
  -- Get current date
  v_lock_date := CURRENT_DATE;
  
  -- Calculate previous month boundaries
  v_prev_month_start := DATE_TRUNC('month', v_lock_date - INTERVAL '1 month')::DATE;
  v_prev_month_end := (DATE_TRUNC('month', v_lock_date) - INTERVAL '1 day')::DATE;
  
  -- Loop through all business profiles with auto-lock enabled
  FOR v_profile IN 
    SELECT DISTINCT bp.id, bp.name
    FROM business_profiles bp
    WHERE bp.id IN (
      SELECT business_profile_id FROM accounting_periods 
      WHERE auto_lock_enabled = TRUE 
        AND status = 'open'
        AND EXTRACT(DAY FROM v_lock_date) >= auto_lock_day
    )
  LOOP
    -- Find or create period for previous month
    SELECT * INTO v_period
    FROM accounting_periods
    WHERE business_profile_id = v_profile.id
      AND period_year = EXTRACT(YEAR FROM v_prev_month_start)
      AND period_month = EXTRACT(MONTH FROM v_prev_month_start);
    
    -- Create period if doesn't exist
    IF v_period.id IS NULL THEN
      INSERT INTO accounting_periods (
        business_profile_id,
        period_year,
        period_month,
        period_start,
        period_end,
        status
      ) VALUES (
        v_profile.id,
        EXTRACT(YEAR FROM v_prev_month_start),
        EXTRACT(MONTH FROM v_prev_month_start),
        v_prev_month_start,
        v_prev_month_end,
        'open'
      ) RETURNING * INTO v_period;
    END IF;
    
    -- Lock the period if still open and past lock day
    IF v_period.status = 'open' AND EXTRACT(DAY FROM v_lock_date) >= v_period.auto_lock_day THEN
      UPDATE accounting_periods
      SET 
        status = 'locked',
        locked_at = NOW(),
        lock_reason = 'Auto-locked on day ' || v_period.auto_lock_day
      WHERE id = v_period.id;
      
      v_locked_count := v_locked_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'locked_count', v_locked_count,
    'lock_date', v_lock_date,
    'previous_month', v_prev_month_start
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_lock_previous_month IS 'Auto-locks previous month periods on the 20th (or configured day) of current month. Run daily via cron.';

GRANT EXECUTE ON FUNCTION auto_lock_previous_month TO authenticated;

-- ============================================
-- 5. MANUAL LOCK/UNLOCK FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION lock_accounting_period(
  p_period_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_period accounting_periods%ROWTYPE;
  v_invoice_count INTEGER;
  v_unposted_count INTEGER;
BEGIN
  -- Get period
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id;
  
  IF v_period.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Period not found');
  END IF;
  
  IF v_period.status = 'locked' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Period already locked');
  END IF;
  
  -- Count unposted transactions in period
  SELECT COUNT(*) INTO v_unposted_count
  FROM invoices
  WHERE business_profile_id = v_period.business_profile_id
    AND accounting_status = 'unposted'
    AND (
      (transaction_type = 'income' AND issue_date BETWEEN v_period.period_start AND v_period.period_end)
      OR (transaction_type = 'expense' AND invoice_date BETWEEN v_period.period_start AND v_period.period_end)
    );
  
  IF v_unposted_count > 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE, 
      'error', 'Cannot lock period with unposted transactions',
      'unposted_count', v_unposted_count
    );
  END IF;
  
  -- Calculate period summary
  UPDATE accounting_periods
  SET 
    status = 'locked',
    locked_at = NOW(),
    locked_by = p_user_id,
    lock_reason = COALESCE(p_reason, 'Manually locked'),
    total_revenue = (
      SELECT COALESCE(SUM(total_gross_value), 0)
      FROM invoices
      WHERE business_profile_id = v_period.business_profile_id
        AND transaction_type = 'income'
        AND issue_date BETWEEN v_period.period_start AND v_period.period_end
        AND accounting_status = 'posted'
    ),
    total_expenses = (
      SELECT COALESCE(SUM(total_gross_value), 0)
      FROM invoices
      WHERE business_profile_id = v_period.business_profile_id
        AND transaction_type = 'expense'
        AND invoice_date BETWEEN v_period.period_start AND v_period.period_end
        AND accounting_status = 'posted'
    )
  WHERE id = p_period_id;
  
  -- Calculate net result
  UPDATE accounting_periods
  SET net_result = COALESCE(total_revenue, 0) - COALESCE(total_expenses, 0)
  WHERE id = p_period_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'locked_at', NOW(),
    'period', v_period.period_year || '-' || LPAD(v_period.period_month::TEXT, 2, '0')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION unlock_accounting_period(
  p_period_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_period accounting_periods%ROWTYPE;
BEGIN
  SELECT * INTO v_period FROM accounting_periods WHERE id = p_period_id;
  
  IF v_period.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Period not found');
  END IF;
  
  IF v_period.status != 'locked' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Period is not locked');
  END IF;
  
  UPDATE accounting_periods
  SET 
    status = 'open',
    locked_at = NULL,
    locked_by = NULL,
    lock_reason = NULL
  WHERE id = p_period_id;
  
  -- Log unlock event
  INSERT INTO events (
    business_profile_id,
    event_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    v_period.business_profile_id,
    'period_unlocked',
    'accounting_period',
    p_period_id,
    'Period ' || v_period.period_year || '-' || LPAD(v_period.period_month::TEXT, 2, '0') || ' unlocked',
    jsonb_build_object(
      'reason', p_reason,
      'unlocked_by', p_user_id,
      'unlocked_at', NOW()
    )
  );
  
  RETURN jsonb_build_object('success', TRUE, 'unlocked_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION lock_accounting_period TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_accounting_period TO authenticated;

-- ============================================
-- 6. EXPENSE ACCEPTANCE FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION accept_expense(
  p_invoice_id UUID,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
BEGIN
  -- Get invoice
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invoice not found');
  END IF;
  
  IF v_invoice.transaction_type != 'expense' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Not an expense');
  END IF;
  
  IF v_invoice.acceptance_status = 'accepted' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Already accepted');
  END IF;
  
  -- Accept the expense
  UPDATE invoices
  SET 
    acceptance_status = 'accepted',
    accepted_at = NOW(),
    accepted_by = p_user_id
  WHERE id = p_invoice_id;
  
  -- Create event
  INSERT INTO events (
    business_profile_id,
    event_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    v_invoice.business_profile_id,
    'expense_accepted',
    'invoice',
    p_invoice_id,
    'Expense accepted: ' || COALESCE(v_invoice.invoice_number, 'Draft'),
    jsonb_build_object(
      'invoice_number', v_invoice.invoice_number,
      'amount', v_invoice.total_gross_value,
      'seller', v_invoice.seller_name,
      'accepted_by', p_user_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'accepted_at', NOW(),
    'invoice_id', p_invoice_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_expense(
  p_invoice_id UUID,
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
BEGIN
  UPDATE invoices
  SET 
    acceptance_status = 'rejected',
    accepted_at = NOW(),
    accepted_by = p_user_id
  WHERE id = p_invoice_id;
  
  INSERT INTO events (
    business_profile_id,
    event_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) SELECT 
    business_profile_id,
    'expense_rejected',
    'invoice',
    p_invoice_id,
    'Expense rejected: ' || COALESCE(invoice_number, 'Draft'),
    jsonb_build_object(
      'reason', p_reason,
      'rejected_by', p_user_id
    )
  FROM invoices WHERE id = p_invoice_id;
  
  RETURN jsonb_build_object('success', TRUE, 'rejected_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION accept_expense TO authenticated;
GRANT EXECUTE ON FUNCTION reject_expense TO authenticated;

-- ============================================
-- 7. PERIOD VALIDATION TRIGGER
-- ============================================

-- Prevent posting to locked periods
CREATE OR REPLACE FUNCTION prevent_locked_period_posting()
RETURNS TRIGGER AS $$
DECLARE
  v_period accounting_periods%ROWTYPE;
  v_transaction_date DATE;
BEGIN
  -- Determine transaction date based on type
  IF NEW.transaction_type = 'income' THEN
    v_transaction_date := NEW.issue_date;
  ELSE
    v_transaction_date := NEW.invoice_date;
  END IF;
  
  -- Find period for this date
  SELECT * INTO v_period
  FROM accounting_periods
  WHERE business_profile_id = NEW.business_profile_id
    AND period_start <= v_transaction_date
    AND period_end >= v_transaction_date
    AND status = 'locked';
  
  -- Block if period is locked
  IF v_period.id IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot post to locked period: % (locked on %)', 
      v_period.period_year || '-' || LPAD(v_period.period_month::TEXT, 2, '0'),
      v_period.locked_at;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to invoices
DROP TRIGGER IF EXISTS check_locked_period_invoices ON invoices;
CREATE TRIGGER check_locked_period_invoices
  BEFORE INSERT OR UPDATE OF accounting_status ON invoices
  FOR EACH ROW
  WHEN (NEW.accounting_status = 'posted')
  EXECUTE FUNCTION prevent_locked_period_posting();

COMMENT ON FUNCTION prevent_locked_period_posting IS 'Prevents posting transactions to locked accounting periods';

-- ============================================
-- 8. HELPER VIEWS
-- ============================================

-- View for pending expenses (needs acceptance)
CREATE OR REPLACE VIEW pending_expenses AS
SELECT 
  i.*,
  c.name as seller_name_resolved,
  c.tax_id as seller_tax_id
FROM invoices i
LEFT JOIN customers c ON c.id = i.seller_id
WHERE i.transaction_type = 'expense'
  AND i.acceptance_status = 'pending'
ORDER BY i.invoice_date DESC;

-- View for unposted transactions
CREATE OR REPLACE VIEW unposted_transactions AS
SELECT 
  i.*,
  CASE 
    WHEN i.transaction_type = 'income' THEN i.issue_date
    ELSE i.invoice_date
  END as transaction_date,
  ap.status as period_status,
  ap.locked_at as period_locked_at
FROM invoices i
LEFT JOIN accounting_periods ap ON 
  ap.business_profile_id = i.business_profile_id
  AND ap.period_start <= CASE WHEN i.transaction_type = 'income' THEN i.issue_date ELSE i.invoice_date END
  AND ap.period_end >= CASE WHEN i.transaction_type = 'income' THEN i.issue_date ELSE i.invoice_date END
WHERE i.accounting_status = 'unposted'
  AND (i.acceptance_status = 'accepted' OR i.acceptance_status = 'auto_accepted')
ORDER BY transaction_date DESC;

GRANT SELECT ON pending_expenses TO authenticated;
GRANT SELECT ON unposted_transactions TO authenticated;

COMMENT ON VIEW pending_expenses IS 'All expenses awaiting acceptance';
COMMENT ON VIEW unposted_transactions IS 'All accepted transactions not yet posted to ledger';
