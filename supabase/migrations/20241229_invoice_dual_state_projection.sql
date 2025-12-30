-- ============================================================================
-- Phase 2: Invoice Dual-State Projection
-- ============================================================================
-- Migration: Add dual-state columns to invoices and create projection trigger
-- Date: 2024-12-29
-- 
-- Goal: Make invoices a fast projection of event truth
-- - events remains immutable source of truth
-- - invoices stores minimal snapshot fields for UI/list queries
-- - snapshots updated via AFTER INSERT ON events trigger
--
-- Design decisions:
-- - accounting_state derived ONLY from event_type (not from events.posted)
-- - economic_state derived from paid_amount vs total_gross_value
-- - UPPERCASE state values for consistency
-- - Backfill uses events first, legacy fields as fallback
-- ============================================================================

-- ============================================================================
-- STEP 0: Temporarily disable conflicting triggers
-- ============================================================================

-- Disable auto_log_invoice_event trigger that references OLD.status (which doesn't exist)
DROP TRIGGER IF EXISTS trigger_auto_log_invoice_event ON public.invoices;

-- ============================================================================
-- STEP 1: Add dual-state columns with defaults
-- ============================================================================

ALTER TABLE public.invoices
  -- Economic state (payment lifecycle)
  ADD COLUMN IF NOT EXISTS economic_state TEXT DEFAULT 'DRAFT',
  
  -- Accounting state (approval/posting lifecycle)
  ADD COLUMN IF NOT EXISTS accounting_state TEXT DEFAULT 'UNAPPROVED',
  
  -- Payment tracking
  ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0,
  
  -- Lifecycle timestamps
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_decision_id UUID,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS posted_by UUID,
  ADD COLUMN IF NOT EXISTS posting_ref TEXT;

-- Ensure currency is always set (it has default 'PLN' but nullable)
ALTER TABLE public.invoices
  ALTER COLUMN currency SET DEFAULT 'PLN',
  ALTER COLUMN currency SET NOT NULL;

-- Update any NULL currencies to PLN
UPDATE public.invoices
SET currency = 'PLN'
WHERE currency IS NULL;

COMMENT ON COLUMN public.invoices.economic_state IS 'Payment lifecycle state: DRAFT, ISSUED, DUE, OVERDUE, PARTIALLY_PAID, PAID, CANCELLED';
COMMENT ON COLUMN public.invoices.accounting_state IS 'Accounting lifecycle state: UNAPPROVED, APPROVED, POSTED, REVERSED';
COMMENT ON COLUMN public.invoices.paid_amount IS 'Total amount paid against this invoice (sum of payment_recorded events)';
COMMENT ON COLUMN public.invoices.issued_at IS 'When invoice was issued (from invoice_issued event)';
COMMENT ON COLUMN public.invoices.approved_at IS 'When invoice was approved (from invoice_approved event)';
COMMENT ON COLUMN public.invoices.approved_by IS 'User who approved invoice';
COMMENT ON COLUMN public.invoices.approved_decision_id IS 'Decision that authorized approval';
COMMENT ON COLUMN public.invoices.posted_at IS 'When invoice was posted to GL (from invoice_posted event)';
COMMENT ON COLUMN public.invoices.posted_by IS 'User who posted invoice';
COMMENT ON COLUMN public.invoices.posting_ref IS 'GL posting reference';

-- ============================================================================
-- STEP 2: Add check constraints
-- ============================================================================

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_economic_state_check
    CHECK (economic_state IN ('DRAFT', 'ISSUED', 'DUE', 'OVERDUE', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')),
  
  ADD CONSTRAINT invoices_accounting_state_check
    CHECK (accounting_state IN ('UNAPPROVED', 'APPROVED', 'POSTED', 'REVERSED')),
  
  ADD CONSTRAINT invoices_paid_amount_check
    CHECK (paid_amount >= 0);

-- ============================================================================
-- STEP 3: Create projection trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_invoice_projection_from_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice_total NUMERIC;
  v_new_economic_state TEXT;
  v_due_date DATE;
BEGIN
  -- Only process invoice-related events
  IF NEW.entity_type != 'invoice' OR NEW.entity_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get invoice total and due date for economic state calculations
  SELECT total_gross_value, due_date
  INTO v_invoice_total, v_due_date
  FROM public.invoices
  WHERE id = NEW.entity_id::UUID;

  -- If invoice doesn't exist, skip (shouldn't happen in normal flow)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Process event based on type
  CASE NEW.event_type
    
    -- ========================================================================
    -- INVOICE_CREATED: Initialize states
    -- ========================================================================
    WHEN 'invoice_created' THEN
      UPDATE public.invoices
      SET 
        economic_state = 'DRAFT',
        accounting_state = 'UNAPPROVED'
      WHERE id = NEW.entity_id::UUID;
    
    -- ========================================================================
    -- INVOICE_ISSUED: Mark as issued, set timestamp
    -- ========================================================================
    WHEN 'invoice_issued' THEN
      UPDATE public.invoices
      SET 
        economic_state = 'ISSUED',
        issued_at = NEW.occurred_at
      WHERE id = NEW.entity_id::UUID;
    
    -- ========================================================================
    -- INVOICE_APPROVED: Update accounting state, capture approval metadata
    -- ========================================================================
    WHEN 'invoice_approved' THEN
      UPDATE public.invoices
      SET 
        accounting_state = 'APPROVED',
        approved_at = NEW.occurred_at,
        approved_by = NEW.actor_id::UUID,
        approved_decision_id = NEW.decision_id::UUID
      WHERE id = NEW.entity_id::UUID;
    
    -- ========================================================================
    -- INVOICE_POSTED: Mark as posted to GL
    -- ========================================================================
    WHEN 'invoice_posted' THEN
      UPDATE public.invoices
      SET 
        accounting_state = 'POSTED',
        posted_at = NEW.occurred_at,
        posted_by = NEW.actor_id::UUID,
        posting_ref = COALESCE(NEW.metadata->>'posting_ref', NEW.id::TEXT)
      WHERE id = NEW.entity_id::UUID;
    
    -- ========================================================================
    -- INVOICE_REVERSED: Mark accounting as reversed
    -- ========================================================================
    WHEN 'invoice_reversed' THEN
      UPDATE public.invoices
      SET 
        accounting_state = 'REVERSED'
      WHERE id = NEW.entity_id::UUID;
    
    -- ========================================================================
    -- PAYMENT_RECORDED: Increment paid_amount, recalculate economic state
    -- ========================================================================
    WHEN 'payment_recorded' THEN
      -- Increment paid_amount
      UPDATE public.invoices
      SET paid_amount = paid_amount + COALESCE(NEW.amount, 0)
      WHERE id = NEW.entity_id::UUID
      RETURNING paid_amount INTO v_invoice_total; -- Reuse variable for new paid amount
      
      -- Recalculate economic state based on payment progress
      IF v_invoice_total = 0 THEN
        -- No payment yet - check if overdue
        IF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
          v_new_economic_state := 'OVERDUE';
        ELSE
          v_new_economic_state := 'DUE';
        END IF;
      ELSIF v_invoice_total >= (SELECT total_gross_value FROM public.invoices WHERE id = NEW.entity_id::UUID) THEN
        -- Fully paid
        v_new_economic_state := 'PAID';
      ELSE
        -- Partially paid
        v_new_economic_state := 'PARTIALLY_PAID';
      END IF;
      
      UPDATE public.invoices
      SET economic_state = v_new_economic_state
      WHERE id = NEW.entity_id::UUID;
    
    -- ========================================================================
    -- PAYMENT_REVERSED: Decrement paid_amount, recalculate economic state
    -- ========================================================================
    WHEN 'payment_reversed' THEN
      -- Decrement paid_amount
      UPDATE public.invoices
      SET paid_amount = GREATEST(0, paid_amount - COALESCE(NEW.amount, 0))
      WHERE id = NEW.entity_id::UUID
      RETURNING paid_amount INTO v_invoice_total;
      
      -- Recalculate economic state
      IF v_invoice_total = 0 THEN
        IF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
          v_new_economic_state := 'OVERDUE';
        ELSE
          v_new_economic_state := 'DUE';
        END IF;
      ELSIF v_invoice_total >= (SELECT total_gross_value FROM public.invoices WHERE id = NEW.entity_id::UUID) THEN
        v_new_economic_state := 'PAID';
      ELSE
        v_new_economic_state := 'PARTIALLY_PAID';
      END IF;
      
      UPDATE public.invoices
      SET economic_state = v_new_economic_state
      WHERE id = NEW.entity_id::UUID;
    
    ELSE
      -- Other event types don't affect invoice projection
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_invoice_projection_from_event() IS 
'Projection trigger: Updates invoice snapshot fields based on events. 
Triggered AFTER INSERT ON events for entity_type=invoice.
Design: accounting_state derived from event_type only (ignores events.posted).';

-- ============================================================================
-- STEP 4: Create trigger on events table
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_invoice_projection ON public.events;

CREATE TRIGGER trigger_update_invoice_projection
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_projection_from_event();

COMMENT ON TRIGGER trigger_update_invoice_projection ON public.events IS
'Maintains invoice projection: updates invoice dual-state fields after event inserts';

-- ============================================================================
-- STEP 5: Backfill existing invoices
-- ============================================================================
-- Strategy: Events first, legacy fields as fallback
-- Priority order:
-- 1. If events exist for invoice: compute from events
-- 2. Else: map from legacy invoice.status, invoice.is_paid
-- 3. Else: default to DRAFT/UNAPPROVED
-- ============================================================================

DO $$
DECLARE
  v_invoice_record RECORD;
  v_has_events BOOLEAN;
  v_has_issued_event BOOLEAN;
  v_has_approved_event BOOLEAN;
  v_has_posted_event BOOLEAN;
  v_has_reversed_event BOOLEAN;
  v_total_paid NUMERIC;
  v_economic_state TEXT;
  v_accounting_state TEXT;
  v_issued_at TIMESTAMPTZ;
  v_approved_at TIMESTAMPTZ;
  v_approved_by UUID;
  v_approved_decision_id UUID;
  v_posted_at TIMESTAMPTZ;
  v_posted_by UUID;
  v_posting_ref TEXT;
BEGIN
  RAISE NOTICE 'Starting invoice dual-state backfill...';
  
  FOR v_invoice_record IN 
    SELECT id, total_gross_value, due_date, lifecycle_status, is_paid, created_at
    FROM public.invoices
  LOOP
    -- Check if events exist for this invoice
    SELECT EXISTS(
      SELECT 1 FROM public.events 
      WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id
    ) INTO v_has_events;
    
    IF v_has_events THEN
      -- ====================================================================
      -- Path 1: Compute from events (preferred)
      -- ====================================================================
      
      -- Check for specific event types
      SELECT 
        EXISTS(SELECT 1 FROM public.events WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id AND event_type = 'invoice_issued'),
        EXISTS(SELECT 1 FROM public.events WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id AND event_type = 'invoice_approved'),
        EXISTS(SELECT 1 FROM public.events WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id AND event_type = 'invoice_posted'),
        EXISTS(SELECT 1 FROM public.events WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id AND event_type = 'invoice_reversed')
      INTO v_has_issued_event, v_has_approved_event, v_has_posted_event, v_has_reversed_event;
      
      -- Calculate total paid from payment events
      SELECT COALESCE(SUM(amount), 0)
      INTO v_total_paid
      FROM public.events
      WHERE entity_type = 'invoice' 
        AND entity_id::UUID = v_invoice_record.id 
        AND event_type = 'payment_recorded';
      
      -- Determine accounting_state from events
      IF v_has_reversed_event THEN
        v_accounting_state := 'REVERSED';
      ELSIF v_has_posted_event THEN
        v_accounting_state := 'POSTED';
      ELSIF v_has_approved_event THEN
        v_accounting_state := 'APPROVED';
      ELSE
        v_accounting_state := 'UNAPPROVED';
      END IF;
      
      -- Determine economic_state from payments
      IF v_has_issued_event THEN
        IF v_total_paid >= v_invoice_record.total_gross_value THEN
          v_economic_state := 'PAID';
        ELSIF v_total_paid > 0 THEN
          v_economic_state := 'PARTIALLY_PAID';
        ELSIF v_invoice_record.due_date IS NOT NULL AND v_invoice_record.due_date < CURRENT_DATE THEN
          v_economic_state := 'OVERDUE';
        ELSE
          v_economic_state := 'DUE';
        END IF;
      ELSE
        v_economic_state := 'DRAFT';
      END IF;
      
      -- Get timestamps from events
      SELECT occurred_at INTO v_issued_at
      FROM public.events
      WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id AND event_type = 'invoice_issued'
      ORDER BY occurred_at DESC LIMIT 1;
      
      SELECT occurred_at, actor_id::UUID, decision_id::UUID
      INTO v_approved_at, v_approved_by, v_approved_decision_id
      FROM public.events
      WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id AND event_type = 'invoice_approved'
      ORDER BY occurred_at DESC LIMIT 1;
      
      SELECT occurred_at, actor_id::UUID, COALESCE(metadata->>'posting_ref', id::TEXT)
      INTO v_posted_at, v_posted_by, v_posting_ref
      FROM public.events
      WHERE entity_type = 'invoice' AND entity_id::UUID = v_invoice_record.id AND event_type = 'invoice_posted'
      ORDER BY occurred_at DESC LIMIT 1;
      
    ELSE
      -- ====================================================================
      -- Path 2: Fallback to legacy invoice fields
      -- ====================================================================
      
      v_total_paid := 0;
      
      -- Map legacy lifecycle_status to accounting_state
      v_accounting_state := CASE v_invoice_record.lifecycle_status
        WHEN 'posted' THEN 'POSTED'
        WHEN 'approved' THEN 'APPROVED'
        WHEN 'reversed' THEN 'REVERSED'
        ELSE 'UNAPPROVED'
      END;
      
      -- Map is_paid to economic_state
      IF v_invoice_record.is_paid THEN
        v_economic_state := 'PAID';
      ELSE
        v_economic_state := 'ISSUED';
      END IF;
      
      -- Use created_at as fallback timestamp
      v_issued_at := v_invoice_record.created_at;
      v_approved_at := NULL;
      v_approved_by := NULL;
      v_approved_decision_id := NULL;
      v_posted_at := NULL;
      v_posted_by := NULL;
      v_posting_ref := NULL;
    END IF;
    
    -- Update invoice with computed values
    UPDATE public.invoices
    SET 
      economic_state = v_economic_state,
      accounting_state = v_accounting_state,
      paid_amount = v_total_paid,
      issued_at = v_issued_at,
      approved_at = v_approved_at,
      approved_by = v_approved_by,
      approved_decision_id = v_approved_decision_id,
      posted_at = v_posted_at,
      posted_by = v_posted_by,
      posting_ref = v_posting_ref
    WHERE id = v_invoice_record.id;
    
  END LOOP;
  
  RAISE NOTICE 'Invoice dual-state backfill complete';
END $$;

-- ============================================================================
-- STEP 6: Create indexes for common queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invoices_economic_state 
  ON public.invoices(economic_state);

CREATE INDEX IF NOT EXISTS idx_invoices_accounting_state 
  ON public.invoices(accounting_state);

CREATE INDEX IF NOT EXISTS idx_invoices_dual_state 
  ON public.invoices(economic_state, accounting_state);

CREATE INDEX IF NOT EXISTS idx_invoices_issued_at 
  ON public.invoices(issued_at) WHERE issued_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_posted_at 
  ON public.invoices(posted_at) WHERE posted_at IS NOT NULL;

COMMENT ON INDEX idx_invoices_dual_state IS 
'Composite index for filtering invoices by both economic and accounting state';

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Verify migration
DO $$
DECLARE
  v_total_invoices INTEGER;
  v_invoices_with_states INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_invoices FROM public.invoices;
  SELECT COUNT(*) INTO v_invoices_with_states 
  FROM public.invoices 
  WHERE economic_state IS NOT NULL AND accounting_state IS NOT NULL;
  
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Phase 2 Migration Complete: Invoice Dual-State Projection';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Total invoices: %', v_total_invoices;
  RAISE NOTICE 'Invoices with dual states: %', v_invoices_with_states;
  RAISE NOTICE 'Trigger created: trigger_update_invoice_projection';
  RAISE NOTICE 'Future invoice events will automatically update projection fields';
  RAISE NOTICE '=================================================================';
END $$;
