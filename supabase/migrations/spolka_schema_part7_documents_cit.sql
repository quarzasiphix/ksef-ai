-- Part 7: Company Documents Storage & CIT Advances

-- ============================================
-- COMPANY DOCUMENTS METADATA TABLE
-- ============================================
-- Tracks documents stored in Supabase Storage buckets
CREATE TABLE IF NOT EXISTS company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Document categorization
  category TEXT NOT NULL CHECK (category IN (
    'contracts_vehicles',
    'contracts_infrastructure', 
    'contracts_services',
    'contracts_other',
    'resolutions',
    'licenses',
    'financial_statements',
    'tax_filings',
    'other'
  )),
  
  -- File information
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in storage bucket
  file_size INTEGER,
  mime_type TEXT,
  
  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  document_date DATE, -- Date of the document itself
  expiry_date DATE, -- For licenses, contracts with expiry
  reference_number TEXT, -- Contract number, license number, etc.
  
  -- Linking to other entities
  linked_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  linked_resolution_id UUID REFERENCES resolutions(id) ON DELETE SET NULL,
  
  -- Audit
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for company_documents
ALTER TABLE company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company documents"
  ON company_documents
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_company_documents_profile ON company_documents(business_profile_id);
CREATE INDEX idx_company_documents_category ON company_documents(category);

-- ============================================
-- CIT ADVANCES TRACKING
-- ============================================
CREATE TABLE IF NOT EXISTS cit_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Period
  fiscal_year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly')),
  period_number INTEGER NOT NULL, -- 1-12 for monthly, 1-4 for quarterly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Cumulative figures (YTD at end of period)
  revenue_ytd DECIMAL(15,2) NOT NULL DEFAULT 0,
  costs_ytd DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit_ytd DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- CIT calculation
  cit_rate INTEGER NOT NULL DEFAULT 19, -- 9 or 19
  tax_due_ytd DECIMAL(15,2) NOT NULL DEFAULT 0,
  advances_paid_ytd DECIMAL(15,2) NOT NULL DEFAULT 0,
  advance_due DECIMAL(15,2) NOT NULL DEFAULT 0, -- This period's advance
  
  -- Payment tracking
  payment_deadline DATE NOT NULL,
  payment_date DATE,
  payment_amount DECIMAL(15,2),
  payment_reference TEXT, -- Bank transfer reference
  
  -- Status
  status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN (
    'calculated',  -- System calculated, not yet due
    'due',         -- Payment deadline approaching
    'paid',        -- Advance paid
    'zero',        -- No payment needed (loss or already covered)
    'overdue'      -- Past deadline, unpaid
  )),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_profile_id, fiscal_year, period_type, period_number)
);

-- RLS for cit_advances
ALTER TABLE cit_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their CIT advances"
  ON cit_advances
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_cit_advances_profile_year ON cit_advances(business_profile_id, fiscal_year);

-- ============================================
-- CIT-8 ANNUAL DECLARATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS cit_annual_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  fiscal_year INTEGER NOT NULL,
  
  -- Income statement figures
  total_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_costs DECIMAL(15,2) NOT NULL DEFAULT 0,
  gross_profit DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Tax adjustments
  non_deductible_costs DECIMAL(15,2) DEFAULT 0,
  tax_exempt_revenue DECIMAL(15,2) DEFAULT 0,
  taxable_income DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- CIT calculation
  cit_rate INTEGER NOT NULL DEFAULT 19,
  cit_due DECIMAL(15,2) NOT NULL DEFAULT 0,
  advances_paid DECIMAL(15,2) NOT NULL DEFAULT 0,
  final_payment DECIMAL(15,2) NOT NULL DEFAULT 0, -- cit_due - advances_paid
  
  -- Filing
  filing_deadline DATE NOT NULL,
  filed_at TIMESTAMPTZ,
  payment_deadline DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'calculated',
    'filed',
    'paid',
    'amended'
  )),
  
  -- Document attachment
  declaration_file_path TEXT,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_profile_id, fiscal_year)
);

-- RLS for cit_annual_declarations
ALTER TABLE cit_annual_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their CIT declarations"
  ON cit_annual_declarations
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ADD CIT SETTINGS TO BUSINESS PROFILES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'cit_advance_type') THEN
    ALTER TABLE business_profiles ADD COLUMN cit_advance_type TEXT DEFAULT 'quarterly' 
      CHECK (cit_advance_type IN ('monthly', 'quarterly'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'business_profiles' AND column_name = 'is_small_taxpayer') THEN
    ALTER TABLE business_profiles ADD COLUMN is_small_taxpayer BOOLEAN DEFAULT false;
  END IF;
END $$;
