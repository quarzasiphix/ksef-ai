-- Create accounting_events table for immutable audit trail
-- This table records all significant accounting events (period closures, corrections, etc.)

CREATE TABLE IF NOT EXISTS accounting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID REFERENCES business_profiles(id) NOT NULL,
  
  -- Event type
  event_type TEXT NOT NULL CHECK (event_type IN (
    'PERIOD_CLOSED',
    'PERIOD_REOPENED',
    'PERIOD_LOCKED',
    'INVOICE_POSTED',
    'INVOICE_CORRECTED',
    'INVOICE_UNPOSTED',
    'TAX_PAYMENT_RECORDED',
    'MANUAL_ADJUSTMENT'
  )),
  
  -- Period reference
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  
  -- Event details
  description TEXT,
  
  -- Snapshot of period totals at time of event
  totals_snapshot JSONB,
  
  -- Related entities
  related_invoice_id UUID REFERENCES invoices(id),
  related_period_id UUID REFERENCES accounting_periods(id),
  
  -- Metadata
  metadata JSONB,
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Events are immutable - no update/delete
  CONSTRAINT no_future_events CHECK (
    created_at <= NOW()
  )
);

-- Indexes for performance
CREATE INDEX idx_accounting_events_business_profile 
  ON accounting_events(business_profile_id);

CREATE INDEX idx_accounting_events_period 
  ON accounting_events(period_year, period_month);

CREATE INDEX idx_accounting_events_type 
  ON accounting_events(event_type);

CREATE INDEX idx_accounting_events_created_at 
  ON accounting_events(created_at DESC);

-- RLS policies
ALTER TABLE accounting_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounting events"
  ON accounting_events FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Only allow inserts through functions (no direct INSERT)
CREATE POLICY "Accounting events can only be created via functions"
  ON accounting_events FOR INSERT
  WITH CHECK (false);

-- Prevent updates and deletes (immutable)
CREATE POLICY "Accounting events are immutable"
  ON accounting_events FOR UPDATE
  USING (false);

CREATE POLICY "Accounting events cannot be deleted"
  ON accounting_events FOR DELETE
  USING (false);

