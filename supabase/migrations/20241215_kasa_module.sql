-- Kasa (Cash Register) Module for Polish Spółka
-- Migration: Create tables for cash accounts, transactions, reconciliations, and settings

-- ============================================================================
-- CASH ACCOUNTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  responsible_person VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_accounts_business_profile ON cash_accounts(business_profile_id);
CREATE INDEX idx_cash_accounts_status ON cash_accounts(status);

-- ============================================================================
-- CASH TRANSACTIONS (KP/KW)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE CASCADE,
  document_number VARCHAR(50) NOT NULL,
  type VARCHAR(2) NOT NULL CHECK (type IN ('KP', 'KW')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description TEXT NOT NULL,
  counterparty_name VARCHAR(255),
  counterparty_tax_id VARCHAR(20),
  category VARCHAR(50) NOT NULL,
  linked_document_type VARCHAR(20),
  linked_document_id UUID,
  attachment_url TEXT,
  is_tax_deductible BOOLEAN NOT NULL DEFAULT true,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_transactions_business_profile ON cash_transactions(business_profile_id);
CREATE INDEX idx_cash_transactions_cash_account ON cash_transactions(cash_account_id);
CREATE INDEX idx_cash_transactions_date ON cash_transactions(date DESC);
CREATE INDEX idx_cash_transactions_type ON cash_transactions(type);
CREATE INDEX idx_cash_transactions_document_number ON cash_transactions(document_number);
CREATE UNIQUE INDEX idx_cash_transactions_unique_doc ON cash_transactions(business_profile_id, document_number);

-- ============================================================================
-- CASH TRANSFERS (Bank <-> Cash)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('bank_to_cash', 'cash_to_bank')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_transfers_business_profile ON cash_transfers(business_profile_id);
CREATE INDEX idx_cash_transfers_cash_account ON cash_transfers(cash_account_id);
CREATE INDEX idx_cash_transfers_date ON cash_transfers(date DESC);

-- ============================================================================
-- CASH RECONCILIATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS cash_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  cash_account_id UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE CASCADE,
  reconciliation_date DATE NOT NULL,
  system_balance DECIMAL(15,2) NOT NULL,
  counted_balance DECIMAL(15,2) NOT NULL,
  difference DECIMAL(15,2) NOT NULL,
  result VARCHAR(20) NOT NULL CHECK (result IN ('match', 'surplus', 'shortage')),
  explanation TEXT,
  counted_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cash_reconciliations_business_profile ON cash_reconciliations(business_profile_id);
CREATE INDEX idx_cash_reconciliations_cash_account ON cash_reconciliations(cash_account_id);
CREATE INDEX idx_cash_reconciliations_date ON cash_reconciliations(reconciliation_date DESC);

-- ============================================================================
-- CASH SETTINGS
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

CREATE UNIQUE INDEX idx_cash_settings_business_profile ON cash_settings(business_profile_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_settings ENABLE ROW LEVEL SECURITY;

-- Cash Accounts policies
CREATE POLICY "Users can view their own cash accounts"
  ON cash_accounts FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cash accounts"
  ON cash_accounts FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own cash accounts"
  ON cash_accounts FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own cash accounts"
  ON cash_accounts FOR DELETE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Cash Transactions policies
CREATE POLICY "Users can view their own cash transactions"
  ON cash_transactions FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cash transactions"
  ON cash_transactions FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own cash transactions"
  ON cash_transactions FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own cash transactions"
  ON cash_transactions FOR DELETE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Cash Transfers policies
CREATE POLICY "Users can view their own cash transfers"
  ON cash_transfers FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cash transfers"
  ON cash_transfers FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Cash Reconciliations policies
CREATE POLICY "Users can view their own cash reconciliations"
  ON cash_reconciliations FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cash reconciliations"
  ON cash_reconciliations FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Cash Settings policies
CREATE POLICY "Users can view their own cash settings"
  ON cash_settings FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own cash settings"
  ON cash_settings FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own cash settings"
  ON cash_settings FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Update cash balance
-- ============================================================================
CREATE OR REPLACE FUNCTION update_cash_balance(
  p_cash_account_id UUID,
  p_amount DECIMAL(15,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE cash_accounts
  SET 
    current_balance = current_balance + p_amount,
    updated_at = NOW()
  WHERE id = p_cash_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cash-attachments', 'cash-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload cash attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'cash-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view cash attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'cash-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cash attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'cash-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM business_profiles WHERE user_id = auth.uid()
    )
  );
