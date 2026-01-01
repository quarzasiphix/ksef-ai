-- Migration: Documents DMS Refactor - Document ≠ File
-- Purpose: Transform documents from file dump to structured DMS with metadata + lifecycle

-- 1. Create documents table (record with metadata)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('contract', 'execution', 'compliance', 'financial', 'correspondence', 'internal', 'other')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'requires_action', 'completed', 'archived', 'signed', 'expired')),
  description TEXT,
  
  -- Scope & Context
  scope TEXT NOT NULL CHECK (scope IN ('department', 'job', 'contract', 'decision', 'client', 'vehicle', 'driver')),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  -- Linkage (what this document relates to)
  job_id UUID REFERENCES operational_jobs(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  decision_id UUID REFERENCES decisions(id) ON DELETE SET NULL,
  invoice_id UUID,
  client_id UUID,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  required_level TEXT DEFAULT 'optional' CHECK (required_level IN ('optional', 'required', 'critical')),
  
  -- Lifecycle
  version INTEGER NOT NULL DEFAULT 1,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_reason TEXT,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Ownership
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create document_attachments table (files linked to documents)
CREATE TABLE IF NOT EXISTS document_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- File info
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Optional integrity
  checksum TEXT,
  
  -- Metadata
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Optional preview
  thumbnail_url TEXT
);

