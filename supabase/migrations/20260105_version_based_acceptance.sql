-- ============================================
-- VERSION-BASED ACCEPTANCE SYSTEM
-- ============================================
-- Implements acceptance tied to specific versions, not documents in general
-- "Acceptance is a signature over a specific version"

-- ============================================
-- 1. ADD REVIEW STATUS TO CHAINS
-- ============================================

ALTER TABLE public.chains
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS reviewed_version_id UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS review_comment TEXT;

-- Create index for review queries
CREATE INDEX IF NOT EXISTS idx_chains_review_status ON public.chains(review_status);
CREATE INDEX IF NOT EXISTS idx_chains_reviewed_by ON public.chains(reviewed_by);

-- Add constraint for valid review statuses
ALTER TABLE public.chains
  ADD CONSTRAINT chains_review_status_check 
  CHECK (review_status IN ('draft', 'pending_review', 'accepted', 'rejected', 'superseded'));

COMMENT ON COLUMN public.chains.review_status IS 'Review state: draft | pending_review | accepted | rejected | superseded';
COMMENT ON COLUMN public.chains.reviewed_version_id IS 'The specific version that was accepted (e.g., invoice_version.id)';
COMMENT ON COLUMN public.chains.reviewed_at IS 'When the acceptance/rejection happened';
COMMENT ON COLUMN public.chains.reviewed_by IS 'Who accepted/rejected';
COMMENT ON COLUMN public.chains.review_comment IS 'Accountant comment on acceptance/rejection';

-- ============================================
-- 2. ADD CHANGE SEVERITY TO INVOICE_VERSIONS
-- ============================================

ALTER TABLE public.invoice_versions
  ADD COLUMN IF NOT EXISTS change_severity TEXT DEFAULT 'accounting',
  ADD COLUMN IF NOT EXISTS accounting_impact_fields TEXT[],
  ADD COLUMN IF NOT EXISTS non_accounting_fields TEXT[];

-- Add constraint for valid change severities
ALTER TABLE public.invoice_versions
  ADD CONSTRAINT invoice_versions_change_severity_check
  CHECK (change_severity IN ('none', 'non_accounting', 'accounting'));

COMMENT ON COLUMN public.invoice_versions.change_severity IS 'Severity of changes: none | non_accounting | accounting. Only "accounting" invalidates acceptance.';
COMMENT ON COLUMN public.invoice_versions.accounting_impact_fields IS 'Fields that changed and impact accounting (amounts, VAT, dates, etc.)';
COMMENT ON COLUMN public.invoice_versions.non_accounting_fields IS 'Fields that changed but do not impact accounting (notes, tags, etc.)';

-- ============================================
-- 3. DEFINE ACCOUNTING-IMPACTING FIELDS
-- ============================================

-- Create a configuration table for field classifications
CREATE TABLE IF NOT EXISTS public.field_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL, -- 'invoice', 'cash_entry', etc.
  field_name TEXT NOT NULL,
  classification TEXT NOT NULL, -- 'accounting' | 'non_accounting'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT field_classifications_unique UNIQUE (object_type, field_name),
  CONSTRAINT field_classifications_check CHECK (classification IN ('accounting', 'non_accounting'))
);

COMMENT ON TABLE public.field_classifications IS 'Defines which fields are accounting-impacting vs non-impacting for change severity calculation';

