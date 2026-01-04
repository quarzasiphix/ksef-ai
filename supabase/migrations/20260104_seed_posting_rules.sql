-- ============================================
-- SEED POSTING RULES - POLISH DEFAULTS
-- ============================================
-- Core financial posting rules for Polish companies

CREATE OR REPLACE FUNCTION seed_posting_rules(
  p_business_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_rule_id UUID;
  v_rules_created INTEGER := 0;
BEGIN
  -- ============================================
  -- SALES RULES (Faktury sprzedaży)
  -- ============================================
  
  -- 1. Sales Invoice - VAT 23%
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme, vat_rate,
    is_system, priority
  ) VALUES (
    p_business_profile_id, 
    'Sprzedaż – VAT 23%',
    'SALES_VAT_23',
    'Standardowa faktura sprzedaży z VAT 23%',
    'sales_invoice', 'income', 'vat', 23.00,
    TRUE, 10
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '202', 'gross', 'Rozrachunki z odbiorcami'),
    (v_rule_id, 2, 'credit', '700', 'net', 'Przychody ze sprzedaży'),
    (v_rule_id, 3, 'credit', '222', 'vat', 'VAT należny');
  v_rules_created := v_rules_created + 1;
  
  -- 2. Sales Invoice - VAT 8%
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme, vat_rate,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Sprzedaż – VAT 8%',
    'SALES_VAT_8',
    'Faktura sprzedaży z obniżoną stawką VAT 8%',
    'sales_invoice', 'income', 'vat', 8.00,
    TRUE, 11
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '202', 'gross', 'Rozrachunki z odbiorcami'),
    (v_rule_id, 2, 'credit', '700', 'net', 'Przychody ze sprzedaży'),
    (v_rule_id, 3, 'credit', '222', 'vat', 'VAT należny');
  v_rules_created := v_rules_created + 1;
  
  -- 3. Sales Invoice - VAT 5%
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme, vat_rate,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Sprzedaż – VAT 5%',
    'SALES_VAT_5',
    'Faktura sprzedaży z obniżoną stawką VAT 5%',
    'sales_invoice', 'income', 'vat', 5.00,
    TRUE, 12
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '202', 'gross', 'Rozrachunki z odbiorcami'),
    (v_rule_id, 2, 'credit', '700', 'net', 'Przychody ze sprzedaży'),
    (v_rule_id, 3, 'credit', '222', 'vat', 'VAT należny');
  v_rules_created := v_rules_created + 1;
  
  -- 4. Sales Invoice - No VAT (zwolniona)
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Sprzedaż – zwolniona z VAT',
    'SALES_NO_VAT',
    'Faktura sprzedaży zwolniona z VAT',
    'sales_invoice', 'income', 'no_vat',
    TRUE, 13
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '202', 'gross', 'Rozrachunki z odbiorcami'),
    (v_rule_id, 2, 'credit', '700', 'gross', 'Przychody ze sprzedaży');
  v_rules_created := v_rules_created + 1;
  
  -- ============================================
  -- PURCHASE RULES (Faktury kosztowe)
  -- ============================================
  
  -- 5. Purchase Invoice - Operating Expense + VAT
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zakup – koszt operacyjny + VAT',
    'PURCHASE_OPEX_VAT',
    'Faktura zakupu kosztów operacyjnych z VAT',
    'purchase_invoice', 'expense', 'vat',
    TRUE, 20
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '400', 'net', 'Koszty operacyjne'),
    (v_rule_id, 2, 'debit', '221', 'vat', 'VAT naliczony'),
    (v_rule_id, 3, 'credit', '201', 'gross', 'Rozrachunki z dostawcami');
  v_rules_created := v_rules_created + 1;
  
  -- 6. Purchase Invoice - No VAT
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, transaction_type, vat_scheme,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zakup – bez VAT',
    'PURCHASE_NO_VAT',
    'Faktura zakupu bez VAT',
    'purchase_invoice', 'expense', 'no_vat',
    TRUE, 21
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '400', 'gross', 'Koszty operacyjne'),
    (v_rule_id, 2, 'credit', '201', 'gross', 'Rozrachunki z dostawcami');
  v_rules_created := v_rules_created + 1;
  
  -- ============================================
  -- PAYMENT RULES (Płatności)
  -- ============================================
  
  -- 7. Customer Payment - Bank
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, payment_method,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Wpływ od klienta – przelew',
    'PAYMENT_IN_BANK',
    'Wpłata od klienta na rachunek bankowy',
    'payment_received', 'bank',
    TRUE, 30
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '130', 'gross', 'Rachunek bankowy'),
    (v_rule_id, 2, 'credit', '202', 'gross', 'Rozrachunki z odbiorcami');
  v_rules_created := v_rules_created + 1;
  
  -- 8. Customer Payment - Cash
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, payment_method,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Wpływ do kasy',
    'PAYMENT_IN_CASH',
    'Wpłata gotówki do kasy',
    'payment_received', 'cash',
    TRUE, 31
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '140', 'gross', 'Kasa'),
    (v_rule_id, 2, 'credit', '202', 'gross', 'Rozrachunki z odbiorcami');
  v_rules_created := v_rules_created + 1;
  
  -- 9. Supplier Payment - Bank
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, payment_method,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zapłata dostawcy – przelew',
    'PAYMENT_OUT_BANK',
    'Płatność dla dostawcy z rachunku bankowego',
    'payment_made', 'bank',
    TRUE, 32
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '201', 'gross', 'Rozrachunki z dostawcami'),
    (v_rule_id, 2, 'credit', '130', 'gross', 'Rachunek bankowy');
  v_rules_created := v_rules_created + 1;
  
  -- 10. Supplier Payment - Cash
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type, payment_method,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zapłata gotówką',
    'PAYMENT_OUT_CASH',
    'Płatność gotówką z kasy',
    'payment_made', 'cash',
    TRUE, 33
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '201', 'gross', 'Rozrachunki z dostawcami'),
    (v_rule_id, 2, 'credit', '140', 'gross', 'Kasa');
  v_rules_created := v_rules_created + 1;
  
  -- ============================================
  -- TAX RULES (Podatki)
  -- ============================================
  
  -- 11. VAT Settlement
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Rozliczenie VAT',
    'VAT_SETTLEMENT',
    'Rozliczenie VAT należnego',
    'vat_settlement',
    TRUE, 40
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '222', 'gross', 'VAT należny'),
    (v_rule_id, 2, 'credit', '229', 'gross', 'VAT do zapłaty');
  v_rules_created := v_rules_created + 1;
  
  -- 12. VAT Payment
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zapłata VAT',
    'VAT_PAYMENT',
    'Zapłata VAT do urzędu skarbowego',
    'vat_payment',
    TRUE, 41
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '229', 'gross', 'VAT do zapłaty'),
    (v_rule_id, 2, 'credit', '130', 'gross', 'Rachunek bankowy');
  v_rules_created := v_rules_created + 1;
  
  -- 13. CIT Advance Payment
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zaliczka CIT',
    'CIT_ADVANCE',
    'Zapłata zaliczki na podatek dochodowy',
    'cit_advance',
    TRUE, 42
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '870', 'gross', 'Podatek dochodowy'),
    (v_rule_id, 2, 'credit', '130', 'gross', 'Rachunek bankowy');
  v_rules_created := v_rules_created + 1;
  
  -- 14. ZUS Payment
  INSERT INTO posting_rules (
    business_profile_id, name, rule_code, description,
    document_type,
    is_system, priority
  ) VALUES (
    p_business_profile_id,
    'Zapłata ZUS',
    'ZUS_PAYMENT',
    'Zapłata składek ZUS',
    'zus_payment',
    TRUE, 43
  ) RETURNING id INTO v_rule_id;
  
  INSERT INTO posting_rule_lines (posting_rule_id, line_order, side, account_code, amount_type, description) VALUES
    (v_rule_id, 1, 'debit', '231', 'gross', 'Rozrachunki z ZUS'),
    (v_rule_id, 2, 'credit', '130', 'gross', 'Rachunek bankowy');
  v_rules_created := v_rules_created + 1;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'rules_created', v_rules_created,
    'message', format('Created %s posting rules', v_rules_created)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_posting_rules IS 'Seed default Polish posting rules for a business profile. Creates 14 core rules covering sales, purchases, payments, and taxes.';

GRANT EXECUTE ON FUNCTION seed_posting_rules TO authenticated;
