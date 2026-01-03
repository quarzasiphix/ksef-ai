-- ============================================================================
-- LINKABLE ENTITIES SEARCH RPC
-- ============================================================================
-- Purpose: Unified search endpoint for entity picker components
-- Returns searchable, department-filtered entities sorted by recency
--
-- This solves the "10 different hooks" problem by providing one search
-- interface for all linkable entities across the system.
--
-- Usage in UI:
-- - UploadFileDialog: search for entities to link files to
-- - Invoice creation: search for operations to link as business reason
-- - Contract creation: search for operations/vehicles/drivers for scope
-- - Any "attach to..." or "link to..." flow
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_linkable_entities(
  p_business_profile_id UUID,
  p_department_id UUID DEFAULT NULL,
  p_query TEXT DEFAULT NULL,
  p_entity_types TEXT[] DEFAULT NULL,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  department_id UUID,
  department_name TEXT,
  department_color TEXT,
  created_at TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_pattern TEXT;
BEGIN
  -- Prepare search pattern
  v_search_pattern := '%' || COALESCE(p_query, '') || '%';
  
  -- Return unified results from multiple entity types
  RETURN QUERY
  
  -- OPERATIONS / JOBS
  SELECT 
    'operation'::TEXT AS entity_type,
    oj.id AS entity_id,
    COALESCE(oj.job_number, 'Operacja') AS title,
    COALESCE(oj.description, '') || ' • ' || 
      COALESCE(TO_CHAR(oj.scheduled_start, 'DD.MM.YYYY'), '') AS subtitle,
    oj.department_id,
    d.name AS department_name,
    d.color AS department_color,
    oj.created_at,
    jsonb_build_object(
      'status', oj.status,
      'scheduled_start', oj.scheduled_start,
      'job_number', oj.job_number
    ) AS metadata
  FROM public.operational_jobs oj
  LEFT JOIN public.departments d ON d.id = oj.department_id
  WHERE oj.business_profile_id = p_business_profile_id
    AND (p_department_id IS NULL OR oj.department_id = p_department_id)
    AND (p_entity_types IS NULL OR 'operation' = ANY(p_entity_types))
    AND (p_query IS NULL OR 
         oj.job_number ILIKE v_search_pattern OR
         oj.description ILIKE v_search_pattern)
  
  UNION ALL
  
  -- INVOICES
  SELECT 
    'invoice'::TEXT AS entity_type,
    i.id AS entity_id,
    i.number AS title,
    COALESCE(c.name, '') || ' • ' || 
      TO_CHAR(i.issue_date, 'DD.MM.YYYY') || ' • ' ||
      i.total_gross_value::TEXT || ' ' || i.currency AS subtitle,
    NULL AS department_id, -- invoices don't have direct department
    NULL AS department_name,
    NULL AS department_color,
    i.created_at,
    jsonb_build_object(
      'status', i.status,
      'issue_date', i.issue_date,
      'total_gross_value', i.total_gross_value,
      'currency', i.currency
    ) AS metadata
  FROM public.invoices i
  LEFT JOIN public.customers c ON c.id = i.customer_id
  WHERE i.business_profile_id = p_business_profile_id
    AND (p_entity_types IS NULL OR 'invoice' = ANY(p_entity_types))
    AND (p_query IS NULL OR 
         i.number ILIKE v_search_pattern OR
         c.name ILIKE v_search_pattern)
  
  UNION ALL
  
  -- CONTRACTS
  SELECT 
    'contract'::TEXT AS entity_type,
    ct.id AS entity_id,
    COALESCE(ct.number, 'Umowa') AS title,
    COALESCE(ct.subject, '') || ' • ' || 
      TO_CHAR(ct.issue_date, 'DD.MM.YYYY') AS subtitle,
    NULL AS department_id,
    NULL AS department_name,
    NULL AS department_color,
    ct.created_at,
    jsonb_build_object(
      'status', ct.status,
      'issue_date', ct.issue_date,
      'subject', ct.subject
    ) AS metadata
  FROM public.contracts ct
  WHERE ct.business_profile_id = p_business_profile_id
    AND (p_entity_types IS NULL OR 'contract' = ANY(p_entity_types))
    AND (p_query IS NULL OR 
         ct.number ILIKE v_search_pattern OR
         ct.subject ILIKE v_search_pattern)
  
  UNION ALL
  
  -- DECISIONS
  SELECT 
    'decision'::TEXT AS entity_type,
    dec.id AS entity_id,
    dec.title AS title,
    COALESCE(dec.decision_number, '') || ' • ' || 
      TO_CHAR(dec.created_at, 'DD.MM.YYYY') AS subtitle,
    dec.department_id,
    d.name AS department_name,
    d.color AS department_color,
    dec.created_at,
    jsonb_build_object(
      'status', dec.status,
      'decision_type', dec.decision_type,
      'category', dec.category
    ) AS metadata
  FROM public.decisions dec
  LEFT JOIN public.departments d ON d.id = dec.department_id
  WHERE dec.business_profile_id = p_business_profile_id
    AND (p_department_id IS NULL OR dec.department_id = p_department_id)
    AND (p_entity_types IS NULL OR 'decision' = ANY(p_entity_types))
    AND (p_query IS NULL OR 
         dec.title ILIKE v_search_pattern OR
         dec.decision_number ILIKE v_search_pattern)
  
  UNION ALL
  
  -- VEHICLES
  SELECT 
    'vehicle'::TEXT AS entity_type,
    v.id AS entity_id,
    v.registration_number AS title,
    COALESCE(v.make, '') || ' ' || COALESCE(v.model, '') AS subtitle,
    v.department_id,
    d.name AS department_name,
    d.color AS department_color,
    v.created_at,
    jsonb_build_object(
      'status', v.status,
      'make', v.make,
      'model', v.model,
      'registration_number', v.registration_number
    ) AS metadata
  FROM public.vehicles v
  LEFT JOIN public.departments d ON d.id = v.department_id
  WHERE v.business_profile_id = p_business_profile_id
    AND (p_department_id IS NULL OR v.department_id = p_department_id)
    AND (p_entity_types IS NULL OR 'vehicle' = ANY(p_entity_types))
    AND (p_query IS NULL OR 
         v.registration_number ILIKE v_search_pattern OR
         v.make ILIKE v_search_pattern OR
         v.model ILIKE v_search_pattern)
  
  UNION ALL
  
  -- DRIVERS
  SELECT 
    'driver'::TEXT AS entity_type,
    dr.id AS entity_id,
    dr.name AS title,
    COALESCE(dr.phone, '') AS subtitle,
    dr.department_id,
    d.name AS department_name,
    d.color AS department_color,
    dr.created_at,
    jsonb_build_object(
      'status', dr.status,
      'phone', dr.phone,
      'license_number', dr.license_number
    ) AS metadata
  FROM public.drivers dr
  LEFT JOIN public.departments d ON d.id = dr.department_id
  WHERE dr.business_profile_id = p_business_profile_id
    AND (p_department_id IS NULL OR dr.department_id = p_department_id)
    AND (p_entity_types IS NULL OR 'driver' = ANY(p_entity_types))
    AND (p_query IS NULL OR 
         dr.name ILIKE v_search_pattern OR
         dr.phone ILIKE v_search_pattern)
  
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_linkable_entities TO authenticated;

-- ============================================================================
-- HELPER: Get entity display info by ID
-- ============================================================================
-- Quick lookup for displaying entity info when you already have the ID

CREATE OR REPLACE FUNCTION public.get_entity_display_info(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  department_id UUID,
  department_name TEXT,
  department_color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.search_linkable_entities(
    (SELECT business_profile_id FROM public.operational_jobs WHERE id = p_entity_id LIMIT 1),
    NULL,
    NULL,
    ARRAY[p_entity_type],
    1
  )
  WHERE entity_id = p_entity_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_entity_display_info TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.search_linkable_entities IS 'Unified search for all linkable entities (operations, invoices, contracts, decisions, vehicles, drivers) with department filtering and recency sorting';
COMMENT ON FUNCTION public.get_entity_display_info IS 'Quick lookup for entity display info by type and ID';
