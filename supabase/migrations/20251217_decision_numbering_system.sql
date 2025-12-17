-- Migration: Decision Numbering System (Legal Paragraph Style)
-- Adds legal-style numbering (§X.Y.Z) to decisions and resolutions
-- Creates hierarchy: Resolution → Decision → Documents

-- ============================================================================
-- 1. UPDATE RESOLUTIONS TABLE - Add numbering
-- ============================================================================

ALTER TABLE resolutions 
  ADD COLUMN IF NOT EXISTS resolution_number TEXT,
  ADD COLUMN IF NOT EXISTS resolution_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  ADD COLUMN IF NOT EXISTS sequence_in_year INTEGER,
  ADD COLUMN IF NOT EXISTS number INTEGER; -- For backward compatibility

-- Create unique index on resolution_number per business profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_resolutions_number_profile 
  ON resolutions(business_profile_id, resolution_number) 
  WHERE resolution_number IS NOT NULL;

-- Function to generate resolution numbers (e.g., "1/2024")
CREATE OR REPLACE FUNCTION generate_resolution_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_sequence INTEGER;
BEGIN
  -- Only generate if not already set
  IF NEW.resolution_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  v_year := EXTRACT(YEAR FROM COALESCE(NEW.resolution_date, CURRENT_DATE));
  
  -- Get next sequence for this year and business profile
  SELECT COALESCE(MAX(sequence_in_year), 0) + 1
  INTO v_sequence
  FROM resolutions
  WHERE resolution_year = v_year
    AND business_profile_id = NEW.business_profile_id;
  
  NEW.resolution_number := v_sequence || '/' || v_year;
  NEW.resolution_year := v_year;
  NEW.sequence_in_year := v_sequence;
  NEW.number := v_sequence; -- For backward compatibility
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-numbering resolutions
DROP TRIGGER IF EXISTS trigger_generate_resolution_number ON resolutions;
CREATE TRIGGER trigger_generate_resolution_number
  BEFORE INSERT ON resolutions
  FOR EACH ROW
  EXECUTE FUNCTION generate_resolution_number();

-- Migrate existing resolutions to have numbers (skip if already numbered)
DO $$
DECLARE
  res_record RECORD;
  v_sequence INTEGER;
  v_year INTEGER;
BEGIN
  FOR res_record IN 
    SELECT id, business_profile_id, resolution_date, created_at
    FROM resolutions 
    WHERE resolution_number IS NULL OR resolution_number = ''
    ORDER BY business_profile_id, COALESCE(resolution_date, created_at)
  LOOP
    v_year := EXTRACT(YEAR FROM COALESCE(res_record.resolution_date, res_record.created_at));
    
    -- Get next sequence for this profile and year
    SELECT COALESCE(MAX(sequence_in_year), 0) + 1
    INTO v_sequence
    FROM resolutions
    WHERE business_profile_id = res_record.business_profile_id
      AND resolution_year = v_year;
    
    -- Update resolution with number
    UPDATE resolutions
    SET 
      resolution_number = v_sequence || '/' || v_year,
      resolution_year = v_year,
      sequence_in_year = v_sequence,
      number = v_sequence
    WHERE id = res_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- 2. UPDATE DECISIONS TABLE - Add legal numbering and resolution links
-- ============================================================================

ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS decision_number TEXT,
  ADD COLUMN IF NOT EXISTS resolution_id UUID REFERENCES resolutions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS legal_reference TEXT,
  ADD COLUMN IF NOT EXISTS scope_description TEXT,
  ADD COLUMN IF NOT EXISTS is_foundational BOOLEAN DEFAULT false;

-- Create unique index on decision_number per business profile
CREATE UNIQUE INDEX IF NOT EXISTS idx_decisions_number_profile 
  ON decisions(business_profile_id, decision_number) 
  WHERE decision_number IS NOT NULL;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_decisions_resolution ON decisions(resolution_id);
CREATE INDEX IF NOT EXISTS idx_decisions_parent ON decisions(parent_decision_id);
CREATE INDEX IF NOT EXISTS idx_decisions_foundational ON decisions(is_foundational) WHERE is_foundational = true;

-- Function to generate decision numbers (§X.Y.Z format)
CREATE OR REPLACE FUNCTION generate_decision_number(
  p_business_profile_id UUID,
  p_resolution_id UUID,
  p_category TEXT
) RETURNS TEXT AS $$
DECLARE
  v_resolution_seq INTEGER;
  v_category_code INTEGER;
  v_sequence INTEGER;
