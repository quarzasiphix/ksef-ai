-- ============================================
-- MOCK KSEF BYPASS FOR DEVELOPMENT
-- ============================================
-- Temporarily removes KSeF requirement from posting readiness
-- This allows testing event closure workflow without KSeF integration

-- Update events_posting_readiness view to remove KSeF blocker
CREATE OR REPLACE VIEW events_posting_readiness AS
SELECT
  e.id AS event_id,
  e.business_profile_id,
  e.event_type,
  e.entity_type,
  e.entity_id,
  e.action_summary,
  e.occurred_at,
  e.amount,
  e.currency,
  e.status,
  
  -- Period info
  (e.metadata->>'period_year')::INT AS period_year,
  (e.metadata->>'period_month')::INT AS period_month,
  (e.metadata->>'period_locked')::BOOLEAN AS period_locked,
  
  -- Posting status
  COALESCE(e.metadata->>'debit_account', '') AS debit_account,
  COALESCE(e.metadata->>'credit_account', '') AS credit_account,
  e.posted,
  
  -- Closure status
  COALESCE((e.metadata->>'is_closed')::BOOLEAN, FALSE) AS is_closed,
  e.metadata->>'closed_at' AS closed_at,
  e.metadata->>'closed_by' AS closed_by,
  
  -- Verification status
  COALESCE((e.metadata->>'verified')::BOOLEAN, FALSE) AS verified,
  e.metadata->>'verified_at' AS verified_at,
  e.metadata->>'verified_by' AS verified_by,
  e.metadata->>'verification_method' AS verification_method,
  
  -- Proof indicators
  COALESCE(e.metadata->>'event_hash', '') AS event_hash,
  COALESCE(e.metadata->>'bank_transaction_id', '') AS bank_transaction_id,
  COALESCE(e.metadata->>'ksef_reference_number', '') AS ksef_reference_number,
  COALESCE(e.metadata->>'decision_id', '') AS decision_id,
  
  -- Commit binding
  e.included_in_commit_id,
  e.included_in_digest,
  
  -- Gating logic: Missing accounts
  CASE
    WHEN COALESCE(e.metadata->>'debit_account', '') = '' THEN TRUE
    WHEN COALESCE(e.metadata->>'credit_account', '') = '' THEN TRUE
    ELSE FALSE
  END AS missing_accounts,
  
  -- Gating logic: Missing required links
  CASE
    WHEN e.entity_type IN ('invoice', 'expense') AND e.entity_id IS NULL THEN TRUE
    WHEN e.event_type LIKE '%_from_operation' AND e.metadata->>'operation_id' IS NULL THEN TRUE
    ELSE FALSE
  END AS missing_required_links,
  
  -- Gating logic: Missing required proof (KSEF BYPASSED FOR NOW)
  CASE
    -- MOCK: Removed KSeF requirement temporarily
    -- WHEN e.direction = 'incoming' AND e.amount > 15000 AND e.metadata->>'ksef_reference_number' IS NULL THEN TRUE
    WHEN e.cash_channel = 'bank' AND e.metadata->>'bank_transaction_id' IS NULL THEN TRUE
    ELSE FALSE
  END AS missing_required_proof,
  
  -- Gating logic: Can close?
  CASE
    WHEN COALESCE((e.metadata->>'is_closed')::BOOLEAN, FALSE) = TRUE THEN FALSE  -- Already closed
    WHEN COALESCE((e.metadata->>'period_locked')::BOOLEAN, FALSE) = TRUE THEN FALSE  -- Period locked
    WHEN COALESCE(e.metadata->>'debit_account', '') = '' THEN FALSE  -- Missing Wn
    WHEN COALESCE(e.metadata->>'credit_account', '') = '' THEN FALSE  -- Missing Ma
    ELSE TRUE
  END AS can_close,
  
  -- Gating logic: Can verify?
  CASE
    WHEN COALESCE((e.metadata->>'verified')::BOOLEAN, FALSE) = TRUE THEN FALSE  -- Already verified
    WHEN COALESCE((e.metadata->>'is_closed')::BOOLEAN, FALSE) = FALSE THEN FALSE  -- Not closed yet
    WHEN COALESCE(e.metadata->>'event_hash', '') = '' THEN FALSE  -- No hash to verify
    ELSE TRUE
  END AS can_verify,
  
  -- Blocker reasons (for UI display) - KSEF blocker removed
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(e.metadata->>'debit_account', '') = '' THEN 'missing_debit_account' END,
    CASE WHEN COALESCE(e.metadata->>'credit_account', '') = '' THEN 'missing_credit_account' END,
    CASE WHEN e.entity_type IN ('invoice', 'expense') AND e.entity_id IS NULL THEN 'missing_entity_link' END,
    CASE WHEN e.event_type LIKE '%_from_operation' AND e.metadata->>'operation_id' IS NULL THEN 'missing_operation_link' END,
    -- MOCK: Removed KSeF blocker
    -- CASE WHEN e.direction = 'incoming' AND e.amount > 15000 AND e.metadata->>'ksef_reference_number' IS NULL THEN 'missing_ksef_proof' END,
    CASE WHEN e.cash_channel = 'bank' AND e.metadata->>'bank_transaction_id' IS NULL THEN 'missing_bank_proof' END,
    CASE WHEN COALESCE((e.metadata->>'period_locked')::BOOLEAN, FALSE) = TRUE THEN 'period_locked' END
  ], NULL) AS blocker_reasons