-- Insert default classifications for invoices
INSERT INTO public.field_classifications (object_type, field_name, classification, description) VALUES
  -- Accounting-impacting fields
  ('invoice', 'total_net_value', 'accounting', 'Net amount impacts ledger'),
  ('invoice', 'total_vat_value', 'accounting', 'VAT amount impacts ledger'),
  ('invoice', 'total_gross_value', 'accounting', 'Gross amount impacts ledger'),
  ('invoice', 'currency', 'accounting', 'Currency affects valuation'),
  ('invoice', 'exchange_rate', 'accounting', 'Exchange rate affects valuation'),
  ('invoice', 'customer_id', 'accounting', 'Customer identity affects AR/AP'),
  ('invoice', 'issue_date', 'accounting', 'Date affects period allocation'),
  ('invoice', 'sell_date', 'accounting', 'Date affects period allocation'),
  ('invoice', 'due_date', 'accounting', 'Payment terms affect cash flow'),
  ('invoice', 'payment_method', 'accounting', 'Payment method affects cash/bank accounts'),
  ('invoice', 'vat', 'accounting', 'VAT status affects tax calculation'),
  ('invoice', 'vat_exemption_reason', 'accounting', 'VAT exemption affects tax treatment'),
  ('invoice', 'items', 'accounting', 'Line items affect amounts and VAT'),
  ('invoice', 'bank_account_id', 'accounting', 'Bank account affects posting'),
  ('invoice', 'cash_account_id', 'accounting', 'Cash account affects posting'),
  
  -- Non-accounting fields
  ('invoice', 'comments', 'non_accounting', 'Internal notes do not affect ledger'),
  ('invoice', 'notes', 'non_accounting', 'Internal notes do not affect ledger'),
  ('invoice', 'project_id', 'non_accounting', 'Project tagging (unless used in posting rules)'),
  ('invoice', 'decision_id', 'non_accounting', 'Decision reference for audit trail')
ON CONFLICT (object_type, field_name) DO NOTHING;

-- ============================================
-- 4. FUNCTION: CALCULATE CHANGE SEVERITY
-- ============================================

CREATE OR REPLACE FUNCTION calculate_change_severity(
  p_object_type TEXT,
  p_changed_fields TEXT[]
)
RETURNS TEXT AS $$
DECLARE
  v_accounting_fields TEXT[];
  v_non_accounting_fields TEXT[];
  v_field TEXT;
  v_classification TEXT;
BEGIN
  -- If no fields changed, return 'none'
  IF p_changed_fields IS NULL OR array_length(p_changed_fields, 1) = 0 THEN
    RETURN 'none';
  END IF;
  
  v_accounting_fields := ARRAY[]::TEXT[];
  v_non_accounting_fields := ARRAY[]::TEXT[];
  
  -- Classify each changed field
  FOREACH v_field IN ARRAY p_changed_fields
  LOOP
    -- Look up classification
    SELECT classification INTO v_classification
    FROM field_classifications
    WHERE object_type = p_object_type
      AND field_name = v_field;
    
    -- Default to 'accounting' if not found (safe default)
    IF v_classification IS NULL THEN
      v_classification := 'accounting';
    END IF;
    
    -- Add to appropriate array
    IF v_classification = 'accounting' THEN
      v_accounting_fields := array_append(v_accounting_fields, v_field);
    ELSE
      v_non_accounting_fields := array_append(v_non_accounting_fields, v_field);
    END IF;
  END LOOP;
  
  -- Determine overall severity
  IF array_length(v_accounting_fields, 1) > 0 THEN
    RETURN 'accounting';
  ELSIF array_length(v_non_accounting_fields, 1) > 0 THEN
    RETURN 'non_accounting';
  ELSE
    RETURN 'none';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_change_severity IS 'Determines if changes are accounting-impacting or not based on field classifications';

-- ============================================
-- 5. ENHANCED CREATE_INVOICE_VERSION
-- ============================================

