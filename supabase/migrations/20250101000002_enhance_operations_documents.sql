-- Migration: Enhance Operations with Document Categories and Job Linkage
-- Purpose: Transform documents from flat storage to semantic, auditable system

-- 1. Add document category and linkage columns to job_documents
ALTER TABLE job_documents
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'operational',
  ADD COLUMN IF NOT EXISTS template_id TEXT,
  ADD COLUMN IF NOT EXISTS linked_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_invoice_id UUID,
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS template_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add check constraint for category
ALTER TABLE job_documents
  ADD CONSTRAINT job_documents_category_check 
  CHECK (category IN ('contractual', 'operational', 'compliance', 'financial', 'history'));

-- Add check constraint for status
ALTER TABLE job_documents
  ADD CONSTRAINT job_documents_status_check 
  CHECK (status IN ('draft', 'active', 'expired', 'archived'));

-- 2. Enhance operational_jobs with document readiness tracking
ALTER TABLE operational_jobs
  ADD COLUMN IF NOT EXISTS document_readiness_status TEXT DEFAULT 'missing_required',
  ADD COLUMN IF NOT EXISTS compliance_blocked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS missing_required_docs TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS missing_recommended_docs TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expired_docs TEXT[] DEFAULT '{}';

-- Add check constraint for document readiness status
ALTER TABLE operational_jobs
  ADD CONSTRAINT operational_jobs_document_readiness_check 
  CHECK (document_readiness_status IN ('ready', 'missing_recommended', 'missing_required'));

-- 3. Create function to auto-update document expiry status
CREATE OR REPLACE FUNCTION check_document_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valid_to IS NOT NULL AND NEW.valid_to < NOW() THEN
    NEW.expired := TRUE;
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document expiry check
DROP TRIGGER IF EXISTS trigger_check_document_expiry ON job_documents;
CREATE TRIGGER trigger_check_document_expiry
  BEFORE INSERT OR UPDATE ON job_documents
  FOR EACH ROW
  EXECUTE FUNCTION check_document_expiry();

-- 4. Create function to calculate job document readiness
CREATE OR REPLACE FUNCTION calculate_job_document_readiness(p_job_id UUID)
RETURNS TABLE(
  status TEXT,
  compliance_blocked BOOLEAN,
  missing_required TEXT[],
  missing_recommended TEXT[],
  expired TEXT[]
) AS $$
DECLARE
  v_job_status TEXT;
  v_documents JSONB;
  v_compliance_docs_expired BOOLEAN;
BEGIN
  -- Get job status
  SELECT operational_jobs.status INTO v_job_status
  FROM operational_jobs
  WHERE id = p_job_id;

  -- Get all documents for job
  SELECT json_agg(json_build_object(
    'id', id,
    'template_id', template_id,
    'category', category,
    'expired', expired,
    'status', job_documents.status
  )) INTO v_documents
  FROM job_documents
  WHERE job_id = p_job_id;

  -- Check for expired compliance documents
  SELECT EXISTS(
    SELECT 1 FROM job_documents
    WHERE job_id = p_job_id
      AND category = 'compliance'
      AND (expired = TRUE OR job_documents.status = 'expired')
  ) INTO v_compliance_docs_expired;

  -- For now, return basic readiness
  -- In production, this would check against TRANSPORT_DOCUMENT_TEMPLATES
  RETURN QUERY SELECT
    CASE
      WHEN v_compliance_docs_expired THEN 'missing_required'::TEXT
      ELSE 'ready'::TEXT
    END,
    v_compliance_docs_expired,
    ARRAY[]::TEXT[], -- missing_required
    ARRAY[]::TEXT[], -- missing_recommended
    ARRAY(
      SELECT id::TEXT FROM job_documents
      WHERE job_id = p_job_id AND (expired = TRUE OR job_documents.status = 'expired')
    ); -- expired
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to auto-lock documents on job completion
CREATE OR REPLACE FUNCTION auto_lock_documents_on_job_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Lock operational documents when job completes
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE job_documents
    SET 
      locked = TRUE,
      locked_reason = 'Job completed'
    WHERE job_id = NEW.id
      AND category = 'operational'
      AND locked = FALSE;
  END IF;

  -- Lock financial documents when job is closed
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    UPDATE job_documents
    SET 
      locked = TRUE,
      locked_reason = 'Job closed'
    WHERE job_id = NEW.id
      AND category IN ('financial', 'operational')
      AND locked = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-locking documents