FROM events e
WHERE e.is_reversed = FALSE;

COMMENT ON VIEW events_posting_readiness IS 'MOCK VERSION: KSeF requirement temporarily bypassed for development. Single source of truth for event posting readiness.';

-- Grant access
GRANT SELECT ON events_posting_readiness TO authenticated;

-- ============================================
-- MOCK KSEF FUNCTIONS
-- ============================================

-- Mock function to add KSeF reference (for testing)
CREATE OR REPLACE FUNCTION mock_add_ksef_reference(
  p_event_id UUID,
  p_ksef_reference TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_mock_ref TEXT;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event not found'
    );
  END IF;
  
  -- Generate mock KSeF reference if not provided
  v_mock_ref := COALESCE(
    p_ksef_reference,
    'MOCK-KSEF-' || to_char(NOW(), 'YYYYMMDD') || '-' || substring(gen_random_uuid()::TEXT, 1, 8)
  );
  
  -- Update event metadata
  UPDATE events
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::JSONB),
    '{ksef_reference_number}',
    to_jsonb(v_mock_ref)
  )
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'ksef_reference_number', v_mock_ref,
    'message', 'Mock KSeF reference added (for development only)'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mock_add_ksef_reference IS 'MOCK: Add fake KSeF reference for development/testing. Remove in production.';

-- ============================================
-- HELPER: Auto-add mock KSeF to all events
-- ============================================

CREATE OR REPLACE FUNCTION mock_ksef_all_events(
  p_business_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Add mock KSeF reference to all events without one
  FOR v_event_id IN
    SELECT id FROM events
    WHERE business_profile_id = p_business_profile_id
      AND direction = 'incoming'
      AND amount > 15000
      AND (metadata->>'ksef_reference_number' IS NULL OR metadata->>'ksef_reference_number' = '')
  LOOP
    PERFORM mock_add_ksef_reference(v_event_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'events_updated', v_count,
    'message', 'Mock KSeF references added to ' || v_count || ' events'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mock_ksef_all_events IS 'MOCK: Bulk add fake KSeF references for development. Remove in production.';

-- ============================================
-- IMPORTANT NOTE
-- ============================================
-- This migration is for DEVELOPMENT ONLY
-- Before production:
-- 1. Remove this migration
-- 2. Restore original events_posting_readiness view with KSeF checks
-- 3. Implement real KSeF integration
-- 4. Drop mock_add_ksef_reference and mock_ksef_all_events functions
