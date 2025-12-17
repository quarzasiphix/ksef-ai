-- Kasa (Cash Register) bridge tables for Treasury Engine
-- This keeps Kasa features working without relying on removed cash_* tables.
-- Balances remain derived from account_movements.

-- ============================================================================
-- KASA DOCUMENTS (metadata for KP/KW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS kasa_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  cash_account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
  document_number VARCHAR(50) NOT NULL,
  type VARCHAR(2) NOT NULL CHECK (type IN ('KP', 'KW')),

  -- Metadata
  description TEXT NOT NULL,
  counterparty_name VARCHAR(255),
  counterparty_tax_id VARCHAR(20),
  category VARCHAR(50) NOT NULL,
  linked_document_type VARCHAR(20),
  linked_document_id UUID,
  attachment_url TEXT,

  -- Tax/accounting flags
  is_tax_deductible BOOLEAN NOT NULL DEFAULT true,

  -- Approvals
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Cancellation (history-safe)
  is_cancelled BOOLEAN NOT NULL DEFAULT false,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(business_profile_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_kasa_docs_business_profile ON kasa_documents(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_kasa_docs_cash_account ON kasa_documents(cash_account_id);
CREATE INDEX IF NOT EXISTS idx_kasa_docs_type ON kasa_documents(type);
CREATE INDEX IF NOT EXISTS idx_kasa_docs_created_at ON kasa_documents(created_at DESC);

ALTER TABLE kasa_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their kasa documents" ON kasa_documents;
CREATE POLICY "Users can manage their kasa documents"
  ON kasa_documents
  FOR ALL
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- CASH SETTINGS (per business profile)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE UNIQUE,
  high_expense_warning_threshold DECIMAL(15,2) NOT NULL DEFAULT 1000,
  cash_share_warning_percentage DECIMAL(5,2) NOT NULL DEFAULT 30,
  require_approval_above DECIMAL(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE cash_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their cash settings" ON cash_settings;
CREATE POLICY "Users can view their cash settings"
  ON cash_settings FOR SELECT
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their cash settings" ON cash_settings;
CREATE POLICY "Users can insert their cash settings"
  ON cash_settings FOR INSERT
  WITH CHECK (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their cash settings" ON cash_settings;
CREATE POLICY "Users can update their cash settings"
  ON cash_settings FOR UPDATE
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- CASH RECONCILIATIONS (audit trail for cash counts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  cash_account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  system_balance DECIMAL(15,2) NOT NULL,
  counted_balance DECIMAL(15,2) NOT NULL,
  difference DECIMAL(15,2) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('match', 'surplus', 'shortage')),
  explanation TEXT,
  adjustment_movement_id UUID REFERENCES account_movements(id),
  counted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cash_recon_business_profile ON cash_reconciliations(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_cash_recon_cash_account ON cash_reconciliations(cash_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_recon_date ON cash_reconciliations(reconciliation_date DESC);

ALTER TABLE cash_reconciliations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their cash reconciliations" ON cash_reconciliations;
CREATE POLICY "Users can view their cash reconciliations"
  ON cash_reconciliations FOR SELECT
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their cash reconciliations" ON cash_reconciliations;
CREATE POLICY "Users can insert their cash reconciliations"
  ON cash_reconciliations FOR INSERT
  WITH CHECK (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- Backfill payment_accounts from existing bank_accounts (if missing)
-- ============================================================================
INSERT INTO payment_accounts (
  id, business_profile_id, account_type, name, currency, opening_balance,
  bank_name, account_number, is_active, created_at, updated_at
)
SELECT
  ba.id,
  ba.business_profile_id,
  'BANK',
  COALESCE(ba.account_name, ba.bank_name || ' - ' || RIGHT(ba.account_number, 4)),
  COALESCE(ba.currency, 'PLN'),
  COALESCE(ba.balance, 0),
  ba.bank_name,
  ba.account_number,
  true,
  ba.created_at,
  ba.updated_at
FROM bank_accounts ba
ON CONFLICT (id) DO NOTHING;
