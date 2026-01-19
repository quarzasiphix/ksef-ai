-- ============================================
-- BASIC SPÓŁKA POSTING RULES (Non-VAT)
-- ============================================
-- Implements deterministic posting for basic spółka operations
-- Covers: income invoices, purchase expenses, cash/bank payments
-- For non-VAT registered spółka with no employees

-- ============================================
-- 1. SEED DEFAULT POSTING RULES FOR NON-VAT SPÓŁKA
-- ============================================

-- This function creates basic posting rules for a spółka
CREATE OR REPLACE FUNCTION seed_basic_spolka_posting_rules(
  p_business_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_rule_id UUID;
  v_rules_created INTEGER := 0;
BEGIN
  -- Check if rules already exist
  IF EXISTS (
    SELECT 1 FROM posting_rules 
    WHERE business_profile_id = p_business_profile_id 
      AND is_system = TRUE
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'System rules already exist for this profile'
    );
  END IF;

  -- ============================================
  -- RULE 1: Sales Invoice (No VAT) - Unpaid
  -- ============================================
  -- Wn: 202 (Należności od odbiorców) - Debit
  -- Ma: 700 (Przychody ze sprzedaży) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    vat_scheme,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Sprzedaż bez VAT - nieopłacona',
    'Faktura sprzedaży bez VAT, nieopłacona (należność)',
    'SALES_NO_VAT_UNPAID',
    'sales_invoice',
    'income',
    'unpaid',
    'no_vat',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  -- Line 1: Debit receivables
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '202', 'gross', 'Należność od odbiorcy');
  
  -- Line 2: Credit revenue
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '700', 'gross', 'Przychód ze sprzedaży');
  
  v_rules_created := v_rules_created + 1;

  -- ============================================
  -- RULE 2: Sales Invoice (No VAT) - Paid by Bank
  -- ============================================
  -- Wn: 130 (Rachunek bankowy) - Debit
  -- Ma: 700 (Przychody ze sprzedaży) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    vat_scheme,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Sprzedaż bez VAT - przelew',
    'Faktura sprzedaży bez VAT, opłacona przelewem',
    'SALES_NO_VAT_BANK',
    'sales_invoice',
    'income',
    'bank',
    'no_vat',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '130', 'gross', 'Wpływ na rachunek bankowy');
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '700', 'gross', 'Przychód ze sprzedaży');
  
  v_rules_created := v_rules_created + 1;

  -- ============================================
  -- RULE 3: Sales Invoice (No VAT) - Paid by Cash
  -- ============================================
  -- Wn: 140 (Kasa) - Debit
  -- Ma: 700 (Przychody ze sprzedaży) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    vat_scheme,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Sprzedaż bez VAT - gotówka',
    'Faktura sprzedaży bez VAT, opłacona gotówką',
    'SALES_NO_VAT_CASH',
    'sales_invoice',
    'income',
    'cash',
    'no_vat',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '140', 'gross', 'Wpływ do kasy');
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '700', 'gross', 'Przychód ze sprzedaży');
  
  v_rules_created := v_rules_created + 1;

  -- ============================================
  -- RULE 4: Purchase Expense (No VAT) - Unpaid
  -- ============================================
  -- Wn: 400 (Koszty wg rodzajów) - Debit
  -- Ma: 201 (Zobowiązania wobec dostawców) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    vat_scheme,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Zakup bez VAT - nieopłacony',
    'Faktura zakupu bez VAT, nieopłacona (zobowiązanie)',
    'PURCHASE_NO_VAT_UNPAID',
    'purchase_invoice',
    'expense',
    'unpaid',
    'no_vat',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '400', 'gross', 'Koszt działalności');
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '201', 'gross', 'Zobowiązanie wobec dostawcy');
  
  v_rules_created := v_rules_created + 1;

  -- ============================================
  -- RULE 5: Purchase Expense (No VAT) - Paid by Bank
  -- ============================================
  -- Wn: 400 (Koszty wg rodzajów) - Debit
  -- Ma: 130 (Rachunek bankowy) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    vat_scheme,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Zakup bez VAT - przelew',
    'Faktura zakupu bez VAT, opłacona przelewem',
    'PURCHASE_NO_VAT_BANK',
    'purchase_invoice',
    'expense',
    'bank',
    'no_vat',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '400', 'gross', 'Koszt działalności');
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '130', 'gross', 'Wypływ z rachunku bankowego');
  
  v_rules_created := v_rules_created + 1;

  -- ============================================
  -- RULE 6: Purchase Expense (No VAT) - Paid by Cash
  -- ============================================
  -- Wn: 400 (Koszty wg rodzajów) - Debit
  -- Ma: 140 (Kasa) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    vat_scheme,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Zakup bez VAT - gotówka',
    'Faktura zakupu bez VAT, opłacona gotówką',
    'PURCHASE_NO_VAT_CASH',
    'purchase_invoice',
    'expense',
    'cash',
    'no_vat',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '400', 'gross', 'Koszt działalności');
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '140', 'gross', 'Wypływ z kasy');
  
  v_rules_created := v_rules_created + 1;

  -- ============================================
  -- RULE 7: Payment of Receivable (Bank)
  -- ============================================
  -- When customer pays an unpaid invoice
  -- Wn: 130 (Rachunek bankowy) - Debit
  -- Ma: 202 (Należności) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Wpłata należności - przelew',
    'Wpłata od odbiorcy na rachunek bankowy',
    'RECEIVABLE_PAYMENT_BANK',
    'payment_received',
    'income',
    'bank',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '130', 'gross', 'Wpływ na rachunek');
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '202', 'gross', 'Rozliczenie należności');
  
  v_rules_created := v_rules_created + 1;

  -- ============================================
  -- RULE 8: Payment of Payable (Bank)
  -- ============================================
  -- When we pay a supplier
  -- Wn: 201 (Zobowiązania) - Debit
  -- Ma: 130 (Rachunek bankowy) - Credit
  
  INSERT INTO posting_rules (
    business_profile_id,
    name,
    description,
    rule_code,
    document_type,
    transaction_type,
    payment_method,
    is_system,
    is_active,
    priority
  ) VALUES (
    p_business_profile_id,
    'Zapłata zobowiązania - przelew',
    'Zapłata dostawcy z rachunku bankowego',
    'PAYABLE_PAYMENT_BANK',
    'payment_made',
    'expense',
    'bank',
    TRUE,
    TRUE,
    10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 1, 'debit', '201', 'gross', 'Rozliczenie zobowiązania');
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description)
  VALUES (v_rule_id, 2, 'credit', '130', 'gross', 'Wypływ z rachunku');
  
  v_rules_created := v_rules_created + 1;

  RETURN jsonb_build_object(
    'success', TRUE,
    'rules_created', v_rules_created,
    'business_profile_id', p_business_profile_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_basic_spolka_posting_rules IS 'Creates basic posting rules for non-VAT spółka. Covers sales, purchases, and payments.';

GRANT EXECUTE ON FUNCTION seed_basic_spolka_posting_rules TO authenticated;

-- ============================================
-- 2. AUTO-POSTING ENGINE
-- ============================================

CREATE OR REPLACE FUNCTION auto_post_invoice(
  p_invoice_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_rule RECORD;
  v_journal_entry_id UUID;
  v_line RECORD;
  v_amount DECIMAL(15,2);
  v_vat_scheme TEXT;
  v_payment_method TEXT;
  v_document_type TEXT;
BEGIN
  -- Get invoice details
  SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
  
  IF v_invoice.id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Invoice not found');
  END IF;
  
  -- Skip if already posted
  IF v_invoice.accounting_status = 'posted' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Already posted');
  END IF;
  
  -- Skip if not accepted (for expenses)
  IF v_invoice.transaction_type = 'expense' AND v_invoice.acceptance_status NOT IN ('accepted', 'auto_accepted') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Expense not accepted');
  END IF;
  
  -- Determine VAT scheme
  IF v_invoice.vat = FALSE OR v_invoice.vat_exempt = TRUE THEN
    v_vat_scheme := 'no_vat';
  ELSE
    v_vat_scheme := 'vat';
  END IF;
  
  -- Determine payment method
  v_payment_method := COALESCE(v_invoice.payment_method_used, v_invoice.payment_method, 'unpaid');
  
  -- Determine document type
  IF v_invoice.transaction_type = 'income' THEN
    v_document_type := 'sales_invoice';
  ELSE
    v_document_type := 'purchase_invoice';
  END IF;
  
  -- Find matching posting rule
  SELECT * INTO v_rule
  FROM find_posting_rule(
    v_invoice.business_profile_id,
    v_document_type,
    v_invoice.transaction_type,
    v_payment_method,
    v_vat_scheme,
    v_invoice.vat_rate
  );
  
  IF v_rule.rule_id IS NULL THEN
    -- No rule found - mark as needs review
    UPDATE invoices
    SET accounting_status = 'needs_review'
    WHERE id = p_invoice_id;
    
    RETURN jsonb_build_object(
      'success', FALSE, 
      'error', 'No matching posting rule found',
      'status', 'needs_review'
    );
  END IF;
  
  -- Create journal entry
  INSERT INTO journal_entries (
    business_profile_id,
    entry_date,
    document_number,
    description,
    is_posted
  ) VALUES (
    v_invoice.business_profile_id,
    CASE 
      WHEN v_invoice.transaction_type = 'income' THEN v_invoice.issue_date
      ELSE v_invoice.invoice_date
    END,
    v_invoice.invoice_number,
    v_rule.rule_name || ' - ' || COALESCE(v_invoice.invoice_number, 'Draft'),
    TRUE
  ) RETURNING id INTO v_journal_entry_id;
  
  -- Create journal entry lines from rule
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
        v_amount := v_invoice.total_gross_value; -- default
    END CASE;
    
    -- Insert journal entry line
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
      'rule_code', v_rule.rule_code,
      'amount', v_invoice.total_gross_value
    )
  );
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'journal_entry_id', v_journal_entry_id,
    'rule_code', v_rule.rule_code,
    'posted_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_post_invoice IS 'Automatically posts an invoice to the ledger using posting rules. Creates journal entry and updates invoice status.';

