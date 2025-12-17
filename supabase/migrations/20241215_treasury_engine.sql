-- Treasury Engine for Polish Spółka z o.o.
-- Core principle: Documents ≠ money movement. Payments create movements. Balances are derived.
-- Migration: Create payment_accounts, document_payments, account_movements, account_transfers

-- ============================================================================
-- PAYMENT ACCOUNTS (Unified Bank + Cash)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  account_type VARCHAR(10) NOT NULL CHECK (account_type IN ('BANK', 'CASH')),
  name VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
  -- Bank-specific
  bank_name VARCHAR(255),
  account_number VARCHAR(50),
  -- Cash-specific
  responsible_person VARCHAR(255),
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_accounts_business ON payment_accounts(business_profile_id);
CREATE INDEX idx_payment_accounts_type ON payment_accounts(account_type);
CREATE INDEX idx_payment_accounts_active ON payment_accounts(is_active);

-- ============================================================================
-- ACCOUNT MOVEMENTS (Source of Truth for Balances)
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  payment_account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN (
    'DOCUMENT_PAYMENT', 'TRANSFER', 'ADJUSTMENT', 'REVERSAL', 'OPENING_BALANCE'
  )),
  source_id UUID,
  description TEXT NOT NULL,
  -- Reversal tracking
  reversed_movement_id UUID REFERENCES account_movements(id),
  reversal_reason TEXT,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_business ON account_movements(business_profile_id);
CREATE INDEX idx_movements_account ON account_movements(payment_account_id);
CREATE INDEX idx_movements_source ON account_movements(source_type, source_id);
CREATE INDEX idx_movements_date ON account_movements(created_at DESC);
CREATE INDEX idx_movements_reversed ON account_movements(is_reversed);

-- ============================================================================
-- DOCUMENT PAYMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN (
    'sales_invoice', 'purchase_invoice', 'KP', 'KW'
  )),
  document_id UUID NOT NULL,
  payment_account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
  direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  payment_date DATE NOT NULL,
  notes TEXT,
  -- Link to movement
  movement_id UUID REFERENCES account_movements(id),
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_payments_business ON document_payments(business_profile_id);
CREATE INDEX idx_doc_payments_document ON document_payments(document_type, document_id);
CREATE INDEX idx_doc_payments_account ON document_payments(payment_account_id);
CREATE INDEX idx_doc_payments_date ON document_payments(payment_date DESC);
CREATE INDEX idx_doc_payments_movement ON document_payments(movement_id);

-- ============================================================================
-- ACCOUNT TRANSFERS (Bank↔Cash, Bank↔Bank)
-- ============================================================================
CREATE TABLE IF NOT EXISTS account_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  from_account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
  transfer_date DATE NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  -- Linked movements (always two: OUT from source, IN to destination)
  out_movement_id UUID NOT NULL REFERENCES account_movements(id),
  in_movement_id UUID NOT NULL REFERENCES account_movements(id),
  -- Audit
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Constraint: cannot transfer to same account
  CONSTRAINT different_accounts CHECK (from_account_id != to_account_id)
);

