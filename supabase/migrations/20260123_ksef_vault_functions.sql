-- KSeF Vault Integration Functions
-- Provides secure access to KSeF secrets stored in Supabase Vault

-- ============================================================================
-- 1. Function to retrieve KSeF secret from Vault
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ksef_secret(secret_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value TEXT;
BEGIN
  -- Check if user has permission to access secrets
  -- Only super admins or service role can access
  IF NOT (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
    OR auth.uid() IS NULL -- Service role
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can access KSeF secrets';
  END IF;

  -- Attempt to retrieve from vault
  -- Note: This requires the vault extension to be enabled
  BEGIN
    SELECT decrypted_secret INTO secret_value
    FROM vault.decrypted_secrets
    WHERE name = secret_name
    LIMIT 1;
    
    IF secret_value IS NULL THEN
      RAISE EXCEPTION 'Secret not found: %', secret_name;
    END IF;
    
    RETURN secret_value;
  EXCEPTION
    WHEN undefined_table THEN
      -- Vault extension not available, fallback to credentials table
      RAISE NOTICE 'Vault extension not available, using fallback';
      
      -- Return reference (actual implementation should use encrypted column)
      SELECT secret_ref INTO secret_value
      FROM ksef_credentials
      WHERE secret_ref = secret_name
      AND is_active = true
      LIMIT 1;
      
      IF secret_value IS NULL THEN
        RAISE EXCEPTION 'Credential not found: %', secret_name;
      END IF;
      
      RETURN secret_value;
  END;
END;
$$;

COMMENT ON FUNCTION get_ksef_secret IS 'Securely retrieve KSeF secret from Vault (super admin only)';

-- ============================================================================
-- 2. Function to store KSeF secret in Vault
-- ============================================================================

CREATE OR REPLACE FUNCTION store_ksef_secret(
  secret_name TEXT,
  secret_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has permission to store secrets
  IF NOT (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
    OR auth.uid() IS NULL -- Service role
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can store KSeF secrets';
  END IF;

  -- Attempt to store in vault
  BEGIN
    INSERT INTO vault.secrets (name, secret)
    VALUES (secret_name, secret_value)
    ON CONFLICT (name) 
    DO UPDATE SET 
      secret = EXCLUDED.secret,
      updated_at = now();
      
    RAISE NOTICE 'Secret stored successfully: %', secret_name;
  EXCEPTION
    WHEN undefined_table THEN
      RAISE EXCEPTION 'Vault extension not available. Cannot store secrets securely.';
  END;
END;
$$;

COMMENT ON FUNCTION store_ksef_secret IS 'Securely store KSeF secret in Vault (super admin only)';

-- ============================================================================
-- 3. Function to rotate KSeF credentials
-- ============================================================================

CREATE OR REPLACE FUNCTION rotate_ksef_credentials(
  p_provider_nip VARCHAR(10),
  p_new_secret_ref TEXT,
  p_new_secret_value TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_credential_id UUID;
  v_new_credential_id UUID;
BEGIN
  -- Check permissions
  IF NOT (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
    OR auth.uid() IS NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can rotate credentials';
  END IF;

  -- Deactivate old credential
  UPDATE ksef_credentials
  SET is_active = false,
      updated_at = now()
  WHERE provider_nip = p_provider_nip
  AND is_active = true
  RETURNING id INTO v_old_credential_id;

  -- Store new secret in vault
  PERFORM store_ksef_secret(p_new_secret_ref, p_new_secret_value);

  -- Create new credential record
  INSERT INTO ksef_credentials (
    provider_nip,
    auth_type,
    secret_ref,
    issued_at,
    is_active,
    description,
    created_by
  ) VALUES (
    p_provider_nip,
    'token',
    p_new_secret_ref,
    now(),
    true,
    'Rotated credential',
    auth.uid()
  ) RETURNING id INTO v_new_credential_id;

  RAISE NOTICE 'Credentials rotated: old=%, new=%', v_old_credential_id, v_new_credential_id;
  
  RETURN v_new_credential_id;
END;
$$;

COMMENT ON FUNCTION rotate_ksef_credentials IS 'Rotate KSeF provider credentials (deactivate old, create new)';

-- ============================================================================
-- 4. Function to check credential expiry
-- ============================================================================

CREATE OR REPLACE FUNCTION check_ksef_credential_expiry()
RETURNS TABLE (
  credential_id UUID,
  provider_nip VARCHAR(10),
  expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id,
    kc.provider_nip,
    kc.expires_at,
    EXTRACT(DAY FROM (kc.expires_at - now()))::INTEGER as days_until_expiry,
    CASE
      WHEN kc.expires_at IS NULL THEN 'no_expiry'
      WHEN kc.expires_at < now() THEN 'expired'
      WHEN kc.expires_at < now() + INTERVAL '7 days' THEN 'expiring_soon'
      ELSE 'valid'
    END as status
  FROM ksef_credentials kc
  WHERE kc.is_active = true
  ORDER BY kc.expires_at NULLS LAST;
END;
$$;

COMMENT ON FUNCTION check_ksef_credential_expiry IS 'Check expiry status of active KSeF credentials';

-- ============================================================================
-- 5. Function to get provider credentials for integration
-- ============================================================================

CREATE OR REPLACE FUNCTION get_provider_credentials_for_integration(
  p_integration_id UUID
)
RETURNS TABLE (
  credential_id UUID,
  provider_nip VARCHAR(10),
  secret_ref TEXT,
  auth_type VARCHAR(20)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has access to this integration
  IF NOT (
    EXISTS (
      SELECT 1 FROM ksef_integrations ki
      JOIN business_profiles bp ON ki.business_profile_id = bp.id
      WHERE ki.id = p_integration_id
      AND bp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND is_super_admin = true
    )
    OR auth.uid() IS NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access credentials for this integration';
  END IF;

  RETURN QUERY
  SELECT 
    kc.id,
    kc.provider_nip,
    kc.secret_ref,
    kc.auth_type
  FROM ksef_integrations ki
  JOIN ksef_credentials kc ON ki.provider_nip = kc.provider_nip
  WHERE ki.id = p_integration_id
  AND kc.is_active = true
  AND ki.status = 'active'
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_provider_credentials_for_integration IS 'Get provider credentials for a specific integration (with access control)';

-- ============================================================================
-- 6. Grant necessary permissions
-- ============================================================================

-- Allow authenticated users to call these functions
GRANT EXECUTE ON FUNCTION get_ksef_secret TO authenticated;
GRANT EXECUTE ON FUNCTION store_ksef_secret TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_ksef_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION check_ksef_credential_expiry TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_credentials_for_integration TO authenticated;

-- Allow service role to call these functions
GRANT EXECUTE ON FUNCTION get_ksef_secret TO service_role;
GRANT EXECUTE ON FUNCTION store_ksef_secret TO service_role;
GRANT EXECUTE ON FUNCTION rotate_ksef_credentials TO service_role;
GRANT EXECUTE ON FUNCTION check_ksef_credential_expiry TO service_role;
GRANT EXECUTE ON FUNCTION get_provider_credentials_for_integration TO service_role;

-- ============================================================================
-- 7. Create view for credential monitoring
-- ============================================================================

CREATE OR REPLACE VIEW ksef_credential_status AS
SELECT 
  kc.id,
  kc.provider_nip,
  kc.auth_type,
  kc.is_active,
  kc.expires_at,
  kc.last_used_at,
  kc.created_at,
  CASE
    WHEN kc.expires_at IS NULL THEN 'no_expiry'
    WHEN kc.expires_at < now() THEN 'expired'
    WHEN kc.expires_at < now() + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as expiry_status,
  EXTRACT(DAY FROM (kc.expires_at - now()))::INTEGER as days_until_expiry,
  (
    SELECT COUNT(*)
    FROM ksef_integrations ki
    WHERE ki.provider_nip = kc.provider_nip
    AND ki.status = 'active'
  ) as active_integrations_count
FROM ksef_credentials kc
WHERE kc.is_active = true;

COMMENT ON VIEW ksef_credential_status IS 'Monitoring view for KSeF credential status and expiry';

-- Grant access to view
GRANT SELECT ON ksef_credential_status TO authenticated;
GRANT SELECT ON ksef_credential_status TO service_role;

-- ============================================================================
-- 8. Documentation
-- ============================================================================

COMMENT ON SCHEMA public IS 'KSeF Vault integration functions added. See migration 20260123 for details.';