GRANT EXECUTE ON FUNCTION auto_post_invoice TO authenticated;

-- ============================================
-- 3. BATCH AUTO-POST FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION auto_post_pending_invoices(
  p_business_profile_id UUID,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_result JSONB;
  v_posted_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
BEGIN
  -- Process unposted, accepted invoices
  FOR v_invoice IN
    SELECT id, invoice_number, transaction_type
    FROM invoices
    WHERE business_profile_id = p_business_profile_id
      AND accounting_status = 'unposted'
      AND (acceptance_status IN ('accepted', 'auto_accepted'))
    ORDER BY 
      CASE WHEN transaction_type = 'income' THEN issue_date ELSE invoice_date END ASC
    LIMIT p_limit
  LOOP
    -- Try to post
    SELECT auto_post_invoice(v_invoice.id) INTO v_result;
    
    IF (v_result->>'success')::BOOLEAN THEN
      v_posted_count := v_posted_count + 1;
    ELSE
      v_failed_count := v_failed_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'invoice_id', v_invoice.id,
        'invoice_number', v_invoice.invoice_number,
        'error', v_result->>'error'
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'posted_count', v_posted_count,
    'failed_count', v_failed_count,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_post_pending_invoices IS 'Batch posts all pending invoices for a business profile. Returns summary of posted and failed invoices.';

GRANT EXECUTE ON FUNCTION auto_post_pending_invoices TO authenticated;
