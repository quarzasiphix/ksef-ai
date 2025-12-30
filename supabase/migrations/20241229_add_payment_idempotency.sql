-- ============================================================================
-- Phase 2.5: Payment Idempotency Protection
-- ============================================================================
-- Migration: Add uniqueness constraint to prevent duplicate payment events
-- Date: 2024-12-29
-- 
-- Problem: payment_recorded events can be inserted multiple times (webhook replays,
-- retries), causing paid_amount to drift above invoice_total.
--
-- Solution: Enforce uniqueness on (entity_type, entity_id, correlation_id, event_type)
-- for payment events where correlation_id is the external payment provider ID.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add partial unique index for payment idempotency
-- ============================================================================

-- Prevent duplicate payment_recorded events for the same correlation_id
-- This ensures Stripe payment_intent_id, bank txn_id, etc. can only be recorded once
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_payment_idempotency
  ON public.events (entity_type, entity_id, correlation_id, event_type)
  WHERE event_type IN ('payment_recorded', 'payment_reversed')
    AND correlation_id IS NOT NULL;

COMMENT ON INDEX idx_events_payment_idempotency IS
'Idempotency constraint: prevents duplicate payment events with same correlation_id.
correlation_id should be: Stripe payment_intent_id, bank txn_id, or internal payment UUID.
Partial index only applies to payment events with non-null correlation_id.';

-- ============================================================================
-- STEP 2: Add helper function to validate payment idempotency
-- ============================================================================

CREATE OR REPLACE FUNCTION check_payment_idempotency(
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_correlation_id TEXT,
  p_event_type event_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if payment event already exists
  RETURN EXISTS(
    SELECT 1 FROM public.events
    WHERE entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND correlation_id = p_correlation_id
      AND event_type = p_event_type
  );
END;
$$;

COMMENT ON FUNCTION check_payment_idempotency IS
'Helper function to check if a payment event already exists before insertion.
Returns TRUE if duplicate, FALSE if safe to insert.
Use in application layer: IF check_payment_idempotency(...) THEN skip ELSE insert.';

-- ============================================================================
-- STEP 3: Verify existing events for potential duplicates
-- ============================================================================

DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  -- Check for existing duplicate payment events (should be 0 if clean)
  SELECT COUNT(*)
  INTO v_duplicate_count
  FROM (
    SELECT entity_type, entity_id, correlation_id, event_type, COUNT(*) as cnt
    FROM public.events
    WHERE event_type IN ('payment_recorded', 'payment_reversed')
      AND correlation_id IS NOT NULL
    GROUP BY entity_type, entity_id, correlation_id, event_type
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF v_duplicate_count > 0 THEN
    RAISE WARNING 'Found % duplicate payment events with same correlation_id. Review before Phase 3.', v_duplicate_count;
  ELSE
    RAISE NOTICE 'No duplicate payment events found. Idempotency constraint is safe.';
  END IF;
END $$;

-- ============================================================================
-- Migration complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Phase 2.5 Migration Complete: Payment Idempotency Protection';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Unique index created: idx_events_payment_idempotency';
  RAISE NOTICE 'Helper function created: check_payment_idempotency()';
  RAISE NOTICE 'Payment events now protected from duplicate insertion';
  RAISE NOTICE 'Next: Phase 3 - Implement cmd_payment_record with this constraint';
  RAISE NOTICE '=================================================================';
END $$;
