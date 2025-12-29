-- Migration: Create bilans_snapshots table for formal approval and audit trail
-- Purpose: Transform bilans from editable form to verifiable event-driven snapshot

-- Create bilans_snapshots table
CREATE TABLE IF NOT EXISTS bilans_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Snapshot metadata
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Approval/locking
  status TEXT NOT NULL CHECK (status IN ('draft', 'approved', 'locked')) DEFAULT 'draft',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id),
  
  -- Ledger state checksum for verification
  ledger_checksum TEXT NOT NULL, -- SHA256 of all journal entries up to snapshot_date
  event_count INTEGER NOT NULL, -- Number of events included
  last_event_timestamp TIMESTAMPTZ, -- Timestamp of last event included
  
  -- Decision reference (optional - for formal accounting decisions)
  decision_id UUID REFERENCES decisions(id),
  
  -- Computed balances (stored for audit trail, but always recomputable)
  total_assets DECIMAL(15,2) NOT NULL,
  total_liabilities DECIMAL(15,2) NOT NULL,
  total_equity DECIMAL(15,2) NOT NULL,
  
  -- Validation status
  is_balanced BOOLEAN NOT NULL DEFAULT false, -- Assets = Liabilities + Equity
  balance_difference DECIMAL(15,2) DEFAULT 0, -- Difference if not balanced
  
  -- Detailed breakdown (JSONB for flexibility)
  assets_breakdown JSONB NOT NULL,
  liabilities_breakdown JSONB NOT NULL,
  equity_breakdown JSONB NOT NULL,
  
  -- Audit notes
  notes TEXT,
  
  -- Version control
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_snapshot_id UUID REFERENCES bilans_snapshots(id),
  
  CONSTRAINT unique_snapshot_per_date UNIQUE (business_profile_id, snapshot_date, version)
);

-- Create indexes for performance
CREATE INDEX idx_bilans_snapshots_business_profile ON bilans_snapshots(business_profile_id);
CREATE INDEX idx_bilans_snapshots_date ON bilans_snapshots(snapshot_date DESC);
CREATE INDEX idx_bilans_snapshots_status ON bilans_snapshots(status);
CREATE INDEX idx_bilans_snapshots_created_at ON bilans_snapshots(created_at DESC);

-- Create table for tracking which events contributed to a snapshot
CREATE TABLE IF NOT EXISTS bilans_snapshot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES bilans_snapshots(id) ON DELETE CASCADE,
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL,
  source_document_type TEXT, -- 'invoice', 'expense', 'contract', 'decision', etc.
  source_document_id UUID,
  
  CONSTRAINT unique_snapshot_event UNIQUE (snapshot_id, journal_entry_id)
);

CREATE INDEX idx_bilans_snapshot_events_snapshot ON bilans_snapshot_events(snapshot_id);
CREATE INDEX idx_bilans_snapshot_events_journal ON bilans_snapshot_events(journal_entry_id);

-- Create table for bilans row drill-down metadata
CREATE TABLE IF NOT EXISTS bilans_row_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES bilans_snapshots(id) ON DELETE CASCADE,
  
  -- Row identification
  row_code TEXT NOT NULL, -- e.g., "A.I.1", "A.II.1", "P.I.1"
  row_label TEXT NOT NULL, -- e.g., "Środki pieniężne", "Należności"
  row_category TEXT NOT NULL, -- 'asset_current', 'asset_fixed', 'liability_current', etc.
  
  -- Computed value
  value DECIMAL(15,2) NOT NULL,
  
  -- Source tracking
  contributing_accounts JSONB, -- Array of chart_of_accounts entries
  contributing_events_count INTEGER DEFAULT 0,
  
  -- Explanation
  explanation TEXT,
  
  CONSTRAINT unique_snapshot_row UNIQUE (snapshot_id, row_code)
);

CREATE INDEX idx_bilans_row_metadata_snapshot ON bilans_row_metadata(snapshot_id);

