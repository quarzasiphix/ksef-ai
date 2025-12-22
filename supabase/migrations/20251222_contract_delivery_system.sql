-- Contract Delivery System
-- Extends document_deliveries to support contract sending/receiving with invoice attachments
-- Integrates with spółka decision tracking for governance

-- ============================================================================
-- CONTRACT DELIVERY EXTENSIONS
-- ============================================================================

-- Add contract support to document_deliveries
DO $$
BEGIN
  -- Add contract_id reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_deliveries' AND column_name = 'contract_id') THEN
    ALTER TABLE document_deliveries 
      ADD COLUMN contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;
  END IF;
  
  -- Add attached_invoice_ids for combo deliveries (contract + invoices)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_deliveries' AND column_name = 'attached_invoice_ids') THEN
    ALTER TABLE document_deliveries 
      ADD COLUMN attached_invoice_ids UUID[] DEFAULT '{}';
  END IF;
END $$;

-- Update document_type enum to include contract
DO $$
BEGIN
  -- Check if 'contract' type already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'contract' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
  ) THEN
    -- Add 'contract' to document_type enum
    ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'contract';
  END IF;
  
  -- Add 'contract_invoice_combo' for combined deliveries
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'contract_invoice_combo' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')
  ) THEN
    ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'contract_invoice_combo';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_document_deliveries_contract_id ON document_deliveries(contract_id);
CREATE INDEX IF NOT EXISTS idx_document_deliveries_attached_invoices ON document_deliveries USING GIN(attached_invoice_ids);

-- ============================================================================
-- CONTRACT AGREEMENT WORKFLOW
-- ============================================================================

-- Add agreement tracking to contracts table
DO $$
BEGIN
  -- Agreement status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'agreement_status') THEN
    ALTER TABLE contracts 
      ADD COLUMN agreement_status TEXT DEFAULT 'draft' 
      CHECK (agreement_status IN (
        'draft',
        'sent',
        'received',
        'under_discussion',
        'correction_needed',
        'approved',
        'signed',
        'rejected',
        'cancelled'
      ));
  END IF;
  
  -- Agreement timestamps
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'agreement_sent_at') THEN
    ALTER TABLE contracts ADD COLUMN agreement_sent_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'agreement_received_at') THEN
    ALTER TABLE contracts ADD COLUMN agreement_received_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'agreement_approved_at') THEN
    ALTER TABLE contracts ADD COLUMN agreement_approved_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'agreement_signed_at') THEN
    ALTER TABLE contracts ADD COLUMN agreement_signed_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'agreement_rejected_at') THEN
    ALTER TABLE contracts ADD COLUMN agreement_rejected_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contracts' AND column_name = 'agreement_rejection_reason') THEN
    ALTER TABLE contracts ADD COLUMN agreement_rejection_reason TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contracts_agreement_status ON contracts(agreement_status);

-- ============================================================================
-- CONTRACT AGREEMENT HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS contract_agreement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  previous_status TEXT,
  new_status TEXT NOT NULL,
  
  action TEXT NOT NULL CHECK (action IN (
    'sent',
    'received',
    'discussed',
    'approved',
    'signed',
    'rejected',
    'corrected',
    'cancelled'
  )),
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contract_agreement_history_contract_id ON contract_agreement_history(contract_id);
CREATE INDEX idx_contract_agreement_history_user_id ON contract_agreement_history(user_id);
CREATE INDEX idx_contract_agreement_history_created_at ON contract_agreement_history(created_at DESC);

