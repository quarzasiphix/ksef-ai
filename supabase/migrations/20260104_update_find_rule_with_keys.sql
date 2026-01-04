-- ============================================
-- UPDATE: FIND POSTING RULE WITH KEY RESOLUTION
-- ============================================
-- Enhanced to resolve account keys to actual accounts

CREATE OR REPLACE FUNCTION find_posting_rule(
  p_business_profile_id UUID,
  p_document_type TEXT,
  p_transaction_type TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_vat_scheme TEXT DEFAULT NULL,
  p_vat_rate DECIMAL DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
  rule_id UUID,
  rule_name TEXT,
  rule_code TEXT,
  description TEXT,
  lines JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id,
    pr.name,
    pr.rule_code,
    pr.description,
    jsonb_agg(
      jsonb_build_object(
        'line_order', prl.line_order,
        'side', prl.side,
        'account_code', COALESCE(
          (SELECT code FROM chart_accounts WHERE id = 
            CASE 
              WHEN prl.use_key_mapping THEN 
                resolve_account_key(p_business_profile_id, prl.account_key, p_department_id, p_project_id)
              ELSE 
                (SELECT id FROM chart_accounts WHERE code = prl.account_code AND business_profile_id = p_business_profile_id LIMIT 1)
            END
          ),
          prl.account_code
        ),
        'account_name', COALESCE(
          (SELECT name FROM chart_accounts WHERE id = 
            CASE 
              WHEN prl.use_key_mapping THEN 
                resolve_account_key(p_business_profile_id, prl.account_key, p_department_id, p_project_id)
              ELSE 
                (SELECT id FROM chart_accounts WHERE code = prl.account_code AND business_profile_id = p_business_profile_id LIMIT 1)
            END
          ),
          'Unknown'
        ),
        'account_key', prl.account_key,
        'use_key_mapping', prl.use_key_mapping,
        'amount_type', prl.amount_type,
        'amount_formula', prl.amount_formula,
        'fixed_amount', prl.fixed_amount,
        'description', prl.description
      ) ORDER BY prl.line_order
    ) as lines
  FROM posting_rules pr
  JOIN posting_rule_lines prl ON prl.posting_rule_id = pr.id
  WHERE pr.business_profile_id = p_business_profile_id
    AND pr.is_active = TRUE
    AND pr.document_type = p_document_type
    AND (pr.transaction_type IS NULL OR pr.transaction_type = p_transaction_type)
    AND (pr.payment_method IS NULL OR pr.payment_method = p_payment_method)
    AND (pr.vat_scheme IS NULL OR pr.vat_scheme = p_vat_scheme)
    AND (pr.vat_rate IS NULL OR pr.vat_rate = p_vat_rate)
    AND (pr.project_id IS NULL OR pr.project_id = p_project_id)
    AND (pr.department_id IS NULL OR pr.department_id = p_department_id)
  GROUP BY pr.id, pr.name, pr.rule_code, pr.description, pr.priority
  ORDER BY pr.priority ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_posting_rule IS 'Find posting rule and resolve account keys to actual accounts based on company mapping + department/project overrides.';

GRANT EXECUTE ON FUNCTION find_posting_rule TO authenticated;

-- ============================================
-- UPDATE: CLOSE ACCOUNTING EVENT WITH KEY RESOLUTION
-- ============================================

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
  v_journal_entry_id UUID;
  v_rule posting_rules%ROWTYPE;
  v_line RECORD;
  v_amount DECIMAL(15,2);
  v_net_amount DECIMAL(15,2);
  v_vat_amount DECIMAL(15,2);
  v_gross_amount DECIMAL(15,2);
  v_period TEXT;
  v_account_id UUID;
  v_account_code TEXT;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF v_event.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Event not found');
  END IF;
  
  v_period := EXTRACT(YEAR FROM v_event.event_date) || '-' || LPAD(EXTRACT(MONTH FROM v_event.event_date)::TEXT, 2, '0');
  v_gross_amount := v_event.amount;
  v_vat_amount := COALESCE((v_event.metadata->>'vat_amount')::DECIMAL, 0);
  v_net_amount := v_gross_amount - v_vat_amount;
  
  INSERT INTO gl_journal_entries (business_profile_id, event_id, period, entry_date, description, status, posted_at, posted_by)
  VALUES (v_event.business_profile_id, p_event_id, v_period, v_event.event_date, 'Event: ' || v_event.event_type, 'posted', NOW(), p_actor_id)
  RETURNING id INTO v_journal_entry_id;
  
  IF p_posting_rule_id IS NOT NULL THEN
    SELECT * INTO v_rule FROM posting_rules WHERE id = p_posting_rule_id;
    IF v_rule.id IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Posting rule not found');
    END IF;
    
    FOR v_line IN SELECT * FROM posting_rule_lines WHERE posting_rule_id = p_posting_rule_id ORDER BY line_order LOOP
      -- Calculate amount
      CASE v_line.amount_type
        WHEN 'gross' THEN v_amount := v_gross_amount;
        WHEN 'net' THEN v_amount := v_net_amount;
        WHEN 'vat' THEN v_amount := v_vat_amount;
        WHEN 'fixed' THEN v_amount := v_line.fixed_amount;
        ELSE v_amount := v_gross_amount;
      END CASE;
      
      -- Resolve account (key or code)
      IF v_line.use_key_mapping THEN
        v_account_id := resolve_account_key(
          v_event.business_profile_id, 
          v_line.account_key,
          (v_event.metadata->>'department_id')::UUID,
          (v_event.metadata->>'project_id')::UUID
        );
        
        IF v_account_id IS NULL THEN
          RETURN jsonb_build_object('success', FALSE, 'error', 'Account key ' || v_line.account_key || ' not mapped');
        END IF;
        
        SELECT code INTO v_account_code FROM chart_accounts WHERE id = v_account_id;
      ELSE
        SELECT id, code INTO v_account_id, v_account_code 
        FROM chart_accounts 
        WHERE code = v_line.account_code AND business_profile_id = v_event.business_profile_id 
        LIMIT 1;
      END IF;
      
      -- Insert journal line
      INSERT INTO gl_journal_lines (journal_entry_id, account_id, account_code, debit, credit, description)
      VALUES (
        v_journal_entry_id, 
        v_account_id, 
        v_account_code,
        CASE WHEN v_line.side = 'debit' THEN v_amount ELSE 0 END,
        CASE WHEN v_line.side = 'credit' THEN v_amount ELSE 0 END,
        COALESCE(v_line.description, (SELECT name FROM chart_accounts WHERE id = v_account_id))
      );
    END LOOP;
  ELSE
    -- Manual mode fallback
    IF p_debit_account_code IS NULL OR p_credit_account_code IS NULL THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'Either posting_rule_id or both debit/credit accounts required');
    END IF;
    
    INSERT INTO gl_journal_lines (journal_entry_id, account_id, account_code, debit, credit, description)
    SELECT v_journal_entry_id, ca.id, ca.code, v_gross_amount, 0, ca.name
    FROM chart_accounts ca WHERE ca.code = p_debit_account_code AND ca.business_profile_id = v_event.business_profile_id;
    
    INSERT INTO gl_journal_lines (journal_entry_id, account_id, account_code, debit, credit, description)
    SELECT v_journal_entry_id, ca.id, ca.code, 0, v_gross_amount, ca.name
    FROM chart_accounts ca WHERE ca.code = p_credit_account_code AND ca.business_profile_id = v_event.business_profile_id;
  END IF;
  
  UPDATE events SET metadata = jsonb_set(COALESCE(metadata, '{}'::JSONB), '{journal_entry_id}', to_jsonb(v_journal_entry_id))
  WHERE id = p_event_id;
  
  RETURN jsonb_build_object('success', TRUE, 'journal_entry_id', v_journal_entry_id, 'period', v_period);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION close_accounting_event IS 'Close event and create journal entry. Resolves account keys to actual accounts via company mapping + overrides.';

GRANT EXECUTE ON FUNCTION close_accounting_event TO authenticated;