CREATE OR REPLACE FUNCTION create_invoice_version(
  p_invoice_id UUID,
  p_snapshot_json JSONB,
  p_changed_fields TEXT[],
  p_change_reason TEXT DEFAULT NULL,
  p_change_summary TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_next_version_no INTEGER;
  v_change_severity TEXT;
  v_accounting_fields TEXT[];
  v_non_accounting_fields TEXT[];
  v_chain_id UUID;
  v_current_review_status TEXT;
  v_is_posted BOOLEAN;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO v_next_version_no
  FROM invoice_versions
  WHERE invoice_id = p_invoice_id;
  
  -- Calculate change severity
  v_change_severity := calculate_change_severity('invoice', p_changed_fields);
  
  -- Get accounting vs non-accounting fields
  SELECT 
    array_agg(field_name) FILTER (WHERE classification = 'accounting'),
    array_agg(field_name) FILTER (WHERE classification = 'non_accounting')
  INTO v_accounting_fields, v_non_accounting_fields
  FROM field_classifications
  WHERE object_type = 'invoice'
    AND field_name = ANY(p_changed_fields);
  
  -- Create version
  INSERT INTO invoice_versions (
    invoice_id,
    version_no,
    snapshot_json,
    changed_fields,
    change_reason,
    change_summary,
    change_severity,
    accounting_impact_fields,
    non_accounting_fields,
    created_by
  ) VALUES (
    p_invoice_id,
    v_next_version_no,
    p_snapshot_json,
    p_changed_fields,
    p_change_reason,
    p_change_summary,
    v_change_severity,
    v_accounting_fields,
    v_non_accounting_fields,
    auth.uid()
  )
  RETURNING id INTO v_version_id;
  
  -- Get the chain for this invoice
  SELECT id, review_status, state
  INTO v_chain_id, v_current_review_status, v_is_posted
  FROM chains
  WHERE primary_object_type = 'invoice'
    AND primary_object_id = p_invoice_id;
  
  -- If chain exists and has accounting-impacting changes
  IF v_chain_id IS NOT NULL AND v_change_severity = 'accounting' THEN
    
    -- Check if invoice is posted
    v_is_posted := (SELECT state = 'posted' FROM chains WHERE id = v_chain_id);
    
    IF v_is_posted THEN
      -- POSTED INVOICES: Block edits or require correction workflow
      -- For MVP, we'll mark as requiring correction
      UPDATE chains
      SET 
        review_status = 'superseded',
        required_actions = required_actions || '["requires_correction"]'::JSONB,
        blockers = blockers || '["posted_invoice_edited"]'::JSONB,
        metadata = metadata || jsonb_build_object(
          'edit_after_posting', true,
          'requires_correction_document', true,
          'edited_version_id', v_version_id
        )
      WHERE id = v_chain_id;
      
    ELSIF v_current_review_status = 'accepted' THEN
      -- ACCEPTED BUT NOT POSTED: Invalidate acceptance, require re-review
      UPDATE chains
      SET 
        review_status = 'superseded',
        required_actions = required_actions || '["requires_re_acceptance"]'::JSONB,
        metadata = metadata || jsonb_build_object(
          'previous_review_status', 'accepted',
          'superseded_at', NOW(),
          'superseded_by_version', v_version_id,
          'change_severity', v_change_severity
        )
      WHERE id = v_chain_id;
      
    END IF;
  END IF;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_invoice_version IS 'Create invoice version with automatic change severity calculation and acceptance invalidation';

-- ============================================
-- 6. FUNCTION: ACCEPT CHAIN (VERSION-BASED)
-- ============================================

CREATE OR REPLACE FUNCTION accept_chain(
  p_chain_id UUID,
  p_version_id UUID,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_chain chains%ROWTYPE;
  v_is_posted BOOLEAN;
BEGIN
  -- Get chain
  SELECT * INTO v_chain FROM chains WHERE id = p_chain_id;
  
  IF v_chain.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Chain not found'
    );
  END IF;
  
  -- Check if already posted
  v_is_posted := v_chain.state = 'posted';
  
  IF v_is_posted THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot accept: already posted to ledger. Use correction workflow.'
    );
  END IF;
  
  -- Accept the specific version
  UPDATE chains
  SET 
    review_status = 'accepted',
    reviewed_version_id = p_version_id,
    reviewed_at = NOW(),
    reviewed_by = auth.uid(),
    review_comment = p_comment,
    requires_verification = FALSE,
    -- Remove re-acceptance requirement if present
    required_actions = (
      SELECT jsonb_agg(action)
      FROM jsonb_array_elements_text(required_actions) action
      WHERE action != 'requires_re_acceptance'
    ),
    metadata = metadata || jsonb_build_object(
      'accepted_version_id', p_version_id,
      'accepted_at', NOW()
    )
  WHERE id = p_chain_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'chain_id', p_chain_id,
    'reviewed_version_id', p_version_id,
    'review_status', 'accepted'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_chain IS 'Accept a specific version of a chain. Acceptance is tied to version, not document in general.';

