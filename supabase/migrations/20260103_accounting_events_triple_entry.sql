-- ============================================================================
-- ACCOUNTING EVENTS - TRIPLE ENTRY FOUNDATION
-- ============================================================================
-- Purpose: Enhance existing events table to become true AccountingEvent (Zdarzenie księgowe)
-- 
-- Philosophy:
-- Every financial movement MUST resolve into a single accounting event.
-- No invoice, cost, contract, cash movement, or bank transaction may exist
-- without being linked to an AccountingEvent.
--
-- This provides:
-- - Auditability (every PLN has a reason)
-- - Clean balance sheet (all movements tracked)
-- - Legal defensibility (decision → operation → event → document)
-- - KSeF readiness (external attestation)
-- - Triple-entry foundation (ledger + explanation + proof)
--
-- Hierarchy:
-- Decision (mandate / authority)
--    ↓
-- Operation / Job (what business did) [OPTIONAL]
--    ↓
-- Accounting Event (economic result) [MANDATORY]
--    ↓
-- Documents (invoice, contract, receipt)
-- ============================================================================

-- ============================================================================
-- 1. Add triple-entry fields to events table
-- ============================================================================

ALTER TABLE public.events
  -- Event hash (for immutability verification)
  ADD COLUMN IF NOT EXISTS event_hash TEXT,
  ADD COLUMN IF NOT EXISTS payload_snapshot JSONB,
  
  -- External attestation (third entry)
  ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_statement_hash TEXT,
  ADD COLUMN IF NOT EXISTS ksef_reference_number TEXT,
  ADD COLUMN IF NOT EXISTS ksef_qr_code TEXT,
  ADD COLUMN IF NOT EXISTS decision_pdf_hash TEXT,
  ADD COLUMN IF NOT EXISTS external_receipt_url TEXT,
  
  -- Accounting semantics (Wn / Ma)
  ADD COLUMN IF NOT EXISTS debit_account TEXT,
  ADD COLUMN IF NOT EXISTS credit_account TEXT,
  ADD COLUMN IF NOT EXISTS account_description TEXT,
  
  -- Legal basis (mandatory for sp. z o.o.)
  ADD COLUMN IF NOT EXISTS legal_basis TEXT,
  ADD COLUMN IF NOT EXISTS legal_basis_type TEXT CHECK (
    legal_basis_type IS NULL OR 
    legal_basis_type IN ('decision', 'contract', 'statute', 'law', 'resolution')
  ),
  
  -- Closure and locking
  ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS period_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS period_month INT,
  ADD COLUMN IF NOT EXISTS period_year INT,
  
  -- Verification
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verification_method TEXT CHECK (
    verification_method IS NULL OR
    verification_method IN ('manual', 'bank_reconciliation', 'ksef_confirmation', 'external_audit')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_closed ON public.events(is_closed) WHERE is_closed = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_period ON public.events(period_year, period_month) WHERE period_locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_bank_transaction ON public.events(bank_transaction_id) WHERE bank_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_ksef ON public.events(ksef_reference_number) WHERE ksef_reference_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_hash ON public.events(event_hash) WHERE event_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_verified ON public.events(verified) WHERE verified = TRUE;

-- ============================================================================
-- 2. Event hash generation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_event_hash(p_event_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_payload JSONB;
  v_hash TEXT;
BEGIN
  -- Build canonical payload for hashing
  SELECT jsonb_build_object(
    'event_id', e.id,
    'business_profile_id', e.business_profile_id,
    'event_type', e.event_type,
    'occurred_at', e.occurred_at,
    'amount', e.amount,
    'currency', e.currency,
    'direction', e.direction,
    'entity_type', e.entity_type,
    'entity_id', e.entity_id,
    'decision_id', e.decision_id,
    'debit_account', e.debit_account,
    'credit_account', e.credit_account,
    'actor_id', e.actor_id,
    'recorded_at', e.recorded_at
  ) INTO v_payload
  FROM public.events e
  WHERE e.id = p_event_id;
  
  -- Generate SHA-256 hash
  v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');
  
  -- Store payload snapshot
  UPDATE public.events
  SET 
    event_hash = v_hash,
    payload_snapshot = v_payload
  WHERE id = p_event_id;
  
  RETURN v_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. Event closure function (locks event for editing)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.close_accounting_event(
  p_event_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_event_hash TEXT;
BEGIN
  -- Check if already closed
  IF EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = p_event_id AND is_closed = TRUE
  ) THEN
    RAISE EXCEPTION 'Event is already closed and cannot be modified';
  END IF;
  
  -- Generate hash before closing
  v_event_hash := public.generate_event_hash(p_event_id);
  
  -- Close the event
  UPDATE public.events
  SET 
    is_closed = TRUE,
    closed_at = NOW(),
    closed_by = p_user_id,
    posted = TRUE,
    status = 'posted',
    period_month = EXTRACT(MONTH FROM occurred_at),
    period_year = EXTRACT(YEAR FROM occurred_at)
  WHERE id = p_event_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Period closing function (locks all events in a month)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.close_accounting_period(
  p_business_profile_id UUID,
  p_year INT,
  p_month INT,
  p_user_id UUID
)
RETURNS TABLE (
  closed_count INT,
  locked_count INT
) AS $$
DECLARE
  v_closed_count INT;
  v_locked_count INT;
BEGIN
  -- Close all open events in the period
  WITH closed_events AS (
    UPDATE public.events
    SET 
      is_closed = TRUE,
      closed_at = NOW(),
      closed_by = p_user_id,
      posted = TRUE,
      status = 'posted',
      period_month = p_month,
      period_year = p_year
    WHERE business_profile_id = p_business_profile_id
      AND EXTRACT(YEAR FROM occurred_at) = p_year
      AND EXTRACT(MONTH FROM occurred_at) = p_month
      AND is_closed = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_closed_count FROM closed_events;
  
  -- Lock the period (prevent new events)
  UPDATE public.events
  SET period_locked = TRUE
  WHERE business_profile_id = p_business_profile_id
    AND period_year = p_year
    AND period_month = p_month;
  
  GET DIAGNOSTICS v_locked_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_closed_count, v_locked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Bank reconciliation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_event_with_bank(
  p_event_id UUID,
  p_bank_transaction_id TEXT,
  p_bank_statement_hash TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.events
  SET 
    bank_transaction_id = p_bank_transaction_id,
    bank_statement_hash = p_bank_statement_hash,
    verified = TRUE,
    verified_at = NOW(),
    verified_by = p_user_id,
    verification_method = 'bank_reconciliation'
  WHERE id = p_event_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. KSeF attestation function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.attest_event_with_ksef(
  p_event_id UUID,
  p_ksef_reference_number TEXT,
  p_ksef_qr_code TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.events
  SET 
    ksef_reference_number = p_ksef_reference_number,
    ksef_qr_code = p_ksef_qr_code,
    verified = TRUE,
    verified_at = NOW(),
    verified_by = p_user_id,
    verification_method = 'ksef_confirmation'
  WHERE id = p_event_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Event integrity verification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_event_integrity(p_event_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  current_hash TEXT,
  stored_hash TEXT,
  has_external_attestation BOOLEAN,
  attestation_type TEXT
) AS $$
DECLARE
  v_current_hash TEXT;
  v_stored_hash TEXT;
  v_has_attestation BOOLEAN;
  v_attestation_type TEXT;
BEGIN
  -- Get stored hash
  SELECT event_hash INTO v_stored_hash
  FROM public.events
  WHERE id = p_event_id;
  
  -- Regenerate hash from current data
  SELECT encode(
    digest(
      jsonb_build_object(
        'event_id', e.id,
        'business_profile_id', e.business_profile_id,
        'event_type', e.event_type,
        'occurred_at', e.occurred_at,
        'amount', e.amount,
        'currency', e.currency,
        'direction', e.direction,
        'entity_type', e.entity_type,
        'entity_id', e.entity_id,
        'decision_id', e.decision_id,
        'debit_account', e.debit_account,
        'credit_account', e.credit_account,
        'actor_id', e.actor_id,
        'recorded_at', e.recorded_at
      )::text,
      'sha256'
    ),
    'hex'
  ) INTO v_current_hash
  FROM public.events e
  WHERE e.id = p_event_id;
  
  -- Check for external attestation
  SELECT 
    CASE 
      WHEN bank_transaction_id IS NOT NULL THEN TRUE
      WHEN ksef_reference_number IS NOT NULL THEN TRUE
      WHEN decision_pdf_hash IS NOT NULL THEN TRUE
      ELSE FALSE
    END,
    CASE 
      WHEN bank_transaction_id IS NOT NULL THEN 'bank'
      WHEN ksef_reference_number IS NOT NULL THEN 'ksef'
      WHEN decision_pdf_hash IS NOT NULL THEN 'decision'
      ELSE NULL
    END
  INTO v_has_attestation, v_attestation_type
  FROM public.events
  WHERE id = p_event_id;
  
  RETURN QUERY SELECT 
    v_current_hash = v_stored_hash AS is_valid,
    v_current_hash,
    v_stored_hash,
    v_has_attestation,
    v_attestation_type;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. Mandatory event linking enforcement
-- ============================================================================

-- Trigger to prevent invoice creation without event
CREATE OR REPLACE FUNCTION public.enforce_invoice_event_link()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's a corresponding accounting event
  IF NOT EXISTS (
    SELECT 1 FROM public.events
    WHERE entity_type = 'invoice'
      AND entity_id = NEW.id
      AND business_profile_id = NEW.business_profile_id
  ) THEN
    -- Auto-create event for invoice
    INSERT INTO public.events (
      business_profile_id,
      event_type,
      actor_id,
      actor_name,
      occurred_at,
      entity_type,
      entity_id,
      entity_reference,
      amount,
      currency,
      direction,
      action_summary,
      status,
      posted,
      needs_action
    ) VALUES (
      NEW.business_profile_id,
      'invoice_created',
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      NEW.issue_date,
      'invoice',
      NEW.id,
      NEW.number,
      NEW.total_gross_value,
      NEW.currency,
      CASE WHEN NEW.transaction_type = 'sale' THEN 'incoming' ELSE 'outgoing' END,
      'Utworzono fakturę: ' || NEW.number,
      'pending',
      FALSE,
      TRUE
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS invoice_event_link_trigger ON public.invoices;
CREATE TRIGGER invoice_event_link_trigger
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_event_link();

-- ============================================================================
-- 9. Views for accounting event management
-- ============================================================================

-- View: Unverified events requiring attention
CREATE OR REPLACE VIEW public.events_requiring_verification AS
SELECT 
  e.*,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.is_closed = TRUE
  AND e.verified = FALSE
  AND e.amount IS NOT NULL
  AND e.amount > 0
ORDER BY e.occurred_at DESC;

-- View: Events with external attestation
CREATE OR REPLACE VIEW public.events_with_attestation AS
SELECT 
  e.*,
  CASE 
    WHEN e.bank_transaction_id IS NOT NULL THEN 'bank'
    WHEN e.ksef_reference_number IS NOT NULL THEN 'ksef'
    WHEN e.decision_pdf_hash IS NOT NULL THEN 'decision'
    ELSE NULL
  END AS attestation_type,
  d.decision_number,
  d.title AS decision_title,
  bp.name AS business_name
FROM public.events e
LEFT JOIN public.decisions d ON d.id = e.decision_id
LEFT JOIN public.business_profiles bp ON bp.id = e.business_profile_id
WHERE e.bank_transaction_id IS NOT NULL
   OR e.ksef_reference_number IS NOT NULL
   OR e.decision_pdf_hash IS NOT NULL
ORDER BY e.occurred_at DESC;

-- View: Period closure status
CREATE OR REPLACE VIEW public.period_closure_status AS
SELECT 
  business_profile_id,
  period_year,
  period_month,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE is_closed = TRUE) AS closed_events,
  COUNT(*) FILTER (WHERE period_locked = TRUE) AS locked_events,
  COUNT(*) FILTER (WHERE verified = TRUE) AS verified_events,
  MAX(closed_at) AS last_closed_at,
  BOOL_AND(period_locked) AS period_fully_locked
FROM public.events
WHERE period_year IS NOT NULL
  AND period_month IS NOT NULL
GROUP BY business_profile_id, period_year, period_month
ORDER BY period_year DESC, period_month DESC;

-- ============================================================================
-- 10. Immutability enforcement
-- ============================================================================

-- Prevent edits to closed events
CREATE OR REPLACE FUNCTION public.prevent_closed_event_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_closed = TRUE THEN
    RAISE EXCEPTION 'Cannot modify closed accounting event. Event ID: %, closed at: %', 
      OLD.id, OLD.closed_at;
  END IF;
  
  IF OLD.period_locked = TRUE THEN
    RAISE EXCEPTION 'Cannot modify event in locked period. Period: %-%, Event ID: %', 
      OLD.period_year, OLD.period_month, OLD.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_closed_event_modification_trigger ON public.events;
CREATE TRIGGER prevent_closed_event_modification_trigger
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closed_event_modification();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN public.events.event_hash IS 'SHA-256 hash of event payload for immutability verification';
COMMENT ON COLUMN public.events.payload_snapshot IS 'Canonical payload snapshot used for hash generation';
COMMENT ON COLUMN public.events.bank_transaction_id IS 'External bank transaction ID for reconciliation (third entry)';
COMMENT ON COLUMN public.events.ksef_reference_number IS 'KSeF reference number for invoice attestation (third entry)';
COMMENT ON COLUMN public.events.is_closed IS 'Event is closed and locked for editing';
COMMENT ON COLUMN public.events.period_locked IS 'Period is closed, no new events allowed';
COMMENT ON COLUMN public.events.verified IS 'Event has been verified against external source';
COMMENT ON COLUMN public.events.debit_account IS 'Debit account (Wn) for double-entry bookkeeping';
COMMENT ON COLUMN public.events.credit_account IS 'Credit account (Ma) for double-entry bookkeeping';
COMMENT ON COLUMN public.events.legal_basis IS 'Legal basis for this accounting event (decision, contract, law)';

COMMENT ON FUNCTION public.generate_event_hash IS 'Generate SHA-256 hash of event payload for immutability verification';
COMMENT ON FUNCTION public.close_accounting_event IS 'Close and lock an accounting event, preventing further edits';
COMMENT ON FUNCTION public.close_accounting_period IS 'Close all events in a period and lock the period';
COMMENT ON FUNCTION public.verify_event_integrity IS 'Verify event integrity by comparing current hash with stored hash';
COMMENT ON FUNCTION public.reconcile_event_with_bank IS 'Link event to bank transaction for external attestation';
COMMENT ON FUNCTION public.attest_event_with_ksef IS 'Link event to KSeF invoice for external attestation';

COMMENT ON VIEW public.events_requiring_verification IS 'Closed events that need external verification';
COMMENT ON VIEW public.events_with_attestation IS 'Events with external attestation (bank, KSeF, decision)';
COMMENT ON VIEW public.period_closure_status IS 'Period closure and verification status by month';