-- RLS for contract agreement history
ALTER TABLE contract_agreement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract agreement history for accessible contracts"
  ON contract_agreement_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_agreement_history.contract_id
      AND contracts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM document_deliveries
      WHERE document_deliveries.contract_id = contract_agreement_history.contract_id
      AND document_deliveries.recipient_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert contract agreement history for own contracts"
  ON contract_agreement_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_agreement_history.contract_id
      AND contracts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM document_deliveries
      WHERE document_deliveries.contract_id = contract_agreement_history.contract_id
      AND document_deliveries.recipient_business_profile_id IN (
        SELECT id FROM business_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- SPÓŁKA DECISION TRACKING FOR CONTRACTS
-- ============================================================================

-- Link contracts to decisions (already exists via decision_id column)
-- Add reverse lookup index
CREATE INDEX IF NOT EXISTS idx_contracts_decision_id ON contracts(decision_id) WHERE decision_id IS NOT NULL;

-- Add contract execution tracking to decisions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'contract_executed') THEN
    ALTER TABLE decisions 
      ADD COLUMN contract_executed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'contract_executed_at') THEN
    ALTER TABLE decisions 
      ADD COLUMN contract_executed_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'contract_id') THEN
    ALTER TABLE decisions 
      ADD COLUMN contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_decisions_contract_id ON decisions(contract_id) WHERE contract_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update contract agreement status