-- ============================================
-- 7. FUNCTION: REJECT CHAIN
-- ============================================

CREATE OR REPLACE FUNCTION reject_chain(
  p_chain_id UUID,
  p_version_id UUID,
  p_comment TEXT
)
RETURNS JSONB AS $$
BEGIN
  -- Reject the specific version
  UPDATE chains
  SET 
    review_status = 'rejected',
    reviewed_version_id = p_version_id,
    reviewed_at = NOW(),
    reviewed_by = auth.uid(),
    review_comment = p_comment,
    metadata = metadata || jsonb_build_object(
      'rejected_version_id', p_version_id,
      'rejected_at', NOW(),
      'rejection_reason', p_comment
    )
  WHERE id = p_chain_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'chain_id', p_chain_id,
    'reviewed_version_id', p_version_id,
    'review_status', 'rejected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_chain IS 'Reject a specific version of a chain with comment';

-- ============================================
-- 8. FUNCTION: SUBMIT FOR REVIEW
-- ============================================

CREATE OR REPLACE FUNCTION submit_for_review(
  p_chain_id UUID,
  p_version_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_chain chains%ROWTYPE;
BEGIN
  -- Get chain
  SELECT * INTO v_chain FROM chains WHERE id = p_chain_id;
  
  IF v_chain.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Chain not found'
    );
  END IF;
  
  -- Check if already posted
  IF v_chain.state = 'posted' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot submit for review: already posted. Use correction workflow.'
    );
  END IF;
  
  -- Submit for review
  UPDATE chains
  SET 
    review_status = 'pending_review',
    requires_verification = TRUE,
    metadata = metadata || jsonb_build_object(
      'submitted_for_review_at', NOW(),
      'submitted_version_id', p_version_id
    )
  WHERE id = p_chain_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'chain_id', p_chain_id,
    'review_status', 'pending_review'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION submit_for_review IS 'Submit a chain for accountant review';

-- ============================================
-- 9. VIEW: CHAINS REQUIRING REVIEW
-- ============================================

CREATE OR REPLACE VIEW chains_requiring_review AS
SELECT 
  c.*,
  -- Get latest version info
  (
    SELECT jsonb_build_object(
      'version_id', iv.id,
      'version_no', iv.version_no,
      'change_severity', iv.change_severity,
      'changed_fields', iv.changed_fields,
      'created_at', iv.created_at
    )
    FROM invoice_versions iv
    WHERE iv.invoice_id = c.primary_object_id
    ORDER BY iv.version_no DESC
    LIMIT 1
  ) as latest_version,
  
  -- Get accepted version info if exists
  (
    SELECT jsonb_build_object(
      'version_id', iv.id,
      'version_no', iv.version_no,
      'reviewed_at', c.reviewed_at,
      'reviewed_by', c.reviewed_by
    )
    FROM invoice_versions iv
    WHERE iv.id = c.reviewed_version_id
  ) as accepted_version,
  
  -- Check if changes after acceptance
  CASE 
    WHEN c.review_status = 'superseded' THEN TRUE
    WHEN c.review_status = 'accepted' AND EXISTS (
      SELECT 1 FROM invoice_versions iv
      WHERE iv.invoice_id = c.primary_object_id
        AND iv.created_at > c.reviewed_at
        AND iv.change_severity = 'accounting'
    ) THEN TRUE
    ELSE FALSE
  END as has_changes_after_acceptance
  
