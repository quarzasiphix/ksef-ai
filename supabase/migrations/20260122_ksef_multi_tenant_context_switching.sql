-- KSeF Multi-Tenant Context Switching Schema
-- Enables Tovernet to manage KSeF operations for multiple client companies
-- Based on official KSeF permissions model

-- ============================================================================
-- 1. KSeF System Credentials (Provider-level)
-- ============================================================================
-- Stores Tovernet's KSeF authentication credentials (tokens/certificates)
-- These are used to authenticate AS Tovernet when making API calls

CREATE TABLE IF NOT EXISTS ksef_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_nip VARCHAR(10) NOT NULL, -- Tovernet NIP
  auth_type VARCHAR(20) NOT NULL CHECK (auth_type IN ('token', 'certificate')),
  
  -- Secret storage reference (never store raw secrets in DB)
  secret_ref TEXT NOT NULL, -- Reference to Vault/KMS/Supabase secret storage
  
  -- Token/Certificate metadata
  expires_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(provider_nip, auth_type, is_active)
);

CREATE INDEX idx_ksef_credentials_provider ON ksef_credentials(provider_nip) WHERE is_active = true;
CREATE INDEX idx_ksef_credentials_expires ON ksef_credentials(expires_at) WHERE is_active = true;

COMMENT ON TABLE ksef_credentials IS 'System-level KSeF authentication credentials for Tovernet';
COMMENT ON COLUMN ksef_credentials.secret_ref IS 'Reference to secret storage (e.g., supabase.vault key name)';

-- ============================================================================
-- 2. KSeF Integrations (Per-Tenant)
-- ============================================================================
-- Tracks which client companies have granted Tovernet permission to access their KSeF context
-- One row per client company

CREATE TABLE IF NOT EXISTS ksef_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant identification
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  business_profile_id UUID REFERENCES business_profiles(id) ON DELETE SET NULL,
  
  -- KSeF context
  taxpayer_nip VARCHAR(10) NOT NULL, -- Client company NIP
  provider_nip VARCHAR(10) NOT NULL, -- Tovernet NIP (who has permission)
  
  -- Integration status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'error', 'expired')),
  
  -- Granted permissions (from KSeF permissions API)
  granted_scopes JSONB DEFAULT '[]'::jsonb,
  -- Example: ["InvoiceRead", "InvoiceWrite", "InvoiceExport"]
  
  -- Verification
  last_verified_at TIMESTAMPTZ,
  verification_error TEXT,
  
  -- Sync metadata
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  
  -- Audit
  granted_at TIMESTAMPTZ, -- When client granted permission in KSeF
  granted_by UUID REFERENCES auth.users(id), -- Who initiated in our system
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(company_id, taxpayer_nip),
  UNIQUE(taxpayer_nip, provider_nip) -- One provider per taxpayer
);

CREATE INDEX idx_ksef_integrations_company ON ksef_integrations(company_id);
CREATE INDEX idx_ksef_integrations_taxpayer ON ksef_integrations(taxpayer_nip);
CREATE INDEX idx_ksef_integrations_status ON ksef_integrations(status);
CREATE INDEX idx_ksef_integrations_active ON ksef_integrations(company_id, status) WHERE status = 'active';

COMMENT ON TABLE ksef_integrations IS 'Per-tenant KSeF integration tracking - which companies granted Tovernet permission';
COMMENT ON COLUMN ksef_integrations.granted_scopes IS 'JSON array of KSeF permission scopes granted to provider';

-- ============================================================================
-- 3. KSeF Sync State (Per-Tenant)
-- ============================================================================
-- Tracks synchronization state for each tenant's KSeF inbox
-- Used by background jobs to pull new invoices

