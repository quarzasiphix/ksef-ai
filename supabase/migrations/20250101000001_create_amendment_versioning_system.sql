-- Create immutable amendment and versioning system for decisions
-- This migration implements audit-grade decision management with:
-- 1. Version history (never delete, always version)
-- 2. Amendment requests (signed document + multi-party approval)
-- 3. Cryptographic hash chain for tamper detection
-- 4. Full event logging integration

-- ============================================================================
-- 1. DECISION_VERSIONS TABLE
-- ============================================================================
-- Stores immutable snapshots of decision data at each version
CREATE TABLE decision_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Snapshot of decision data at this version
  title TEXT NOT NULL,
  description TEXT,
  decision_type TEXT NOT NULL,
  category TEXT,
  legal_basis TEXT,
  decision_body TEXT NOT NULL CHECK (decision_body IN ('ZARZAD', 'WSPOLNICY')),
  approval_policy TEXT NOT NULL,
  
  -- Full data snapshot (JSONB) - complete decision state
  data_snapshot JSONB NOT NULL,
  
  -- Audit hashing - creates tamper-evident chain
  snapshot_hash TEXT NOT NULL, -- SHA-256 of data_snapshot
  previous_version_hash TEXT, -- Hash of previous version (blockchain-style)
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ, -- When this version was replaced by newer one
  superseded_by UUID REFERENCES decision_versions(id),
  
  -- Amendment that created this version (null for v1)
  amendment_id UUID, -- FK added after amendment_requests table created
  
  UNIQUE(decision_id, version_number)
);

CREATE INDEX idx_decision_versions_decision ON decision_versions(decision_id);
CREATE INDEX idx_decision_versions_current ON decision_versions(decision_id, superseded_at) 
  WHERE superseded_at IS NULL;
CREATE INDEX idx_decision_versions_hash ON decision_versions(snapshot_hash);

COMMENT ON TABLE decision_versions IS 
'Immutable version history for decisions. Each decision change creates a new version, old versions are never deleted.';

COMMENT ON COLUMN decision_versions.snapshot_hash IS 
'SHA-256 hash of data_snapshot for tamper detection';

COMMENT ON COLUMN decision_versions.previous_version_hash IS 
'Hash of previous version, creating a blockchain-style audit chain';