BEGIN
  -- Get resolution sequence number
  IF p_resolution_id IS NULL THEN
    v_resolution_seq := 0; -- Foundational decisions
  ELSE
    SELECT COALESCE(sequence_in_year, number, 1)
    INTO v_resolution_seq
    FROM resolutions 
    WHERE id = p_resolution_id;
  END IF;
  
  -- Map category to code
  v_category_code := CASE p_category
    WHEN 'operational_activity' THEN 1
    WHEN 'b2b_contracts' THEN 2
    WHEN 'sales_services' THEN 3
    WHEN 'operational_costs' THEN 4
    WHEN 'company_financing' THEN 5
    WHEN 'compensation' THEN 6
    WHEN 'custom_projects' THEN 7
    ELSE 9
  END;
  
  -- Get next sequence for this resolution + category
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(SPLIT_PART(decision_number, '.', 3), ' ', 1) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM decisions
  WHERE business_profile_id = p_business_profile_id
    AND decision_number LIKE '§' || v_resolution_seq || '.' || v_category_code || '.%';
  
  RETURN '§' || v_resolution_seq || '.' || v_category_code || '.' || v_sequence;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing decisions to have numbers
DO $$
DECLARE
  dec_record RECORD;
  v_decision_number TEXT;
  v_resolution_id UUID;
BEGIN
  FOR dec_record IN 
    SELECT id, business_profile_id, category, title, created_at
    FROM decisions 
    WHERE decision_number IS NULL
    ORDER BY business_profile_id, created_at
  LOOP
    -- Try to find or create a foundational resolution for this profile
    SELECT id INTO v_resolution_id
    FROM resolutions
    WHERE business_profile_id = dec_record.business_profile_id
      AND title ILIKE '%założyciel%'
    LIMIT 1;
    
    -- If no foundational resolution exists, create one
    IF v_resolution_id IS NULL THEN
      INSERT INTO resolutions (
        business_profile_id,
        title,
        content,
        resolution_date,
        resolution_type,
        status
      ) VALUES (
        dec_record.business_profile_id,
        'Uchwała Założycielska - Podstawy Działalności',
        'Uchwała określająca podstawowe zasady prowadzenia działalności operacyjnej spółki.',
        CURRENT_DATE,
        'shareholders',
        'approved'
      )
      RETURNING id INTO v_resolution_id;
    END IF;
    
    -- Generate decision number
    v_decision_number := generate_decision_number(
      dec_record.business_profile_id,
      v_resolution_id,
      dec_record.category
    );
    
    -- Update decision
    UPDATE decisions
    SET 
      decision_number = v_decision_number,
      resolution_id = v_resolution_id,
      is_foundational = true,
      legal_reference = 'Uchwała Założycielska',
      scope_description = title
    WHERE id = dec_record.id;
  END LOOP;
END $$;

-- ============================================================================
-- 3. ADD DECISION REFERENCES TO DOCUMENTS
-- ============================================================================

-- Add decision_reference column to all document types
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS decision_reference TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS decision_reference TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS decision_reference TEXT;
ALTER TABLE company_documents ADD COLUMN IF NOT EXISTS decision_reference TEXT;

-- Create indexes for decision references
CREATE INDEX IF NOT EXISTS idx_contracts_decision_ref ON contracts(decision_reference) WHERE decision_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_decision_ref ON invoices(decision_reference) WHERE decision_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_decision_ref ON expenses(decision_reference) WHERE decision_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_documents_decision_ref ON company_documents(decision_reference) WHERE decision_reference IS NOT NULL;

-- Function to auto-populate decision_reference when decision_id is set
CREATE OR REPLACE FUNCTION sync_decision_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.decision_id IS NOT NULL THEN
    SELECT decision_number INTO NEW.decision_reference
    FROM decisions
    WHERE id = NEW.decision_id;
  ELSE
    NEW.decision_reference := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-syncing decision references
DROP TRIGGER IF EXISTS trigger_sync_contract_decision_ref ON contracts;
CREATE TRIGGER trigger_sync_contract_decision_ref
  BEFORE INSERT OR UPDATE OF decision_id ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION sync_decision_reference();

DROP TRIGGER IF EXISTS trigger_sync_invoice_decision_ref ON invoices;
CREATE TRIGGER trigger_sync_invoice_decision_ref
  BEFORE INSERT OR UPDATE OF decision_id ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_decision_reference();

DROP TRIGGER IF EXISTS trigger_sync_expense_decision_ref ON expenses;
CREATE TRIGGER trigger_sync_expense_decision_ref
  BEFORE INSERT OR UPDATE OF decision_id ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION sync_decision_reference();

DROP TRIGGER IF EXISTS trigger_sync_company_document_decision_ref ON company_documents;
CREATE TRIGGER trigger_sync_company_document_decision_ref
  BEFORE INSERT OR UPDATE OF decision_id ON company_documents
  FOR EACH ROW
  EXECUTE FUNCTION sync_decision_reference();

-- ============================================================================
-- 4. CREATE DOCUMENT HIERARCHY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW document_hierarchy AS
-- Contracts
SELECT 
  'contract' as doc_type,
  c.id as doc_id,
  c.number as doc_number,
  c.subject as doc_title,
  c.decision_id,
  c.decision_reference,
  d.decision_number,
  d.title as decision_title,
  d.resolution_id,
  r.resolution_number,
  r.title as resolution_title,
  c.business_profile_id,
  c.created_at,
  COALESCE(c.expected_amount, 0) as amount