CREATE OR REPLACE FUNCTION update_contract_agreement_status(
  p_contract_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status
  SELECT agreement_status INTO v_current_status
  FROM contracts
  WHERE id = p_contract_id;

  -- Update contract status
  UPDATE contracts
  SET 
    agreement_status = p_new_status,
    agreement_sent_at = CASE WHEN p_new_status = 'sent' THEN NOW() ELSE agreement_sent_at END,
    agreement_received_at = CASE WHEN p_new_status = 'received' THEN NOW() ELSE agreement_received_at END,
    agreement_approved_at = CASE WHEN p_new_status = 'approved' THEN NOW() ELSE agreement_approved_at END,
    agreement_signed_at = CASE WHEN p_new_status = 'signed' THEN NOW() ELSE agreement_signed_at END,
    agreement_rejected_at = CASE WHEN p_new_status = 'rejected' THEN NOW() ELSE agreement_rejected_at END,
    agreement_rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_comment ELSE agreement_rejection_reason END,
    updated_at = NOW()
  WHERE id = p_contract_id;

  -- Log to history
  INSERT INTO contract_agreement_history (
    contract_id,
    user_id,
    previous_status,
    new_status,
    action,
    comment
  ) VALUES (
    p_contract_id,
    p_user_id,
    v_current_status,
    p_new_status,
    p_action,
    p_comment
  );
  
  -- If signed, mark decision as executed
  IF p_new_status = 'signed' THEN
    UPDATE decisions
    SET 
      contract_executed = true,
      contract_executed_at = NOW()
    WHERE contract_id = p_contract_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send contract with optional invoice attachments
CREATE OR REPLACE FUNCTION send_contract_delivery(
  p_contract_id UUID,
  p_sender_business_profile_id UUID,
  p_recipient_business_profile_id UUID,
  p_attached_invoice_ids UUID[] DEFAULT '{}',
  p_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_delivery_id UUID;
  v_document_type TEXT;
BEGIN
  -- Determine document type
  IF array_length(p_attached_invoice_ids, 1) > 0 THEN
    v_document_type := 'contract_invoice_combo';
  ELSE
    v_document_type := 'contract';
  END IF;
  
  -- Create delivery
  INSERT INTO document_deliveries (
    document_type,
    contract_id,
    attached_invoice_ids,
    sender_business_profile_id,
    recipient_business_profile_id,
    delivery_status,
    sent_at
  ) VALUES (
    v_document_type::document_type,
    p_contract_id,
    p_attached_invoice_ids,
    p_sender_business_profile_id,
    p_recipient_business_profile_id,
    'sent',
    NOW()
  ) RETURNING id INTO v_delivery_id;
  
  -- Update contract status to sent
  UPDATE contracts
  SET 
    agreement_status = 'sent',
    agreement_sent_at = NOW()
  WHERE id = p_contract_id;
  
  -- Log history
  INSERT INTO contract_agreement_history (
    contract_id,
    user_id,
    previous_status,
    new_status,
    action,
    comment
  ) VALUES (
    p_contract_id,
    auth.uid(),
    'draft',
    'sent',
    'sent',
    p_message
  );
  
  -- Create initial thread message if provided
  IF p_message IS NOT NULL THEN
    INSERT INTO document_threads (
      delivery_id,
      message_type,
      message_text,
      author_user_id,
      author_business_profile_id
    ) VALUES (
      v_delivery_id,
      'comment',
      p_message,
      auth.uid(),
      p_sender_business_profile_id
    );
  END IF;
  
  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get received contracts with sender info
CREATE OR REPLACE FUNCTION get_received_contracts_with_senders()
RETURNS TABLE (
  contract_id UUID,
  contract_number TEXT,
  contract_subject TEXT,
  contract_type TEXT,
  valid_from DATE,
  valid_to DATE,
  agreement_status TEXT,
  sender_id UUID,
  sender_name TEXT,
  sender_tax_id TEXT,
  sender_address TEXT,
  sender_city TEXT,
  sender_postal_code TEXT,
  buyer_id UUID,
  buyer_name TEXT,
  buyer_tax_id TEXT,
  buyer_address TEXT,
  buyer_city TEXT,
  buyer_postal_code TEXT,
  delivery_id UUID,
  delivery_status TEXT,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  attached_invoice_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS contract_id,
    c.number AS contract_number,
    c.subject AS contract_subject,
    c.contract_type,
    c.valid_from,
    c.valid_to,
    c.agreement_status,
    
    sender_bp.id AS sender_id,
    sender_bp.name AS sender_name,
    sender_bp.tax_id AS sender_tax_id,
    sender_bp.address AS sender_address,
    sender_bp.city AS sender_city,
    sender_bp.postal_code AS sender_postal_code,
    
    buyer_bp.id AS buyer_id,
    buyer_bp.name AS buyer_name,
    buyer_bp.tax_id AS buyer_tax_id,
    buyer_bp.address AS buyer_address,
    buyer_bp.city AS buyer_city,
    buyer_bp.postal_code AS buyer_postal_code,
    
    dd.id AS delivery_id,
    dd.delivery_status::TEXT,
    dd.sent_at,
    dd.received_at,
    COALESCE(array_length(dd.attached_invoice_ids, 1), 0) AS attached_invoice_count
  FROM contracts c
  INNER JOIN document_deliveries dd ON dd.contract_id = c.id
  INNER JOIN business_profiles sender_bp ON dd.sender_business_profile_id = sender_bp.id
  INNER JOIN business_profiles buyer_bp ON dd.recipient_business_profile_id = buyer_bp.id
  WHERE buyer_bp.user_id = auth.uid()
  ORDER BY dd.sent_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

-- View for contracts pending agreement
CREATE OR REPLACE VIEW contracts_pending_agreement AS
SELECT 
  c.*,
  bp.name AS business_profile_name,
  cust.name AS customer_name,
  d.decision_number,
  d.decision_type
FROM contracts c
LEFT JOIN business_profiles bp ON c.business_profile_id = bp.id
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN decisions d ON c.decision_id = d.id
WHERE c.agreement_status IN ('received', 'under_discussion', 'correction_needed')
AND bp.user_id = auth.uid();

-- View for signed contracts ready for execution
CREATE OR REPLACE VIEW contracts_ready_for_execution AS
SELECT 
  c.*,
  bp.name AS business_profile_name,
  cust.name AS customer_name,
  d.decision_number,
  d.decision_type,
  d.contract_executed
FROM contracts c
LEFT JOIN business_profiles bp ON c.business_profile_id = bp.id
LEFT JOIN customers cust ON c.customer_id = cust.id
LEFT JOIN decisions d ON c.decision_id = d.id
WHERE c.agreement_status = 'signed'
AND bp.user_id = auth.uid();

COMMENT ON VIEW contracts_pending_agreement IS 'Contracts awaiting recipient agreement/approval';
COMMENT ON VIEW contracts_ready_for_execution IS 'Signed contracts ready for execution and tracking';
