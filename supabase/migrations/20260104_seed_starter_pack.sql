-- ============================================
-- SEED STARTER PACK
-- ============================================
-- Minimal rule pack for 0-employee sp. z o.o. (no VAT)
-- 6 core rules: Sales, Purchase, Payment in/out, Capital, CIT

CREATE OR REPLACE FUNCTION seed_starter_pack(
  p_business_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_pack_id UUID;
  v_rule_id UUID;
  v_account_id UUID;
  v_rules_created INTEGER := 0;
BEGIN
  -- ============================================
  -- 1. CREATE STARTER PACK
  -- ============================================
  
  INSERT INTO rule_packs (
    pack_code, name, description,
    complexity_level, industry,
    supports_vat, supports_payroll, supports_departments, supports_projects,
    display_order
  ) VALUES (
    'STARTER_GENERAL',
    'Starter Pack',
    'Minimal accounting for 0-2 person company, no VAT',
    'starter', 'general',
    FALSE, FALSE, FALSE, FALSE,
    10
  ) ON CONFLICT (pack_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_pack_id;
  
  -- ============================================
  -- 2. MAP ACCOUNT KEYS TO CHART ACCOUNTS
  -- ============================================
  
  -- Get account IDs and create mappings
  
  -- BANK_MAIN → 130
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '130' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'BANK_MAIN', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- AR_CUSTOMERS → 201
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '201' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'AR_CUSTOMERS', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- AP_SUPPLIERS → 202
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '202' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'AP_SUPPLIERS', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- REVENUE_MAIN → 700
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '700' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'REVENUE_MAIN', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- COST_OPEX → 400
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '400' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'COST_OPEX', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- EQUITY_CAPITAL → 800
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '800' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'EQUITY_CAPITAL', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- CIT_EXPENSE → 870
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '870' LIMIT 1;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'CIT_EXPENSE', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- CIT_PAYABLE → 225 (create if doesn't exist)
  SELECT id INTO v_account_id FROM chart_accounts 
  WHERE business_profile_id = p_business_profile_id AND code = '225' LIMIT 1;
  IF v_account_id IS NULL THEN
    INSERT INTO chart_accounts (business_profile_id, code, name, account_type, is_synthetic, is_active)
    VALUES (p_business_profile_id, '225', 'Rozrachunki z US - CIT', 'liability', FALSE, TRUE)
    RETURNING id INTO v_account_id;
  END IF;
  IF v_account_id IS NOT NULL THEN
    INSERT INTO company_account_key_map (business_profile_id, account_key, account_id)
    VALUES (p_business_profile_id, 'CIT_PAYABLE', v_account_id)
    ON CONFLICT (business_profile_id, account_key) DO NOTHING;
  END IF;
  
  -- ============================================
  -- 3. CREATE RULES WITH ACCOUNT KEYS
  -- ============================================
  
  -- Rule 1: Sales (no VAT)
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Sprzedaż',
    'STARTER_SALES_NO_VAT',
    'Faktura sprzedaży bez VAT',
    'sales_invoice', 'income', 'no_vat',
    TRUE, 10
  ) ON CONFLICT (business_profile_id, rule_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_key, amount_type, use_key_mapping, description) VALUES
    (v_rule_id, 1, 'debit', 'AR_CUSTOMERS', 'gross', TRUE, 'Należności od klientów'),
    (v_rule_id, 2, 'credit', 'REVENUE_MAIN', 'gross', TRUE, 'Przychody')
  ON CONFLICT (posting_rule_id, line_order) DO NOTHING;
  
  INSERT INTO rule_pack_rules (rule_pack_id, posting_rule_id, rule_group) 
  VALUES (v_pack_id, v_rule_id, 'sales')
  ON CONFLICT DO NOTHING;
  v_rules_created := v_rules_created + 1;
  
  -- Rule 2: Purchase (no VAT)
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zakup',
    'STARTER_PURCHASE_NO_VAT',
    'Faktura zakupu bez VAT',
    'purchase_invoice', 'expense', 'no_vat',
    TRUE, 20
  ) ON CONFLICT (business_profile_id, rule_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_key, amount_type, use_key_mapping, description) VALUES
    (v_rule_id, 1, 'debit', 'COST_OPEX', 'gross', TRUE, 'Koszty operacyjne'),
    (v_rule_id, 2, 'credit', 'AP_SUPPLIERS', 'gross', TRUE, 'Zobowiązania wobec dostawców')
  ON CONFLICT (posting_rule_id, line_order) DO NOTHING;
  
  INSERT INTO rule_pack_rules (rule_pack_id, posting_rule_id, rule_group) 
  VALUES (v_pack_id, v_rule_id, 'purchases')
  ON CONFLICT DO NOTHING;
  v_rules_created := v_rules_created + 1;
  
  -- Rule 3: Customer payment (bank)
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, payment_method,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Wpłata od klienta',
    'STARTER_PAYMENT_IN',
    'Wpłata od klienta na rachunek',
    'payment_received', 'bank',
    TRUE, 30
  ) ON CONFLICT (business_profile_id, rule_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_key, amount_type, use_key_mapping, description) VALUES
    (v_rule_id, 1, 'debit', 'BANK_MAIN', 'gross', TRUE, 'Rachunek bankowy'),
    (v_rule_id, 2, 'credit', 'AR_CUSTOMERS', 'gross', TRUE, 'Należności od klientów')
  ON CONFLICT (posting_rule_id, line_order) DO NOTHING;
  
  INSERT INTO rule_pack_rules (rule_pack_id, posting_rule_id, rule_group) 
  VALUES (v_pack_id, v_rule_id, 'payments')
  ON CONFLICT DO NOTHING;
  v_rules_created := v_rules_created + 1;
  
  -- Rule 4: Supplier payment (bank)
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, payment_method,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zapłata dostawcy',
    'STARTER_PAYMENT_OUT',
    'Zapłata dostawcy z rachunku',
    'payment_made', 'bank',
    TRUE, 31
  ) ON CONFLICT (business_profile_id, rule_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_key, amount_type, use_key_mapping, description) VALUES
    (v_rule_id, 1, 'debit', 'AP_SUPPLIERS', 'gross', TRUE, 'Zobowiązania wobec dostawców'),
    (v_rule_id, 2, 'credit', 'BANK_MAIN', 'gross', TRUE, 'Rachunek bankowy')
  ON CONFLICT (posting_rule_id, line_order) DO NOTHING;
  
  INSERT INTO rule_pack_rules (rule_pack_id, posting_rule_id, rule_group) 
  VALUES (v_pack_id, v_rule_id, 'payments')
  ON CONFLICT DO NOTHING;
  v_rules_created := v_rules_created + 1;
  
  -- Rule 5: Capital injection
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Kapitał zakładowy',
    'STARTER_CAPITAL',
    'Wniesienie kapitału zakładowego',
    'capital_injection',
    TRUE, 40
  ) ON CONFLICT (business_profile_id, rule_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_key, amount_type, use_key_mapping, description) VALUES
    (v_rule_id, 1, 'debit', 'BANK_MAIN', 'gross', TRUE, 'Rachunek bankowy'),
    (v_rule_id, 2, 'credit', 'EQUITY_CAPITAL', 'gross', TRUE, 'Kapitał zakładowy')
  ON CONFLICT (posting_rule_id, line_order) DO NOTHING;
  
  INSERT INTO rule_pack_rules (rule_pack_id, posting_rule_id, rule_group) 
  VALUES (v_pack_id, v_rule_id, 'internal')
  ON CONFLICT DO NOTHING;
  v_rules_created := v_rules_created + 1;
  
  -- Rule 6: CIT accrual
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Podatek CIT',
    'STARTER_CIT',
    'Naliczenie podatku dochodowego',
    'cit_accrual',
    TRUE, 41
  ) ON CONFLICT (business_profile_id, rule_code) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_key, amount_type, use_key_mapping, description) VALUES
    (v_rule_id, 1, 'debit', 'CIT_EXPENSE', 'gross', TRUE, 'Podatek dochodowy'),
    (v_rule_id, 2, 'credit', 'CIT_PAYABLE', 'gross', TRUE, 'Zobowiązania podatkowe')
  ON CONFLICT (posting_rule_id, line_order) DO NOTHING;
  
  INSERT INTO rule_pack_rules (rule_pack_id, posting_rule_id, rule_group) 
  VALUES (v_pack_id, v_rule_id, 'taxes')
  ON CONFLICT DO NOTHING;
  v_rules_created := v_rules_created + 1;
  
  -- ============================================
  -- 4. ACTIVATE PACK FOR COMPANY
  -- ============================================
  
  UPDATE business_profiles
  SET active_rule_pack_id = v_pack_id,
      complexity_level = 'starter'
  WHERE id = p_business_profile_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'pack_id', v_pack_id,
    'rules_created', v_rules_created,
    'message', 'Starter pack activated with ' || v_rules_created || ' rules'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_starter_pack IS 'Seed minimal Starter Pack for 0-employee sp. z o.o. (no VAT). Creates 6 core rules using account keys.';

GRANT EXECUTE ON FUNCTION seed_starter_pack TO authenticated;