-- 3. Create document_activity table (audit trail)
CREATE TABLE IF NOT EXISTS document_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'created', 'status_changed', 'linked', 'unlinked', 
    'attachment_added', 'attachment_removed', 'locked', 'unlocked', 
    'metadata_updated', 'expired'
  )),
  
  -- Change details
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  
  -- Actor
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create required_document_rules table (per department template)
CREATE TABLE IF NOT EXISTS required_document_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_template_id TEXT NOT NULL,
  
  -- What document
  document_type TEXT NOT NULL,
  title_template TEXT NOT NULL,
  
  -- When required
  scope TEXT NOT NULL CHECK (scope IN ('department', 'job', 'contract', 'decision', 'client', 'vehicle', 'driver')),
  stage TEXT, -- e.g., 'before_start', 'before_close'
  is_required BOOLEAN DEFAULT FALSE,
  required_level TEXT DEFAULT 'optional' CHECK (required_level IN ('optional', 'required', 'critical')),
  
  -- Validation
  must_have_attachments BOOLEAN DEFAULT FALSE,
  must_be_signed BOOLEAN DEFAULT FALSE,
  must_not_be_expired BOOLEAN DEFAULT FALSE,
  
  -- Auto-creation
  auto_create BOOLEAN DEFAULT FALSE,
  template_id TEXT
);

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department_id);
CREATE INDEX IF NOT EXISTS idx_documents_business_profile ON documents(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_scope ON documents(scope);
CREATE INDEX IF NOT EXISTS idx_documents_job ON documents(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_decision ON documents(decision_id) WHERE decision_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON documents(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_driver ON documents(driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_required ON documents(required_level) WHERE required_level IN ('required', 'critical');
CREATE INDEX IF NOT EXISTS idx_documents_locked ON documents(is_locked) WHERE is_locked = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_valid_to ON documents(valid_to) WHERE valid_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_document_attachments_document ON document_attachments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_activity_document ON document_activity(document_id);
CREATE INDEX IF NOT EXISTS idx_document_activity_type ON document_activity(activity_type);

CREATE INDEX IF NOT EXISTS idx_required_document_rules_template ON required_document_rules(department_template_id);
CREATE INDEX IF NOT EXISTS idx_required_document_rules_scope ON required_document_rules(scope);

-- 6. Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_updated_at();

-- 7. Create function to auto-log document activity
CREATE OR REPLACE FUNCTION log_document_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO document_activity (document_id, activity_type, performed_by, description)
    VALUES (NEW.id, 'created', NEW.created_by, 'Document created');
    RETURN NEW;
  END IF;
  
  -- Log status change
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO document_activity (document_id, activity_type, old_value, new_value, performed_by)
    VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, NEW.created_by);
  END IF;
  
  -- Log locking
  IF TG_OP = 'UPDATE' AND OLD.is_locked = FALSE AND NEW.is_locked = TRUE THEN
    INSERT INTO document_activity (document_id, activity_type, performed_by, description)
    VALUES (NEW.id, 'locked', NEW.locked_by, NEW.locked_reason);
  END IF;
  
  -- Log unlocking
  IF TG_OP = 'UPDATE' AND OLD.is_locked = TRUE AND NEW.is_locked = FALSE THEN
    INSERT INTO document_activity (document_id, activity_type, performed_by)
    VALUES (NEW.id, 'unlocked', NEW.created_by);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_document_activity
  AFTER INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION log_document_activity();

-- 8. Create function to log attachment activity
CREATE OR REPLACE FUNCTION log_attachment_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO document_activity (document_id, activity_type, performed_by, description)
    VALUES (NEW.document_id, 'attachment_added', NEW.uploaded_by, NEW.original_filename);
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    INSERT INTO document_activity (document_id, activity_type, performed_by, description)
    VALUES (OLD.document_id, 'attachment_removed', auth.uid(), OLD.original_filename);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_attachment_activity
  AFTER INSERT OR DELETE ON document_attachments
  FOR EACH ROW
  EXECUTE FUNCTION log_attachment_activity();

-- 9. Create function to check document expiry
CREATE OR REPLACE FUNCTION check_document_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.valid_to IS NOT NULL AND NEW.valid_to < NOW() AND NEW.status != 'expired' THEN
    NEW.status = 'expired';
    INSERT INTO document_activity (document_id, activity_type, performed_by, description)
    VALUES (NEW.id, 'expired', NEW.created_by, 'Document expired automatically');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_document_expiry
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION check_document_expiry();

-- 10. Create view for document stats
CREATE OR REPLACE VIEW v_document_stats AS
SELECT
  d.department_id,
  d.business_profile_id,
  COUNT(*) AS total_documents,
  COUNT(*) FILTER (WHERE d.required_level IN ('required', 'critical') AND d.status IN ('draft', 'requires_action')) AS missing_required,
  COUNT(*) FILTER (WHERE d.valid_to IS NOT NULL AND d.valid_to BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS expiring_soon,
  COUNT(*) FILTER (WHERE d.status = 'requires_action') AS awaiting_signature,
  COUNT(*) FILTER (WHERE d.status = 'requires_action') AS requires_action,
  
  -- By type
  COUNT(*) FILTER (WHERE d.type = 'contract') AS type_contract,
  COUNT(*) FILTER (WHERE d.type = 'execution') AS type_execution,
  COUNT(*) FILTER (WHERE d.type = 'compliance') AS type_compliance,
  COUNT(*) FILTER (WHERE d.type = 'financial') AS type_financial,
  COUNT(*) FILTER (WHERE d.type = 'correspondence') AS type_correspondence,
  COUNT(*) FILTER (WHERE d.type = 'internal') AS type_internal,
  COUNT(*) FILTER (WHERE d.type = 'other') AS type_other,
  
  -- By status
  COUNT(*) FILTER (WHERE d.status = 'draft') AS status_draft,
  COUNT(*) FILTER (WHERE d.status = 'ready') AS status_ready,
  COUNT(*) FILTER (WHERE d.status = 'requires_action') AS status_requires_action,
  COUNT(*) FILTER (WHERE d.status = 'completed') AS status_completed,
  COUNT(*) FILTER (WHERE d.status = 'archived') AS status_archived,
  COUNT(*) FILTER (WHERE d.status = 'signed') AS status_signed,
  COUNT(*) FILTER (WHERE d.status = 'expired') AS status_expired,
  
  -- By scope
  COUNT(*) FILTER (WHERE d.scope = 'department') AS scope_department,
  COUNT(*) FILTER (WHERE d.scope = 'job') AS scope_job,
  COUNT(*) FILTER (WHERE d.scope = 'contract') AS scope_contract,
  COUNT(*) FILTER (WHERE d.scope = 'decision') AS scope_decision,
  COUNT(*) FILTER (WHERE d.scope = 'client') AS scope_client,
  COUNT(*) FILTER (WHERE d.scope = 'vehicle') AS scope_vehicle,
  COUNT(*) FILTER (WHERE d.scope = 'driver') AS scope_driver
FROM documents d
GROUP BY d.department_id, d.business_profile_id;

-- 11. Create view for documents with attachment counts
CREATE OR REPLACE VIEW v_documents_with_attachments AS
SELECT
  d.*,
  COUNT(da.id) AS attachment_count,
  COUNT(da.id) > 0 AS has_attachments,
  CASE
    WHEN d.valid_to IS NOT NULL AND d.valid_to < NOW() THEN TRUE
    ELSE FALSE
  END AS is_expired,
  CASE
    WHEN d.valid_to IS NOT NULL THEN EXTRACT(DAY FROM (d.valid_to - NOW()))::INTEGER
    ELSE NULL
  END AS days_until_expiry
FROM documents d
LEFT JOIN document_attachments da ON da.document_id = d.id
GROUP BY d.id;

-- 12. Add RLS policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view documents in their business profile
CREATE POLICY "Users can view documents in their business profile"
  ON documents FOR SELECT
  USING (
    business_profile_id IN (
      SELECT business_profile_id FROM user_business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert documents in their business profile
CREATE POLICY "Users can insert documents in their business profile"
  ON documents FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT business_profile_id FROM user_business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update unlocked documents in their business profile
CREATE POLICY "Users can update unlocked documents in their business profile"
  ON documents FOR UPDATE
  USING (
    is_locked = FALSE
    AND business_profile_id IN (
      SELECT business_profile_id FROM user_business_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can view attachments for documents they can see
CREATE POLICY "Users can view attachments for documents they can see"
  ON document_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_attachments.document_id
        AND documents.business_profile_id IN (
          SELECT business_profile_id FROM user_business_profiles
          WHERE user_id = auth.uid()
        )
    )
  );

-- Policy: Users can insert attachments for documents they can see
CREATE POLICY "Users can insert attachments for documents they can see"
  ON document_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_attachments.document_id
        AND documents.is_locked = FALSE
        AND documents.business_profile_id IN (
          SELECT business_profile_id FROM user_business_profiles
          WHERE user_id = auth.uid()
        )
    )
  );

-- Policy: Users can view activity for documents they can see
CREATE POLICY "Users can view activity for documents they can see"
  ON document_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_activity.document_id
        AND documents.business_profile_id IN (
          SELECT business_profile_id FROM user_business_profiles
          WHERE user_id = auth.uid()
        )
    )
  );

-- 13. Add comments for documentation
COMMENT ON TABLE documents IS 'Document records with metadata and lifecycle (NOT files - files are in document_attachments)';
COMMENT ON TABLE document_attachments IS 'Physical files attached to document records';
COMMENT ON TABLE document_activity IS 'Audit trail for document lifecycle events';
COMMENT ON TABLE required_document_rules IS 'Rules defining required documents per department template';

COMMENT ON COLUMN documents.scope IS 'What this document relates to: department/job/contract/decision/client/vehicle/driver';
COMMENT ON COLUMN documents.required_level IS 'Importance: optional/required/critical';
COMMENT ON COLUMN documents.is_locked IS 'If true, document cannot be edited (locked after completion/signing)';
COMMENT ON COLUMN documents.version IS 'Document version number (for future versioning support)';