-- Function to compute ledger checksum
CREATE OR REPLACE FUNCTION compute_ledger_checksum(
  p_business_profile_id UUID,
  p_snapshot_date DATE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_checksum TEXT;
BEGIN
  -- Create deterministic checksum of all posted journal entries up to date
  SELECT encode(
    digest(
      string_agg(
        je.id::text || je.entry_date::text || je.total_debit::text || je.total_credit::text,
        '|'
        ORDER BY je.entry_date, je.id
      ),
      'sha256'
    ),
    'hex'
  )
  INTO v_checksum
  FROM journal_entries je
  WHERE je.business_profile_id = p_business_profile_id
    AND je.is_posted = true
    AND je.entry_date <= p_snapshot_date;
  
  RETURN COALESCE(v_checksum, '');
END;
$$;

-- Function to validate bilans balance
CREATE OR REPLACE FUNCTION validate_bilans_balance(
  p_snapshot_id UUID
)
RETURNS TABLE (
  is_balanced BOOLEAN,
  balance_difference DECIMAL(15,2),
  validation_errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot bilans_snapshots%ROWTYPE;
  v_difference DECIMAL(15,2);
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Get snapshot
  SELECT * INTO v_snapshot
  FROM bilans_snapshots
  WHERE id = p_snapshot_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot not found';
  END IF;
  
  -- Calculate difference
  v_difference := v_snapshot.total_assets - (v_snapshot.total_liabilities + v_snapshot.total_equity);
  
  -- Check for validation errors
  IF ABS(v_difference) > 0.01 THEN
    v_errors := v_errors || jsonb_build_object(
      'type', 'balance_mismatch',
      'message', 'Aktywa nie równają się Pasywom',
      'difference', v_difference
    );
  END IF;
  
  -- Check for future-dated events
  IF EXISTS (
    SELECT 1 FROM bilans_snapshot_events bse
    JOIN journal_entries je ON je.id = bse.journal_entry_id
    WHERE bse.snapshot_id = p_snapshot_id
      AND je.entry_date > v_snapshot.snapshot_date
  ) THEN
    v_errors := v_errors || jsonb_build_object(
      'type', 'future_events',
      'message', 'Znaleziono zdarzenia z datą przyszłą'
    );
  END IF;
  
  RETURN QUERY SELECT 
    (ABS(v_difference) <= 0.01),
    v_difference,
    v_errors;
END;
$$;

-- Function to create bilans snapshot from ledger
CREATE OR REPLACE FUNCTION create_bilans_snapshot(
  p_business_profile_id UUID,
  p_snapshot_date DATE,
  p_created_by UUID,
  p_decision_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id UUID;
  v_checksum TEXT;
  v_event_count INTEGER;
  v_last_event_timestamp TIMESTAMPTZ;
  v_assets DECIMAL(15,2) := 0;
  v_liabilities DECIMAL(15,2) := 0;
  v_equity DECIMAL(15,2) := 0;
  v_is_balanced BOOLEAN;
  v_difference DECIMAL(15,2);
BEGIN
  -- Compute checksum
  v_checksum := compute_ledger_checksum(p_business_profile_id, p_snapshot_date);
  
  -- Count events
  SELECT COUNT(*), MAX(je.created_at)
  INTO v_event_count, v_last_event_timestamp
  FROM journal_entries je
  WHERE je.business_profile_id = p_business_profile_id
    AND je.is_posted = true
    AND je.entry_date <= p_snapshot_date;
  
  -- Calculate balances (simplified - you'll need proper account mapping)
  -- This is a placeholder - actual implementation should use chart_of_accounts
  SELECT 
    COALESCE(SUM(CASE WHEN coa.account_type = 'asset' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.account_type = 'liability' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.account_type = 'equity' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0)
  INTO v_assets, v_liabilities, v_equity
  FROM journal_entries je
  JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.business_profile_id = p_business_profile_id
    AND je.is_posted = true
    AND je.entry_date <= p_snapshot_date;
  
  -- Check balance
  v_difference := v_assets - (v_liabilities + v_equity);
  v_is_balanced := ABS(v_difference) <= 0.01;
  
  -- Create snapshot
  INSERT INTO bilans_snapshots (
    business_profile_id,
    snapshot_date,
    created_by,
    status,
    ledger_checksum,
    event_count,
    last_event_timestamp,
    decision_id,
    total_assets,
    total_liabilities,
    total_equity,
    is_balanced,
    balance_difference,
    assets_breakdown,
    liabilities_breakdown,
    equity_breakdown
  ) VALUES (
    p_business_profile_id,
    p_snapshot_date,
    p_created_by,
    'draft',
    v_checksum,
    v_event_count,
    v_last_event_timestamp,
    p_decision_id,
    v_assets,
    v_liabilities,
    v_equity,
    v_is_balanced,
    v_difference,
    '{}'::JSONB, -- Placeholder - implement detailed breakdown
    '{}'::JSONB,
    '{}'::JSONB
  )
  RETURNING id INTO v_snapshot_id;
  
  -- Link events to snapshot
  INSERT INTO bilans_snapshot_events (snapshot_id, journal_entry_id, event_date, event_type)
  SELECT 
    v_snapshot_id,
    je.id,
    je.entry_date,
    je.entry_type
  FROM journal_entries je
  WHERE je.business_profile_id = p_business_profile_id
    AND je.is_posted = true
    AND je.entry_date <= p_snapshot_date;
  
  RETURN v_snapshot_id;
END;
$$;

-- Function to approve/lock snapshot
CREATE OR REPLACE FUNCTION approve_bilans_snapshot(
  p_snapshot_id UUID,
  p_approved_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_balanced BOOLEAN;
BEGIN
  -- Validate balance first
  SELECT is_balanced INTO v_is_balanced
  FROM validate_bilans_balance(p_snapshot_id);
  
  IF NOT v_is_balanced THEN
    RAISE EXCEPTION 'Nie można zatwierdzić niezgodnego bilansu';
  END IF;
  
  -- Approve snapshot
  UPDATE bilans_snapshots
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_approved_by
  WHERE id = p_snapshot_id
    AND status = 'draft';
  
  RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION compute_ledger_checksum(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_bilans_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_bilans_snapshot(UUID, DATE, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_bilans_snapshot(UUID, UUID) TO authenticated;

-- Add comments
COMMENT ON TABLE bilans_snapshots IS 'Formal balance sheet snapshots with approval workflow and audit trail';
COMMENT ON COLUMN bilans_snapshots.ledger_checksum IS 'SHA256 checksum of all journal entries up to snapshot_date for verification';
COMMENT ON COLUMN bilans_snapshots.status IS 'draft = editable, approved = locked for changes, locked = finalized and immutable';
COMMENT ON FUNCTION create_bilans_snapshot IS 'Creates a new bilans snapshot by computing balances from posted journal entries';
COMMENT ON FUNCTION approve_bilans_snapshot IS 'Approves and locks a bilans snapshot after validation';