CREATE TABLE IF NOT EXISTS ksef_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES ksef_integrations(id) ON DELETE CASCADE,
  
  -- Sync cursors
  last_pull_timestamp TIMESTAMPTZ,
  last_pull_cursor TEXT, -- KSeF continuation token
  last_invoice_ksef_number VARCHAR(35), -- Last processed KSeF number
  
  -- Sync statistics
  total_invoices_pulled INTEGER DEFAULT 0,
  last_pull_count INTEGER DEFAULT 0,
  last_pull_duration_ms INTEGER,
  
  -- Error tracking
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  consecutive_errors INTEGER DEFAULT 0,
  
  -- Sync configuration
  sync_interval_minutes INTEGER DEFAULT 15,
  sync_enabled BOOLEAN DEFAULT true,
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id),
  UNIQUE(integration_id)
);

CREATE INDEX idx_ksef_sync_state_company ON ksef_sync_state(company_id);
CREATE INDEX idx_ksef_sync_state_enabled ON ksef_sync_state(sync_enabled) WHERE sync_enabled = true;
CREATE INDEX idx_ksef_sync_state_next_sync ON ksef_sync_state(last_pull_timestamp, sync_interval_minutes) WHERE sync_enabled = true;

COMMENT ON TABLE ksef_sync_state IS 'Synchronization state for KSeF inbox polling per tenant';

-- ============================================================================
-- 4. KSeF Documents Raw (Immutable Storage)
-- ============================================================================
-- Stores raw KSeF documents (XML) as received from API
-- Immutable audit trail of all KSeF interactions

CREATE TABLE IF NOT EXISTS ksef_documents_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES ksef_integrations(id) ON DELETE CASCADE,
  
  -- KSeF identifiers
  ksef_number VARCHAR(35) NOT NULL, -- Official KSeF invoice number
  ksef_reference_number VARCHAR(50), -- Session reference if applicable
  
  -- Document data
  document_type VARCHAR(20) NOT NULL CHECK (document_type IN ('invoice', 'upo', 'correction', 'other')),
  raw_xml TEXT NOT NULL, -- Original XML as received
  raw_metadata JSONB, -- Headers, timestamps, etc.
  
  -- Direction
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  
  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  
  -- Linked to normalized invoice
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Immutable audit
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(ksef_number, company_id)
);

CREATE INDEX idx_ksef_documents_company ON ksef_documents_raw(company_id);
CREATE INDEX idx_ksef_documents_ksef_number ON ksef_documents_raw(ksef_number);
CREATE INDEX idx_ksef_documents_unprocessed ON ksef_documents_raw(company_id, processed) WHERE processed = false;
CREATE INDEX idx_ksef_documents_direction ON ksef_documents_raw(company_id, direction);

COMMENT ON TABLE ksef_documents_raw IS 'Immutable storage of raw KSeF documents (XML) for audit trail';

-- ============================================================================
-- 5. KSeF Audit Log (All Operations)
-- ============================================================================
-- Comprehensive audit trail of all KSeF API operations
-- Critical for security, compliance, and debugging

CREATE TABLE IF NOT EXISTS ksef_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  integration_id UUID REFERENCES ksef_integrations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Operation details
  operation VARCHAR(50) NOT NULL, -- e.g., 'list_invoices', 'send_invoice', 'verify_permission'
  endpoint TEXT NOT NULL, -- Full API endpoint
  http_method VARCHAR(10),
  
  -- Request context
  taxpayer_nip VARCHAR(10), -- Client NIP (context)
  provider_nip VARCHAR(10), -- Tovernet NIP (auth)
  
  -- Request/Response
  request_id TEXT, -- Correlation ID
  request_payload JSONB,
  response_status INTEGER,
  response_payload JSONB,
  
  -- Timing
  duration_ms INTEGER,
  
  -- Error tracking
  error_code TEXT,
  error_message TEXT,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes for common queries
  CONSTRAINT chk_response_status CHECK (response_status >= 100 AND response_status < 600)
);

