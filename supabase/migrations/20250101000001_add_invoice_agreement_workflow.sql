-- Invoice Agreement Workflow
-- Adds agreement status tracking for pre-KSeF verification

-- Agreement status enum
DO $$ BEGIN
  CREATE TYPE invoice_agreement_status AS ENUM (
    'draft',              -- Initial state, not yet sent
    'sent',               -- Sent to recipient, awaiting receipt
    'received',           -- Received by recipient, not yet reviewed
    'under_discussion',   -- Active discussion/negotiation
    'correction_needed',  -- Requires correction before approval
    'approved',           -- Approved by recipient
    'ready_for_ksef',     -- Both parties agreed, ready for KSeF submission
    'rejected',           -- Rejected by recipient
    'cancelled'           -- Cancelled by sender
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add agreement columns to invoices table
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS agreement_status invoice_agreement_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS agreement_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreement_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreement_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreement_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agreement_rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS ready_for_ksef_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ksef_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS erp_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS erp_sync_status TEXT CHECK (erp_sync_status IN ('pending', 'synced', 'failed'));

-- Create index for agreement status queries
CREATE INDEX IF NOT EXISTS idx_invoices_agreement_status ON invoices(agreement_status);
CREATE INDEX IF NOT EXISTS idx_invoices_ready_for_ksef ON invoices(ready_for_ksef_at) WHERE ready_for_ksef_at IS NOT NULL;

-- Invoice agreement history table
CREATE TABLE IF NOT EXISTS invoice_agreement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  previous_status invoice_agreement_status,
  new_status invoice_agreement_status NOT NULL,
  
  action TEXT NOT NULL CHECK (action IN ('sent', 'received', 'discussed', 'approved', 'rejected', 'corrected', 'cancelled')),
  comment TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for agreement history
CREATE INDEX idx_invoice_agreement_history_invoice_id ON invoice_agreement_history(invoice_id);
CREATE INDEX idx_invoice_agreement_history_user_id ON invoice_agreement_history(user_id);
CREATE INDEX idx_invoice_agreement_history_created_at ON invoice_agreement_history(created_at DESC);

-- RLS for agreement history
ALTER TABLE invoice_agreement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agreement history for accessible invoices"
  ON invoice_agreement_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_agreement_history.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM invoice_shares
      WHERE invoice_shares.invoice_id = invoice_agreement_history.invoice_id
      AND invoice_shares.receiver_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert agreement history for own invoices"
  ON invoice_agreement_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_agreement_history.invoice_id
      AND invoices.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM invoice_shares
      WHERE invoice_shares.invoice_id = invoice_agreement_history.invoice_id
      AND invoice_shares.receiver_user_id = auth.uid()
    )
  );

-- Function to update invoice agreement status
CREATE OR REPLACE FUNCTION update_invoice_agreement_status(
  p_invoice_id UUID,
  p_new_status invoice_agreement_status,
  p_user_id UUID,
  p_action TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status invoice_agreement_status;
BEGIN
  -- Get current status
  SELECT agreement_status INTO v_current_status
  FROM invoices
  WHERE id = p_invoice_id;

  -- Update invoice status
  UPDATE invoices
  SET 
    agreement_status = p_new_status,
    agreement_sent_at = CASE WHEN p_new_status = 'sent' THEN now() ELSE agreement_sent_at END,
    agreement_received_at = CASE WHEN p_new_status = 'received' THEN now() ELSE agreement_received_at END,
    agreement_approved_at = CASE WHEN p_new_status = 'approved' THEN now() ELSE agreement_approved_at END,
    agreement_rejected_at = CASE WHEN p_new_status = 'rejected' THEN now() ELSE agreement_rejected_at END,
    agreement_rejection_reason = CASE WHEN p_new_status = 'rejected' THEN p_comment ELSE agreement_rejection_reason END,
    ready_for_ksef_at = CASE WHEN p_new_status = 'ready_for_ksef' THEN now() ELSE ready_for_ksef_at END,
    updated_at = now()
  WHERE id = p_invoice_id;

  -- Log to history
  INSERT INTO invoice_agreement_history (
    invoice_id,
    user_id,
    previous_status,
    new_status,
    action,
    comment
  ) VALUES (
    p_invoice_id,
    p_user_id,
    v_current_status,
    p_new_status,
    p_action,
    p_comment
  );

  -- If status is ready_for_ksef and auto_push is enabled, trigger ERP sync
  IF p_new_status = 'ready_for_ksef' THEN
    -- Check if there's an ERP connection with auto_push enabled
    PERFORM 1
    FROM erp_connections ec
    JOIN invoices i ON i.business_profile_id = ec.business_profile_id
    WHERE i.id = p_invoice_id
    AND ec.auto_push_after_agreement = true
    AND ec.status = 'connected';
    
    IF FOUND THEN
      -- Mark as pending ERP sync
      UPDATE invoices
      SET erp_sync_status = 'pending'
      WHERE id = p_invoice_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get agreement workflow summary
CREATE OR REPLACE FUNCTION get_invoice_agreement_summary(p_invoice_id UUID)
RETURNS TABLE (
  invoice_id UUID,
  current_status invoice_agreement_status,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  ready_for_ksef_at TIMESTAMPTZ,
  history_count BIGINT,
  discussion_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.agreement_status,
    i.agreement_sent_at,
    i.agreement_received_at,
    i.agreement_approved_at,
    i.ready_for_ksef_at,
    (SELECT COUNT(*) FROM invoice_agreement_history WHERE invoice_agreement_history.invoice_id = i.id),
    (SELECT COUNT(*) FROM invoice_discussions WHERE invoice_discussions.invoice_id = i.id)
  FROM invoices i
  WHERE i.id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for invoices pending agreement
CREATE OR REPLACE VIEW invoices_pending_agreement AS
SELECT 
  i.*,
  bp.name as business_name,
  c.name as customer_name,
  COALESCE(
    (SELECT COUNT(*) FROM invoice_discussions WHERE invoice_discussions.invoice_id = i.id),
    0
  ) as discussion_count
FROM invoices i
LEFT JOIN business_profiles bp ON i.business_profile_id = bp.id
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.agreement_status IN ('sent', 'received', 'under_discussion', 'correction_needed')
ORDER BY i.created_at DESC;

-- View for invoices ready for KSeF
CREATE OR REPLACE VIEW invoices_ready_for_ksef AS
SELECT 
  i.*,
  bp.name as business_name,
  c.name as customer_name
FROM invoices i
LEFT JOIN business_profiles bp ON i.business_profile_id = bp.id
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.agreement_status = 'ready_for_ksef'
AND i.ksef_submitted_at IS NULL
ORDER BY i.ready_for_ksef_at DESC;

COMMENT ON TABLE invoice_agreement_history IS 'Tracks all status changes and actions in the invoice agreement workflow';
COMMENT ON FUNCTION update_invoice_agreement_status IS 'Updates invoice agreement status and logs to history';
COMMENT ON VIEW invoices_pending_agreement IS 'Invoices currently in agreement workflow';
COMMENT ON VIEW invoices_ready_for_ksef IS 'Invoices approved and ready for KSeF submission';
