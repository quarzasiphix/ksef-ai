-- Decisions / Mandates System
-- Core concept: Every operational document must trace back to an authorizing decision
-- This creates a causality engine for legal reality

-- ============================================
-- DECISIONS (DECYZJE / MANDATY) TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Link to the authorizing resolution (uchwała)
  resolution_id UUID REFERENCES resolutions(id) ON DELETE SET NULL,
  
  -- Decision metadata
  title TEXT NOT NULL,
  description TEXT,
  
  -- Decision type: strategic (shareholders) vs operational (board)
  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'strategic_shareholders',  -- Uchwała wspólników
    'operational_board'        -- Uchwała zarządu
  )),
  
  -- Decision category (what it authorizes)
  category TEXT NOT NULL CHECK (category IN (
    'operational_activity',    -- Zgoda na prowadzenie działalności operacyjnej
    'company_financing',       -- Zgoda na finansowanie spółki (kapitał/pożyczki)
    'compensation',            -- Zgoda na wynagrodzenie wspólników/zarządu
    'sales_services',          -- Zgoda na sprzedaż produktów/usług
    'operational_costs',       -- Zgoda na ponoszenie kosztów operacyjnych
    'b2b_contracts',           -- Zgoda na zawieranie umów B2B
    'custom_projects',         -- Zgoda na projekty niestandardowe
    'other'                    -- Inne
  )),
  
  -- Scope and limits
  scope_description TEXT,  -- What is allowed in detail
  
  -- Financial limits (optional)
  amount_limit DECIMAL(15,2),  -- Max amount authorized
  currency TEXT DEFAULT 'PLN',
  
  -- Time limits
  valid_from DATE,
  valid_to DATE,
  
  -- Counterparty restrictions (optional JSONB array)
  allowed_counterparties JSONB DEFAULT '[]',  -- [{name: "...", nip: "..."}]
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',      -- Currently valid
    'expired',     -- Past valid_to date
    'revoked',     -- Manually revoked
    'superseded'   -- Replaced by newer decision
  )),
  
  -- Usage tracking (computed fields, updated by triggers or app logic)
  total_contracts INTEGER DEFAULT 0,
  total_invoices INTEGER DEFAULT 0,
  total_expenses INTEGER DEFAULT 0,
  total_amount_used DECIMAL(15,2) DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decisions_profile ON decisions(business_profile_id);
CREATE INDEX idx_decisions_resolution ON decisions(resolution_id);
CREATE INDEX idx_decisions_status ON decisions(status) WHERE status = 'active';
CREATE INDEX idx_decisions_category ON decisions(category);
CREATE INDEX idx_decisions_valid_period ON decisions(valid_from, valid_to);

ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their decisions"
  ON decisions
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ADD DECISION_ID TO EXISTING TABLES
-- ============================================

-- Contracts must reference a decision
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'decision_id') THEN
    ALTER TABLE contracts ADD COLUMN decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contracts_decision ON contracts(decision_id);

-- Invoices must reference a decision
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoices' AND column_name = 'decision_id') THEN
    ALTER TABLE invoices ADD COLUMN decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_decision ON invoices(decision_id);

-- Expenses must reference a decision
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'decision_id') THEN
    ALTER TABLE expenses ADD COLUMN decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_expenses_decision ON expenses(decision_id);

-- Company documents can optionally reference a decision
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_documents' AND column_name = 'decision_id') THEN
    ALTER TABLE company_documents ADD COLUMN decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_documents_decision ON company_documents(decision_id);

