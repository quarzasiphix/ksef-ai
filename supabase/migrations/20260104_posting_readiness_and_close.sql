-- ============================================
-- POSTING READINESS & EVENT CLOSURE
-- ============================================
-- Implements the operational layer for month-end:
-- - Posting readiness view (gating logic)
-- - Close event RPC (policy enforcement)
-- - Verify event RPC (integrity checks)

-- ============================================
-- 1. POSTING READINESS VIEW
-- ============================================
-- Single source of truth for:
-- - Drawer button gating
-- - Posting tab filters
-- - Month-end blocker lists

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
  
  -- Gating logic: Missing required links (basic version, expand with policies later)
  CASE
    WHEN e.entity_type IN ('invoice', 'expense') AND e.entity_id IS NULL THEN TRUE
    WHEN e.event_type LIKE '%_from_operation' AND e.metadata->>'operation_id' IS NULL THEN TRUE
    ELSE FALSE
  END AS missing_required_links,
  
  -- Gating logic: Missing required proof (basic version, expand with policies later)
  CASE
    WHEN e.direction = 'incoming' AND e.amount > 15000 AND e.metadata->>'ksef_reference_number' IS NULL THEN TRUE
    WHEN e.cash_channel = 'bank' AND e.metadata->>'bank_transaction_id' IS NULL THEN TRUE
    ELSE FALSE
  END AS missing_required_proof,
  
  -- Gating logic: Can close?
  CASE
    WHEN COALESCE((e.metadata->>'is_closed')::BOOLEAN, FALSE) = TRUE THEN FALSE  -- Already closed
    WHEN COALESCE((e.metadata->>'period_locked')::BOOLEAN, FALSE) = TRUE THEN FALSE  -- Period locked
    WHEN COALESCE(e.metadata->>'debit_account', '') = '' THEN FALSE  -- Missing Wn
    WHEN COALESCE(e.metadata->>'credit_account', '') = '' THEN FALSE  -- Missing Ma
    -- Add more policy checks here as needed
    ELSE TRUE
  END AS can_close,
  
  -- Gating logic: Can verify?
  CASE
    WHEN COALESCE((e.metadata->>'verified')::BOOLEAN, FALSE) = TRUE THEN FALSE  -- Already verified
    WHEN COALESCE((e.metadata->>'is_closed')::BOOLEAN, FALSE) = FALSE THEN FALSE  -- Not closed yet
    WHEN COALESCE(e.metadata->>'event_hash', '') = '' THEN FALSE  -- No hash to verify
    ELSE TRUE
  END AS can_verify,
  
  -- Blocker reasons (for UI display)
  ARRAY_REMOVE(ARRAY[
    CASE WHEN COALESCE(e.metadata->>'debit_account', '') = '' THEN 'missing_debit_account' END,
    CASE WHEN COALESCE(e.metadata->>'credit_account', '') = '' THEN 'missing_credit_account' END,
    CASE WHEN e.entity_type IN ('invoice', 'expense') AND e.entity_id IS NULL THEN 'missing_entity_link' END,
    CASE WHEN e.event_type LIKE '%_from_operation' AND e.metadata->>'operation_id' IS NULL THEN 'missing_operation_link' END,
    CASE WHEN e.direction = 'incoming' AND e.amount > 15000 AND e.metadata->>'ksef_reference_number' IS NULL THEN 'missing_ksef_proof' END,
    CASE WHEN e.cash_channel = 'bank' AND e.metadata->>'bank_transaction_id' IS NULL THEN 'missing_bank_proof' END,
    CASE WHEN COALESCE((e.metadata->>'period_locked')::BOOLEAN, FALSE) = TRUE THEN 'period_locked' END
  ], NULL) AS blocker_reasons

FROM events e
WHERE e.is_reversed = FALSE;

COMMENT ON VIEW events_posting_readiness IS 'Single source of truth for event posting readiness. Used by drawer gating, posting tab filters, and month-end blocker lists.';

-- Grant access
GRANT SELECT ON events_posting_readiness TO authenticated;

-- ============================================
-- 2. CLOSE ACCOUNTING EVENT RPC
-- ============================================

