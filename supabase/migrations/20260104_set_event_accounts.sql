-- ============================================
-- SET EVENT ACCOUNTS RPC
-- ============================================
-- Allows setting debit/credit accounts for an event before closing
-- Stores in events.metadata for persistence

CREATE OR REPLACE FUNCTION set_event_accounts(
  p_event_id UUID,
  p_debit_account_code TEXT,
  p_credit_account_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_event events%ROWTYPE;
  v_debit_account chart_accounts%ROWTYPE;
  v_credit_account chart_accounts%ROWTYPE;
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Event not found'
    );
  END IF;
  
  -- Validate debit account
  SELECT * INTO v_debit_account
  FROM chart_accounts
  WHERE business_profile_id = v_event.business_profile_id
    AND code = p_debit_account_code
    AND is_active = TRUE;
  
  IF v_debit_account.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Debit account not found or inactive: ' || p_debit_account_code
    );
  END IF;
  
  -- Validate credit account
  SELECT * INTO v_credit_account
  FROM chart_accounts
  WHERE business_profile_id = v_event.business_profile_id
    AND code = p_credit_account_code
    AND is_active = TRUE;
  
  IF v_credit_account.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Credit account not found or inactive: ' || p_credit_account_code
    );
  END IF;
  
  -- Update event metadata with account selections
  UPDATE events
  SET metadata = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(metadata, '{}'::JSONB),
          '{debit_account_id}', to_jsonb(v_debit_account.id)
        ),
        '{debit_account_code}', to_jsonb(v_debit_account.code)
      ),
      '{credit_account_id}', to_jsonb(v_credit_account.id)
    ),
    '{credit_account_code}', to_jsonb(v_credit_account.code)
  )
  WHERE id = p_event_id;
  
  -- Return success with updated readiness
  RETURN jsonb_build_object(
    'success', TRUE,
    'debit_account', jsonb_build_object(
      'id', v_debit_account.id,
      'code', v_debit_account.code,
      'name', v_debit_account.name
    ),
    'credit_account', jsonb_build_object(
      'id', v_credit_account.id,
      'code', v_credit_account.code,
      'name', v_credit_account.name
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_event_accounts IS 'Set debit and credit accounts for an event. Validates accounts belong to same profile and are active. Stores in event metadata.';

GRANT EXECUTE ON FUNCTION set_event_accounts TO authenticated;