FROM contracts c
LEFT JOIN decisions d ON c.decision_id = d.id
LEFT JOIN resolutions r ON d.resolution_id = r.id

UNION ALL

-- Invoices
SELECT 
  'invoice' as doc_type,
  i.id as doc_id,
  i.number as doc_number,
  i.number as doc_title,
  i.decision_id,
  i.decision_reference,
  d.decision_number,
  d.title as decision_title,
  d.resolution_id,
  r.resolution_number,
  r.title as resolution_title,
  i.business_profile_id,
  i.created_at,
  i.total_gross_value as amount
FROM invoices i
LEFT JOIN decisions d ON i.decision_id = d.id
LEFT JOIN resolutions r ON d.resolution_id = r.id

UNION ALL

-- Expenses
SELECT 
  'expense' as doc_type,
  e.id as doc_id,
  e.expense_number as doc_number,
  e.description as doc_title,
  e.decision_id,
  e.decision_reference,
  d.decision_number,
  d.title as decision_title,
  d.resolution_id,
  r.resolution_number,
  r.title as resolution_title,
  e.business_profile_id,
  e.created_at,
  e.amount
FROM expenses e
LEFT JOIN decisions d ON e.decision_id = d.id
LEFT JOIN resolutions r ON d.resolution_id = r.id

UNION ALL

-- Company Documents
SELECT 
  'document' as doc_type,
  cd.id as doc_id,
  cd.reference_number as doc_number,
  cd.title as doc_title,
  cd.decision_id,
  cd.decision_reference,
  d.decision_number,
  d.title as decision_title,
  d.resolution_id,
  r.resolution_number,
  r.title as resolution_title,
  cd.business_profile_id,
  cd.created_at,
  0 as amount
FROM company_documents cd
LEFT JOIN decisions d ON cd.decision_id = d.id
LEFT JOIN resolutions r ON d.resolution_id = r.id;

-- Grant access to the view
GRANT SELECT ON document_hierarchy TO authenticated;

-- ============================================================================
-- 5. UPDATE RLS POLICIES
-- ============================================================================

-- Ensure users can see decisions linked to their resolutions
DROP POLICY IF EXISTS "Users can view decisions" ON decisions;
CREATE POLICY "Users can view decisions"
  ON decisions FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get decision tree for a resolution
CREATE OR REPLACE FUNCTION get_decision_tree(p_resolution_id UUID)
RETURNS TABLE (
  decision_id UUID,
  decision_number TEXT,
  decision_title TEXT,
  category TEXT,
  status TEXT,
  contracts_count BIGINT,
  invoices_count BIGINT,
  expenses_count BIGINT,
  total_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as decision_id,
    d.decision_number,
    d.title as decision_title,
    d.category,
    d.status,
    COUNT(DISTINCT c.id) as contracts_count,
    COUNT(DISTINCT i.id) as invoices_count,
    COUNT(DISTINCT e.id) as expenses_count,
    COALESCE(SUM(DISTINCT i.total_gross_value), 0) + COALESCE(SUM(DISTINCT e.amount), 0) as total_amount
  FROM decisions d
  LEFT JOIN contracts c ON c.decision_id = d.id
  LEFT JOIN invoices i ON i.decision_id = d.id
  LEFT JOIN expenses e ON e.decision_id = d.id
  WHERE d.resolution_id = p_resolution_id
  GROUP BY d.id, d.decision_number, d.title, d.category, d.status
  ORDER BY d.decision_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get all documents for a decision
CREATE OR REPLACE FUNCTION get_decision_documents(p_decision_id UUID)
RETURNS TABLE (
  doc_type TEXT,
  doc_id UUID,
  doc_number TEXT,
  doc_title TEXT,
  amount NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM document_hierarchy
  WHERE decision_id = p_decision_id
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN decisions.decision_number IS 'Legal paragraph-style number (e.g., §1.2.3)';
COMMENT ON COLUMN decisions.resolution_id IS 'Source resolution that created this decision';
COMMENT ON COLUMN decisions.legal_reference IS 'Full legal reference text';
COMMENT ON COLUMN decisions.scope_description IS 'Description of what this decision authorizes';
COMMENT ON COLUMN decisions.is_foundational IS 'Whether this is an auto-created foundational decision';

COMMENT ON COLUMN resolutions.resolution_number IS 'Resolution number (e.g., 1/2024)';
COMMENT ON COLUMN resolutions.sequence_in_year IS 'Sequence number within the year';

COMMENT ON COLUMN contracts.decision_reference IS 'Cached decision number for display (e.g., §1.2.3)';
COMMENT ON COLUMN invoices.decision_reference IS 'Cached decision number for display (e.g., §1.2.3)';
COMMENT ON COLUMN expenses.decision_reference IS 'Cached decision number for display (e.g., §1.2.3)';

COMMENT ON VIEW document_hierarchy IS 'Unified view of all documents with their decision and resolution links';
COMMENT ON FUNCTION get_decision_tree IS 'Get all decisions under a resolution with usage statistics';
COMMENT ON FUNCTION get_decision_documents IS 'Get all documents linked to a specific decision';
