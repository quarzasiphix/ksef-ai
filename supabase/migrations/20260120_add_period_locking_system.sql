-- Migration: Add Period Locking System
-- This migration adds the accounting_periods table and related functions for automatic period locking

-- Create accounting_periods table if it doesn't exist
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked')),
  is_locked BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  closure_note TEXT,
  total_revenue DECIMAL(15,2) DEFAULT 0,
  total_tax DECIMAL(15,2) DEFAULT 0,
  invoice_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique periods per business profile
  UNIQUE(business_profile_id, period_year, period_month)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounting_periods_business_profile ON accounting_periods(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_period ON accounting_periods(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_status ON accounting_periods(status);
CREATE INDEX IF NOT EXISTS idx_accounting_periods_locked ON accounting_periods(is_locked);

-- Add RLS policies
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view periods for their own business profiles
CREATE POLICY "Users can view own accounting periods" ON accounting_periods
  FOR SELECT USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert periods for their own business profiles
CREATE POLICY "Users can insert own accounting periods" ON accounting_periods
  FOR INSERT WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update periods for their own business profiles (but not locked ones)
CREATE POLICY "Users can update own unlocked accounting periods" ON accounting_periods
  FOR UPDATE USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
    AND is_locked = FALSE
  );

-- Policy: Users cannot delete periods (data integrity)
CREATE POLICY "No deletion of accounting periods" ON accounting_periods
  FOR DELETE USING (FALSE);

-- Function to automatically create accounting periods for all business profiles
CREATE OR REPLACE FUNCTION ensure_accounting_periods_exist()
RETURNS VOID AS $$
DECLARE
  v_profile RECORD;
  v_current_year INTEGER;
  v_current_month INTEGER;
  v_start_year INTEGER;
  v_start_month INTEGER;
BEGIN
  -- Get current date
  v_current_year := EXTRACT(YEAR FROM NOW());
  v_current_month := EXTRACT(MONTH FROM NOW());
  
  -- Create periods for current year and previous year
  v_start_year := v_current_year - 1;
  v_start_month := 1;
  
  -- Loop through all business profiles
  FOR v_profile IN 
    SELECT id FROM business_profiles 
    WHERE deleted_at IS NULL
  LOOP
    -- Create periods for the last 24 months
    FOR v_year IN v_start_year..v_current_year LOOP
      FOR v_month IN 1..12 LOOP
        -- Skip future months
        IF (v_year = v_current_year AND v_month > v_current_month) THEN
          CONTINUE;
        END IF;
        
        -- Skip months before start date if this is the first year
        IF v_year = v_start_year AND v_month < 1 THEN
          CONTINUE;
        END IF;
        
        -- Insert period if it doesn't exist
        INSERT INTO accounting_periods (
          business_profile_id,
          period_year,
          period_month,
          status,
          is_locked
        ) VALUES (
          v_profile.id,
          v_year,
          v_month,
          'open',
          FALSE
        ) ON CONFLICT (business_profile_id, period_year, period_month) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get periods that should be automatically locked
CREATE OR REPLACE FUNCTION get_periods_requiring_lock()
RETURNS TABLE (
  business_profile_id UUID,
  period_year INTEGER,
  period_month INTEGER,
  days_overdue INTEGER,
  has_unposted_invoices BOOLEAN
) AS $$
DECLARE
  v_today DATE;
  v_deadline DATE;
BEGIN
  v_today := CURRENT_DATE;
  
  RETURN QUERY
  SELECT 
    ap.business_profile_id,
    ap.period_year,
    ap.period_month,
    GREATEST(0, EXTRACT(DAYS FROM (v_today - DATE(v_period_year, v_period_month + 1, 20))))::INTEGER AS days_overdue,
    EXISTS(
      SELECT 1 FROM invoices i 
      WHERE i.business_profile_id = ap.business_profile_id
        AND i.accounting_status = 'unposted'
        AND EXTRACT(YEAR FROM i.issue_date) = ap.period_year
        AND EXTRACT(MONTH FROM i.issue_date) = ap.period_month
    ) AS has_unposted_invoices
  FROM accounting_periods ap
  WHERE ap.status = 'open'
    AND ap.is_locked = FALSE
    AND ap.period_year <= EXTRACT(YEAR FROM v_today)
    AND (
      ap.period_year < EXTRACT(YEAR FROM v_today)
      OR (
        ap.period_year = EXTRACT(YEAR FROM v_today)
        AND ap.period_month < EXTRACT(MONTH FROM v_today)
      )
    )
    AND v_today > DATE(ap.period_year, ap.period_month + 1, 20) -- After tax deadline
  ORDER BY ap.period_year, ap.period_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically lock eligible periods
CREATE OR REPLACE FUNCTION auto_lock_periods(
  p_max_days_overdue INTEGER DEFAULT 90,
  p_skip_if_unposted BOOLEAN DEFAULT TRUE
)
RETURNS TABLE (
  business_profile_id UUID,
  period_year INTEGER,
  period_month INTEGER,
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_period RECORD;
  v_result JSONB;
BEGIN
  -- Loop through periods requiring locking
  FOR v_period IN 
    SELECT * FROM get_periods_requiring_lock()
    WHERE days_overdue <= p_max_days_overdue
      AND (NOT p_skip_if_unposted OR NOT has_unposted_invoices)
  LOOP
    BEGIN
      -- Lock the period
      SELECT close_accounting_period(
        v_period.business_profile_id,
        v_period.period_year,
        v_period.period_month,
        TRUE, -- Lock the period
        format('Automatically locked %s days after tax deadline', v_period.days_overdue)
      ) INTO v_result;
      
      RETURN NEXT VALUES (
        v_period.business_profile_id,
        v_period.period_year,
        v_period.period_month,
        (v_result->>'success')::BOOLEAN,
        v_result->>'message'
      );
      
    EXCEPTION WHEN OTHERS THEN
      RETURN NEXT VALUES (
        v_period.business_profile_id,
        v_period.period_year,
        v_period.period_month,
        FALSE,
        SQLERRM
      );
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION ensure_accounting_periods_exist TO authenticated;
GRANT EXECUTE ON FUNCTION get_periods_requiring_lock TO authenticated;
GRANT EXECUTE ON FUNCTION auto_lock_periods TO authenticated;

-- Create initial periods for existing business profiles
SELECT ensure_accounting_periods_exist();

-- Add trigger to automatically create periods for new business profiles
CREATE OR REPLACE FUNCTION create_periods_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Create periods for the new business profile
  INSERT INTO accounting_periods (business_profile_id, period_year, period_month, status, is_locked)
  SELECT 
    NEW.id,
    EXTRACT(YEAR FROM NOW()) - 1,
    month_num,
    'open',
    FALSE
  FROM generate_series(1, 12) AS month_num
  UNION ALL
  SELECT 
    NEW.id,
    EXTRACT(YEAR FROM NOW()),
    month_num,
    'open',
    FALSE
  FROM generate_series(1, EXTRACT(MONTH FROM NOW())) AS month_num;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER create_accounting_periods_for_new_profile
  AFTER INSERT ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_periods_for_new_profile();

COMMENT ON TABLE accounting_periods IS 'Accounting periods with closure and locking capabilities';
COMMENT ON FUNCTION ensure_accounting_periods_exist IS 'Ensure accounting periods exist for all business profiles';
COMMENT ON FUNCTION get_periods_requiring_lock IS 'Get periods that should be automatically locked';
COMMENT ON FUNCTION auto_lock_periods IS 'Automatically lock eligible periods';
COMMENT ON FUNCTION create_periods_for_new_profile IS 'Create accounting periods for new business profiles';