CREATE INDEX idx_ksef_audit_company ON ksef_audit_log(company_id, created_at DESC);
CREATE INDEX idx_ksef_audit_operation ON ksef_audit_log(operation, created_at DESC);
CREATE INDEX idx_ksef_audit_errors ON ksef_audit_log(response_status) WHERE response_status >= 400;
CREATE INDEX idx_ksef_audit_taxpayer ON ksef_audit_log(taxpayer_nip, created_at DESC);
CREATE INDEX idx_ksef_audit_request_id ON ksef_audit_log(request_id);

COMMENT ON TABLE ksef_audit_log IS 'Comprehensive audit trail of all KSeF API operations for security and compliance';

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE ksef_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE ksef_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ksef_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE ksef_documents_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE ksef_audit_log ENABLE ROW LEVEL SECURITY;

-- ksef_credentials: Only system/admin access
CREATE POLICY ksef_credentials_admin_all ON ksef_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- ksef_integrations: Users can see their company's integrations
CREATE POLICY ksef_integrations_select ON ksef_integrations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY ksef_integrations_insert ON ksef_integrations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY ksef_integrations_update ON ksef_integrations
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- ksef_sync_state: Same as integrations
CREATE POLICY ksef_sync_state_select ON ksef_sync_state
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- ksef_documents_raw: Users can see their company's documents
CREATE POLICY ksef_documents_select ON ksef_documents_raw
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
  );

-- ksef_audit_log: Users can see their company's audit logs
CREATE POLICY ksef_audit_select ON ksef_audit_log
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_company_access
      WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 7. Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ksef_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER ksef_credentials_updated_at
  BEFORE UPDATE ON ksef_credentials
  FOR EACH ROW EXECUTE FUNCTION update_ksef_updated_at();

CREATE TRIGGER ksef_integrations_updated_at
  BEFORE UPDATE ON ksef_integrations
  FOR EACH ROW EXECUTE FUNCTION update_ksef_updated_at();

CREATE TRIGGER ksef_sync_state_updated_at
  BEFORE UPDATE ON ksef_sync_state
  FOR EACH ROW EXECUTE FUNCTION update_ksef_updated_at();

-- Function to get active integration for company
CREATE OR REPLACE FUNCTION get_active_ksef_integration(p_company_id UUID)
RETURNS TABLE (
  integration_id UUID,
  taxpayer_nip VARCHAR(10),
  provider_nip VARCHAR(10),
  granted_scopes JSONB,
  last_verified_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ki.id,
    ki.taxpayer_nip,
    ki.provider_nip,
    ki.granted_scopes,
    ki.last_verified_at
  FROM ksef_integrations ki
  WHERE ki.company_id = p_company_id
  AND ki.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log KSeF operation
CREATE OR REPLACE FUNCTION log_ksef_operation(
  p_company_id UUID,
  p_integration_id UUID,
  p_operation VARCHAR(50),
  p_endpoint TEXT,
  p_taxpayer_nip VARCHAR(10),
  p_provider_nip VARCHAR(10),
  p_response_status INTEGER,
  p_duration_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ksef_audit_log (
    company_id,
    integration_id,
    user_id,
    operation,
    endpoint,
    taxpayer_nip,
    provider_nip,
    response_status,
    duration_ms,
    error_message
  ) VALUES (
    p_company_id,
    p_integration_id,
    auth.uid(),
    p_operation,
    p_endpoint,
    p_taxpayer_nip,
    p_provider_nip,
    p_response_status,
    p_duration_ms,
    p_error_message
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Initial Data
-- ============================================================================

-- Insert Tovernet provider credentials placeholder
-- NOTE: Actual secret_ref should be set via secure process
INSERT INTO ksef_credentials (
  provider_nip,
  auth_type,
  secret_ref,
  description,
  is_active
) VALUES (
  '0000000000', -- Replace with actual Tovernet NIP
  'token',
  'ksef_tovernet_token', -- Reference to secret storage
  'Tovernet KSeF system token',
  false -- Set to true when configured
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. Comments and Documentation
-- ============================================================================

COMMENT ON SCHEMA public IS 'KSeF Multi-Tenant Context Switching implemented. See migration 20260122 for details.';