CREATE OR REPLACE FUNCTION close_accounting_event(
  p_event_id UUID,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_bypass_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_readiness RECORD;
  v_event_hash TEXT;
  v_snapshot JSONB;
  v_period_year INT;
  v_period_month INT;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event not found'
    );
  END IF;
  
  -- Get readiness
  SELECT * INTO v_readiness FROM events_posting_readiness WHERE event_id = p_event_id;
  
  -- Check if already closed
  IF v_readiness.is_closed THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event already closed'
    );
  END IF;
  
  -- Check period lock
  IF v_readiness.period_locked AND p_bypass_reason IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Period is locked. Provide bypass reason if authorized.'
    );
  END IF;
  
  -- Check posting readiness (unless bypassed)
  IF NOT v_readiness.can_close AND p_bypass_reason IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event not ready to close',
      'blockers', v_readiness.blocker_reasons
    );
  END IF;
  
  -- Determine period (use occurred_at if not set)
  v_period_year := COALESCE(v_readiness.period_year, EXTRACT(YEAR FROM v_event.occurred_at)::INT);
  v_period_month := COALESCE(v_readiness.period_month, EXTRACT(MONTH FROM v_event.occurred_at)::INT);
  
  -- Create payload snapshot (immutable record of event state at close time)
  v_snapshot := jsonb_build_object(
    'event_id', v_event.id,
    'event_type', v_event.event_type,
    'entity_type', v_event.entity_type,
    'entity_id', v_event.entity_id,
    'entity_reference', v_event.entity_reference,
    'occurred_at', v_event.occurred_at,
    'amount', v_event.amount,
    'currency', v_event.currency,
    'direction', v_event.direction,
    'debit_account', v_readiness.debit_account,
    'credit_account', v_readiness.credit_account,
    'period_year', v_period_year,
    'period_month', v_period_month,
    'closed_at', NOW(),
    'closed_by', p_actor_name,
    'bypass_reason', p_bypass_reason
  );
  
  -- Generate event hash (SHA256 of canonical snapshot)
  v_event_hash := encode(
    digest(v_snapshot::TEXT, 'sha256'),
    'hex'
  );
  
  -- Update event
  UPDATE events
  SET 
    posted = TRUE,
    metadata = jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(metadata, '{}'::JSONB),
                  '{is_closed}', 'true'::JSONB
                ),
                '{closed_at}', to_jsonb(NOW())
              ),
              '{closed_by}', to_jsonb(p_actor_name)
            ),
            '{event_hash}', to_jsonb(v_event_hash)
          ),
          '{payload_snapshot}', v_snapshot
        ),
        '{period_year}', to_jsonb(v_period_year)
      ),
      '{period_month}', to_jsonb(v_period_month)
    )
  WHERE id = p_event_id;
  
  -- Log closure event (audit trail)
  INSERT INTO events (
    business_profile_id,
    event_type,
    actor_id,
    actor_name,
    entity_type,
    entity_id,
    action_summary,
    occurred_at,
    metadata
  )
  VALUES (
    v_event.business_profile_id,
    'event_closed',
    p_actor_id,
    p_actor_name,
    'event',
    v_event.id,
    'Closed event: ' || v_event.action_summary,
    NOW(),
    jsonb_build_object(
      'closed_event_id', v_event.id,
      'event_hash', v_event_hash,
      'bypass_reason', p_bypass_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'event_hash', v_event_hash,
    'closed_at', NOW(),
    'period', jsonb_build_object('year', v_period_year, 'month', v_period_month)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION close_accounting_event IS 'Close an accounting event with policy enforcement. Generates event_hash and payload_snapshot. Only mutation path for event closure.';

-- ============================================
-- 3. VERIFY EVENT INTEGRITY RPC
-- ============================================

CREATE OR REPLACE FUNCTION verify_event_integrity(
  p_event_id UUID,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_verification_method TEXT DEFAULT 'manual'
)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_readiness RECORD;
  v_stored_hash TEXT;
  v_computed_hash TEXT;
  v_snapshot JSONB;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event not found'
    );
  END IF;
  
  -- Get readiness
  SELECT * INTO v_readiness FROM events_posting_readiness WHERE event_id = p_event_id;
  
  -- Check if can verify
  IF NOT v_readiness.can_verify THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event cannot be verified',
      'reason', CASE
        WHEN v_readiness.verified THEN 'Already verified'
        WHEN NOT v_readiness.is_closed THEN 'Not closed yet'
        WHEN v_readiness.event_hash = '' THEN 'No hash to verify'
        ELSE 'Unknown reason'
      END
    );
  END IF;
  
  -- Get stored hash and snapshot
  v_stored_hash := v_event.metadata->>'event_hash';
  v_snapshot := v_event.metadata->'payload_snapshot';
  
  -- Recompute hash from snapshot
  v_computed_hash := encode(
    digest(v_snapshot::TEXT, 'sha256'),
    'hex'
  );
  
  -- Compare hashes
  IF v_stored_hash != v_computed_hash THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Hash mismatch - possible tampering',
      'stored_hash', v_stored_hash,
      'computed_hash', v_computed_hash
    );
  END IF;
  
  -- Mark as verified
  UPDATE events
  SET metadata = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          metadata,
          '{verified}', 'true'::JSONB
        ),
        '{verified_at}', to_jsonb(NOW())
      ),
      '{verified_by}', to_jsonb(p_actor_name)
    ),
    '{verification_method}', to_jsonb(p_verification_method)
  )
  WHERE id = p_event_id;
  
  -- Log verification event (audit trail)
  INSERT INTO events (
    business_profile_id,
    event_type,
    actor_id,
    actor_name,
    entity_type,
    entity_id,
    action_summary,
    occurred_at,
    metadata
  )
  VALUES (
    v_event.business_profile_id,
    'event_verified',
    p_actor_id,
    p_actor_name,
    'event',
    v_event.id,
    'Verified event: ' || v_event.action_summary,
    NOW(),
    jsonb_build_object(
      'verified_event_id', v_event.id,
      'event_hash', v_stored_hash,
      'verification_method', p_verification_method
    )
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'verified', TRUE,
    'event_hash', v_stored_hash,
    'verified_at', NOW(),
    'verification_method', p_verification_method
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_event_integrity IS 'Verify event integrity by recomputing hash from payload_snapshot. Marks event as verified if hash matches.';

-- ============================================
-- 4. HELPER: GET EVENT DETAIL FOR DRAWER
-- ============================================

CREATE OR REPLACE FUNCTION get_event_detail_for_drawer(
  p_event_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_readiness RECORD;
  v_linked_entity JSONB;
  v_linked_operation JSONB;
  v_linked_decision JSONB;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Event not found');
  END IF;
  
  -- Get readiness
  SELECT * INTO v_readiness FROM events_posting_readiness WHERE event_id = p_event_id;
  
  -- Get linked entity (invoice/expense/etc)
  IF v_event.entity_type = 'invoice' AND v_event.entity_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'type', 'invoice',
      'id', id,
      'number', invoice_number,
      'counterparty', counterparty_name,
      'total', total_amount
    ) INTO v_linked_entity
    FROM invoices
    WHERE id = v_event.entity_id;
  ELSIF v_event.entity_type = 'expense' AND v_event.entity_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'type', 'expense',
      'id', id,
      'description', description,
      'amount', amount
    ) INTO v_linked_entity
    FROM expenses
    WHERE id = v_event.entity_id;
  END IF;
  
  -- Get linked operation/job (if exists)
  IF v_event.metadata->>'operation_id' IS NOT NULL THEN
    SELECT jsonb_build_object(
      'type', 'operation',
      'id', id,
      'job_number', job_number,
      'status', status
    ) INTO v_linked_operation
    FROM operational_jobs
    WHERE id = (v_event.metadata->>'operation_id')::UUID;
  END IF;
  
  -- Get linked decision (if exists)
  IF v_event.metadata->>'decision_id' IS NOT NULL THEN
    SELECT jsonb_build_object(
      'type', 'decision',
      'id', id,
      'decision_number', decision_number,
      'title', title,
      'status', status
    ) INTO v_linked_decision
    FROM decisions
    WHERE id = (v_event.metadata->>'decision_id')::UUID;
  END IF;
  
  -- Return comprehensive event detail
  RETURN jsonb_build_object(
    'event', row_to_json(v_event),
    'readiness', row_to_json(v_readiness),
    'linked_entity', v_linked_entity,
    'linked_operation', v_linked_operation,
    'linked_decision', v_linked_decision
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_event_detail_for_drawer IS 'Get comprehensive event detail for Event Detail Drawer. Includes readiness, linked entities, operations, and decisions.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION close_accounting_event TO authenticated;
GRANT EXECUTE ON FUNCTION verify_event_integrity TO authenticated;
GRANT EXECUTE ON FUNCTION get_event_detail_for_drawer TO authenticated;