DROP TRIGGER IF EXISTS trigger_auto_lock_documents ON operational_jobs;
CREATE TRIGGER trigger_auto_lock_documents
  AFTER UPDATE ON operational_jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION auto_lock_documents_on_job_completion();

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_documents_category ON job_documents(category);
CREATE INDEX IF NOT EXISTS idx_job_documents_template_id ON job_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_linked_contract ON job_documents(linked_contract_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_linked_decision ON job_documents(linked_decision_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_expired ON job_documents(expired) WHERE expired = TRUE;
CREATE INDEX IF NOT EXISTS idx_job_documents_status ON job_documents(status);
CREATE INDEX IF NOT EXISTS idx_operational_jobs_document_readiness ON operational_jobs(document_readiness_status);
CREATE INDEX IF NOT EXISTS idx_operational_jobs_compliance_blocked ON operational_jobs(compliance_blocked) WHERE compliance_blocked = TRUE;

-- 7. Add RLS policies for document categories
-- Policy: Users can view documents for jobs in their department
CREATE POLICY "Users can view job documents in their department"
  ON job_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM operational_jobs
      WHERE operational_jobs.id = job_documents.job_id
        AND operational_jobs.department_id IN (
          SELECT id FROM departments
          WHERE business_profile_id IN (
            SELECT business_profile_id FROM user_business_profiles
            WHERE user_id = auth.uid()
          )
        )
    )
  );

-- Policy: Users can insert documents for jobs in their department
CREATE POLICY "Users can insert job documents in their department"
  ON job_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM operational_jobs
      WHERE operational_jobs.id = job_documents.job_id
        AND operational_jobs.department_id IN (
          SELECT id FROM departments
          WHERE business_profile_id IN (
            SELECT business_profile_id FROM user_business_profiles
            WHERE user_id = auth.uid()
          )
        )
    )
  );

-- Policy: Users can update unlocked documents in their department
CREATE POLICY "Users can update unlocked job documents in their department"
  ON job_documents FOR UPDATE
  USING (
    locked = FALSE
    AND EXISTS (
      SELECT 1 FROM operational_jobs
      WHERE operational_jobs.id = job_documents.job_id
        AND operational_jobs.department_id IN (
          SELECT id FROM departments
          WHERE business_profile_id IN (
            SELECT business_profile_id FROM user_business_profiles
            WHERE user_id = auth.uid()
          )
        )
    )
  );

-- 8. Add comments for documentation
COMMENT ON COLUMN job_documents.category IS 'Semantic document category: contractual (before), operational (during), compliance (blocking), financial (after), history (archived)';
COMMENT ON COLUMN job_documents.template_id IS 'Links to predefined document template (e.g., single_transport_order, pickup_protocol)';
COMMENT ON COLUMN job_documents.linked_contract_id IS 'Links document to contract for auditability';
COMMENT ON COLUMN job_documents.linked_decision_id IS 'Links document to decision for authorization trail';
COMMENT ON COLUMN job_documents.locked IS 'If true, document cannot be edited (locked after job completion/invoicing)';
COMMENT ON COLUMN job_documents.expired IS 'Auto-set to true if valid_to < NOW()';
COMMENT ON COLUMN job_documents.template_data IS 'Structured data for template-based documents (e.g., pickup protocol fields)';

COMMENT ON COLUMN operational_jobs.document_readiness_status IS 'Visual indicator: ready (green), missing_recommended (yellow), missing_required (red)';
COMMENT ON COLUMN operational_jobs.compliance_blocked IS 'If true, job cannot proceed due to missing/expired compliance documents';

-- 9. Migrate existing documents to default category
UPDATE job_documents
SET category = 'operational'
WHERE category IS NULL;

-- 10. Create view for document readiness dashboard
CREATE OR REPLACE VIEW v_job_document_readiness AS
SELECT
  oj.id AS job_id,
  oj.job_number,
  oj.title,
  oj.status AS job_status,
  oj.department_id,
  oj.document_readiness_status,
  oj.compliance_blocked,
  COUNT(jd.id) FILTER (WHERE jd.category = 'contractual') AS contractual_docs,
  COUNT(jd.id) FILTER (WHERE jd.category = 'operational') AS operational_docs,
  COUNT(jd.id) FILTER (WHERE jd.category = 'compliance') AS compliance_docs,
  COUNT(jd.id) FILTER (WHERE jd.category = 'financial') AS financial_docs,
  COUNT(jd.id) FILTER (WHERE jd.expired = TRUE) AS expired_docs,
  COUNT(jd.id) FILTER (WHERE jd.locked = TRUE) AS locked_docs
FROM operational_jobs oj
LEFT JOIN job_documents jd ON jd.job_id = oj.id
GROUP BY oj.id, oj.job_number, oj.title, oj.status, oj.department_id, oj.document_readiness_status, oj.compliance_blocked;

COMMENT ON VIEW v_job_document_readiness IS 'Dashboard view showing document readiness per job with category counts';