FROM chains c
WHERE c.review_status IN ('pending_review', 'superseded')
   OR (c.requires_verification = TRUE AND c.review_status != 'accepted');

COMMENT ON VIEW chains_requiring_review IS 'Chains that require accountant review, including those with changes after acceptance';

GRANT SELECT ON chains_requiring_review TO authenticated;

-- ============================================
-- 10. TRIGGER: AUTO-INVALIDATE ON EDIT
-- ============================================

-- This trigger automatically handles acceptance invalidation when new versions are created
-- (Already handled in create_invoice_version function, but adding trigger as safety net)

CREATE OR REPLACE FUNCTION trigger_invalidate_acceptance_on_version()
RETURNS TRIGGER AS $$
DECLARE
  v_chain_id UUID;
  v_review_status TEXT;
BEGIN
  -- Only process if this is an accounting-impacting change
  IF NEW.change_severity = 'accounting' THEN
    
    -- Get chain for this invoice
    SELECT id, review_status INTO v_chain_id, v_review_status
    FROM chains
    WHERE primary_object_type = 'invoice'
      AND primary_object_id = NEW.invoice_id;
    
    -- If chain is accepted, mark as superseded
    IF v_chain_id IS NOT NULL AND v_review_status = 'accepted' THEN
      UPDATE chains
      SET 
        review_status = 'superseded',
        required_actions = required_actions || '["requires_re_acceptance"]'::JSONB
      WHERE id = v_chain_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidate_acceptance
  AFTER INSERT ON invoice_versions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_invalidate_acceptance_on_version();

COMMENT ON TRIGGER trigger_invalidate_acceptance ON invoice_versions IS 'Automatically invalidates acceptance when accounting-impacting changes are made';

-- ============================================
-- 11. BUSINESS RULE ENFORCEMENT
-- ============================================

-- Function to check if invoice can be edited
CREATE OR REPLACE FUNCTION can_edit_invoice(p_invoice_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_chain chains%ROWTYPE;
  v_can_edit BOOLEAN;
  v_reason TEXT;
BEGIN
  -- Get chain
  SELECT * INTO v_chain
  FROM chains
  WHERE primary_object_type = 'invoice'
    AND primary_object_id = p_invoice_id;
  
  IF v_chain.id IS NULL THEN
    -- No chain yet, can edit
    RETURN jsonb_build_object(
      'can_edit', TRUE,
      'reason', 'No chain exists yet'
    );
  END IF;
  
  -- MVP POLICY: Soft change with mandatory re-accept
  -- Allow edits if not posted, but invalidate acceptance
  
  IF v_chain.state = 'posted' THEN
    -- Posted invoices require correction workflow
    RETURN jsonb_build_object(
      'can_edit', FALSE,
      'reason', 'Invoice is posted to ledger. Use correction workflow.',
      'requires_correction', TRUE
    );
  ELSE
    -- Can edit, but will invalidate acceptance
    RETURN jsonb_build_object(
      'can_edit', TRUE,
      'reason', 'Can edit, but acceptance will be invalidated if changes are accounting-impacting',
      'will_invalidate_acceptance', v_chain.review_status = 'accepted'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_edit_invoice IS 'Check if invoice can be edited based on current state (MVP: soft change policy)';

-- ============================================
-- 12. UPDATE EXISTING CHAINS
-- ============================================

-- Set default review status for existing chains
UPDATE chains
SET review_status = 'draft'
WHERE review_status IS NULL;

-- ============================================
-- SUMMARY COMMENT
-- ============================================

COMMENT ON TABLE public.chains IS 
'Event chains with version-based acceptance system. 
Key principle: Acceptance is a signature over a specific version; 
any accounting-impacting change creates a new version and automatically 
invalidates acceptance, requiring re-review (or correction if already posted).

MVP Policy: Soft change with mandatory re-accept
- Allow edits if not posted
- Acceptance is invalidated for accounting-impacting changes
- Accountant must accept again
- Posted invoices require correction workflow';
