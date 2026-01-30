-- Multi-Line Journal Entries System Migration
-- This migration adds support for multi-line journal entries, capital events, and accounting bridges

-- ============================================================================
-- 1. JOURNAL ENTRIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  period_id UUID REFERENCES accounting_periods(id),
  
  -- Status and workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  posting_rule_id UUID REFERENCES posting_rules(id),
  rule_match_explain JSONB,
  
  -- Totals (must be balanced to post)
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  -- Metadata
  description TEXT,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  void_reason TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT balanced_entry CHECK (
    (status = 'draft') OR 
    (status IN ('posted', 'voided') AND total_debit = total_credit)
  ),
  CONSTRAINT positive_amounts CHECK (total_debit >= 0 AND total_credit >= 0)
);

-- Indexes for performance
CREATE INDEX idx_journal_entries_business_profile ON journal_entries(business_profile_id);
CREATE INDEX idx_journal_entries_event ON journal_entries(event_id);
CREATE INDEX idx_journal_entries_period ON journal_entries(period_id);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_posted_at ON journal_entries(posted_at) WHERE posted_at IS NOT NULL;

-- ============================================================================
-- 2. JOURNAL ENTRY LINES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  
  -- Line ordering and side
  line_number INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('debit', 'credit')),
  
  -- Account reference
  account_id UUID REFERENCES chart_of_accounts(id),
  account_code TEXT,
  account_name TEXT,
  
  -- Amount
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  -- Metadata
  description TEXT,
  analytic_tags JSONB DEFAULT '{}',
  meta JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(journal_entry_id, line_number)
);

-- Indexes
CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id);
CREATE INDEX idx_journal_entry_lines_side ON journal_entry_lines(side);

-- ============================================================================
-- 3. CAPITAL EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS capital_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('contribution', 'repayment', 'conversion', 'distribution')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  
  -- Counterparty
  shareholder_id UUID REFERENCES shareholders(id),
  counterparty_name TEXT,
  
  -- Payment details
  payment_method TEXT CHECK (payment_method IN ('bank', 'cash', 'in_kind', 'offset')),
  payment_account_id UUID REFERENCES bank_accounts(id),
  
  -- Dates and description
  event_date DATE NOT NULL,
  description TEXT,
  notes TEXT,
  
  -- Accounting links
  event_id UUID REFERENCES events(id),
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'cancelled')),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_capital_events_business_profile ON capital_events(business_profile_id);
CREATE INDEX idx_capital_events_shareholder ON capital_events(shareholder_id);
CREATE INDEX idx_capital_events_event_date ON capital_events(event_date);
CREATE INDEX idx_capital_events_status ON capital_events(status);
CREATE INDEX idx_capital_events_event ON capital_events(event_id) WHERE event_id IS NOT NULL;

-- ============================================================================
-- 4. CONTRACT ACCOUNTING LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_accounting_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  link_type TEXT NOT NULL CHECK (link_type IN ('activation', 'billing', 'settlement', 'termination', 'adjustment')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(contract_id, event_id)
);

-- Indexes
CREATE INDEX idx_contract_accounting_links_contract ON contract_accounting_links(contract_id);
CREATE INDEX idx_contract_accounting_links_event ON contract_accounting_links(event_id);
CREATE INDEX idx_contract_accounting_links_journal ON contract_accounting_links(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ============================================================================
-- 5. DOCUMENT ACCOUNTING LINKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_accounting_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  link_type TEXT NOT NULL CHECK (link_type IN ('financial_impact', 'settlement', 'adjustment', 'reversal')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(generated_document_id, event_id)
);

-- Indexes
CREATE INDEX idx_document_accounting_links_document ON document_accounting_links(generated_document_id);
CREATE INDEX idx_document_accounting_links_event ON document_accounting_links(event_id);
CREATE INDEX idx_document_accounting_links_journal ON document_accounting_links(journal_entry_id) WHERE journal_entry_id IS NOT NULL;

-- ============================================================================
-- 6. RLS POLICIES
-- ============================================================================

-- Journal Entries RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal entries for their business profiles"
  ON journal_entries FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create journal entries for their business profiles"
  ON journal_entries FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update draft journal entries for their business profiles"
  ON journal_entries FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  )
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Journal Entry Lines RLS
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view journal entry lines for their entries"
  ON journal_entry_lines FOR SELECT
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries 
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage lines for their draft entries"
  ON journal_entry_lines FOR ALL
  USING (
    journal_entry_id IN (
      SELECT id FROM journal_entries 
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
      AND status = 'draft'
    )
  );

-- Capital Events RLS
ALTER TABLE capital_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view capital events for their business profiles"
  ON capital_events FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create capital events for their business profiles"
  ON capital_events FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update capital events for their business profiles"
  ON capital_events FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Contract Accounting Links RLS
ALTER TABLE contract_accounting_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract accounting links for their contracts"
  ON contract_accounting_links FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM contracts 
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Document Accounting Links RLS
ALTER TABLE document_accounting_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document accounting links for their documents"
  ON document_accounting_links FOR SELECT
  USING (
    generated_document_id IN (
      SELECT id FROM generated_documents 
      WHERE business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- 7. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update journal entry totals
CREATE OR REPLACE FUNCTION update_journal_entry_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE journal_entries
  SET 
    total_debit = (
      SELECT COALESCE(SUM(amount), 0)
      FROM journal_entry_lines
      WHERE journal_entry_id = NEW.journal_entry_id AND side = 'debit'
    ),
    total_credit = (
      SELECT COALESCE(SUM(amount), 0)
      FROM journal_entry_lines
      WHERE journal_entry_id = NEW.journal_entry_id AND side = 'credit'
    ),
    updated_at = NOW()
  WHERE id = NEW.journal_entry_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update totals when lines change
CREATE TRIGGER update_journal_totals_on_line_change
  AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_journal_entry_totals();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_entry_lines_updated_at
  BEFORE UPDATE ON journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_capital_events_updated_at
  BEFORE UPDATE ON capital_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE journal_entries IS 'Multi-line journal entries supporting complex accounting transactions';
COMMENT ON TABLE journal_entry_lines IS 'Individual debit/credit lines within journal entries';
COMMENT ON TABLE capital_events IS 'Capital contributions, repayments, and distributions for spółka';
COMMENT ON TABLE contract_accounting_links IS 'Links contracts to accounting events and journal entries';
COMMENT ON TABLE document_accounting_links IS 'Links generated documents to accounting events and journal entries';

COMMENT ON COLUMN journal_entries.status IS 'draft: editable, posted: immutable and balanced, voided: cancelled';
COMMENT ON COLUMN journal_entries.rule_match_explain IS 'JSON explanation of which posting rule matched and why';
COMMENT ON COLUMN journal_entry_lines.analytic_tags IS 'JSON tags for analytics (department, project, etc.)';
COMMENT ON COLUMN capital_events.event_type IS 'contribution: dopłata, repayment: zwrot, distribution: wypłata zysku';