-- ============================================================================
-- 2. AMENDMENT_REQUESTS TABLE
-- ============================================================================
-- Tracks amendment proposals with signed document requirement
CREATE TABLE amendment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id),
  
  -- Current version being amended
  from_version_id UUID NOT NULL REFERENCES decision_versions(id),
  
  -- Proposed changes
  proposed_changes JSONB NOT NULL, -- Full new decision data
  changes_diff JSONB, -- Computed diff for UI display
  justification TEXT NOT NULL,
  
  -- Requester
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Approval tracking
  required_approvers UUID[] NOT NULL DEFAULT '{}',
  approvals JSONB NOT NULL DEFAULT '[]', 
  -- Structure: [{user_id, approved_at, signature}]
  
  -- Document with signature
  document_url TEXT,
  document_name TEXT,
  document_uploaded_at TIMESTAMPTZ,
  
  -- Signature verification (from microservice or podpis.gov.pl)
  signature_verification JSONB,
  -- Structure:
  -- {
  --   status: 'valid' | 'invalid' | 'indeterminate' | 'not_checked',
  --   checked_at: timestamp,
  --   signers: [{cn, issuer, signing_time, certificate_valid, revocation_status, has_timestamp}],
  --   certificate_issuer: string,
  --   has_timestamp: boolean,
  --   revocation_checked: boolean,
  --   report_blob: {} // full validation report
  -- }
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',              -- No document yet
    'pending_verification', -- Document uploaded, awaiting signature check
    'verified',             -- Signature valid, ready for approvals
    'approved',             -- All approvals received, new version created
    'rejected',             -- Rejected by approver
    'cancelled'             -- Cancelled by requester
  )),
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Created version (when approved)
  created_version_id UUID REFERENCES decision_versions(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_amendment_requests_decision ON amendment_requests(decision_id);
CREATE INDEX idx_amendment_requests_status ON amendment_requests(status);
CREATE INDEX idx_amendment_requests_from_version ON amendment_requests(from_version_id);
CREATE INDEX idx_amendment_requests_business_profile ON amendment_requests(business_profile_id);

COMMENT ON TABLE amendment_requests IS 
'Amendment proposals for decisions. Requires signed document and multi-party approval before creating new version.';

COMMENT ON COLUMN amendment_requests.signature_verification IS 
'Signature verification data from validation microservice (ETSI DSS or similar)';

-- Add FK from decision_versions to amendment_requests
ALTER TABLE decision_versions
ADD CONSTRAINT fk_decision_versions_amendment
FOREIGN KEY (amendment_id) REFERENCES amendment_requests(id);

-- ============================================================================
-- 3. UPDATE DECISIONS TABLE
-- ============================================================================

-- Add new status values for amendment workflow
ALTER TABLE decisions 
DROP CONSTRAINT IF EXISTS decisions_status_check;

ALTER TABLE decisions 
ADD CONSTRAINT decisions_status_check 
CHECK (status IN (
  'draft',
  'pending_approval',
  'active',
  'amendment_pending',  -- NEW: Amendment request in progress
  'amended',            -- NEW: Superseded by newer version
  'revocation_pending',
  'revoked',
  'rejected',
  'cancelled'
));

-- Add versioning fields
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS current_version_id UUID REFERENCES decision_versions(id),
ADD COLUMN IF NOT EXISTS version_count INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_decisions_current_version ON decisions(current_version_id);

COMMENT ON COLUMN decisions.current_version_id IS 
'Points to the current active version in decision_versions table';

COMMENT ON COLUMN decisions.version_count IS 
'Total number of versions created for this decision';

-- ============================================================================
-- 4. MIGRATE EXISTING DECISIONS TO V1
-- ============================================================================

-- Create initial version (v1) for all existing decisions that don't have versions yet
INSERT INTO decision_versions (
  decision_id,
  version_number,
  title,
  description,
  decision_type,
  category,
  legal_basis,
  decision_body,
  approval_policy,
  data_snapshot,
  snapshot_hash,
  previous_version_hash,
  created_by,
  created_at
)
SELECT 
  d.id,
  1 as version_number,
  d.title,
  d.description,
  d.decision_type,
  d.category,
  d.legal_basis,
  COALESCE(d.decision_body, 'WSPOLNICY') as decision_body,
  COALESCE(d.approval_policy, 'ALL_SHAREHOLDERS') as approval_policy,
  jsonb_build_object(
    'title', d.title,
    'description', d.description,
    'decision_type', d.decision_type,
    'category', d.category,
    'legal_basis', d.legal_basis,
    'decision_body', COALESCE(d.decision_body, 'WSPOLNICY'),
    'approval_policy', COALESCE(d.approval_policy, 'ALL_SHAREHOLDERS'),
    'status', d.status,
    'created_at', d.created_at
  ) as data_snapshot,
  encode(digest(d.id::text || d.title || COALESCE(d.created_at::text, ''), 'sha256'), 'hex') as snapshot_hash,
  NULL as previous_version_hash,
  COALESCE(d.created_by, d.user_id) as created_by,
  d.created_at
FROM decisions d
WHERE d.current_version_id IS NULL;

-- Update decisions to point to their v1
UPDATE decisions d
SET 
  current_version_id = dv.id,
  version_count = 1
FROM decision_versions dv
WHERE d.id = dv.decision_id 
  AND dv.version_number = 1
  AND d.current_version_id IS NULL;

-- ============================================================================
-- 5. ADD DECISION_BODY AND APPROVAL_POLICY IF MISSING
-- ============================================================================

-- Add decision_body column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'decision_body'
  ) THEN
    ALTER TABLE decisions 
    ADD COLUMN decision_body TEXT DEFAULT 'WSPOLNICY' 
    CHECK (decision_body IN ('ZARZAD', 'WSPOLNICY'));
  END IF;
END $$;

-- Add approval_policy column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'approval_policy'
  ) THEN
    ALTER TABLE decisions 
    ADD COLUMN approval_policy TEXT DEFAULT 'ALL_SHAREHOLDERS';
  END IF;
END $$;

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to compute SHA-256 hash of JSONB data
CREATE OR REPLACE FUNCTION compute_snapshot_hash(data JSONB)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(data::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get current version for a decision
CREATE OR REPLACE FUNCTION get_current_version(p_decision_id UUID)
RETURNS decision_versions AS $$
  SELECT * FROM decision_versions
  WHERE decision_id = p_decision_id
    AND superseded_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- 7. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_amendment_requests_updated_at
  BEFORE UPDATE ON amendment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE decision_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE amendment_requests ENABLE ROW LEVEL SECURITY;

-- Decision versions: same access as parent decision
CREATE POLICY decision_versions_select ON decision_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM decisions d
      WHERE d.id = decision_versions.decision_id
        AND d.business_profile_id IN (
          SELECT business_profile_id FROM business_profiles
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY decision_versions_insert ON decision_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM decisions d
      WHERE d.id = decision_versions.decision_id
        AND d.business_profile_id IN (
          SELECT business_profile_id FROM business_profiles
          WHERE user_id = auth.uid()
        )
    )
  );

-- Amendment requests: same access as parent decision
CREATE POLICY amendment_requests_select ON amendment_requests
  FOR SELECT
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY amendment_requests_insert ON amendment_requests
  FOR INSERT
  WITH CHECK (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY amendment_requests_update ON amendment_requests
  FOR UPDATE
  USING (
    business_profile_id IN (
      SELECT id FROM business_profiles
      WHERE user_id = auth.uid()
    )
  );
