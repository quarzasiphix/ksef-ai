-- ============================================
-- UPDATE: CLOSE ACCOUNTING EVENT WITH POSTING RULES
-- ============================================
-- Replaces manual account selection with rule-based multi-line posting

CREATE OR REPLACE FUNCTION close_accounting_event(
  p_event_id UUID,
  p_actor_id UUID,
  p_actor_name TEXT,
  p_posting_rule_id UUID DEFAULT NULL,
  p_debit_account_code TEXT DEFAULT NULL,
  p_credit_account_code TEXT DEFAULT NULL,
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
  v_rule posting_rules%ROWTYPE;
  v_line RECORD;
  v_amount DECIMAL(15,2);
  v_net_amount DECIMAL(15,2);
  v_vat_amount DECIMAL(15,2);
  v_gross_amount DECIMAL(15,2);
BEGIN
  -- Get event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found');
  END IF;
  
  -- Get readiness
  SELECT * INTO v_readiness FROM get_event_posting_readiness(p_event_id);
  
  IF v_readiness.is_closed THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event already closed');
  END IF;
  
  -- Determine period
  v_period_year := EXTRACT(YEAR FROM v_event.event_date);
  v_period_month := EXTRACT(MONTH FROM v_event.event_date);
  v_period := v_period_year || '-' || LPAD(v_period_month::TEXT, 2, '0');
  
  -- Calculate amounts (handle VAT if present)
  v_gross_amount := v_event.amount;
  v_vat_amount := COALESCE((v_event.metadata->>'vat_amount')::DECIMAL, 0);
  v_net_amount := v_gross_amount - v_vat_amount;
  
  -- Create journal entry header
  INSERT INTO gl_journal_entries (
    business_profile_id,
    event_id,
    period,
    entry_date,
    description,
    status,
    posted_at,
    posted_by
  ) VALUES (
    v_event.business_profile_id,
    p_event_id,
    v_period,
    v_event.event_date,
    'Event: ' || v_event.event_type || ' - ' || COALESCE(v_event.description, ''),
    'posted',
    NOW(),
    p_actor_id
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Expand posting rule into journal lines
  IF p_posting_rule_id IS NOT NULL THEN
    -- Get rule
    SELECT * INTO v_rule FROM posting_rules WHERE id = p_posting_rule_id;
    
    IF v_rule.id IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Posting rule not found');
    END IF;
    
    -- Create lines from rule
    FOR v_line IN 
      SELECT * FROM posting_rule_lines 
      WHERE posting_rule_id = p_posting_rule_id 
      ORDER BY line_order
    LOOP
      -- Calculate amount based on type
      CASE v_line.amount_type
        WHEN 'gross' THEN v_amount := v_gross_amount;
        WHEN 'net' THEN v_amount := v_net_amount;
        WHEN 'vat' THEN v_amount := v_vat_amount;
        WHEN 'fixed' THEN v_amount := v_line.fixed_amount;
        ELSE v_amount := v_gross_amount; -- default
      END CASE;
      
      -- Insert journal line
      INSERT INTO gl_journal_lines (
        journal_entry_id,
        account_id,
        account_code,
        debit,
        credit,
        description
      )
      SELECT 
        v_journal_entry_id,
        ca.id,
        ca.code,
        CASE WHEN v_line.side = 'debit' THEN v_amount ELSE 0 END,
        CASE WHEN v_line.side = 'credit' THEN v_amount ELSE 0 END,
        COALESCE(v_line.description, ca.name)
      FROM chart_accounts ca
      WHERE ca.code = v_line.account_code
        AND ca.business_profile_id = v_event.business_profile_id;
    END LOOP;
    
  ELSE
    -- Manual mode: use provided debit/credit accounts (legacy 2-line posting)
    IF p_debit_account_code IS NULL OR p_credit_account_code IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Either posting_rule_id or both debit/credit accounts required');
    END IF;
    
    -- Insert debit line
    INSERT INTO gl_journal_lines (journal_entry_id, account_id, account_code, debit, credit, description)
    SELECT v_journal_entry_id, ca.id, ca.code, v_gross_amount, 0, ca.name
    FROM chart_accounts ca
    WHERE ca.code = p_debit_account_code AND ca.business_profile_id = v_event.business_profile_id;
    
    -- Insert credit line
    INSERT INTO gl_journal_lines (journal_entry_id, account_id, account_code, debit, credit, description)
    SELECT v_journal_entry_id, ca.id, ca.code, 0, v_gross_amount, ca.name
    FROM chart_accounts ca
    WHERE ca.code = p_credit_account_code AND ca.business_profile_id = v_event.business_profile_id;
  END IF;
  
  -- Verify journal entry balance
  PERFORM verify_journal_entry_balance(v_journal_entry_id);
  
  -- Update event metadata with journal entry ID
  UPDATE events
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::JSONB),
    '{journal_entry_id}',
    to_jsonb(v_journal_entry_id)
  )
  WHERE id = p_event_id;
  
  -- Log closure event
  INSERT INTO event_log (
    event_id,
    actor_id,
    actor_name,
    action,
    details
  ) VALUES (
    p_event_id,
    p_actor_id,
    p_actor_name,
    'closed',
    jsonb_build_object(
      'journal_entry_id', v_journal_entry_id,
      'posting_rule_id', p_posting_rule_id,
      'period', v_period,
      'amount', v_gross_amount
    )
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'journal_entry_id', v_journal_entry_id,
    'period', v_period,
    'closed_at', NOW()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION close_accounting_event IS 'Close an accounting event and create journal entry. Supports both rule-based (multi-line) and manual (2-line) posting.';

GRANT EXECUTE ON FUNCTION close_accounting_event TO authenticated;
