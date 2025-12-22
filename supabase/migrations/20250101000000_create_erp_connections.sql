-- ERP Integration Tables
-- KsięgaI acts as a pre-KSeF agreement layer between ERP systems and KSeF

-- ERP Connections table
CREATE TABLE IF NOT EXISTS erp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_profile_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  
  provider TEXT NOT NULL CHECK (provider IN ('comarch', 'enova365', 'symfonia', 'insert', 'odoo', 'custom')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error', 'syncing')),
  
  -- Connection credentials (will be encrypted)
  api_endpoint TEXT,
  api_key TEXT,
  client_id TEXT,
  client_secret TEXT,
  
  -- Configuration
  sync_direction TEXT NOT NULL DEFAULT 'bidirectional' CHECK (sync_direction IN ('push', 'pull', 'bidirectional')),
  auto_push_after_agreement BOOLEAN DEFAULT true,
  auto_pull_status BOOLEAN DEFAULT true,
  
  -- Sync settings
  last_sync_at TIMESTAMPTZ,
  sync_frequency_minutes INTEGER DEFAULT 60,
  
  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_profile_id, provider)
);

-- ERP Sync Logs table
CREATE TABLE IF NOT EXISTS erp_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_connection_id UUID NOT NULL REFERENCES erp_connections(id) ON DELETE CASCADE,
  
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull', 'bidirectional')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'payment', 'customer', 'product')),
  entity_id UUID NOT NULL,
  
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  
  request_payload JSONB,
  response_payload JSONB,
  
  synced_at TIMESTAMPTZ DEFAULT now(),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_erp_connections_user_id ON erp_connections(user_id);
CREATE INDEX idx_erp_connections_business_profile_id ON erp_connections(business_profile_id);
CREATE INDEX idx_erp_connections_status ON erp_connections(status);
CREATE INDEX idx_erp_sync_logs_connection_id ON erp_sync_logs(erp_connection_id);
CREATE INDEX idx_erp_sync_logs_entity ON erp_sync_logs(entity_type, entity_id);
CREATE INDEX idx_erp_sync_logs_status ON erp_sync_logs(status);
CREATE INDEX idx_erp_sync_logs_synced_at ON erp_sync_logs(synced_at DESC);

-- RLS Policies
ALTER TABLE erp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own ERP connections
CREATE POLICY "Users can view own ERP connections"
  ON erp_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ERP connections"
  ON erp_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ERP connections"
  ON erp_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ERP connections"
  ON erp_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Users can view sync logs for their connections
CREATE POLICY "Users can view own ERP sync logs"
  ON erp_sync_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM erp_connections
      WHERE erp_connections.id = erp_sync_logs.erp_connection_id
      AND erp_connections.user_id = auth.uid()
    )
  );

-- System can insert sync logs
CREATE POLICY "System can insert ERP sync logs"
  ON erp_sync_logs FOR INSERT
  WITH CHECK (true);

-- Updated_at trigger for erp_connections
CREATE OR REPLACE FUNCTION update_erp_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER erp_connections_updated_at
  BEFORE UPDATE ON erp_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_erp_connections_updated_at();

-- Function to log ERP sync attempts
CREATE OR REPLACE FUNCTION log_erp_sync(
  p_connection_id UUID,
  p_direction TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_status TEXT,
  p_error_message TEXT DEFAULT NULL,
  p_request_payload JSONB DEFAULT NULL,
  p_response_payload JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO erp_sync_logs (
    erp_connection_id,
    direction,
    entity_type,
    entity_id,
    status,
    error_message,
    request_payload,
    response_payload
  ) VALUES (
    p_connection_id,
    p_direction,
    p_entity_type,
    p_entity_id,
    p_status,
    p_error_message,
    p_request_payload,
    p_response_payload
  )
  RETURNING id INTO v_log_id;
  
  -- Update connection error count if failed
  IF p_status = 'failed' THEN
    UPDATE erp_connections
    SET 
      error_count = error_count + 1,
      last_error = p_error_message,
      status = 'error'
    WHERE id = p_connection_id;
  ELSIF p_status = 'success' THEN
    UPDATE erp_connections
    SET 
      last_sync_at = now(),
      error_count = 0,
      last_error = NULL,
      status = 'connected'
    WHERE id = p_connection_id;
  END IF;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
