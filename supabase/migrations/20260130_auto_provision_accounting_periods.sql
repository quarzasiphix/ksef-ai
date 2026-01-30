-- Migration: Auto-provision accounting periods
-- Purpose: Periods are auto-created when financial events occur, not manually created
-- This eliminates the "Create period" mental model and makes periods a property of time

-- ============================================================================
-- 1. Add unique constraint to prevent duplicate periods
-- ============================================================================

-- Drop existing constraint if it exists
ALTER TABLE accounting_periods 
DROP CONSTRAINT IF EXISTS accounting_periods_business_year_month_unique;

-- Add unique constraint on (business_profile_id, year, month)
ALTER TABLE accounting_periods 
ADD CONSTRAINT accounting_periods_business_year_month_unique 
UNIQUE (business_profile_id, year, month);

-- ============================================================================
-- 2. Create function to ensure accounting period exists (idempotent)
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_accounting_period(
  p_business_profile_id UUID,
  p_event_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_period_id UUID;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Extract year and month from event date
  v_year := EXTRACT(YEAR FROM p_event_date);
  v_month := EXTRACT(MONTH FROM p_event_date);
  
  -- Calculate period boundaries
  v_period_start := DATE_TRUNC('month', p_event_date)::DATE;
  v_period_end := (DATE_TRUNC('month', p_event_date) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Try to get existing period
  SELECT id INTO v_period_id
  FROM accounting_periods
  WHERE business_profile_id = p_business_profile_id
    AND year = v_year
    AND month = v_month;
  
  -- If period doesn't exist, create it
  IF v_period_id IS NULL THEN
    INSERT INTO accounting_periods (
      business_profile_id,
      year,
      month,
      period_start,
      period_end,
      status,
      is_locked,
      auto_lock_enabled,
      created_at,
      updated_at
    )
    VALUES (
      p_business_profile_id,
      v_year,
      v_month,
      v_period_start,
      v_period_end,
      'open',
      false,
      true, -- Enable auto-lock by default
      NOW(),
      NOW()
    )
    ON CONFLICT (business_profile_id, year, month) 
    DO NOTHING
    RETURNING id INTO v_period_id;
    
    -- If INSERT returned NULL due to conflict, fetch the existing ID
    IF v_period_id IS NULL THEN
      SELECT id INTO v_period_id
      FROM accounting_periods
      WHERE business_profile_id = p_business_profile_id
        AND year = v_year
        AND month = v_month;
    END IF;
  END IF;
  
  RETURN v_period_id;
END;
$$;

-- ============================================================================
-- 3. Create trigger function to auto-provision periods for invoices
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_provision_period_for_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_date DATE;
  v_period_id UUID;
BEGIN
  -- Determine the event date (issue_date for invoices)
  v_event_date := NEW.issue_date;
  
  -- Skip if no business profile or no issue date
  IF NEW.business_profile_id IS NULL OR v_event_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Ensure accounting period exists
  v_period_id := ensure_accounting_period(NEW.business_profile_id, v_event_date);
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_provision_period_invoice ON invoices;

-- Create trigger for invoices
CREATE TRIGGER trigger_auto_provision_period_invoice
  BEFORE INSERT OR UPDATE OF issue_date, business_profile_id
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION auto_provision_period_for_invoice();

-- ============================================================================
-- 4. Create trigger function to auto-provision periods for expenses
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_provision_period_for_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_date DATE;
  v_period_id UUID;
BEGIN
  -- Determine the event date (expense_date for expenses)
  v_event_date := COALESCE(NEW.expense_date, NEW.created_at::DATE);
  
  -- Skip if no business profile or no date
  IF NEW.business_profile_id IS NULL OR v_event_date IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Ensure accounting period exists
  v_period_id := ensure_accounting_period(NEW.business_profile_id, v_event_date);
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_provision_period_expense ON expenses;

-- Create trigger for expenses
CREATE TRIGGER trigger_auto_provision_period_expense
  BEFORE INSERT OR UPDATE OF expense_date, business_profile_id
  ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_provision_period_for_expense();

-- ============================================================================
-- 5. Create one-time backfill function for legacy records
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_missing_accounting_periods()
RETURNS TABLE(
  business_profile_id UUID,
  periods_created INTEGER,
  date_range TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_profile RECORD;
  v_date_record RECORD;
  v_period_id UUID;
  v_periods_created INTEGER;
  v_min_date DATE;
  v_max_date DATE;
BEGIN
  -- For each business profile
  FOR v_business_profile IN 
    SELECT DISTINCT bp.id, bp.name
    FROM business_profiles bp
  LOOP
    v_periods_created := 0;
    v_min_date := NULL;
    v_max_date := NULL;
    
    -- Get all unique year-month combinations from invoices
    FOR v_date_record IN
      SELECT DISTINCT 
        EXTRACT(YEAR FROM issue_date)::INTEGER AS year,
        EXTRACT(MONTH FROM issue_date)::INTEGER AS month,
        DATE_TRUNC('month', issue_date)::DATE AS period_date
      FROM invoices
      WHERE business_profile_id = v_business_profile.id
        AND issue_date IS NOT NULL
      
      UNION
      
      SELECT DISTINCT 
        EXTRACT(YEAR FROM COALESCE(expense_date, created_at::DATE))::INTEGER AS year,
        EXTRACT(MONTH FROM COALESCE(expense_date, created_at::DATE))::INTEGER AS month,
        DATE_TRUNC('month', COALESCE(expense_date, created_at::DATE))::DATE AS period_date
      FROM expenses
      WHERE business_profile_id = v_business_profile.id
        AND COALESCE(expense_date, created_at::DATE) IS NOT NULL
      
      ORDER BY year, month
    LOOP
      -- Ensure period exists
      v_period_id := ensure_accounting_period(v_business_profile.id, v_date_record.period_date);
      
      IF v_period_id IS NOT NULL THEN
        v_periods_created := v_periods_created + 1;
        
        IF v_min_date IS NULL OR v_date_record.period_date < v_min_date THEN
          v_min_date := v_date_record.period_date;
        END IF;
        
        IF v_max_date IS NULL OR v_date_record.period_date > v_max_date THEN
          v_max_date := v_date_record.period_date;
        END IF;
      END IF;
    END LOOP;
    
    -- Return results for this business profile if any periods were created
    IF v_periods_created > 0 THEN
      RETURN QUERY SELECT 
        v_business_profile.id,
        v_periods_created,
        v_min_date::TEXT || ' to ' || v_max_date::TEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- ============================================================================
-- 6. Add helper function to check if financial events exist for a period
-- ============================================================================

CREATE OR REPLACE FUNCTION has_financial_events(
  p_business_profile_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_has_events BOOLEAN;
BEGIN
  -- Calculate period boundaries
  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + INTERVAL '1 month - 1 day')::DATE;
  
  -- Check for invoices
  SELECT EXISTS (
    SELECT 1 FROM invoices
    WHERE business_profile_id = p_business_profile_id
      AND issue_date >= v_period_start
      AND issue_date <= v_period_end
  ) INTO v_has_events;
  
  IF v_has_events THEN
    RETURN TRUE;
  END IF;
  
  -- Check for expenses
  SELECT EXISTS (
    SELECT 1 FROM expenses
    WHERE business_profile_id = p_business_profile_id
      AND COALESCE(expense_date, created_at::DATE) >= v_period_start
      AND COALESCE(expense_date, created_at::DATE) <= v_period_end
  ) INTO v_has_events;
  
  RETURN v_has_events;
END;
$$;

-- ============================================================================
-- 7. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION ensure_accounting_period(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_missing_accounting_periods() TO authenticated;
GRANT EXECUTE ON FUNCTION has_financial_events(UUID, INTEGER, INTEGER) TO authenticated;

-- ============================================================================
-- 8. Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION ensure_accounting_period(UUID, DATE) IS 
'Idempotent function to ensure an accounting period exists for a given business and date. 
Called automatically by triggers on financial events (invoices, expenses, etc.)';

COMMENT ON FUNCTION backfill_missing_accounting_periods() IS 
'One-time backfill function to create missing accounting periods for existing financial events. 
Returns the number of periods created per business profile.';

COMMENT ON FUNCTION has_financial_events(UUID, INTEGER, INTEGER) IS 
'Check if any financial events exist for a given business profile and period.
Used by UI to determine zero-state vs normal state.';

COMMENT ON CONSTRAINT accounting_periods_business_year_month_unique ON accounting_periods IS 
'Ensures only one accounting period exists per business profile per month.
Enables idempotent auto-provisioning.';