-- ============================================
-- FOUNDATIONAL DECISIONS INITIALIZATION
-- ============================================
-- Function to create default decisions for a new business profile
CREATE OR REPLACE FUNCTION initialize_foundational_decisions(profile_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strategic decisions (shareholders)
  INSERT INTO decisions (
    business_profile_id,
    title,
    description,
    decision_type,
    category,
    scope_description,
    status
  ) VALUES
  (
    profile_id,
    'Zgoda na prowadzenie działalności operacyjnej',
    'Uchwała wspólników zezwalająca na prowadzenie bieżącej działalności gospodarczej spółki',
    'strategic_shareholders',
    'operational_activity',
    'Zarząd jest upoważniony do prowadzenia bieżącej działalności operacyjnej spółki zgodnie z przedmiotem działalności',
    'active'
  ),
  (
    profile_id,
    'Zgoda na finansowanie spółki',
    'Uchwała wspólników dotycząca kapitału zakładowego i możliwości zaciągania pożyczek',
    'strategic_shareholders',
    'company_financing',
    'Zarząd może zaciągać zobowiązania finansowe w ramach prowadzonej działalności',
    'active'
  ),
  (
    profile_id,
    'Zgoda na wynagrodzenie zarządu',
    'Uchwała wspólników określająca zasady wynagradzania członków zarządu',
    'strategic_shareholders',
    'compensation',
    'Członkowie zarządu otrzymują wynagrodzenie zgodnie z umowami o zarządzanie',
    'active'
  );

  -- Operational decisions (board)
  INSERT INTO decisions (
    business_profile_id,
    title,
    description,
    decision_type,
    category,
    scope_description,
    status
  ) VALUES
  (
    profile_id,
    'Zgoda na sprzedaż produktów i usług',
    'Uchwała zarządu zezwalająca na prowadzenie sprzedaży w ramach działalności',
    'operational_board',
    'sales_services',
    'Spółka może zawierać umowy sprzedaży produktów i świadczenia usług zgodnie z przedmiotem działalności',
    'active'
  ),
  (
    profile_id,
    'Zgoda na ponoszenie kosztów operacyjnych',
    'Uchwała zarządu dotycząca wydatków operacyjnych',
    'operational_board',
    'operational_costs',
    'Zarząd może ponosić koszty niezbędne do prowadzenia działalności: wynagrodzenia, usługi, materiały, infrastruktura',
    'active'
  ),
  (
    profile_id,
    'Zgoda na zawieranie umów B2B',
    'Uchwała zarządu zezwalająca na zawieranie umów z kontrahentami',
    'operational_board',
    'b2b_contracts',
    'Spółka może zawierać umowy z dostawcami, usługodawcami i innymi kontrahentami',
    'active'
  );
END;
$$;

-- ============================================
-- TRIGGERS FOR USAGE TRACKING
-- ============================================

-- Update decision usage when contract is linked
CREATE OR REPLACE FUNCTION update_decision_usage_on_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.decision_id IS NOT NULL THEN
    UPDATE decisions
    SET 
      total_contracts = (
        SELECT COUNT(*) FROM contracts WHERE decision_id = NEW.decision_id
      ),
      updated_at = now()
    WHERE id = NEW.decision_id;
  END IF;
  
  IF OLD.decision_id IS NOT NULL AND OLD.decision_id != NEW.decision_id THEN
    UPDATE decisions
    SET 
      total_contracts = (
        SELECT COUNT(*) FROM contracts WHERE decision_id = OLD.decision_id
      ),
      updated_at = now()
    WHERE id = OLD.decision_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_decision_usage_on_contract
AFTER INSERT OR UPDATE OF decision_id ON contracts
FOR EACH ROW
EXECUTE FUNCTION update_decision_usage_on_contract();

-- Update decision usage when invoice is linked
CREATE OR REPLACE FUNCTION update_decision_usage_on_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.decision_id IS NOT NULL THEN
    UPDATE decisions
    SET 
      total_invoices = (
        SELECT COUNT(*) FROM invoices WHERE decision_id = NEW.decision_id
      ),
      total_amount_used = (
        SELECT COALESCE(SUM(total_gross_value), 0) 
        FROM invoices 
        WHERE decision_id = NEW.decision_id
      ),
      updated_at = now()
    WHERE id = NEW.decision_id;
  END IF;
  
  IF OLD.decision_id IS NOT NULL AND OLD.decision_id != NEW.decision_id THEN
    UPDATE decisions
    SET 
      total_invoices = (
        SELECT COUNT(*) FROM invoices WHERE decision_id = OLD.decision_id
      ),
      total_amount_used = (
        SELECT COALESCE(SUM(total_gross_value), 0) 
        FROM invoices 
        WHERE decision_id = OLD.decision_id
      ),
      updated_at = now()
    WHERE id = OLD.decision_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_decision_usage_on_invoice
AFTER INSERT OR UPDATE OF decision_id ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_decision_usage_on_invoice();

-- Update decision usage when expense is linked
CREATE OR REPLACE FUNCTION update_decision_usage_on_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.decision_id IS NOT NULL THEN
    UPDATE decisions
    SET 
      total_expenses = (
        SELECT COUNT(*) FROM expenses WHERE decision_id = NEW.decision_id
      ),
      updated_at = now()
    WHERE id = NEW.decision_id;
  END IF;
  
  IF OLD.decision_id IS NOT NULL AND OLD.decision_id != NEW.decision_id THEN
    UPDATE decisions
    SET 
      total_expenses = (
        SELECT COUNT(*) FROM expenses WHERE decision_id = OLD.decision_id
      ),
      updated_at = now()
    WHERE id = OLD.decision_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_decision_usage_on_expense
AFTER INSERT OR UPDATE OF decision_id ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_decision_usage_on_expense();

-- ============================================
-- AUTO-EXPIRE DECISIONS
-- ============================================
-- Function to mark decisions as expired when valid_to passes
CREATE OR REPLACE FUNCTION auto_expire_decisions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE decisions
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND valid_to IS NOT NULL
    AND valid_to < CURRENT_DATE;
END;
$$;

-- This should be called periodically (e.g., daily cron job or on app startup)
