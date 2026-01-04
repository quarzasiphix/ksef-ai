-- ============================================
-- ENHANCED GET CHART ACCOUNTS FOR PICKER
-- ============================================
-- Add filters for types and search to make picker more flexible

CREATE OR REPLACE FUNCTION get_chart_accounts_for_picker(
  p_business_profile_id UUID,
  p_types TEXT[] DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  account_type TEXT,
  is_synthetic BOOLEAN,
  default_vat_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.code,
    ca.name,
    ca.account_type,
    ca.is_synthetic,
    ca.default_vat_rate
  FROM chart_accounts ca
  WHERE ca.business_profile_id = p_business_profile_id
    AND ca.is_active = TRUE
    AND ca.is_synthetic = FALSE  -- Only postable accounts
    AND (p_types IS NULL OR ca.account_type = ANY(p_types))
    AND (p_search IS NULL OR 
         ca.code ILIKE '%' || p_search || '%' OR 
         ca.name ILIKE '%' || p_search || '%')
  ORDER BY ca.code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_chart_accounts_for_picker IS 'Get active, postable chart accounts for picker with optional type and search filters.';

GRANT EXECUTE ON FUNCTION get_chart_accounts_for_picker TO authenticated;
