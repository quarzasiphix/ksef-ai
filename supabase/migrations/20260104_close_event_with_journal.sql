-- ============================================
-- UPDATE: CLOSE ACCOUNTING EVENT WITH JOURNAL ENTRY
-- ============================================
-- When closing an event, create journal entry + lines
-- This implements the Wn/Ma accounting interpretation layer

CREATE OR REPLACE FUNCTION close_accounting_event(
  p_event_id UUID,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_debit_account_code TEXT,
  p_credit_account_code TEXT,
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
  v_period TEXT;
  v_journal_entry_id UUID;
  v_debit_account_id UUID;
  v_credit_account_id UUID;
  v_amount DECIMAL(15,2);
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
  
  -- Validate accounts provided
  IF p_debit_account_code IS NULL OR p_credit_account_code IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Both debit and credit accounts must be provided'
    );
  END IF;
  
  -- Get account IDs
  SELECT id INTO v_debit_account_id
  FROM chart_accounts
  WHERE business_profile_id = v_event.business_profile_id
    AND code = p_debit_account_code
    AND is_active = TRUE;
  
  SELECT id INTO v_credit_account_id
  FROM chart_accounts
  WHERE business_profile_id = v_event.business_profile_id
    AND code = p_credit_account_code
    AND is_active = TRUE;
  
  IF v_debit_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Debit account not found or inactive: ' || p_debit_account_code
    );
  END IF;
  
  IF v_credit_account_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Credit account not found or inactive: ' || p_credit_account_code
    );
  END IF;
  
  -- Get amount (must be positive)
  v_amount := ABS(COALESCE(v_event.amount, 0));
  
  IF v_amount = 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event amount is zero - cannot create journal entry'
    );
  END IF;
  
  -- Determine period (use occurred_at if not set)
  v_period_year := COALESCE(v_readiness.period_year, EXTRACT(YEAR FROM v_event.occurred_at)::INT);
  v_period_month := COALESCE(v_readiness.period_month, EXTRACT(MONTH FROM v_event.occurred_at)::INT);
  v_period := v_period_year || '-' || LPAD(v_period_month::TEXT, 2, '0');
  
  -- Create payload snapshot (immutable record of event state at close time)
  v_snapshot := jsonb_build_object(
    'event_id', v_event.id,
    'event_type', v_event.event_type,
    'entity_type', v_event.entity_type,
    'entity_id', v_event.entity_id,
    'entity_reference', v_event.entity_reference,
    'occurred_at', v_event.occurred_at,
    'amount', v_amount,
    'currency', v_event.currency,
    'direction', v_event.direction,
    'debit_account', p_debit_account_code,
    'credit_account', p_credit_account_code,
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
  
  -- Create journal entry (header)
  INSERT INTO gl_journal_entries (
    business_profile_id,
    event_id,
    period,
    entry_date,
    description,
    status,
    posted_at,
    posted_by,
    created_by
  )
  VALUES (
    v_event.business_profile_id,
    v_event.id,
    v_period,
    v_event.occurred_at::DATE,
    v_event.action_summary,
    'posted',
    NOW(),
    p_actor_id,
    p_actor_id
  )
  RETURNING id INTO v_journal_entry_id;
  
  -- Create journal lines (Wn/Ma)
  -- Debit line (Wn)
  INSERT INTO gl_journal_lines (
    journal_entry_id,
    account_id,
    account_code,
    debit,
    credit,
    description
  )
  VALUES (
    v_journal_entry_id,
    v_debit_account_id,
    p_debit_account_code,
    v_amount,
    NULL,
    'Wn: ' || v_event.action_summary
  );
  
  -- Credit line (Ma)
  INSERT INTO gl_journal_lines (
    journal_entry_id,
    account_id,
    account_code,
    debit,
    credit,
    description
  )
  VALUES (
    v_journal_entry_id,
    v_credit_account_id,
    p_credit_account_code,
    NULL,
    v_amount,
    'Ma: ' || v_event.action_summary
  );
  
  -- Update event metadata
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
      ),
      '{journal_entry_id}', to_jsonb(v_journal_entry_id)
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
      'journal_entry_id', v_journal_entry_id,
      'debit_account', p_debit_account_code,
      'credit_account', p_credit_account_code,
      'bypass_reason', p_bypass_reason
    )
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'event_hash', v_event_hash,
    'journal_entry_id', v_journal_entry_id,
    'closed_at', NOW(),
    'period', jsonb_build_object('year', v_period_year, 'month', v_period_month)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION close_accounting_event IS 'Close accounting event and create journal entry with Wn/Ma lines. Implements double-entry bookkeeping.';

GRANT EXECUTE ON FUNCTION close_accounting_event TO authenticated;
