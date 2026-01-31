-- Fix auto_post_invoice function to use correct table structure
-- The function was trying to insert into columns that don't exist in the actual journal_entries table

-- ============================================================================
-- 1. Fix auto_post_invoice function
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_post_invoice(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_rule RECORD;
  v_journal_entry_id UUID;
  v_line RECORD;
  v_amount DECIMAL;
  v_period_id UUID;
  v_event_date DATE;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice
  FROM invoices
  WHERE id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invoice not found');
  END IF;
  
  -- Check if already posted
  IF v_invoice.accounting_status = 'posted' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invoice already posted');
  END IF;
  
  -- Determine event date (issue_date for income, invoice_date for expenses)
  v_event_date := CASE 
    WHEN v_invoice.transaction_type = 'income' THEN v_invoice.issue_date
    ELSE COALESCE(v_invoice.invoice_date, v_invoice.issue_date)
  END;
  
  IF v_event_date IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invoice has no date');
  END IF;
  
  -- CRITICAL: Ensure accounting period exists for this invoice
  v_period_id := ensure_accounting_period(v_invoice.business_profile_id, v_event_date);
  
  IF v_period_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE, 
      'error', 'Failed to create accounting period for ' || v_event_date::TEXT
    );
  END IF;
  
  -- Check if period is locked
  IF EXISTS (
    SELECT 1 FROM accounting_periods
    WHERE id = v_period_id AND is_locked = TRUE
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE, 
      'error', 'Cannot post to locked period'
    );
  END IF;
  
  -- Find matching posting rule
  SELECT 
    pr.id,
    pr.rule_code,
    jsonb_agg(
      jsonb_build_object(
        'line_order', prl.line_order,
        'side', prl.side,
        'account_code', prl.account_code,
        'account_name', ca.name,
        'amount_type', prl.amount_type,
        'amount_formula', prl.amount_formula,
        'fixed_amount', prl.fixed_amount,
        'description', prl.description
      ) ORDER BY prl.line_order
    ) AS lines
  INTO v_rule
  FROM posting_rules pr
  LEFT JOIN posting_rule_lines prl ON prl.posting_rule_id = pr.id
  LEFT JOIN chart_accounts ca ON ca.code = prl.account_code 
    AND ca.business_profile_id = pr.business_profile_id
  WHERE pr.business_profile_id = v_invoice.business_profile_id
    AND pr.is_active = TRUE
    AND pr.document_type = 'sales_invoice'
    AND pr.transaction_type = v_invoice.transaction_type
    AND (
      pr.payment_method = v_invoice.payment_method
      OR pr.payment_method IS NULL
    )
  GROUP BY pr.id, pr.rule_code
  ORDER BY pr.priority DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE, 
      'error', 'No matching posting rule found for this invoice type'
    );
  END IF;
  
  -- Create journal entry using the CORRECT table structure
  INSERT INTO journal_entries (
    business_profile_id,
    user_id,
    entry_date,
    document_number,
    description,
    is_posted
  ) VALUES (
    v_invoice.business_profile_id,
    auth.uid(),
    v_event_date,
    COALESCE(v_invoice.invoice_number, 'Draft'),
    'Auto-posted: ' || COALESCE(v_invoice.invoice_number, 'Draft'),
    TRUE
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Create journal entry lines using the CORRECT table structure
  FOR v_line IN 
    SELECT * FROM jsonb_to_recordset(v_rule.lines) AS x(
      line_order INTEGER,
      side TEXT,
      account_code TEXT,
      account_name TEXT,
      amount_type TEXT,
      amount_formula TEXT,
      fixed_amount DECIMAL,
      description TEXT
    )
  LOOP
    -- Calculate amount based on type
    CASE v_line.amount_type
      WHEN 'gross' THEN
        v_amount := v_invoice.total_gross_value;
      WHEN 'net' THEN
        v_amount := v_invoice.total_net_value;
      WHEN 'vat' THEN
        v_amount := v_invoice.total_vat_value;
      WHEN 'fixed' THEN
        v_amount := v_line.fixed_amount;
      ELSE
        v_amount := v_invoice.total_gross_value;
    END CASE;
    
    -- Insert journal entry line with CORRECT column names
    INSERT INTO journal_entry_lines (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) SELECT
      v_journal_entry_id,
      ca.id,
      CASE WHEN v_line.side = 'debit' THEN v_amount ELSE 0 END,
      CASE WHEN v_line.side = 'credit' THEN v_amount ELSE 0 END,
      COALESCE(v_line.description, v_invoice.invoice_number)
    FROM chart_accounts ca
    WHERE ca.business_profile_id = v_invoice.business_profile_id
      AND ca.code = v_line.account_code
      AND ca.is_active = TRUE;
  END LOOP;
  
  -- Update invoice status
  UPDATE invoices
  SET 
    accounting_status = 'posted',
    posted_at = NOW(),
    journal_entry_id = v_journal_entry_id
  WHERE id = p_invoice_id;
  
  -- Create event
  INSERT INTO events (
    business_profile_id,
    event_type,
    entity_type,
    entity_id,
    description,
    metadata
  ) VALUES (
    v_invoice.business_profile_id,
    'invoice_posted',
    'invoice',
    p_invoice_id,
    'Invoice posted to ledger: ' || COALESCE(v_invoice.invoice_number, 'Draft'),
    jsonb_build_object(
      'journal_entry_id', v_journal_entry_id,
      'period_id', v_period_id,
      'rule_code', v_rule.rule_code,
      'amount', v_invoice.total_gross_value
    )
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'journal_entry_id', v_journal_entry_id,
    'period_id', v_period_id,
    'rule_code', v_rule.rule_code,
    'posted_at', NOW()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_post_invoice IS 'Auto-posts an invoice to the ledger using correct table structure. Returns success status and journal entry details.';

GRANT EXECUTE ON FUNCTION auto_post_invoice TO authenticated;