-- Function to record period closure event
CREATE OR REPLACE FUNCTION record_period_closure_event(
  p_business_profile_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_totals_snapshot JSONB,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO accounting_events (
    business_profile_id,
    event_type,
    period_year,
    period_month,
    description,
    totals_snapshot,
    created_by
  ) VALUES (
    p_business_profile_id,
    'PERIOD_CLOSED',
    p_period_year,
    p_period_month,
    COALESCE(p_description, 'Period closed'),
    p_totals_snapshot,
    auth.uid()
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record invoice posting event
CREATE OR REPLACE FUNCTION record_invoice_posted_event(
  p_business_profile_id UUID,
  p_invoice_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO accounting_events (
    business_profile_id,
    event_type,
    period_year,
    period_month,
    related_invoice_id,
    metadata,
    created_by
  ) VALUES (
    p_business_profile_id,
    'INVOICE_POSTED',
    p_period_year,
    p_period_month,
    p_invoice_id,
    p_metadata,
    auth.uid()
  )
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION record_period_closure_event TO authenticated;
GRANT EXECUTE ON FUNCTION record_invoice_posted_event TO authenticated;

-- Add is_locked column to accounting_periods if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounting_periods' 
    AND column_name = 'is_locked'
  ) THEN
    ALTER TABLE accounting_periods ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add closed_at and closed_by if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounting_periods' 
    AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE accounting_periods ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'accounting_periods' 
    AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE accounting_periods ADD COLUMN closed_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Function to close a period
CREATE OR REPLACE FUNCTION close_accounting_period(
  p_business_profile_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_lock_period BOOLEAN DEFAULT FALSE,
  p_closure_note TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_period_id UUID;
  v_unposted_count INTEGER;
  v_total_revenue DECIMAL(15,2);
  v_total_tax DECIMAL(15,2);
  v_invoice_count INTEGER;
  v_totals_snapshot JSONB;
  v_event_id UUID;
BEGIN
  -- Check if period exists
  SELECT id INTO v_period_id
  FROM accounting_periods
  WHERE business_profile_id = p_business_profile_id
    AND period_year = p_period_year
    AND period_month = p_period_month;
  
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PERIOD_NOT_FOUND',
      'message', 'Okres księgowy nie istnieje'
    );
  END IF;
  
  -- Check for unposted invoices
  SELECT COUNT(*) INTO v_unposted_count
  FROM invoices
  WHERE business_profile_id = p_business_profile_id
    AND accounting_status = 'unposted'
    AND EXTRACT(YEAR FROM issue_date) = p_period_year
    AND EXTRACT(MONTH FROM issue_date) = p_period_month;
  
  IF v_unposted_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UNPOSTED_INVOICES',
      'message', format('%s faktur wymaga zaksięgowania', v_unposted_count),
      'unposted_count', v_unposted_count
    );
  END IF;
  
  -- Calculate period totals
  SELECT 
    COALESCE(SUM(tax_base_amount), 0),
    COALESCE(SUM(ryczalt_tax_amount), 0),
    COUNT(*)
  INTO v_total_revenue, v_total_tax, v_invoice_count
  FROM jdg_revenue_register_lines
  WHERE business_profile_id = p_business_profile_id
    AND period_year = p_period_year
    AND period_month = p_period_month;
  
  -- Create totals snapshot
  v_totals_snapshot := jsonb_build_object(
    'total_revenue', v_total_revenue,
    'total_tax', v_total_tax,
    'invoice_count', v_invoice_count,
    'period_year', p_period_year,
    'period_month', p_period_month,
    'closed_at', NOW(),
    'closure_note', p_closure_note
  );
  
  -- Update period status
  UPDATE accounting_periods
  SET 
    status = 'closed',
    is_locked = p_lock_period,
    closed_at = NOW(),
    closed_by = auth.uid(),
    total_revenue = v_total_revenue,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = v_period_id;
  
  -- Record closure event
  v_event_id := record_period_closure_event(
    p_business_profile_id,
    p_period_year,
    p_period_month,
    v_totals_snapshot,
    p_closure_note
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period_id,
    'event_id', v_event_id,
    'totals', v_totals_snapshot,
    'is_locked', p_lock_period
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION close_accounting_period TO authenticated;

-- Function to reopen a period (requires special permission)
CREATE OR REPLACE FUNCTION reopen_accounting_period(
  p_business_profile_id UUID,
  p_period_year INTEGER,
  p_period_month INTEGER,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_period_id UUID;
  v_is_locked BOOLEAN;
BEGIN
  -- Get period
  SELECT id, is_locked INTO v_period_id, v_is_locked
  FROM accounting_periods
  WHERE business_profile_id = p_business_profile_id
    AND period_year = p_period_year
    AND period_month = p_period_month;
  
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PERIOD_NOT_FOUND'
    );
  END IF;
  
  -- Can't reopen locked periods
  IF v_is_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PERIOD_LOCKED',
      'message', 'Okres jest zablokowany i nie może być ponownie otwarty'
    );
  END IF;
  
  -- Reopen period
  UPDATE accounting_periods
  SET 
    status = 'open',
    closed_at = NULL,
    closed_by = NULL,
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = v_period_id;
  
  -- Record event
  INSERT INTO accounting_events (
    business_profile_id,
    event_type,
    period_year,
    period_month,
    description,
    created_by
  ) VALUES (
    p_business_profile_id,
    'PERIOD_REOPENED',
    p_period_year,
    p_period_month,
    p_reason,
    auth.uid()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'period_id', v_period_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reopen_accounting_period TO authenticated;

COMMENT ON TABLE accounting_events IS 'Immutable audit trail of all accounting events';
COMMENT ON FUNCTION close_accounting_period IS 'Close an accounting period and create immutable snapshot';
COMMENT ON FUNCTION reopen_accounting_period IS 'Reopen a closed period (only if not locked)';
