-- Migration: Create idempotent posting orchestrator
-- Purpose: Central function for all invoice posting operations with KSeF awareness

CREATE OR REPLACE FUNCTION orchestrate_posting_for_invoice(
  p_invoice_id UUID,
  p_trigger TEXT -- 'invoice_issued' | 'ksef_submitted' | 'upo_available' | 'payment_registered' | 'manual_request'
) RETURNS JSONB AS $$
DECLARE
  v_invoice RECORD;
  v_journal_id UUID;
  v_policy TEXT;
  v_result JSONB;
BEGIN
  -- Get invoice with business profile policy
  SELECT 
    i.*,
    COALESCE(bp.accounting_post_on, 'ksef_submitted') as accounting_post_on
  INTO v_invoice
  FROM invoices i
  JOIN business_profiles bp ON bp.id = i.business_profile_id
  WHERE i.id = p_invoice_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invoice not found'
    );
  END IF;
  
  -- Idempotency check: Already posted?
  IF v_invoice.posting_status = 'posted' AND v_invoice.journal_entry_id IS NOT NULL THEN
    -- Check if journal actually exists and is posted
    SELECT id INTO v_journal_id
    FROM journal_entries
    WHERE id = v_invoice.journal_entry_id
    AND entry_status = 'posted';
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true, 
        'action', 'noop', 
        'reason', 'Already posted',
        'journal_entry_id', v_invoice.journal_entry_id
      );
    END IF;
  END IF;
  
  -- Respect needs_review status (don't overwrite user work)
  -- Only manual requests can override this
  IF v_invoice.posting_status = 'needs_review' AND p_trigger != 'manual_request' THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'skipped',
      'reason', 'Needs manual review - use posting queue'
    );
  END IF;
  
  -- Check if invoice is in acceptable state for posting
  IF v_invoice.acceptance_status != 'accepted' THEN
    RETURN jsonb_build_object(
      'success', false,
      'action', 'rejected',
      'reason', 'Invoice must be accepted before posting'
    );
  END IF;
  
  -- Get posting policy
  v_policy := v_invoice.accounting_post_on;
  
  -- Evaluate policy and trigger combination
  IF v_policy = 'ksef_submitted' THEN
    -- Post on KSeF submission success
    IF p_trigger = 'ksef_submitted' AND v_invoice.ksef_status = 'submitted' THEN
      -- Trigger auto-posting
      RETURN jsonb_build_object(
        'success', true,
        'action', 'auto_post',
        'reason', 'Policy: post on KSeF submission',
        'trigger', p_trigger
      );
    ELSIF p_trigger = 'manual_request' THEN
      -- Manual always allowed
      RETURN jsonb_build_object(
        'success', true,
        'action', 'manual_post',
        'reason', 'Manual posting requested',
        'trigger', p_trigger
      );
    ELSE
      -- Conditions not met yet
      RETURN jsonb_build_object(
        'success', true,
        'action', 'deferred',
        'reason', 'Waiting for KSeF submission',
        'policy', v_policy,
        'trigger', p_trigger
      );
    END IF;
    
  ELSIF v_policy = 'upo_available' THEN
    -- Post only when UPO is available
    IF v_invoice.ksef_upo IS NOT NULL OR p_trigger = 'manual_request' THEN
      RETURN jsonb_build_object(
        'success', true,
        'action', 'auto_post',
        'reason', 'Policy: UPO available or manual request',
        'trigger', p_trigger
      );
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'action', 'deferred',
        'reason', 'Waiting for UPO confirmation',
        'policy', v_policy,
        'trigger', p_trigger
      );
    END IF;
    
  ELSIF v_policy = 'manual' THEN
    -- Only manual posting allowed
    IF p_trigger = 'manual_request' THEN
      RETURN jsonb_build_object(
        'success', true,
        'action', 'manual_post',
        'reason', 'Manual posting policy',
        'trigger', p_trigger
      );
    ELSE
      RETURN jsonb_build_object(
        'success', true,
        'action', 'queued',
        'reason', 'Manual posting required - use posting queue',
        'policy', v_policy
      );
    END IF;
    
  ELSE
    -- Unknown policy
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unknown accounting posting policy: ' || v_policy
    );
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION orchestrate_posting_for_invoice(UUID, TEXT) TO authenticated;

-- Comment
COMMENT ON FUNCTION orchestrate_posting_for_invoice IS 
'Idempotent orchestrator for invoice posting. Evaluates business profile policy and current state to determine if posting should proceed. Returns action recommendation without actually posting (posting logic handled separately).';