CREATE INDEX idx_transfers_business ON account_transfers(business_profile_id);
CREATE INDEX idx_transfers_from ON account_transfers(from_account_id);
CREATE INDEX idx_transfers_to ON account_transfers(to_account_id);
CREATE INDEX idx_transfers_date ON account_transfers(transfer_date DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transfers ENABLE ROW LEVEL SECURITY;

-- Payment Accounts
CREATE POLICY "Users can view their payment accounts"
  ON payment_accounts FOR SELECT
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their payment accounts"
  ON payment_accounts FOR INSERT
  WITH CHECK (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their payment accounts"
  ON payment_accounts FOR UPDATE
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Account Movements
CREATE POLICY "Users can view their movements"
  ON account_movements FOR SELECT
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their movements"
  ON account_movements FOR INSERT
  WITH CHECK (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their movements"
  ON account_movements FOR UPDATE
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Document Payments
CREATE POLICY "Users can view their document payments"
  ON document_payments FOR SELECT
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their document payments"
  ON document_payments FOR INSERT
  WITH CHECK (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- Account Transfers
CREATE POLICY "Users can view their transfers"
  ON account_transfers FOR SELECT
  USING (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their transfers"
  ON account_transfers FOR INSERT
  WITH CHECK (business_profile_id IN (SELECT id FROM business_profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- VIEWS: Computed Balances (NEVER store balances, always compute)
-- ============================================================================

CREATE OR REPLACE VIEW payment_account_balances AS
SELECT 
  pa.id AS payment_account_id,
  pa.business_profile_id,
  pa.name AS account_name,
  pa.account_type,
  pa.currency,
  pa.opening_balance,
  COALESCE(SUM(CASE WHEN m.direction = 'IN' AND NOT m.is_reversed THEN m.amount ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN m.direction = 'OUT' AND NOT m.is_reversed THEN m.amount ELSE 0 END), 0) AS total_out,
  pa.opening_balance 
    + COALESCE(SUM(CASE WHEN m.direction = 'IN' AND NOT m.is_reversed THEN m.amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN m.direction = 'OUT' AND NOT m.is_reversed THEN m.amount ELSE 0 END), 0) AS current_balance,
  COUNT(m.id) FILTER (WHERE NOT m.is_reversed) AS movement_count,
  MAX(m.created_at) FILTER (WHERE NOT m.is_reversed) AS last_movement_date
FROM payment_accounts pa
LEFT JOIN account_movements m ON m.payment_account_id = pa.id
WHERE pa.is_active = true
GROUP BY pa.id, pa.business_profile_id, pa.name, pa.account_type, pa.currency, pa.opening_balance;

-- View for document payment status
CREATE OR REPLACE VIEW document_payment_status AS
SELECT 
  dp.document_type,
  dp.document_id,
  dp.business_profile_id,
  dp.currency,
  COALESCE(SUM(dp.amount), 0) AS total_paid,
  COUNT(dp.id) AS payment_count
FROM document_payments dp
JOIN account_movements m ON m.id = dp.movement_id AND NOT m.is_reversed
GROUP BY dp.document_type, dp.document_id, dp.business_profile_id, dp.currency;

-- ============================================================================
-- FUNCTIONS: Treasury Operations
-- ============================================================================

-- Function to create a movement (used by all treasury operations)
CREATE OR REPLACE FUNCTION create_account_movement(
  p_business_profile_id UUID,
  p_payment_account_id UUID,
  p_direction VARCHAR(3),
  p_amount DECIMAL(15,2),
  p_currency VARCHAR(3),
  p_source_type VARCHAR(20),
  p_source_id UUID,
  p_description TEXT,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_movement_id UUID;
BEGIN
  INSERT INTO account_movements (
    business_profile_id,
    payment_account_id,
    direction,
    amount,
    currency,
    source_type,
    source_id,
    description,
    created_by
  ) VALUES (
    p_business_profile_id,
    p_payment_account_id,
    p_direction,
    p_amount,
    p_currency,
    p_source_type,
    p_source_id,
    p_description,
    p_created_by
  )
  RETURNING id INTO v_movement_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reverse a movement (for corrections)
CREATE OR REPLACE FUNCTION reverse_movement(
  p_movement_id UUID,
  p_reason TEXT,
  p_created_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_original RECORD;
  v_reversal_id UUID;
  v_opposite_direction VARCHAR(3);
BEGIN
  -- Get original movement
  SELECT * INTO v_original FROM account_movements WHERE id = p_movement_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movement not found: %', p_movement_id;
  END IF;
  
  IF v_original.is_reversed THEN
    RAISE EXCEPTION 'Movement already reversed: %', p_movement_id;
  END IF;
  
  -- Determine opposite direction
  v_opposite_direction := CASE WHEN v_original.direction = 'IN' THEN 'OUT' ELSE 'IN' END;
  
  -- Create reversal movement
  INSERT INTO account_movements (
    business_profile_id,
    payment_account_id,
    direction,
    amount,
    currency,
    source_type,
    source_id,
    description,
    reversed_movement_id,
    reversal_reason,
    created_by
  ) VALUES (
    v_original.business_profile_id,
    v_original.payment_account_id,
    v_opposite_direction,
    v_original.amount,
    v_original.currency,
    'REVERSAL',
    v_original.source_id,
    'REVERSAL: ' || v_original.description,
    p_movement_id,
    p_reason,
    p_created_by
  )
  RETURNING id INTO v_reversal_id;
  
  -- Mark original as reversed
  UPDATE account_movements SET is_reversed = true WHERE id = p_movement_id;
  
  RETURN v_reversal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get account balance at a point in time
CREATE OR REPLACE FUNCTION get_account_balance_at(
  p_payment_account_id UUID,
  p_as_of TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
  v_opening_balance DECIMAL(15,2);
  v_total_in DECIMAL(15,2);
  v_total_out DECIMAL(15,2);
BEGIN
  SELECT opening_balance INTO v_opening_balance 
  FROM payment_accounts WHERE id = p_payment_account_id;
  
  SELECT 
    COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0)
  INTO v_total_in, v_total_out
  FROM account_movements 
  WHERE payment_account_id = p_payment_account_id 
    AND NOT is_reversed
    AND created_at <= p_as_of;
  
  RETURN v_opening_balance + v_total_in - v_total_out;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- MIGRATION: Move existing bank_accounts and cash_accounts to payment_accounts
-- ============================================================================

-- Insert existing bank accounts (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bank_accounts') THEN
    INSERT INTO payment_accounts (
      id, business_profile_id, account_type, name, currency, opening_balance,
      bank_name, account_number, is_active, created_at, updated_at
    )
    SELECT 
      id, business_profile_id, 'BANK', 
      COALESCE(account_name, bank_name || ' - ' || RIGHT(account_number, 4)),
      COALESCE(currency, 'PLN'),
      COALESCE(balance, 0),
      bank_name, account_number, true, created_at, updated_at
    FROM bank_accounts
    ON CONFLICT (id) DO NOTHING;
    
    -- Create opening balance movements for existing bank accounts
    INSERT INTO account_movements (
      business_profile_id, payment_account_id, direction, amount, currency,
      source_type, description, created_by, created_at
    )
    SELECT 
      ba.business_profile_id, ba.id, 'IN', ABS(ba.balance), COALESCE(ba.currency, 'PLN'),
      'OPENING_BALANCE', 'Saldo początkowe (migracja)',
      (SELECT user_id FROM business_profiles WHERE id = ba.business_profile_id),
      ba.created_at
    FROM bank_accounts ba
    WHERE ba.balance != 0
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert existing cash accounts (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cash_accounts') THEN
    INSERT INTO payment_accounts (
      id, business_profile_id, account_type, name, currency, opening_balance,
      responsible_person, is_active, created_at, updated_at
    )
    SELECT 
      id, business_profile_id, 'CASH', name, COALESCE(currency, 'PLN'),
      COALESCE(opening_balance, 0),
      responsible_person, status = 'active', created_at, updated_at
    FROM cash_accounts
    ON CONFLICT (id) DO NOTHING;
    
    -- Create opening balance movements for existing cash accounts
    INSERT INTO account_movements (
      business_profile_id, payment_account_id, direction, amount, currency,
      source_type, description, created_by, created_at
    )
    SELECT 
      ca.business_profile_id, ca.id, 'IN', ABS(ca.opening_balance), COALESCE(ca.currency, 'PLN'),
      'OPENING_BALANCE', 'Saldo początkowe (migracja)',
      (SELECT user_id FROM business_profiles WHERE id = ca.business_profile_id),
      ca.created_at
    FROM cash_accounts ca
    WHERE ca.opening_balance != 0
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
