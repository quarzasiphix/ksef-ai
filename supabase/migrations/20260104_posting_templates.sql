-- ============================================
-- POSTING TEMPLATES
-- ============================================
-- Rules for auto-mapping events → Wn/Ma accounts
-- NO money storage - just mapping rules
-- Uses existing invoice/payment/bank data as input

-- ============================================
-- 1. POSTING TEMPLATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS posting_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Template identification
  name TEXT NOT NULL,
  description TEXT,
  
  -- Matching criteria (all must match for template to apply)
  event_type TEXT, -- e.g., 'invoice_issued', 'payment_received'
  transaction_type TEXT, -- 'income' or 'expense'
  payment_method TEXT, -- 'gotówka', 'przelew', 'karta', 'credit'
  document_type TEXT, -- 'invoice', 'expense', 'contract'
  
  -- Account mapping (output)
  debit_account_code TEXT NOT NULL, -- Wn
  credit_account_code TEXT NOT NULL, -- Ma
  
  -- Priority (higher = applied first if multiple match)
  priority INT DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  FOREIGN KEY (business_profile_id, debit_account_code) 
    REFERENCES chart_accounts(business_profile_id, code),
  FOREIGN KEY (business_profile_id, credit_account_code) 
    REFERENCES chart_accounts(business_profile_id, code)
);

CREATE INDEX idx_posting_templates_profile ON posting_templates(business_profile_id);
CREATE INDEX idx_posting_templates_event_type ON posting_templates(event_type);
CREATE INDEX idx_posting_templates_active ON posting_templates(is_active) WHERE is_active = TRUE;

CREATE TRIGGER update_posting_templates_updated_at
  BEFORE UPDATE ON posting_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE posting_templates IS 'Posting templates - rules for auto-mapping events to Wn/Ma accounts. No money storage, just rules.';

-- ============================================
-- 2. RLS POLICIES
-- ============================================

ALTER TABLE posting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY posting_templates_select_policy ON posting_templates
  FOR SELECT USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE id = business_profile_id
    )
  );

CREATE POLICY posting_templates_insert_policy ON posting_templates
  FOR INSERT WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE id = business_profile_id
    )
  );

CREATE POLICY posting_templates_update_policy ON posting_templates
  FOR UPDATE USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE id = business_profile_id
    )
  );

GRANT SELECT, INSERT, UPDATE ON posting_templates TO authenticated;

-- ============================================
-- 3. FIND MATCHING TEMPLATE
-- ============================================

CREATE OR REPLACE FUNCTION find_posting_template(
  p_business_profile_id UUID,
  p_event_type TEXT,
  p_transaction_type TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL,
  p_document_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  debit_account_code TEXT,
  credit_account_code TEXT,
  priority INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id AS template_id,
    pt.name AS template_name,
    pt.debit_account_code,
    pt.credit_account_code,
    pt.priority
  FROM posting_templates pt
  WHERE pt.business_profile_id = p_business_profile_id
    AND pt.is_active = TRUE
    AND (pt.event_type IS NULL OR pt.event_type = p_event_type)
    AND (pt.transaction_type IS NULL OR pt.transaction_type = p_transaction_type)
    AND (pt.payment_method IS NULL OR pt.payment_method = p_payment_method)
    AND (pt.document_type IS NULL OR pt.document_type = p_document_type)
  ORDER BY pt.priority DESC, pt.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_posting_template IS 'Find best matching posting template for an event based on criteria. Returns highest priority match.';
GRANT EXECUTE ON FUNCTION find_posting_template TO authenticated;

-- ============================================
-- 4. SEED DEFAULT TEMPLATES
-- ============================================

CREATE OR REPLACE FUNCTION seed_posting_templates(
  p_business_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check if already seeded
  SELECT COUNT(*) INTO v_count
  FROM posting_templates
  WHERE business_profile_id = p_business_profile_id;
  
  IF v_count > 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Posting templates already exist for this profile'
    );
  END IF;
  
  -- Insert default Polish posting templates
  INSERT INTO posting_templates (
    business_profile_id, 
    name, 
    description,
    event_type, 
    transaction_type, 
    payment_method,
    debit_account_code, 
    credit_account_code,
    priority
  ) VALUES
  
  -- Income invoices
  (p_business_profile_id, 
   'Faktura przychodowa - gotówka', 
   'Invoice issued, payment received in cash',
   'invoice_issued', 'income', 'gotówka',
   '140', '703', -- Wn: Kasa, Ma: Sprzedaż usług
   100),
  
  (p_business_profile_id, 
   'Faktura przychodowa - przelew', 
   'Invoice issued, payment by bank transfer',
   'invoice_issued', 'income', 'przelew',
   '130', '703', -- Wn: Bank, Ma: Sprzedaż usług
   100),
  
  (p_business_profile_id, 
   'Faktura przychodowa - na kredyt', 
   'Invoice issued, payment on credit (receivable)',
   'invoice_issued', 'income', 'credit',
   '202', '703', -- Wn: Rozrachunki z odbiorcami, Ma: Sprzedaż usług
   100),
  
  -- Expense invoices
  (p_business_profile_id, 
   'Faktura kosztowa - gotówka', 
   'Expense invoice paid in cash',
   'invoice_issued', 'expense', 'gotówka',
   '402', '140', -- Wn: Usługi obce, Ma: Kasa
   100),
  
  (p_business_profile_id, 
   'Faktura kosztowa - przelew', 
   'Expense invoice paid by bank transfer',
   'invoice_issued', 'expense', 'przelew',
   '402', '130', -- Wn: Usługi obce, Ma: Bank
   100),
  
  (p_business_profile_id, 
   'Faktura kosztowa - na kredyt', 
   'Expense invoice on credit (payable)',
   'invoice_issued', 'expense', 'credit',
   '402', '201', -- Wn: Usługi obce, Ma: Rozrachunki z dostawcami
   100),
  
  -- Payment received
  (p_business_profile_id, 
   'Płatność otrzymana - gotówka', 
   'Payment received in cash (closes receivable)',
   'payment_received', NULL, 'gotówka',
   '140', '202', -- Wn: Kasa, Ma: Rozrachunki z odbiorcami
   90),
  
  (p_business_profile_id, 
   'Płatność otrzymana - przelew', 
   'Payment received by bank transfer (closes receivable)',
   'payment_received', NULL, 'przelew',
   '130', '202', -- Wn: Bank, Ma: Rozrachunki z odbiorcami
   90),
  
  -- Payment sent
  (p_business_profile_id, 
   'Płatność wysłana - gotówka', 
   'Payment sent in cash (closes payable)',
   'payment_sent', NULL, 'gotówka',
   '201', '140', -- Wn: Rozrachunki z dostawcami, Ma: Kasa
   90),
  
  (p_business_profile_id, 
   'Płatność wysłana - przelew', 
   'Payment sent by bank transfer (closes payable)',
   'payment_sent', NULL, 'przelew',
   '201', '130', -- Wn: Rozrachunki z dostawcami, Ma: Bank
   90);
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'templates_created', 10
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION seed_posting_templates IS 'Seed default posting templates for a new business profile. Only runs if no templates exist.';
GRANT EXECUTE ON FUNCTION seed_posting_templates TO authenticated;
